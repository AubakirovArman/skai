/**
 * React Hook for Text-to-Speech functionality
 * Supports play/pause/resume and automatic language detection
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { ttsClient } from '@/lib/tts-client'
import { prepareTextForTTS } from '@/lib/text-sanitizer'

export type TTSStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'
export type TTSLanguage = 'kk' | 'ru' | 'en'

interface UseTTSOptions {
  language?: TTSLanguage
  autoDetectLanguage?: boolean
  onPlay?: () => void
  onPause?: () => void
  onEnd?: () => void
  onError?: (error: Error) => void
}

export function useTTS(options: UseTTSOptions = {}) {
  const {
    language, // Приоритетный язык из настроек интерфейса
    autoDetectLanguage = false, // По умолчанию выключено (используем язык интерфейса)
    onPlay,
    onPause,
    onEnd,
    onError,
  } = options

  const [status, setStatus] = useState<TTSStatus>('idle')
  const [currentText, setCurrentText] = useState<string>('')
  const [currentLang, setCurrentLang] = useState<TTSLanguage>(language || 'ru')
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  
  // Кэш для хранения аудио URL по хешу текста
  // Структура: { textHash: { url: string, lang: string } }
  const audioCacheRef = useRef<Map<string, { url: string, lang: 'kk' | 'ru' }>>(new Map())

  /**
   * Simple hash function for text caching
   * Uses numeric hash instead of btoa to support Unicode (Cyrillic, Kazakh, etc.)
   */
  const hashText = useCallback((text: string, lang: 'kk' | 'ru'): string => {
    // Простой численный хеш для Unicode-безопасности
    let hash = 0
    const sample = text.substring(0, 100) + text.substring(Math.max(0, text.length - 100))
    
    for (let i = 0; i < sample.length; i++) {
      const char = sample.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Комбинируем язык, длину текста и хеш выборки
    return `${lang}-${text.length}-${Math.abs(hash).toString(36)}`
  }, [])

  /**
   * Detect language based on text content
   */
  const detectLanguage = useCallback((text: string): 'kk' | 'ru' => {
    // Казахские символы: ә, ғ, қ, ң, ө, ұ, ү, һ, і
    const kazakhChars = /[әғқңөұүһі]/i
    const hasKazakhChars = kazakhChars.test(text)
    
    // Простая эвристика: если есть казахские символы, это казахский
    return hasKazakhChars ? 'kk' : 'ru'
  }, [])

  /**
   * Get effective language based on priority:
   * 1. Explicitly passed lang parameter
   * 2. Language from hook options (interface language)
   * 3. Auto-detected language (if enabled)
   * 4. Default 'ru'
   * 
   * Note: TTS API only supports 'kk' and 'ru', so 'en' falls back to 'ru'
   */
  const getEffectiveLanguage = useCallback((text: string, explicitLang?: TTSLanguage): 'kk' | 'ru' => {
    // Priority 1: Explicit parameter
    if (explicitLang) {
      if (explicitLang === 'kk') return 'kk'
      if (explicitLang === 'ru') return 'ru'
      if (explicitLang === 'en') {
        console.log('[useTTS] ⚠️ English TTS not supported, falling back to Russian')
        return 'ru' // English не поддерживается TTS API, используем русский
      }
    }
    
    // Priority 2: Language from options (interface language)
    if (language) {
      if (language === 'kk') return 'kk'
      if (language === 'ru') return 'ru'
      if (language === 'en') {
        console.log('[useTTS] ⚠️ English TTS not supported, falling back to Russian')
        return 'ru' // English не поддерживается TTS API, используем русский
      }
    }
    
    // Priority 3: Auto-detect
    if (autoDetectLanguage) {
      return detectLanguage(text)
    }
    
    // Priority 4: Default
    return 'ru'
  }, [language, autoDetectLanguage, detectLanguage])

  /**
   * Generate and play audio (with caching)
   */
  const generateAndPlay = useCallback(async (text: string, lang?: TTSLanguage) => {
    try {
      setStatus('loading')
      
      // Очищаем текст от Markdown разметки и лишних символов
      const cleanedText = prepareTextForTTS(text, 5000) // Максимум 5000 символов
      
      console.log('[useTTS] 🧹 Original text length:', text.length)
      console.log('[useTTS] ✨ Cleaned text length:', cleanedText.length)
      console.log('[useTTS] 📝 Cleaned preview:', cleanedText.substring(0, 150))
      
      // Get effective language based on priority
      const effectiveLanguage = getEffectiveLanguage(text, lang)
      setCurrentLang(effectiveLanguage)
      setCurrentText(cleanedText) // Сохраняем очищенный текст

      // Проверяем кэш
      const textHash = hashText(cleanedText, effectiveLanguage)
      const cached = audioCacheRef.current.get(textHash)
      
      let audioUrl: string
      
      if (cached) {
        console.log('[useTTS] 💾 Using cached audio:', textHash)
        audioUrl = cached.url
      } else {
        console.log('[useTTS] 🎤 Generating NEW audio for text:', cleanedText.substring(0, 100))
        console.log('[useTTS] 🌐 Using language:', effectiveLanguage)
        console.log('[useTTS] 📍 Language source:', lang ? 'explicit' : language ? 'interface' : autoDetectLanguage ? 'auto-detect' : 'default')

        // Generate audio URL with cleaned text
        audioUrl = await ttsClient.generateSpeechURL(cleanedText, effectiveLanguage)
        
        // Сохраняем в кэш
        audioCacheRef.current.set(textHash, { url: audioUrl, lang: effectiveLanguage })
        console.log('[useTTS] 💾 Cached audio with hash:', textHash)
        console.log('[useTTS] 📊 Cache size:', audioCacheRef.current.size)
      }
      
      audioUrlRef.current = audioUrl

      // Create audio element
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      // Set up event listeners
      audio.onplay = () => {
        setStatus('playing')
        onPlay?.()
        console.log('[useTTS] ▶️ Audio playing')
      }

      audio.onpause = () => {
        // Only set paused if not ended
        if (!audio.ended) {
          setStatus('paused')
          onPause?.()
          console.log('[useTTS] ⏸️ Audio paused')
        }
      }

      audio.onended = () => {
        setStatus('idle')
        onEnd?.()
        cleanup()
        console.log('[useTTS] ✅ Audio ended')
      }

      audio.onerror = (e) => {
        const error = new Error('Audio playback error')
        setStatus('error')
        onError?.(error)
        console.error('[useTTS] ❌ Audio error:', e)
        cleanup()
      }

      // Start playing
      await audio.play()
      
    } catch (error) {
      console.error('[useTTS] ❌ Generation error:', error)
      setStatus('error')
      onError?.(error as Error)
      cleanup()
    }
  }, [getEffectiveLanguage, hashText, language, autoDetectLanguage, onPlay, onPause, onEnd, onError])

  /**
   * Play audio (generate new or resume paused)
   */
  const play = useCallback(async (text?: string, lang?: TTSLanguage) => {
    console.log('[useTTS] 🎬 Play called:', { 
      status, 
      hasText: !!text, 
      hasAudio: !!audioRef.current,
      currentText: currentText.substring(0, 50)
    })
    
    if (status === 'paused' && audioRef.current) {
      // Resume paused audio
      console.log('[useTTS] ▶️ Resuming paused audio (not generating new)')
      await audioRef.current.play()
    } else if (text) {
      // Generate and play new audio
      console.log('[useTTS] 🎤 Generating new audio')
      await generateAndPlay(text, lang)
    } else {
      console.warn('[useTTS] ⚠️ Play called without text and not paused')
    }
  }, [status, currentText, generateAndPlay])

  /**
   * Pause audio
   */
  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      console.log('[useTTS] ⏸️ Pausing audio (currentTime:', audioRef.current.currentTime, ')')
      audioRef.current.pause()
    } else {
      console.warn('[useTTS] ⚠️ Cannot pause: no audio or already paused')
    }
  }, [])

  /**
   * Stop audio and reset
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      console.log('[useTTS] ⏹️ Stopping audio')
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    cleanup()
    setStatus('idle')
  }, [])

  /**
   * Toggle play/pause
   */
  const toggle = useCallback(async (text?: string, lang?: TTSLanguage) => {
    const audioPaused = audioRef.current?.paused ?? true
    const audioEnded = audioRef.current?.ended ?? true
    
    console.log('[useTTS] 🔀 Toggle called:', { 
      status, 
      hasText: !!text, 
      hasAudio: !!audioRef.current,
      audioPaused,
      audioEnded,
      currentText: currentText.substring(0, 50) 
    })
    
    // Проверяем реальное состояние audio элемента, а не только status
    if (audioRef.current && !audioPaused && !audioEnded) {
      // Audio элемент существует и играет -> пауза
      console.log('[useTTS] ⏸️ Toggle: Pausing (audio is playing)')
      pause()
    } else if (audioRef.current && audioPaused && !audioEnded) {
      // Audio элемент на паузе -> продолжить
      console.log('[useTTS] ▶️ Toggle: Resuming from pause (audio is paused)')
      await play() // Don't pass text, just resume
    } else if (text) {
      // Нет audio элемента или он закончился -> новое воспроизведение
      console.log('[useTTS] 🎬 Toggle: Starting new audio (no audio or ended)')
      await play(text, lang)
    }
  }, [status, currentText, play, pause])

  /**
   * Cleanup audio resources
   */
  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onplay = null
      audioRef.current.onpause = null
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current = null
    }
    if (audioUrlRef.current) {
      // Note: не удаляем URL из кэша, так как он может быть использован снова
      audioUrlRef.current = null
    }
  }, [])

  /**
   * Cleanup all cached audio on unmount
   */
  const cleanupCache = useCallback(() => {
    console.log('[useTTS] 🧹 Cleaning up cache, size:', audioCacheRef.current.size)
    audioCacheRef.current.forEach(({ url }) => {
      URL.revokeObjectURL(url)
    })
    audioCacheRef.current.clear()
  }, [])

  /**
   * Play audio from preloaded URL (no generation needed)
   */
  const playFromUrl = useCallback(async (audioUrl: string, text: string) => {
    try {
      console.log('[useTTS] 🎵 Playing from preloaded URL')
      setStatus('loading')
      setCurrentText(text)
      
      // Create audio element from preloaded URL
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audioUrlRef.current = audioUrl

      // Set up event listeners
      audio.onplay = () => {
        setStatus('playing')
        onPlay?.()
        console.log('[useTTS] ▶️ Preloaded audio playing')
      }

      audio.onpause = () => {
        if (!audio.ended) {
          setStatus('paused')
          onPause?.()
          console.log('[useTTS] ⏸️ Preloaded audio paused')
        }
      }

      audio.onended = () => {
        setStatus('idle')
        onEnd?.()
        // Don't cleanup - URL might be reused
        console.log('[useTTS] ✅ Preloaded audio ended')
      }

      audio.onerror = (e) => {
        const error = new Error('Audio playback error')
        setStatus('error')
        onError?.(error)
        console.error('[useTTS] ❌ Preloaded audio error:', e)
      }

      // Start playing
      await audio.play()
      
    } catch (error) {
      console.error('[useTTS] ❌ Playback error:', error)
      setStatus('error')
      onError?.(error as Error)
    }
  }, [onPlay, onPause, onEnd, onError])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
      cleanupCache()
    }
  }, [cleanup, cleanupCache])

  return {
    status,
    currentText,
    currentLang,
    isPlaying: status === 'playing',
    isPaused: status === 'paused',
    isLoading: status === 'loading',
    isError: status === 'error',
    play,
    pause,
    stop,
    toggle,
    playFromUrl, // NEW: Play from preloaded URL
  }
}
