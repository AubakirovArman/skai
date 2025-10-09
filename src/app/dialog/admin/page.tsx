'use client'

import {
  useEffect,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { AuthGuard } from '@/components/auth-guard'
import { useLanguage, type Language } from '@/contexts/language-context'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MeetingFormState {
  id?: string
  code: string
  titleRu: string
  titleKk: string
  titleEn: string
  summaryRu: string
  summaryKk: string
  summaryEn: string
  overviewRu: string
  overviewKk: string
  overviewEn: string
}

interface QuestionFormState {
  id?: string
  meetingId: string
  number: string
  titleRu: string
  titleKk: string
  titleEn: string
  collapsedTextRu: string
  collapsedTextKk: string
  collapsedTextEn: string
  expandedTextRu: string
  expandedTextKk: string
  expandedTextEn: string
  decisionLabelRu: string
  decisionLabelKk: string
  decisionLabelEn: string
  triggerPhrases: string
}

interface MeetingWithQuestions {
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
    triggerPhrases: string[]
  }>
}

type MeetingQuestion = MeetingWithQuestions['questions'][number]

const createEmptyMeetingForm = (): MeetingFormState => ({
  code: '',
  titleRu: '',
  titleKk: '',
  titleEn: '',
  summaryRu: '',
  summaryKk: '',
  summaryEn: '',
  overviewRu: '',
  overviewKk: '',
  overviewEn: '',
})

const createEmptyQuestionForm = (meetingId: string, nextNumber: number): QuestionFormState => ({
  meetingId,
  number: String(nextNumber),
  titleRu: '',
  titleKk: '',
  titleEn: '',
  collapsedTextRu: '',
  collapsedTextKk: '',
  collapsedTextEn: '',
  expandedTextRu: '',
  expandedTextKk: '',
  expandedTextEn: '',
  decisionLabelRu: '',
  decisionLabelKk: '',
  decisionLabelEn: '',
  triggerPhrases: '',
})

const mapMeetingToForm = (meeting: MeetingWithQuestions): MeetingFormState => ({
  id: meeting.id,
  code: meeting.code,
  titleRu: meeting.titleRu ?? '',
  titleKk: meeting.titleKk ?? '',
  titleEn: meeting.titleEn ?? '',
  summaryRu: meeting.summaryRu ?? '',
  summaryKk: meeting.summaryKk ?? '',
  summaryEn: meeting.summaryEn ?? '',
  overviewRu: meeting.overviewRu ?? '',
  overviewKk: meeting.overviewKk ?? '',
  overviewEn: meeting.overviewEn ?? '',
})

const mapQuestionToForm = (meetingId: string, question: MeetingQuestion): QuestionFormState => ({
  id: question.id,
  meetingId,
  number: String(question.number),
  titleRu: question.titleRu ?? '',
  titleKk: question.titleKk ?? '',
  titleEn: question.titleEn ?? '',
  collapsedTextRu: question.collapsedTextRu ?? '',
  collapsedTextKk: question.collapsedTextKk ?? '',
  collapsedTextEn: question.collapsedTextEn ?? '',
  expandedTextRu: question.expandedTextRu ?? '',
  expandedTextKk: question.expandedTextKk ?? '',
  expandedTextEn: question.expandedTextEn ?? '',
  decisionLabelRu: question.decisionLabelRu ?? '',
  decisionLabelKk: question.decisionLabelKk ?? '',
  decisionLabelEn: question.decisionLabelEn ?? '',
  triggerPhrases: question.triggerPhrases.join(', '),
})

const getLocalizedMeetingTitle = (meeting: MeetingWithQuestions, language: Language): string => {
  if (language === 'kk') {
    return meeting.titleKk || meeting.titleRu || meeting.titleEn || meeting.code
  }
  if (language === 'en') {
    return meeting.titleEn || meeting.titleRu || meeting.code
  }
  return meeting.titleRu || meeting.titleEn || meeting.code
}

