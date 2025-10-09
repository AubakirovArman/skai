'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AuthGuard } from '@/components/auth-guard'
import { useLanguage } from '@/contexts/language-context'
import { translations, type Language } from '@/locales'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

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
  const [meetings, setMeetings] = useState<MeetingListItem[]>([])
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

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

  // Начать запись аудио
  const startRecording = async () => {
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

  // Остановить запись аудио
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
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

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-[calc(100vh-120px)] pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
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

        {messages.length === 0 && !isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-[#1f1f1f] border border-gray-100 dark:border-[#333333] rounded-2xl p-6 mb-8 shadow-sm"
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

        <div className="flex-1 bg-white dark:bg-[#1f1f1f] border border-gray-100 dark:border-[#333333] rounded-2xl p-4 sm:p-6 shadow-sm overflow-hidden">
          <div className="h-full overflow-y-auto space-y-4 pr-1">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
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

        <form onSubmit={handleSubmit} className="mt-6">
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

        <div className="mt-10">
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
      </div>
    </AuthGuard>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && <AssistantAvatar />}
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-sm transition',
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
