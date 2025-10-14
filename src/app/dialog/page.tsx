'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AuthGuard } from '@/components/auth-guard'
import { useLanguage } from '@/contexts/language-context'
import { translations, type Language } from '@/locales'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// Конфигурация голосов Azure для каждого языка
const VOICE_CONFIG: Record<Language, { voice: string; xmlLang: string; speechRecognitionLang: string }> = {
  ru: {
    voice: 'ru-RU-SvetlanaNeural',
    xmlLang: 'ru-RU',
    speechRecognitionLang: 'ru-RU'
  },
  kk: {
    voice: 'kk-KZ-AigulNeural',
    xmlLang: 'kk-KZ',
    speechRecognitionLang: 'kk-KZ'
  },
  en: {
    voice: 'en-US-AriaNeural',
    xmlLang: 'en-US',
    speechRecognitionLang: 'en-US'
  }
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  actions?: Array<{
    label: string
    href: string
  }>
  meta?: {
    meetingId?: string
    meetingCode?: string
    questionId?: string
    questionNumber?: number
  }
}

interface ChatApiResponse {
  success: boolean
  message?: {
    text: string
    actions?: ChatMessage['actions']
    meta?: ChatMessage['meta']
  }
  error?: string
}
interface MeetingListItem {
  id: string
  code: string
  titleRu: string
  titleKk: string
  titleEn: string
  questions: Array<{
    id: string
    number: number
    titleRu: string
    titleKk: string
    titleEn: string
  }>
}