const getLocalizedQuestionTitle = (question: MeetingQuestion, language: Language): string => {
  if (language === 'kk') {
    return question.titleKk || question.titleRu || question.titleEn
  }
  if (language === 'en') {
    return question.titleEn || question.titleRu || question.titleKk
  }
  return question.titleRu || question.titleEn || question.titleKk
}

const getLocalizedDecisionLabel = (question: MeetingQuestion, language: Language): string | null => {
  if (language === 'kk') {
    return question.decisionLabelKk || question.decisionLabelRu || question.decisionLabelEn || null
  }
  if (language === 'en') {
    return question.decisionLabelEn || question.decisionLabelRu || question.decisionLabelKk || null
  }
  return question.decisionLabelRu || question.decisionLabelEn || question.decisionLabelKk || null
}

const getNextQuestionNumber = (questions: MeetingQuestion[]): number => {
  if (questions.length === 0) {
    return 1
  }
  return Math.max(...questions.map((question) => question.number)) + 1
}

const parseTriggerPhrases = (input: string): string[] =>
  input
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

export default function DialogAdminPage() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const [meetings, setMeetings] = useState<MeetingWithQuestions[]>([])
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [meetingForm, setMeetingForm] = useState<MeetingFormState>(createEmptyMeetingForm())
  const [questionForm, setQuestionForm] = useState<QuestionFormState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingMeeting, setIsSavingMeeting] = useState(false)
  const [isSavingQuestion, setIsSavingQuestion] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const isDialogAdmin = (session?.user as { role?: string } | undefined)?.role === 'dialog_admin'

  const showError = (message: string) => {
    setErrorMessage(message)
    setSuccessMessage(null)
  }

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setErrorMessage(null)
  }

  const refreshMeetings = async (): Promise<MeetingWithQuestions[] | null> => {
    try {
      const response = await fetch('/api/dialog/admin/meetings')
      if (!response.ok) {
        throw new Error('Request failed')
      }
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to load meetings')
      }

      const fetched: MeetingWithQuestions[] = data.meetings
      setMeetings(fetched)

      if (selectedMeetingId && !fetched.some((meeting) => meeting.id === selectedMeetingId)) {
        setSelectedMeetingId(null)
        setMeetingForm(createEmptyMeetingForm())
        setQuestionForm(null)
      }

      return fetched
    } catch (error) {
      console.error('[Dialog Admin] Failed to fetch meetings:', error)
      showError('Не удалось загрузить список заседаний')
      return null
    }
  }

  useEffect(() => {
    if (!isDialogAdmin) {
      setIsLoading(false)
      return
    }

    let active = true
    setIsLoading(true)
    setErrorMessage(null)

    refreshMeetings().finally(() => {
      if (active) {
        setIsLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [isDialogAdmin])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const selectedMeeting = useMemo(() => {
    if (!selectedMeetingId) {
      return null
    }
    return meetings.find((meeting) => meeting.id === selectedMeetingId) ?? null
  }, [meetings, selectedMeetingId])

  const sortedQuestions = useMemo(() => {
    if (!selectedMeeting) {
      return [] as MeetingQuestion[]
    }
    return [...selectedMeeting.questions].sort((a, b) => a.number - b.number)
  }, [selectedMeeting])

  const handleMeetingSelect = (meetingId: string) => {
    setSelectedMeetingId(meetingId)
    const meeting = meetings.find((item) => item.id === meetingId)
    if (meeting) {
      setMeetingForm(mapMeetingToForm(meeting))
      setQuestionForm(null)
    }
  }

  const handleMeetingFormChange = (field: keyof MeetingFormState, value: string) => {
    setMeetingForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleQuestionFormChange = (field: keyof QuestionFormState, value: string) => {
    setQuestionForm((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const handleCreateMeeting = () => {
    setSelectedMeetingId(null)
    setMeetingForm(createEmptyMeetingForm())
    setQuestionForm(null)
    setSuccessMessage(null)
    setErrorMessage(null)
  }

  const handleEditQuestion = (meeting: MeetingWithQuestions, questionId?: string) => {
    if (questionId) {
      const question = meeting.questions.find((item) => item.id === questionId)
      if (question) {
        setQuestionForm(mapQuestionToForm(meeting.id, question))
      }
      return
    }

    const nextNumber = getNextQuestionNumber(meeting.questions)
    setQuestionForm(createEmptyQuestionForm(meeting.id, nextNumber))
  }

  const handleSaveMeeting = async () => {
    setIsSavingMeeting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    if (
      !meetingForm.code.trim() ||
      !meetingForm.titleRu.trim() ||
      !meetingForm.titleKk.trim() ||
      !meetingForm.titleEn.trim()
    ) {
      showError('Заполните обязательные поля заседания')
      setIsSavingMeeting(false)
      return
    }

    const payload = {
      ...meetingForm,
      code: meetingForm.code.trim(),
      titleRu: meetingForm.titleRu.trim(),
      titleKk: meetingForm.titleKk.trim(),
      titleEn: meetingForm.titleEn.trim(),
    }

    const method = meetingForm.id ? 'PUT' : 'POST'
    const url = meetingForm.id
      ? `/api/dialog/admin/meetings/${meetingForm.id}`
      : '/api/dialog/admin/meetings'

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Request failed')
      }

      const data = (await response.json()) as {
        success?: boolean
        meeting?: { id: string }
        error?: string
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to save meeting')
      }

      showSuccess(meetingForm.id ? 'Заседание обновлено' : 'Заседание создано')
      const refreshed = await refreshMeetings()
      const meetingId = data.meeting?.id ?? meetingForm.id ?? null

      if (meetingId && refreshed) {
        const updated = refreshed.find((item) => item.id === meetingId)
        if (updated) {
          setSelectedMeetingId(meetingId)
          setMeetingForm(mapMeetingToForm(updated))
        }
      }
    } catch (error) {
      console.error('[Dialog Admin] Failed to save meeting:', error)
      showError('Не удалось сохранить заседание')
    } finally {
      setIsSavingMeeting(false)
    }
  }

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Удалить заседание и все его вопросы?')) {
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/dialog/admin/meetings/${meetingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Request failed')
      }

      showSuccess('Заседание удалено')
      await refreshMeetings()

      if (selectedMeetingId === meetingId) {
        setSelectedMeetingId(null)
        setMeetingForm(createEmptyMeetingForm())
        setQuestionForm(null)
      }
    } catch (error) {
      console.error('[Dialog Admin] Failed to delete meeting:', error)
      showError('Не удалось удалить заседание')
    }
  }

  const handleSaveQuestion = async () => {
    if (!questionForm) {
      return
    }

    setIsSavingQuestion(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const numericNumber = Number(questionForm.number)
    if (!Number.isFinite(numericNumber) || numericNumber <= 0) {
      showError('Введите корректный номер вопроса')
      setIsSavingQuestion(false)
      return
    }

    const method = questionForm.id ? 'PUT' : 'POST'
    const url = questionForm.id
      ? `/api/dialog/admin/meetings/${questionForm.meetingId}/questions/${questionForm.id}`
      : `/api/dialog/admin/meetings/${questionForm.meetingId}/questions`

    const payload = {
      number: numericNumber,
      titleRu: questionForm.titleRu.trim(),
      titleKk: questionForm.titleKk.trim(),
      titleEn: questionForm.titleEn.trim(),
      collapsedTextRu: questionForm.collapsedTextRu.trim(),
      collapsedTextKk: questionForm.collapsedTextKk.trim(),
      collapsedTextEn: questionForm.collapsedTextEn.trim(),
      expandedTextRu: questionForm.expandedTextRu.trim() || null,
      expandedTextKk: questionForm.expandedTextKk.trim() || null,
      expandedTextEn: questionForm.expandedTextEn.trim() || null,
      decisionLabelRu: questionForm.decisionLabelRu.trim() || null,
      decisionLabelKk: questionForm.decisionLabelKk.trim() || null,
      decisionLabelEn: questionForm.decisionLabelEn.trim() || null,
      triggerPhrases: parseTriggerPhrases(questionForm.triggerPhrases),
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Request failed')
      }

      const data = (await response.json()) as {
        success?: boolean
        question?: { id: string }
        error?: string
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to save question')
      }

      showSuccess(questionForm.id ? 'Вопрос обновлён' : 'Вопрос создан')
      const refreshed = await refreshMeetings()

      if (refreshed) {
        const updatedMeeting = refreshed.find((meeting) => meeting.id === questionForm.meetingId)
        if (updatedMeeting) {
          setSelectedMeetingId(updatedMeeting.id)
          setMeetingForm(mapMeetingToForm(updatedMeeting))

          if (questionForm.id) {
            const updatedQuestion = updatedMeeting.questions.find(
              (item) => item.id === questionForm.id
            )
            if (updatedQuestion) {
              setQuestionForm(mapQuestionToForm(updatedMeeting.id, updatedQuestion))
            }
          } else {
            setQuestionForm(null)
          }
        }
      }
    } catch (error) {
      console.error('[Dialog Admin] Failed to save question:', error)
      showError('Не удалось сохранить вопрос')
    } finally {
      setIsSavingQuestion(false)
    }
  }

  const handleDeleteQuestion = async (meetingId: string, questionId: string) => {
    if (!confirm('Удалить вопрос?')) {
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(
        `/api/dialog/admin/meetings/${meetingId}/questions/${questionId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        throw new Error('Request failed')
      }

      showSuccess('Вопрос удалён')
      const refreshed = await refreshMeetings()

      if (refreshed) {
        const updatedMeeting = refreshed.find((meeting) => meeting.id === meetingId)
        if (updatedMeeting) {
          setSelectedMeetingId(updatedMeeting.id)
          setMeetingForm(mapMeetingToForm(updatedMeeting))
        }
      }

      if (questionForm?.id === questionId) {
        setQuestionForm(null)
      }
    } catch (error) {
      console.error('[Dialog Admin] Failed to delete question:', error)
      showError('Не удалось удалить вопрос')
    }
  }

  const handleMoveQuestion = async (
    meeting: MeetingWithQuestions,
    questionId: string,
    direction: 'up' | 'down'
  ) => {
    const ordered = [...meeting.questions].sort((a, b) => a.number - b.number)
    const currentIndex = ordered.findIndex((question) => question.id === questionId)

    if (currentIndex === -1) {
      return
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= ordered.length) {
      return
    }

    const reordered = [...ordered]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(targetIndex, 0, moved)

    const payload = reordered.map((question, index) => ({
      id: question.id,
      number: index + 1,
    }))

    try {
      const response = await fetch(`/api/dialog/admin/meetings/${meeting.id}/questions/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: payload }),
      })

      if (!response.ok) {
        throw new Error('Request failed')
      }

      showSuccess('Порядок вопросов обновлён')
      const refreshed = await refreshMeetings()

      if (refreshed && questionForm?.id) {
        const updatedMeeting = refreshed.find((item) => item.id === questionForm.meetingId)
        const updatedQuestion = updatedMeeting?.questions.find(
          (item) => item.id === questionForm.id
        )
        if (updatedMeeting && updatedQuestion) {
          setQuestionForm(mapQuestionToForm(updatedMeeting.id, updatedQuestion))
        }
      }
    } catch (error) {
      console.error('[Dialog Admin] Failed to reorder questions:', error)
      showError('Не удалось изменить порядок вопросов')
    }
  }

  if (!isDialogAdmin) {
    return (
      <AuthGuard>
        <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333333] rounded-2xl p-10 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Доступ запрещён
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              У вас нет прав на управление диалогами. Используйте учётную запись admin2.
            </p>
            <Link
              href="/dialog"
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d7a13a] text-white text-sm font-medium"
            >
              Вернуться к диалогу
            </Link>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-50">
              Панель управления диалогами
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Управляйте заседаниями, вопросами и триггерными фразами для чат-бота
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dialog"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#333333] text-sm text-gray-600 dark:text-gray-200 hover:border-[#d7a13a] hover:text-[#d7a13a]"
            >
              Перейти в чат
            </Link>
            <button
              onClick={handleCreateMeeting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d7a13a] text-white text-sm hover:bg-[#c18c28]"
            >
              Новое заседание
            </button>
          </div>
        </header>

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {errorMessage}
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            key={successMessage}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {successMessage}
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-10 w-10 rounded-full border-4 border-[#d7a13a] border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SectionCard title="Список заседаний">
              <div className="space-y-3">
                {meetings.map((meeting) => {
                  const isSelected = meeting.id === selectedMeetingId
                  const localizedTitle = getLocalizedMeetingTitle(meeting, language)

                  return (
                    <button
                      key={meeting.id}
                      onClick={() => handleMeetingSelect(meeting.id)}
                      className={cn(
                        'w-full text-left px-4 py-3 rounded-xl border transition flex flex-col gap-1',
                        isSelected
                          ? 'border-[#d7a13a] bg-[#d7a13a]/10 text-[#d7a13a]'
                          : 'border-gray-200 dark:border-[#333333] text-gray-700 dark:text-gray-200 hover:border-[#d7a13a]'
                      )}
                    >
                      <span className="text-sm font-medium">{localizedTitle}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{meeting.code}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Вопросов: {meeting.questions.length}
                      </span>
                    </button>
                  )
                })}
                {meetings.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-300">
                    Пока нет ни одного заседания. Создайте новое.
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Настройки заседания" className="lg:col-span-2">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    label="Код (например, 262)"
                    value={meetingForm.code}
                    onChangeValue={(value) => handleMeetingFormChange('code', value)}
                    required
                  />
                  <TextField
                    label="Название (RU)"
                    value={meetingForm.titleRu}
                    onChangeValue={(value) => handleMeetingFormChange('titleRu', value)}
                    required
                  />
                  <TextField
                    label="Название (KK)"
                    value={meetingForm.titleKk}
                    onChangeValue={(value) => handleMeetingFormChange('titleKk', value)}
                    required
                  />
                  <TextField
                    label="Название (EN)"
                    value={meetingForm.titleEn}
                    onChangeValue={(value) => handleMeetingFormChange('titleEn', value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextareaField
                    label="Краткий обзор (RU)"
                    value={meetingForm.summaryRu}
                    onChangeValue={(value) => handleMeetingFormChange('summaryRu', value)}
                    rows={4}
                  />
                  <TextareaField
                    label="Краткий обзор (KK)"
                    value={meetingForm.summaryKk}
                    onChangeValue={(value) => handleMeetingFormChange('summaryKk', value)}
                    rows={4}
                  />
                  <TextareaField
                    label="Краткий обзор (EN)"
                    value={meetingForm.summaryEn}
                    onChangeValue={(value) => handleMeetingFormChange('summaryEn', value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextareaField
                    label="Развёрнутый обзор (RU)"
                    value={meetingForm.overviewRu}
                    onChangeValue={(value) => handleMeetingFormChange('overviewRu', value)}
                    rows={6}
                  />
                  <TextareaField
                    label="Развёрнутый обзор (KK)"
                    value={meetingForm.overviewKk}
                    onChangeValue={(value) => handleMeetingFormChange('overviewKk', value)}
                    rows={6}
                  />
                  <TextareaField
                    label="Развёрнутый обзор (EN)"
                    value={meetingForm.overviewEn}
                    onChangeValue={(value) => handleMeetingFormChange('overviewEn', value)}
                    rows={6}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleSaveMeeting}
                    disabled={isSavingMeeting}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d7a13a] text-white text-sm hover:bg-[#c18c28]',
                      isSavingMeeting && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    {isSavingMeeting ? 'Сохранение...' : 'Сохранить заседание'}
                  </button>
                  {meetingForm.id && (
                    <button
                      onClick={() => handleDeleteMeeting(meetingForm.id!)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Удалить заседание
                    </button>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {selectedMeeting && !isLoading && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Вопросы заседания">
              <div className="space-y-3">
                <button
                  onClick={() => handleEditQuestion(selectedMeeting)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#d7a13a] text-white text-sm hover:bg-[#c18c28]"
                >
                  Добавить вопрос
                </button>

                <div className="space-y-3">
                  {sortedQuestions.map((question, index) => {
                    const decision = getLocalizedDecisionLabel(question, language)

                    return (
                      <motion.div
                        key={question.id}
                        layout
                        className="border border-gray-200 dark:border-[#333333] rounded-xl p-4 bg-white dark:bg-[#1f1f1f]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Вопрос {question.number}
                            </p>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                              {getLocalizedQuestionTitle(question, language)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex divide-x divide-gray-200 overflow-hidden rounded-lg border border-gray-200 dark:border-[#333333]">
                              <button
                                onClick={() => handleMoveQuestion(selectedMeeting, question.id, 'up')}
                                disabled={index === 0}
                                className={cn(
                                  'px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed',
                                  'transition'
                                )}
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => handleMoveQuestion(selectedMeeting, question.id, 'down')}
                                disabled={index === sortedQuestions.length - 1}
                                className={cn(
                                  'px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed',
                                  'transition'
                                )}
                              >
                                ↓
                              </button>
                            </div>
                            <button
                              onClick={() => handleEditQuestion(selectedMeeting, question.id)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#333333] text-gray-600 hover:border-[#d7a13a] hover:text-[#d7a13a]"
                            >
                              Редактировать
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(selectedMeeting.id, question.id)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              Удалить
                            </button>
                          </div>
                        </div>

                        {decision && (
                          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                            Метка решения: {decision}
                          </p>
                        )}

                        {question.triggerPhrases.length > 0 && (
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Триггеры: {question.triggerPhrases.join(', ')}
                          </p>
                        )}

                        <p className="mt-3 text-xs text-gray-600 dark:text-gray-300 line-clamp-3">
                          {question.collapsedTextRu || question.collapsedTextEn || question.collapsedTextKk}
                        </p>
                      </motion.div>
                    )
                  })}

                  {sortedQuestions.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-300">
                      Для этого заседания пока нет вопросов.
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>

            {questionForm && (
              <SectionCard title={questionForm.id ? 'Редактирование вопроса' : 'Новый вопрос'}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <TextField
                      label="Номер"
                      value={questionForm.number}
                      onChangeValue={(value) => handleQuestionFormChange('number', value)}
                      type="number"
                      min={1}
                      required
                    />
                    <TextField
                      label="Метка решения (RU)"
                      value={questionForm.decisionLabelRu}
                      onChangeValue={(value) => handleQuestionFormChange('decisionLabelRu', value)}
                    />
                    <TextField
                      label="Метка решения (KK)"
                      value={questionForm.decisionLabelKk}
                      onChangeValue={(value) => handleQuestionFormChange('decisionLabelKk', value)}
                    />
                    <TextField
                      label="Метка решения (EN)"
                      value={questionForm.decisionLabelEn}
                      onChangeValue={(value) => handleQuestionFormChange('decisionLabelEn', value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <TextField
                      label="Заголовок (RU)"
                      value={questionForm.titleRu}
                      onChangeValue={(value) => handleQuestionFormChange('titleRu', value)}
                      required
                    />
                    <TextField
                      label="Заголовок (KK)"
                      value={questionForm.titleKk}
                      onChangeValue={(value) => handleQuestionFormChange('titleKk', value)}
                      required
                    />
                    <TextField
                      label="Заголовок (EN)"
                      value={questionForm.titleEn}
                      onChangeValue={(value) => handleQuestionFormChange('titleEn', value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <TextareaField
                      label="Краткое заключение (RU)"
                      value={questionForm.collapsedTextRu}
                      onChangeValue={(value) => handleQuestionFormChange('collapsedTextRu', value)}
                      rows={4}
                      required
                      placeholder="Краткое описание решения по вопросу"
                    />
                    <TextareaField
                      label="Краткое заключение (KK)"
                      value={questionForm.collapsedTextKk}
                      onChangeValue={(value) => handleQuestionFormChange('collapsedTextKk', value)}
                      rows={4}
                      required
                      placeholder="Сұрақ бойынша шешімнің қысқаша сипаттамасы"
                    />
                    <TextareaField
                      label="Краткое заключение (EN)"
                      value={questionForm.collapsedTextEn}
                      onChangeValue={(value) => handleQuestionFormChange('collapsedTextEn', value)}
                      rows={4}
                      required
                      placeholder="Brief description of the decision"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <TextareaField
                      label="Обоснование (RU)"
                      value={questionForm.expandedTextRu}
                      onChangeValue={(value) => handleQuestionFormChange('expandedTextRu', value)}
                      rows={6}
                      placeholder="Развернутое обоснование решения с деталями"
                    />
                    <TextareaField
                      label="Обоснование (KK)"
                      value={questionForm.expandedTextKk}
                      onChangeValue={(value) => handleQuestionFormChange('expandedTextKk', value)}
                      rows={6}
                      placeholder="Егжей-тегжейлі түсініктеме"
                    />
                    <TextareaField
                      label="Обоснование (EN)"
                      value={questionForm.expandedTextEn}
                      onChangeValue={(value) => handleQuestionFormChange('expandedTextEn', value)}
                      rows={6}
                      placeholder="Detailed justification of the decision"
                    />
                  </div>

                  <TextareaField
                    label="Триггерные фразы (через запятую)"
                    value={questionForm.triggerPhrases}
                    onChangeValue={(value) => handleQuestionFormChange('triggerPhrases', value)}
                    rows={3}
                    placeholder="например: вопрос 1 заседания 262, решение по первому вопросу"
                  />

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleSaveQuestion}
                      disabled={isSavingQuestion}
                      className={cn(
                        'inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d7a13a] text-white text-sm hover:bg-[#c18c28]',
                        isSavingQuestion && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      {isSavingQuestion ? 'Сохранение...' : 'Сохранить вопрос'}
                    </button>
                    <button
                      onClick={() => setQuestionForm(null)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#333333] text-sm text-gray-600 dark:text-gray-200 hover:border-[#d7a13a] hover:text-[#d7a13a]"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </SectionCard>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  )
}

interface SectionCardProps {
  title: string
  className?: string
  children: ReactNode
}

function SectionCard({ title, className, children }: SectionCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1f1f1f] p-6 shadow-sm',
        className
      )}
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  label: string
  value: string
  onChangeValue: (value: string) => void
  type?: 'text' | 'number' | 'email' | 'url'
}

function TextField({ label, value, onChangeValue, className, type = 'text', ...rest }: TextFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChangeValue(event.target.value)}
        className={cn(
          'rounded-xl border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1f1f1f] px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-[#d7a13a] focus:outline-none focus:ring-2 focus:ring-[#d7a13a]/40',
          className
        )}
        {...rest}
      />
    </label>
  )
}

interface TextareaFieldProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  label: string
  value: string
  onChangeValue: (value: string) => void
}

function TextareaField({ label, value, onChangeValue, className, rows = 4, ...rest }: TextareaFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChangeValue(event.target.value)}
        rows={rows}
        className={cn(
          'rounded-xl border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1f1f1f] px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-[#d7a13a] focus:outline-none focus:ring-2 focus:ring-[#d7a13a]/40',
          'resize-none',
          className
        )}
        {...rest}
      />
    </label>
  )
}