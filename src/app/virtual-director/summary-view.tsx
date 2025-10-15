'use client'

import MarkdownRender from '@/components/markdown-render'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useLanguage } from '@/contexts/language-context'

interface SummaryViewProps {
  summary: string
}

// Ключевые слова для разных языков
const SECTION_KEYWORDS = {
  ru: {
    agenda: 'ПУНКТ ПОВЕСТКИ ДНЯ',
    decision: 'РЕШЕНИЕ НЕЗАВИСИМОГО ЧЛЕНА СД',
    briefConclusion: 'КРАТКОЕ ЗАКЛЮЧЕНИЕ',
    justification: 'ОБОСНОВАНИЕ',
    // Варианты написания решения
    decisionVariants: ['ЗА', 'ПРОТИВ', 'ВОЗДЕРЖАЛСЯ'],
  },
  kk: {
    agenda: 'КҮН ТӘРТІБІНІҢ ТАРМАҒЫ',
    decision: 'ДК ТӘУЕЛСІЗ МҮШЕСІНІҢ ШЕШІМІ',
    briefConclusion: 'ҚЫСҚАША ҚОРЫТЫНДЫ',
    justification: 'НЕГІЗДЕМЕ',
    decisionVariants: ['ЖАҚ', 'ҚАРСЫ', 'БЕЙТАРАП ҚАЛДЫ'],
  },
  en: {
    agenda: 'AGENDA ITEM',
    decision: 'DECISION OF INDEPENDENT BOARD MEMBER',
    briefConclusion: 'BRIEF CONCLUSION',
    justification: 'JUSTIFICATION',
    decisionVariants: ['FOR', 'AGAINST', 'ABSTAINED'],
  },
}

export function SummaryView({ summary }: SummaryViewProps) {
  const { language } = useLanguage()
  const keywords = SECTION_KEYWORDS[language as keyof typeof SECTION_KEYWORDS] || SECTION_KEYWORDS.ru
  
  const summaryText = summary ?? ''
  if (!summaryText.trim()) {
    return (
      <div className="rounded-2xl border border-[#ebeefa] dark:border-[#d7a13a]/30 bg-[#fdfdff] dark:bg-[#333333] p-6 text-sm text-slate-500 dark:text-gray-400">Данные отсутствуют</div>
    )
  }

  const lines = summaryText.split('\n')
  
  // Создаём регулярное выражение с ключевыми словами текущего языка
  const sectionPattern = [
    keywords.agenda,
    keywords.decision,
    keywords.briefConclusion,
    keywords.justification
  ].join('|').replace(/\s+/g, '\\s+') // Учитываем возможные пробелы
  
  const sectionRegex = new RegExp(`^\\*\\*(${sectionPattern}):\\*\\*`, 'i')

  const sections: Record<string, string[]> = {}
  let current: string | null = null

  for (const line of lines) {
    const match = line.match(sectionRegex)
    if (match) {
      // Нормализуем ключ (убираем лишние пробелы и приводим к верхнему регистру)
      current = match[1].trim().toUpperCase().replace(/\s+/g, ' ')
      sections[current] = []
      const remainder = line.replace(sectionRegex, '').trim()
      if (remainder) sections[current].push(remainder)
      continue
    }
    if (current) {
      sections[current].push(line)
    }
  }

  // Функция для получения секции по любому варианту ключевого слова
  const getSection = (key: string) => {
    const normalizedKey = key.trim().toUpperCase().replace(/\s+/g, ' ')
    return (sections[normalizedKey] || []).join('\n').trim()
  }
  
  const blocks: JSX.Element[] = []

  // Переводы для UI (заголовки блоков)
  const uiLabels = {
    ru: {
      agenda: 'Пункт повестки дня',
      decision: 'Голосую',
      briefConclusion: 'Краткое заключение',
      justification: 'Обоснование',
    },
    kk: {
      agenda: 'Күн тәртібінің тармағы',
      decision: 'ШЕШІМ',
      briefConclusion: 'Қысқаша қорытынды',
      justification: 'Негіздеме',
    },
    en: {
      agenda: 'Agenda Item',
      decision: 'DECISION',
      briefConclusion: 'Brief Conclusion',
      justification: 'Justification',
    },
  }
  
  const labels = uiLabels[language as keyof typeof uiLabels] || uiLabels.ru

  const agenda = getSection(keywords.agenda)
  if (agenda) {
    blocks.push(
      <div key="agenda" className="rounded-2xl border border-[#d0dcff] dark:border-[#d7a13a]/30 bg-[#eef2ff] dark:bg-[#333333] px-5 py-4">
        <div className="text-sm font-semibold uppercase tracking-wide text-[#5b6cc8] dark:text-[#d7a13a]">{labels.agenda}</div>
        <p className="mt-2 text-sm leading-relaxed text-[#3c4470] dark:text-gray-300">{agenda}</p>
      </div>
    )
  }

  const decisionRaw = getSection(keywords.decision)
  if (decisionRaw) {
    const decision = decisionRaw.split(/\s+/)[0]?.toUpperCase() || decisionRaw.toUpperCase()
    // Проверяем, является ли решение положительным (ЗА/ЖАҚ/FOR)
    const isPositive = keywords.decisionVariants[0] && decision.includes(keywords.decisionVariants[0])
    blocks.push(
      <div
        key="decision"
        className={`rounded-2xl border px-5 py-4 text-sm font-semibold ${
          isPositive
            ? 'border-[#cde4d4] dark:border-[#d7a13a]/50 bg-[#f2fbf5] dark:bg-[#2a4a2a] text-[#327a4f] dark:text-[#d7a13a]'
            : 'border-[#f3d2d2] dark:border-red-500/50 bg-[#fff5f5] dark:bg-[#4a2a2a] text-[#c14a4a] dark:text-red-400'
        }`}
      >
        {labels.decision}: {decision}
      </div>
    )
  }

  const shortSummary = getSection(keywords.briefConclusion)
  if (shortSummary) {
    blocks.push(
      <div key="short-summary" className="rounded-2xl border border-[#f2e4c7] dark:border-[#d7a13a]/30 bg-[#fff9ef] dark:bg-[#333333] px-5 py-4">
        <div className="text-sm font-semibold uppercase tracking-wide text-[#c28d2d] dark:text-[#d7a13a]">{labels.briefConclusion}</div>
        <div className="prose prose-sm mt-2 max-w-none text-[#5d5438] dark:text-gray-300">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {shortSummary}
          </ReactMarkdown>
        </div>
      </div>
    )
  }

  const justification = getSection(keywords.justification)
  if (justification) {
    blocks.push(
      <div key="justification" className="rounded-2xl border border-[#e2e5f2] dark:border-[#d7a13a]/30 bg-[#f8f9ff] dark:bg-[#333333] px-5 py-4">
        <div className="text-sm font-semibold uppercase tracking-wide text-[#7b84a7] dark:text-[#d7a13a]">{labels.justification}</div>
        <div className="prose prose-sm mt-2 max-w-none text-[#4a5170] dark:text-gray-300">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {justification}
          </ReactMarkdown>
        </div>
      </div>
    )
  }

  if (!blocks.length) {
    return (
      <div className="rounded-2xl border border-[#ebeefa] dark:border-[#d7a13a]/30 bg-[#fdfdff] dark:bg-[#333333] p-6 text-sm text-slate-600 dark:text-gray-300">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {summaryText}
        </ReactMarkdown>
      </div>
    )
  }

  return <div className="space-y-4">{blocks}</div>
}