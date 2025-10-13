'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AuthGuard } from '@/components/auth-guard'
import { useLanguage } from '@/contexts/language-context'
import { useTTS } from '@/hooks/useTTS'
import { TTSButton } from '@/components/tts-button'

interface Question {
  id: string
  number: number
  titleRu: string | null
  titleKk: string | null
  titleEn: string | null
  collapsedTextRu: string | null
  collapsedTextKk: string | null
  collapsedTextEn: string | null
  expandedTextRu: string | null
  expandedTextKk: string | null
  expandedTextEn: string | null
  decisionLabelRu: string | null
  decisionLabelKk: string | null
  decisionLabelEn: string | null
}

interface Meeting {
  id: string
  code: string
  titleRu: string
  titleKk: string
  titleEn: string
  questions: Question[]
}

export default function QuestionPage() {
  const params = useParams()
  const { language } = useLanguage()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const meetingCode = params.meeting as string
  const questionNumber = parseInt(params.question as string, 10)

  // Ref для видео
  const videoRef = useRef<HTMLVideoElement>(null)

  // TTS Hook
  const tts = useTTS({
    language: language as 'kk' | 'ru' | 'en',
    onError: (error) => {
      console.error('TTS Error:', error)
      alert('Ошибка при генерации озвучки. Попробуйте еще раз.')
    },
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/dialog/meetings')
        
        if (!response.ok) {
          throw new Error('Не удалось загрузить данные')
        }

        const data = await response.json()
        
        if (!data.success || !data.meetings) {
          throw new Error('Неверный формат данных')
        }

        const foundMeeting = data.meetings.find(
          (m: Meeting) => m.code === meetingCode
        )

        if (!foundMeeting) {
          setError(`Заседание ${meetingCode} не найдено`)
          return
        }

        setMeeting(foundMeeting)

        const foundQuestion = foundMeeting.questions.find(
          (q: Question) => q.number === questionNumber
        )

        if (!foundQuestion) {
          setError(`Вопрос ${questionNumber} в заседании ${meetingCode} не найден`)
          return
        }

        setQuestion(foundQuestion)
      } catch (err) {
        console.error('[Question Page] Error:', err)
        setError(err instanceof Error ? err.message : 'Произошла ошибка')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [meetingCode, questionNumber])

  const selectText = (ru: string | null, kk: string | null, en: string | null) => {
    switch (language) {
      case 'kk':
        return kk || ru || en || ''
      case 'en':
        return en || ru || kk || ''
      case 'ru':
      default:
        return ru || kk || en || ''
    }
  }

  // Генерация текста для озвучки (только решение и краткое содержание)
  const ttsText = useMemo(() => {
    if (!question) return ''

    const decisionLabel = selectText(
      question.decisionLabelRu,
      question.decisionLabelKk,
      question.decisionLabelEn
    )
    const collapsedText = selectText(
      question.collapsedTextRu,
      question.collapsedTextKk,
      question.collapsedTextEn
    )

    let text = ''

    // Решение
    if (decisionLabel) {
      if (language === 'ru') {
        text += `Решение по данному вопросу: ${decisionLabel}. `
      } else if (language === 'kk') {
        text += `Осы мәселе бойынша шешім: ${decisionLabel}. `
      } else {
        text += `Decision on this issue: ${decisionLabel}. `
      }
    }

    // Краткое заключение
    if (collapsedText) {
      if (language === 'ru') {
        text += `Краткое заключение: ${collapsedText}`
      } else if (language === 'kk') {
        text += `Қысқаша қорытынды: ${collapsedText}`
      } else {
        text += `Brief summary: ${collapsedText}`
      }
    }

    return text
  }, [question, language])

  // Обработчик кнопки озвучки
  const handleTTSClick = () => {
    if (!ttsText.trim()) {
      alert('Нет текста для озвучки')
      return
    }

    if (tts.isPlaying || tts.isPaused) {
      tts.toggle()
    } else {
      // Запускаем видео при начале озвучки
      if (videoRef.current) {
        videoRef.current.currentTime = 0 // Начинаем с начала
        videoRef.current.play().catch(err => {
          console.error('Video play error:', err)
        })
      }
      tts.play(ttsText)
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen pt-24 pb-20 px-4 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#d7a13a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Загрузка...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (error || !question || !meeting) {
    return (
      <AuthGuard>
        <div className="min-h-screen pt-24 pb-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
              <p className="text-red-600 dark:text-red-400 text-lg mb-4">
                {error || 'Данные не найдены'}
              </p>
              <Link
                href="/dialog"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#d7a13a] text-white rounded-lg hover:bg-[#c18c28] transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Вернуться к диалогу
              </Link>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  const meetingTitle = selectText(meeting.titleRu, meeting.titleKk, meeting.titleEn)
  const questionTitle = selectText(question.titleRu, question.titleKk, question.titleEn)
  const decisionLabel = selectText(
    question.decisionLabelRu,
    question.decisionLabelKk,
    question.decisionLabelEn
  )
  const collapsedText = selectText(
    question.collapsedTextRu,
    question.collapsedTextKk,
    question.collapsedTextEn
  )
  const expandedText = selectText(
    question.expandedTextRu,
    question.expandedTextKk,
    question.expandedTextEn
  )

  // Найти предыдущий и следующий вопросы
  const currentIndex = meeting.questions.findIndex(q => q.number === questionNumber)
  const prevQuestion = currentIndex > 0 ? meeting.questions[currentIndex - 1] : null
  const nextQuestion = currentIndex < meeting.questions.length - 1 ? meeting.questions[currentIndex + 1] : null

  return (
    <AuthGuard>
      <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Хлебные крошки */}
          <div className="mb-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/dialog" className="hover:text-[#d7a13a] transition">
              SK AI Диалог
            </Link>
            <span>/</span>
            <Link href={`/dialog/${meetingCode}`} className="hover:text-[#d7a13a] transition">
              {meetingTitle}
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">Вопрос {questionNumber}</span>
          </div>

          {/* Заголовок */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Вопрос {questionNumber}
            </h1>
            {questionTitle && (
              <p className="text-lg text-gray-600 dark:text-gray-400">{questionTitle}</p>
            )}
          </motion.div>

          {/* Layout: Видео слева, Карточка справа */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col lg:flex-row gap-6 mb-6"
          >
            {/* Левая часть: Видео и кнопка озвучки */}
            <div className="flex flex-col items-center gap-4 lg:w-auto">
              {/* Видео презентация в круге */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 rounded-full border-2 border-blue-300 dark:border-blue-700 overflow-hidden shadow-lg flex-shrink-0">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src="/1231213.mp4" type="video/mp4" />
                  <source src="/1231213.mp4" type="video/quicktime" />
                </video>
              </div>

              {/* Кнопка озвучки */}
              <TTSButton
                onClick={handleTTSClick}
                isPlaying={tts.isPlaying}
                isPaused={tts.isPaused}
                isLoading={tts.isLoading}
                isError={tts.isError}
                language={language}
              />
            </div>

            {/* Правая часть: Карточка вопроса */}
            <div className="flex-1 bg-white dark:bg-[#1f1f1f] rounded-2xl border-2 border-blue-200 dark:border-blue-800 shadow-lg p-6">
              {decisionLabel && (
                <div className="mb-6">
                  <div className="inline-block px-6 py-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-lg font-bold text-lg">
                    РЕШЕНИЕ:  {decisionLabel}
                  </div>
                </div>
              )}

              {/* Краткое заключение */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  КРАТКОЕ ЗАКЛЮЧЕНИЕ
                </h3>
                <p className="text-gray-900 dark:text-gray-100 text-base leading-relaxed">
                  {collapsedText || 'Информация отсутствует'}
                </p>
              </div>

              {/* Обоснование (раскрываемое) */}
              {expandedText && (
                <div>
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-[#2c2c2c] rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c3c3c] transition mb-2"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">
                      {expanded ? 'Скрыть обоснование' : 'Показать обоснование'}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                        expanded ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {expanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-gray-50 dark:bg-[#2c2c2c] rounded-lg"
                    >
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        ПОДРОБНАЯ ИНФОРМАЦИЯ
                      </h3>
                      <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                        {expandedText}
                      </p>
                    </motion.div>
                  )}
                </div>
              )}

              {!expandedText && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Подробная информация не указана
                </p>
              )}
            </div>
          </motion.div>

          {/* Навигация между вопросами */}
          <div className="flex items-center justify-between gap-4">
            {prevQuestion ? (
              <Link
                href={`/dialog/${meetingCode}/${prevQuestion.number}`}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-[#d7a13a] dark:hover:text-[#d7a13a] transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Вопрос {prevQuestion.number}</span>
              </Link>
            ) : (
              <div></div>
            )}

            <Link
              href={`/dialog/${meetingCode}`}
              className="px-6 py-3 bg-gray-100 dark:bg-[#2c2c2c] text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-[#3c3c3c] transition"
            >
              Все вопросы заседания
            </Link>

            {nextQuestion ? (
              <Link
                href={`/dialog/${meetingCode}/${nextQuestion.number}`}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-[#d7a13a] dark:hover:text-[#d7a13a] transition"
              >
                <span>Вопрос {nextQuestion.number}</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <div></div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
