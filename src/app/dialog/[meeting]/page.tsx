'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AuthGuard } from '@/components/auth-guard'
import { useLanguage } from '@/contexts/language-context'
import { translations, type Language } from '@/locales'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MeetingData {
  id: string
  code: string
  titleRu: string
  titleKk: string
  titleEn: string
  summaryRu: string | null
  summaryKk: string | null
  summaryEn: string | null
  overviewRu: string | null
  overviewKk: string | null
  overviewEn: string | null
  questions: Array<{
    id: string
    number: number
    titleRu: string
    titleKk: string
    titleEn: string
    collapsedTextRu: string
    collapsedTextKk: string
    collapsedTextEn: string
    expandedTextRu: string | null
    expandedTextKk: string | null
    expandedTextEn: string | null
    decisionLabelRu: string | null
    decisionLabelKk: string | null
    decisionLabelEn: string | null
  }>
}

export default function MeetingDetailsPage() {
  const params = useParams<{ meeting: string }>()
  const meetingCode = Array.isArray(params.meeting) ? params.meeting[0] : params.meeting
  const { language } = useLanguage()
  const tDialog = translations[language].dialog

  const [meeting, setMeeting] = useState<MeetingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const response = await fetch('/api/dialog/meetings')
        if (!response.ok) {
          throw new Error('Failed to fetch meetings')
        }
        const data = await response.json()
        if (data.success && data.meetings) {
          const found = data.meetings.find((m: MeetingData) => m.code === meetingCode)
          setMeeting(found || null)
        }
      } catch (error) {
        console.error('[Meeting Details] Failed to fetch:', error)
        setMeeting(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMeeting()
  }, [meetingCode])

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex justify-center items-center min-h-[50vh]">
          <div className="h-10 w-10 rounded-full border-4 border-[#d7a13a] border-t-transparent animate-spin" />
        </div>
      </AuthGuard>
    )
  }

  if (!meeting) {
    return (
      <AuthGuard>
        <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333333] rounded-2xl p-10 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">{tDialog.unknownMeeting}</h1>
            <Link
              href="/dialog"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d7a13a] text-white text-sm font-medium"
            >
              {tDialog.detailsBackLink}
            </Link>
          </div>
        </div>
      </AuthGuard>
    )
  }

  const toggleQuestion = (number: number) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [number]: !prev[number]
    }))
  }

  const toggleAll = (expand: boolean) => {
    const map = Object.fromEntries(meeting.questions.map((question) => [question.number, expand]))
    setExpandedQuestions(map)
  }

  const selectText = (ru: string | null, kk: string | null, en: string | null): string => {
    if (language === 'kk') return kk || ru || en || ''
    if (language === 'en') return en || ru || kk || ''
    return ru || kk || en || ''
  }

  const title = tDialog.detailsPageTitle(meeting.code)
  const meetingTitle = selectText(meeting.titleRu, meeting.titleKk, meeting.titleEn)
  const meetingSummary = selectText(meeting.summaryRu, meeting.summaryKk, meeting.summaryEn)
  const meetingOverview = selectText(meeting.overviewRu, meeting.overviewKk, meeting.overviewEn)

  return (
    <AuthGuard>
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dialog"
            className="text-sm text-[#d7a13a] hover:underline"
          >
            ← {tDialog.detailsBackLink}
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-50 mb-2">{title}</h1>
          <p className="text-base text-gray-600 dark:text-gray-400 mb-6">{meetingTitle}</p>

          {(meetingSummary || meetingOverview) && (
            <div className="mb-6 text-sm text-gray-600 dark:text-gray-300 space-y-2">
              {meetingSummary && <p>{meetingSummary}</p>}
              {meetingOverview && <p>{meetingOverview}</p>}
            </div>
          )}
        </motion.div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-4">
            Результаты анализа
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Выберите вкладку, чтобы посмотреть детали.
          </p>

          <div className="border-2 border-blue-400 rounded-2xl p-6 space-y-4">
            {meeting.questions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Вопросы отсутствуют</p>
            ) : (
              meeting.questions.map((question) => {
                const isExpanded = expandedQuestions[question.number]
                const questionTitle = selectText(question.titleRu, question.titleKk, question.titleEn)
                const decisionLabel = selectText(question.decisionLabelRu, question.decisionLabelKk, question.decisionLabelEn)
                const collapsedText = selectText(question.collapsedTextRu, question.collapsedTextKk, question.collapsedTextEn)
                const expandedText = selectText(question.expandedTextRu, question.expandedTextKk, question.expandedTextEn)

                return (
                  <motion.div
                    key={question.number}
                    id={`question-${question.number}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: question.number * 0.05 }}
                    className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold mb-1">
                          ПОВЕСТКА ДНЯ №{question.number}
                        </p>
                        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                          {questionTitle}
                        </h3>
                        <p className="text-base font-semibold text-green-700 dark:text-green-400">
                          {decisionLabel || 'РЕШЕНИЕ:ЗА'}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleQuestion(question.number)}
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 underline hover:text-[#d7a13a] transition whitespace-nowrap"
                      >
                        {isExpanded ? 'Скрыть' : 'Просмотреть'}
                      </button>
                    </div>

                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="pt-3 border-t border-blue-200 dark:border-blue-700 space-y-3"
                      >
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Краткое заключение:
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {collapsedText || 'Информация отсутствует'}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Обоснование:
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {expandedText || 'Подробная информация не указана'}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )
              })
            )}
          </div>
        </section>
      </div>
    </AuthGuard>
  )
}