export default function DialogPage() {
  const { language } = useLanguage()
  const tDialog = translations[language].dialog
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null)
  const [meetings, setMeetings] = useState<MeetingListItem[]>([])
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Azure Speech Recognition states (для микрофона)
  const [isAvatarInitialized, setIsAvatarInitialized] = useState(false)
  const [azureConfig, setAzureConfig] = useState<{key: string, region: string} | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const speechRecognizerRef = useRef<any>(null)

  useEffect(() => {
    const loadMeetings = async () => {
      try {
        const response = await fetch('/api/dialog/meetings')
        if (!response.ok) {
          throw new Error('Failed to load meetings')
        }
        const data = await response.json()
        if (data.success) {
          setMeetings(data.meetings)
        }
      } catch (error) {
        console.error('[Dialog] Failed to fetch meetings:', error)
      }
    }

    loadMeetings()
  }, [])

  // Загрузка Azure конфигурации для аватара
  useEffect(() => {
    fetch('/api/azure-speech-config')
      .then(res => res.json())
      .then(config => {
        setAzureConfig(config)
        console.log('✅ Azure config loaded for avatar')
      })
      .catch(err => {
        console.error('❌ Failed to load Azure config:', err)
      })
  }, [])

  // Загрузка Azure Speech SDK для аватара
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://aka.ms/csspeech/jsbrowserpackageraw'
    script.async = true
    script.onload = () => {
      console.log('✅ Azure Speech SDK loaded')
      setIsAvatarInitialized(true)
    }
    script.onerror = () => {
      console.error('❌ Failed to load Azure Speech SDK')
    }
    document.body.appendChild(script)

    return () => {
      if (speechRecognizerRef.current) {
        speechRecognizerRef.current.close()
      }
    }
  }, [])

  const suggestions = useMemo(() => {
    if (meetings.length === 0) {
      return []
    }

    const meeting = meetings[0]
    const localizedTitle = selectTitle(meeting, language)
    return meeting.questions.slice(0, 3).map((question) => {
      return formatSuggestion(language, meeting.code, question.number, selectQuestionTitle(question, language) || localizedTitle)
    })
  }, [meetings, language])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Azure Speech Recognition для микрофона
  const startAzureSpeechRecognition = async () => {
    if (!isAvatarInitialized || !azureConfig) {
      alert('Аватар не подключен. Сначала запустите аватар.')
      return
    }

    const SpeechSDK = (window as any).SpeechSDK
    
    try {
      setIsRecording(true)
      setIsTranscribing(false)

      const voiceConfig = VOICE_CONFIG[language]
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(azureConfig.key, azureConfig.region)
      speechConfig.speechRecognitionLanguage = voiceConfig.speechRecognitionLang
      
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput()
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig)
      speechRecognizerRef.current = recognizer

      recognizer.recognizeOnceAsync(
        async (result: any) => {
          recognizer.close()
          setIsRecording(false)

          if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
            const recognizedText = result.text.trim()
            console.log('📝 Recognized text:', recognizedText)
            if (recognizedText) {
              setInputValue(recognizedText)
            }
          } else if (result.reason === SpeechSDK.ResultReason.NoMatch) {
            console.warn('Speech recognition: No match')
            alert('Не удалось распознать речь, попробуйте снова.')
          }
        },
        (err: any) => {
          recognizer.close()
          console.error('Speech recognition error:', err)
          setIsRecording(false)
          alert('Ошибка распознавания речи.')
        }
      )
    } catch (error: any) {
      console.error('Speech recognition failed:', error)
      setIsRecording(false)
      alert(error.message || 'Speech recognition failed')
    }
  }

  const stopAzureSpeechRecognition = () => {
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.stopContinuousRecognitionAsync()
      setIsRecording(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed
    }

    const nextConversation = [...messages, userMessage]
    setMessages(nextConversation)
    setInputValue('')
    setIsThinking(true)

    try {
      const response = await fetch('/api/dialog/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: nextConversation.map(({ role, text }) => ({ role, text })),
          language,
        }),
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const data = (await response.json()) as ChatApiResponse

      if (!data.success || !data.message) {
        throw new Error(data.error || 'Empty response from chat API')
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: data.message.text,
        actions: data.message.actions,
        meta: data.message.meta,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('[Dialog Chat] Failed to get response:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: tDialog.error,
        },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  const handleSuggestedQuery = (query: string) => {
    setInputValue(query)
  }

  // Начать запись аудио - использует Azure Speech Recognition
  const startRecording = async () => {
    if (isAvatarInitialized && azureConfig) {
      // Используем Azure Speech Recognition
      startAzureSpeechRecognition()
    } else {
      // Fallback на старый MediaRecorder
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          await transcribeAudio(audioBlob)
          
          // Останавливаем все треки медиа-потока
          stream.getTracks().forEach(track => track.stop())
        }

        mediaRecorder.start()
        setIsRecording(true)
      } catch (error) {
        console.error('Ошибка при доступе к микрофону:', error)
        alert('Не удалось получить доступ к микрофону. Проверьте разрешения браузера.')
      }
    }
  }

  // Остановить запись аудио
  const stopRecording = () => {
    if (speechRecognizerRef.current) {
      stopAzureSpeechRecognition()
    } else if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Транскрибация аудио
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Ошибка транскрибации')
      }

      const data = await response.json()
      
      if (data.text) {
        setInputValue(data.text)
      }
    } catch (error) {
      console.error('Ошибка при транскрибации:', error)
      alert('Не удалось транскрибировать аудио. Попробуйте еще раз.')
    } finally {
      setIsTranscribing(false)
    }
  }

  // Озвучка сообщения бота
  const handleTTSClick = async (messageId: string, text: string) => {
    try {
      console.log('[Dialog TTS] Clicked for message:', messageId)
      
      // Если уже играет это сообщение - остановить
      if (playingAudioId === messageId) {
        audioRef.current?.pause()
        // Останавливаем видео
        if (videoRef.current) {
          videoRef.current.pause()
          videoRef.current.currentTime = 0
        }
        setPlayingAudioId(null)
        return
      }

      // Остановить предыдущее аудио
      if (audioRef.current) {
        audioRef.current.pause()
      }

      setLoadingAudioId(messageId)

      console.log('[Dialog TTS] Sending text to TTS:', text.substring(0, 100))

      // Запрос к TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          language: language === 'ru' ? 'ru-RU' : language === 'kk' ? 'kk-KZ' : 'en-US'
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Dialog TTS] API error:', errorText)
        throw new Error('TTS request failed')
      }

      const data = await response.json()
      console.log('[Dialog TTS] Response:', data)
      
      if (!data.audioUrl) {
        throw new Error('No audio URL in response')
      }

      // Воспроизвести аудио
      const audio = new Audio(data.audioUrl)
      audioRef.current = audio
      
      audio.onended = () => {
        console.log('[Dialog TTS] Audio ended')
        setPlayingAudioId(null)
        // Останавливаем видео и возвращаем в начало
        if (videoRef.current) {
          videoRef.current.pause()
          videoRef.current.currentTime = 0
        }
      }
      
      audio.onerror = (e) => {
        console.error('[Dialog TTS] Audio playback error:', e)
        setPlayingAudioId(null)
        setLoadingAudioId(null)
        // Останавливаем видео при ошибке
        if (videoRef.current) {
          videoRef.current.pause()
          videoRef.current.currentTime = 0
        }
        alert('Ошибка воспроизведения аудио')
      }

      await audio.play()
      setPlayingAudioId(messageId)
      setLoadingAudioId(null)
      
      // Запускаем видео один раз (без loop)
      if (videoRef.current) {
        videoRef.current.currentTime = 0
        videoRef.current.loop = false
        await videoRef.current.play()
      }

    } catch (error) {
      console.error('[Dialog TTS] Error:', error)
      setLoadingAudioId(null)
      alert('Не удалось озвучить сообщение')
    }
  }

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-[calc(100vh-120px)] pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-3xl sm:text-4xl font-semibold text-gray-900 dark:text-gray-50"
          >
            {tDialog.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-300"
          >
            {tDialog.subtitle}
          </motion.p>
        </div>
        
        {/* Grid с видео слева и чатом справа */}
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 mb-8">
          {/* Видео слева - фиксированная высота */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white dark:bg-[#1f1f1f] border border-gray-100 dark:border-[#333333] rounded-2xl p-4 shadow-sm self-start"
          >
            <div className="relative bg-gray-900 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <video 
                ref={videoRef}
                src="/IMG_3502.MOV"
                className="w-full h-full object-cover"
                playsInline
                muted
              />
            </div>
            
          </motion.div>

          {/* Чат справа - фиксированная высота с внутренним скроллом */}
          <div className="flex flex-col h-[500px] lg:h-[600px]">
        
        {/* Область чата с фиксированной высотой и скроллом */}
        <div className="flex-1 bg-white dark:bg-[#1f1f1f] border border-gray-100 dark:border-[#333333] rounded-2xl p-4 sm:p-6 shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {messages.length === 0 && !isThinking && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-50 dark:bg-[#2a2a2a] border border-gray-100 dark:border-[#333333] rounded-xl p-6"
              >
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {tDialog.emptyState}
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((query) => (
                    <button
                      key={query}
                      onClick={() => handleSuggestedQuery(query)}
                      className="px-3 py-2 text-sm rounded-full bg-[#d7a13a]/10 text-[#d7a13a] hover:bg-[#d7a13a]/20 transition"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
            {messages.map((message) => (
              <MessageBubble 
                key={message.id} 
                message={message}
                onTTSClick={handleTTSClick}
                playingAudioId={playingAudioId}
                loadingAudioId={loadingAudioId}
              />
            ))}
            <AnimatePresence>
              {isThinking && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-3 items-start"
                >
                  <AssistantAvatar />
                  <div className="bg-gray-100 dark:bg-[#2c2c2c] text-gray-500 dark:text-gray-300 px-4 py-3 rounded-2xl rounded-tl-sm text-sm">
                    ...
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Форма ввода - закреплена внизу */}
        <form onSubmit={handleSubmit} className="mt-4">
          {(isRecording || isTranscribing) && (
            <div className="mb-2 text-sm text-gray-600 dark:text-gray-300">
              {isRecording && '🔴 Запись...'}
              {isTranscribing && '⏳ Транскрибация...'}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={tDialog.placeholder}
              rows={2}
              disabled={isRecording || isTranscribing}
              className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1f1f1f] px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#d7a13a]/60 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            
            {/* Кнопка микрофона */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isThinking || isTranscribing}
              className={cn(
                'inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-all',
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'bg-gray-200 dark:bg-[#2c2c2c] hover:bg-gray-300 dark:hover:bg-[#3c3c3c] text-gray-600 dark:text-[#d7a13a]',
                (isThinking || isTranscribing) && 'opacity-60 cursor-not-allowed'
              )}
              title={isRecording ? 'Остановить запись' : 'Начать запись'}
            >
              {isTranscribing ? (
                <div className="w-5 h-5 border-2 border-[#d7a13a] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              )}
            </button>

            <button
              type="submit"
              disabled={!inputValue.trim() || isThinking || isRecording || isTranscribing}
              className={cn(
                'inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-medium transition-colors',
                'bg-[#d7a13a] text-white hover:bg-[#c18c28]',
                (!inputValue.trim() || isThinking || isRecording || isTranscribing) && 'opacity-60 cursor-not-allowed'
              )}
            >
              {tDialog.send}
            </button>
          </div>
        </form>
      </div> {/* Закрывающий тег для чата справа */}
      
      </div> {/* Закрывающий тег для grid контейнера */}
      
      {/* Другие заседания - за пределами grid */}
      <div className="mt-6">
        <h2 className="text-sm uppercase tracking-wide text-gray-400 mb-3">{tDialog.otherMeetingsTitle}</h2>
        <div className="flex flex-wrap gap-2">
          {meetings.map((meeting) => (
            <Link
              key={meeting.id}
              href={`/dialog/${meeting.code}`}
              className="px-3 py-2 text-sm rounded-full border border-gray-200 dark:border-[#333333] text-gray-600 dark:text-gray-200 hover:border-[#d7a13a] hover:text-[#d7a13a] transition"
            >
              {selectTitle(meeting, language)}
            </Link>
          ))}
        </div>
      </div>
      </div> {/* Закрывающий тег для основного flex контейнера */}
    </AuthGuard>
  )
}

function MessageBubble({ message, onTTSClick, playingAudioId, loadingAudioId }: { 
  message: ChatMessage
  onTTSClick: (messageId: string, text: string) => void
  playingAudioId: string | null
  loadingAudioId: string | null
}) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && <AssistantAvatar />}
      <div className="flex flex-col items-start max-w-[85%] sm:max-w-[70%]">
        <div
          className={cn(
            'px-4 py-3 rounded-2xl text-sm shadow-sm transition',
            isUser
              ? 'bg-[#d7a13a] text-white rounded-tr-sm'
              : 'bg-gray-100 dark:bg-[#2c2c2c] text-gray-800 dark:text-gray-100 rounded-tl-sm'
          )}
        >
          <p>{message.text}</p>
          {message.actions && message.actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full bg-white text-[#d7a13a] border border-[#d7a13a]/30 hover:bg-[#d7a13a]/10 transition"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          )}
        </div>
        
        {/* Кнопка озвучки для сообщений бота */}
        {!isUser && (
          <button
            onClick={() => onTTSClick(message.id, message.text)}
            disabled={loadingAudioId === message.id}
            className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-[#d7a13a] dark:hover:text-[#d7a13a] transition-colors disabled:opacity-50 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2c2c2c]"
            title={playingAudioId === message.id ? 'Остановить' : 'Воспроизвести ответ'}
          >
            {loadingAudioId === message.id ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Загрузка...</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={cn('w-4 h-4', playingAudioId === message.id && 'text-[#d7a13a]')}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
                <span>{playingAudioId === message.id ? 'Остановить' : 'Воспроизвести ответ'}</span>
              </>
            )}
          </button>
        )}
      </div>
      {isUser && <UserAvatar />}
    </div>
  )
}

function selectTitle(meeting: MeetingListItem, language: Language) {
  switch (language) {
    case 'kk':
      return meeting.titleKk || meeting.titleRu || meeting.titleEn
    case 'en':
      return meeting.titleEn || meeting.titleRu || meeting.titleKk
    case 'ru':
    default:
      return meeting.titleRu || meeting.titleKk || meeting.titleEn
  }
}

function selectQuestionTitle(
  question: MeetingListItem['questions'][number],
  language: Language
) {
  switch (language) {
    case 'kk':
      return question.titleKk || question.titleRu || question.titleEn
    case 'en':
      return question.titleEn || question.titleRu || question.titleKk
    case 'ru':
    default:
      return question.titleRu || question.titleKk || question.titleEn
  }
}

function formatSuggestion(
  language: Language,
  meetingCode: string,
  questionNumber: number,
  questionTitle?: string
) {
  switch (language) {
    case 'kk':
      return `Отырыстың ${meetingCode} ${questionNumber}-сұрағы бойынша не шешілді?`
    case 'en':
      return `What was decided in meeting ${meetingCode} question ${questionNumber}?`
    case 'ru':
    default:
      return questionTitle
        ? `Что решили на заседании ${meetingCode} по вопросу ${questionNumber} (${questionTitle})?`
        : `Что решили на заседании ${meetingCode} по вопросу ${questionNumber}?`
  }
}

function AssistantAvatar() {
  return (
    <div className="w-10 h-10 rounded-full bg-[#d7a13a]/15 text-[#d7a13a] flex items-center justify-center font-semibold">
      SK
    </div>
  )
}

function UserAvatar() {
  return (
    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-semibold">
      Я
    </div>
  )
}
