'use client'

import MarkdownRender from '@/components/markdown-render'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface SummaryViewProps {
  summary: string
}

export function SummaryView({ summary }: SummaryViewProps) {
  const summaryText = summary ?? ''
  if (!summaryText.trim()) {
    return (
      <div className="rounded-2xl border border-[#ebeefa] dark:border-[#d7a13a]/30 bg-[#fdfdff] dark:bg-[#333333] p-6 text-sm text-slate-500 dark:text-gray-400">Данные отсутствуют</div>
    )
  }

  const lines = summaryText.split('\n')
  const sectionRegex = /^\*\*(ПУНКТ ПОВЕСТКИ ДНЯ|РЕШЕНИЕ НЕЗАВИСИМОГО ЧЛЕНА СД|КРАТКОЕ ЗАКЛЮЧЕНИЕ|ОБОСНОВАНИЕ):\*\*/

  const sections: Record<string, string[]> = {}
  let current: string | null = null

  for (const line of lines) {
    const match = line.match(sectionRegex)
    if (match) {
      current = match[1]
      sections[current] = []
      const remainder = line.replace(sectionRegex, '').trim()
      if (remainder) sections[current].push(remainder)
      continue
    }
    if (current) {
      sections[current].push(line)
    }
  }

  const getSection = (key: string) => (sections[key] || []).join('\n').trim()
  const blocks: JSX.Element[] = []

  const agenda = getSection('ПУНКТ ПОВЕСТКИ ДНЯ')
  if (agenda) {
    blocks.push(
      <div key="agenda" className="rounded-2xl border border-[#d0dcff] dark:border-[#d7a13a]/30 bg-[#eef2ff] dark:bg-[#333333] px-5 py-4">
        <div className="text-sm font-semibold uppercase tracking-wide text-[#5b6cc8] dark:text-[#d7a13a]">Пункт повестки дня</div>
        <p className="mt-2 text-sm leading-relaxed text-[#3c4470] dark:text-gray-300">{agenda}</p>
      </div>
    )
  }

  const decisionRaw = getSection('РЕШЕНИЕ НЕЗАВИСИМОГО ЧЛЕНА СД')
  if (decisionRaw) {
    const decision = decisionRaw.split(/\s+/)[0]?.toUpperCase() || decisionRaw.toUpperCase()
    const isPositive = decision.includes('ЗА')
    blocks.push(
      <div
        key="decision"
        className={`rounded-2xl border px-5 py-4 text-sm font-semibold ${
          isPositive
            ? 'border-[#cde4d4] dark:border-[#d7a13a]/50 bg-[#f2fbf5] dark:bg-[#2a4a2a] text-[#327a4f] dark:text-[#d7a13a]'
            : 'border-[#f3d2d2] dark:border-red-500/50 bg-[#fff5f5] dark:bg-[#4a2a2a] text-[#c14a4a] dark:text-red-400'
        }`}
      >
        РЕШЕНИЕ: {decision}
      </div>
    )
  }

  const shortSummary = getSection('КРАТКОЕ ЗАКЛЮЧЕНИЕ')
  if (shortSummary) {
    blocks.push(
      <div key="short-summary" className="rounded-2xl border border-[#f2e4c7] dark:border-[#d7a13a]/30 bg-[#fff9ef] dark:bg-[#333333] px-5 py-4">
        <div className="text-sm font-semibold uppercase tracking-wide text-[#c28d2d] dark:text-[#d7a13a]">Краткое заключение</div>
        <div className="prose prose-sm mt-2 max-w-none text-[#5d5438] dark:text-gray-300">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {shortSummary}
          </ReactMarkdown>
        </div>
      </div>
    )
  }

  const justification = getSection('ОБОСНОВАНИЕ')
  if (justification) {
    blocks.push(
      <div key="justification" className="rounded-2xl border border-[#e2e5f2] dark:border-[#d7a13a]/30 bg-[#f8f9ff] dark:bg-[#333333] px-5 py-4">
        <div className="text-sm font-semibold uppercase tracking-wide text-[#7b84a7] dark:text-[#d7a13a]">Обоснование</div>
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