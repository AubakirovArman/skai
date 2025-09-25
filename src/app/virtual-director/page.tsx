'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import * as mammoth from 'mammoth'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import imageMain from '../../../image_main.png'

interface AnalysisResult {
  vnd: string
  np: string
  summary: string
  fileName?: string
  timestamp?: Date
}

const STORAGE_KEY = 'virtual-director-analysis-history'

export default function VirtualDirectorPage() {
  const [file, setFile] = useState<File | null>(null)
  const [content, setContent] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'vnd' | 'np'>('summary')
  const [analysisStep, setAnalysisStep] = useState<'upload' | 'processing' | 'vnd' | 'np' | 'summary' | 'complete'>('upload')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Загрузка сохраненного анализа из localStorage при монтировании компонента
  useEffect(() => {
    const savedAnalysis = localStorage.getItem(STORAGE_KEY)
    if (savedAnalysis) {
      try {
        const parsedAnalysis = JSON.parse(savedAnalysis)
        if (parsedAnalysis.timestamp) {
          parsedAnalysis.timestamp = new Date(parsedAnalysis.timestamp)
        }
        setAnalysisResult(parsedAnalysis)
        setAnalysisStep('complete')
      } catch (error) {
        console.error('Ошибка при загрузке сохраненного анализа:', error)
      }
    }
  }, [])

  // Сохранение результата анализа в localStorage
  useEffect(() => {
    if (analysisResult && analysisStep === 'complete') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(analysisResult))
    }
  }, [analysisResult, analysisStep])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      
      // Читаем содержимое файла для предварительного просмотра
      const readFileContent = async () => {
        if (selectedFile.name.toLowerCase().endsWith('.docx')) {
          try {
            const arrayBuffer = await selectedFile.arrayBuffer()
            const result = await mammoth.extractRawText({ arrayBuffer })
            setContent(result.value)
          } catch (error) {
            console.error('Ошибка при чтении DOCX файла:', error)
            // Fallback to regular text reading
            const reader = new FileReader()
            reader.onload = (event) => {
              setContent(event.target?.result as string || '')
            }
            reader.readAsText(selectedFile)
          }
        } else {
          const reader = new FileReader()
          reader.onload = (event) => {
            setContent(event.target?.result as string || '')
          }
          reader.readAsText(selectedFile)
        }
      }
      
      readFileContent()
    }
  }

  const handleAnalyze = async () => {
    if (!file && !content.trim()) {
      alert('Пожалуйста, загрузите файл или введите текст для анализа')
      return
    }

    setAnalysisStep('processing')
    setErrorMessage(null)

    try {
      let documentText = content.trim().length > 0 ? content : ''
      
      // Если текст пуст и есть файл, читаем его содержимое
      if (!documentText && file) {
        if (file.name.toLowerCase().endsWith('.docx')) {
          try {
            const arrayBuffer = await file.arrayBuffer()
            const result = await mammoth.extractRawText({ arrayBuffer })
            documentText = result.value
          } catch (error) {
            console.error('Ошибка при чтении DOCX файла:', error)
            // Fallback to regular text reading
            documentText = await file.text()
          }
        } else {
          documentText = await file.text()
        }
      }

      if (!documentText.trim()) {
        throw new Error('Не удалось получить содержимое документа для анализа')
      }

      const sendRequest = async (url: string, payload: Record<string, unknown>) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        const responseText = await response.text()

        let parsed: unknown
        try {
          parsed = JSON.parse(responseText)
        } catch (parseError) {
          throw new Error('Сервер вернул некорректный ответ')
        }

        const { success, result, error } = parsed as {
          success?: boolean
          result?: string
          error?: string
        }

        if (!response.ok || !success || !result) {
          const message = error || `Сервер вернул статус ${response.status}`
          throw new Error(message)
        }

        return result
      }

      setAnalysisStep('vnd')
      const vndResult = await sendRequest('/api/analyze/vnd', { documentContent: documentText })

      setAnalysisStep('np')
      const npResult = await sendRequest('/api/analyze/np', { documentContent: documentText })

      setAnalysisStep('summary')
      const summaryResult = await sendRequest('/api/analyze/summary', { vndResult, npResult })

      const analysisWithMetadata = {
        vnd: vndResult,
        np: npResult,
        summary: summaryResult,
        fileName: file?.name || 'Текстовый ввод',
        timestamp: new Date()
      }
      setAnalysisResult(analysisWithMetadata)
      setAnalysisStep('complete')
    } catch (error) {
      console.error('Ошибка анализа:', error)
      const message = error instanceof Error ? error.message : 'Произошла ошибка при анализе документа'
      setErrorMessage(message)
      setAnalysisStep('upload')
    }
  }

  const resetAnalysis = () => {
    setFile(null)
    setContent('')
    setAnalysisResult(null)
    setAnalysisStep('upload')
    setErrorMessage(null)
    setActiveTab('summary')
    localStorage.removeItem(STORAGE_KEY)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const clearAnalysisHistory = () => {
    setAnalysisResult(null)
    setAnalysisStep('upload')
    setActiveTab('summary')
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#f8f6f1]">
        <div className="px-6 pb-16 pt-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <motion.header
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="flex w-full flex-wrap items-center gap-6 rounded-2xl border border-[#e4dfd0] bg-white px-6 py-5 shadow-sm"
            >
              <div className="flex min-w-[240px] flex-1 flex-col gap-1 text-left">
                <h1 className="text-2xl font-semibold leading-tight text-[#2a2a33] sm:text-[28px]">
                  Виртуальный член Совета Директоров
                </h1>
              </div>
            </motion.header>

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-[#f1d5d5] bg-[#fff5f5] px-6 py-4 text-sm text-[#c14949]"
              >
                {errorMessage}
              </motion.div>
            )}

            {analysisResult && analysisStep === 'complete' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#ddefe2] bg-[#f6fbf8] px-6 py-4 text-sm text-[#2c6e47]"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#39a56d]"></span>
                  <span>
                    Сохранен анализ: {analysisResult.fileName}
                    {analysisResult.timestamp && (
                      <span className="ml-2 text-[#3b8561]">
                        ({analysisResult.timestamp.toLocaleString('ru-RU')})
                      </span>
                    )}
                  </span>
                </div>
                <button
                  onClick={clearAnalysisHistory}
                  className="text-xs font-medium text-[#c05c5c] transition-colors hover:text-[#a13f3f]"
                >
                  Очистить
                </button>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {analysisStep === 'upload' && (
                <motion.section
                  key="upload"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="rounded-3xl border border-[#e3e6f1] bg-white p-10 shadow-[0_35px_90px_-70px_rgba(15,23,42,0.65)]"
                >
                  <h2 className="text-center text-2xl font-semibold text-slate-900">Загрузка документа для анализа</h2>
                  <div className="mt-10 space-y-8">
                    <div className="rounded-2xl border border-dashed border-[#d4d9eb] bg-[#f9faff] px-6 py-10 text-center transition-colors duration-200 hover:border-[#c5cae3]">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="flex cursor-pointer flex-col items-center gap-4 text-slate-500">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_15px_45px_-30px_rgba(15,23,42,0.4)]">
                          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M7 12l7-7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M23.5 18v3.5A1.5 1.5 0 0 1 22 23h-16a1.5 1.5 0 0 1-1.5-1.5V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-medium text-slate-700">Нажмите для загрузки файла</p>
                          <p className="text-sm text-[#9aa2ba]">Поддерживаются форматы: TXT, DOC, DOCX</p>
                        </div>
                      </label>
                      {file && (
                        <div className="mt-6 rounded-2xl border border-[#dce4ff] bg-[#eef2ff] px-4 py-3 text-left text-sm text-[#445089]">
                          <p className="font-medium">{file.name}</p>
                          <p className="text-xs text-[#707aa6]">{(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                      )}
                    </div>

                    <div className="text-center text-sm font-medium uppercase tracking-[0.4em] text-[#c3c7d7]">или</div>

                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-slate-600">
                        Введите текст документа:
                      </label>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="h-40 w-full resize-none rounded-2xl border border-[#d5d9eb] bg-[#fdfdff] px-4 py-4 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition focus:border-[#c1c7e5] focus:ring-2 focus:ring-[#e4e7f6]"
                        placeholder="Введите название темы и пояснительную записку..."
                      />
                    </div>

                    <motion.button
                      onClick={handleAnalyze}
                      disabled={!file && !content.trim()}
                      className="w-full rounded-2xl bg-[#f3d9a6] px-6 py-3 text-base font-semibold text-[#6c4d1d] shadow-[0_20px_45px_-30px_rgba(215,161,58,0.85)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#eccf97] disabled:cursor-not-allowed disabled:opacity-60"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      Начать анализ
                    </motion.button>
                  </div>
                </motion.section>
              )}

              {(analysisStep === 'processing' || analysisStep === 'vnd' || analysisStep === 'np' || analysisStep === 'summary') && (
                <motion.section
                  key="processing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="rounded-3xl border border-[#e3e6f1] bg-white p-10 shadow-[0_35px_90px_-70px_rgba(15,23,42,0.65)]"
                >
                  <h2 className="text-center text-2xl font-semibold text-slate-900">Процесс анализа документа</h2>
                  <div className="mt-10 space-y-7">
                    <StepRow
                      title="Подготовка к анализу"
                      active={analysisStep === 'processing'}
                      done={analysisStep !== 'processing'}
                    />
                    <StepRow
                      title="Анализ ВНД (Внутренние нормативные документы)"
                      active={analysisStep === 'vnd'}
                      done={analysisStep === 'np' || analysisStep === 'summary'}
                      idle={analysisStep === 'processing'}
                    />
                    <StepRow
                      title="Анализ НПА (Нормативные правовые акты)"
                      active={analysisStep === 'np'}
                      done={analysisStep === 'summary'}
                      idle={analysisStep === 'processing' || analysisStep === 'vnd'}
                    />
                    <StepRow
                      title="Формирование итогового заключения"
                      active={analysisStep === 'summary'}
                      idle={analysisStep === 'processing' || analysisStep === 'vnd' || analysisStep === 'np'}
                    />
                  </div>
                </motion.section>
              )}

              {analysisStep === 'complete' && analysisResult && (
                <motion.section
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="rounded-3xl border border-[#e3e6f1] bg-white p-10 shadow-[0_35px_90px_-70px_rgba(15,23,42,0.65)]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-900">Результаты анализа</h2>
                      <p className="text-sm text-slate-500">Выберите вкладку, чтобы посмотреть детали.</p>
                    </div>
                    <button
                      onClick={resetAnalysis}
                      className="self-start rounded-xl border border-[#d5d9eb] bg-[#f6f7fb] px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-[#c8cce4] hover:bg-[#eef0fb]"
                    >
                      Новый анализ
                    </button>
                  </div>

                  <div className="mt-8 border-b border-[#e5e7f2]">
                    <nav className="flex flex-wrap gap-4">
                      {[
                        { id: 'summary' as const, label: 'Итоговое заключение' },
                        { id: 'vnd' as const, label: 'Анализ ВНД' },
                        { id: 'np' as const, label: 'Анализ НПА' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`relative pb-3 text-sm font-medium transition-colors ${
                            activeTab === tab.id
                              ? 'text-[#d7a13a]'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {tab.label}
                          {activeTab === tab.id && (
                            <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#d7a13a]"></span>
                          )}
                        </button>
                      ))}
                    </nav>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.25 }}
                      className="mt-8 space-y-6"
                    >
                      {activeTab === 'summary' && (
                        <SummaryView summary={analysisResult.summary} />
                      )}

                      {activeTab === 'vnd' && (
                        <div className="rounded-2xl border border-[#dbe0f2] bg-[#f8faff] p-6">
                          <h3 className="text-lg font-semibold text-slate-900">Анализ ВНД</h3>
                          <div className="prose prose-sm mt-4 max-w-none text-slate-700">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {analysisResult.vnd || ''}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {activeTab === 'np' && (
                        <div className="rounded-2xl border border-[#e2e5f2] bg-[#fafbff] p-6">
                          <h3 className="text-lg font-semibold text-slate-900">Анализ НПА</h3>
                          <div className="prose prose-sm mt-4 max-w-none text-slate-700">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {analysisResult.np || ''}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.section>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>
    </AuthGuard>
  )
}

function StepRow({
  title,
  active,
  done,
  idle,
}: {
  title: string
  active?: boolean
  done?: boolean
  idle?: boolean
}) {
  const stateClass = done
    ? 'bg-[#e8f8ef] border-[#c8ead8] text-[#317a50]'
    : active
      ? 'bg-[#f0f5ff] border-[#c5d4ff] text-[#3755a5]'
      : idle
        ? 'bg-[#f7f8fc] border-[#e5e8f4] text-[#a1a8c2]'
        : 'bg-[#f9fafe] border-[#e4e7f5] text-[#7a819b]'

  return (
    <div className={`flex items-center gap-4 rounded-2xl border px-5 py-4 text-sm font-medium transition ${stateClass}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-[0_10px_25px_-20px_rgba(15,23,42,0.55)]">
        {done ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12.5L9.5 17L19 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : active ? (
          <span className="relative inline-flex h-3 w-3 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current"></span>
          </span>
        ) : (
          <span className="text-xs font-semibold tracking-wide text-current">•</span>
        )}
      </span>
      <span className="leading-snug text-slate-600">{title}</span>
    </div>
  )
}

function SummaryView({ summary }: { summary: string }) {
  const summaryText = summary ?? ''
  if (!summaryText.trim()) {
    return <div className="rounded-2xl border border-[#ebeefa] bg-[#fdfdff] p-6 text-sm text-slate-500">Данные отсутствуют</div>
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
      <div key="agenda" className="rounded-2xl border border-[#d0dcff] bg-[#eef2ff] px-5 py-4">
        <div className="text-sm font-semibold uppercase tracking-wide text-[#5b6cc8]">Пункт повестки дня</div>
        <p className="mt-2 text-sm leading-relaxed text-[#3c4470]">{agenda}</p>
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
            ? 'border-[#cde4d4] bg-[#f2fbf5] text-[#327a4f]'
            : 'border-[#f3d2d2] bg-[#fff5f5] text-[#c14a4a]'
        }`}
      >
        РЕШЕНИЕ: {decision}
      </div>
    )
  }

  const shortSummary = getSection('КРАТКОЕ ЗАКЛЮЧЕНИЕ')
  if (shortSummary) {
    blocks.push(
      <div key="short-summary" className="rounded-2xl border border-[#f2e4c7] bg-[#fff9ef] px-5 py-4">
        <div className="text-sm font-semibold uppercase tracking-wide text-[#c28d2d]">Краткое заключение</div>
        <div className="prose prose-sm mt-2 max-w-none text-[#5d5438]">
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
      <div key="justification" className="rounded-2xl border border-[#e2e5f2] bg-[#f8f9ff] px-5 py-4">
        <div className="text-sm font-semibold uppercase tracking-wide text-[#7b84a7]">Обоснование</div>
        <div className="prose prose-sm mt-2 max-w-none text-[#4a5170]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {justification}
          </ReactMarkdown>
        </div>
      </div>
    )
  }

  if (!blocks.length) {
    return (
      <div className="rounded-2xl border border-[#ebeefa] bg-[#fdfdff] p-6 text-sm text-slate-600">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {summaryText}
        </ReactMarkdown>
      </div>
    )
  }

  return <div className="space-y-4">{blocks}</div>
}