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
      <main className="min-h-screen bg-[#f8f6f1] dark:bg-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-6 sm:pt-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8">
            <motion.header
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="flex w-full flex-wrap items-center gap-4 sm:gap-6 rounded-2xl border border-[#e4dfd0] dark:border-[#d7a13a]/30 bg-white dark:bg-[#2a2a2a] px-4 sm:px-6 py-4 sm:py-5 shadow-sm dark:shadow-[0_25px_80px_-60px_rgba(215,161,58,0.2)]"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                <h1 className="text-xl sm:text-2xl lg:text-[28px] font-semibold leading-tight text-[#2a2a33] dark:text-white">
                  Виртуальный член Совета Директоров
                </h1>
              </div>
            </motion.header>

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-red-200 dark:border-[#d7a13a]/50 bg-red-50 dark:bg-[#2a2a2a] px-4 sm:px-6 py-3 sm:py-4 text-sm text-red-700 dark:text-[#d7a13a]"
              >
                {errorMessage}
              </motion.div>
            )}

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-[#f1d5d5] dark:border-red-800 bg-[#fff5f5] dark:bg-red-900/20 px-4 sm:px-6 py-3 sm:py-4 text-sm text-[#c14949] dark:text-red-300"
              >
                {errorMessage}
              </motion.div>
            )}

            {analysisResult && analysisStep === 'complete' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-2xl border border-[#ddefe2] dark:border-[#d7a13a]/50 bg-[#f6fbf8] dark:bg-[#2a2a2a] px-4 sm:px-6 py-3 sm:py-4 text-sm text-[#2c6e47] dark:text-[#d7a13a]"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#39a56d] dark:bg-[#d7a13a] flex-shrink-0"></span>
                  <span className="min-w-0">
                    Сохранен анализ: {analysisResult.fileName}
                    {analysisResult.timestamp && (
                      <span className="ml-2 text-[#3b8561] dark:text-green-400 block sm:inline">
                        ({analysisResult.timestamp.toLocaleString('ru-RU')})
                      </span>
                    )}
                  </span>
                </div>
                <button
                  onClick={clearAnalysisHistory}
                  className="text-xs font-medium text-[#c05c5c] dark:text-red-400 transition-colors hover:text-[#a13f3f] dark:hover:text-red-300 flex-shrink-0 self-start sm:self-auto"
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
                  className="rounded-3xl border border-[#e3e6f1] dark:border-[#d7a13a]/30 bg-white dark:bg-[#2a2a2a] p-6 sm:p-10 shadow-[0_35px_90px_-70px_rgba(15,23,42,0.65)] dark:shadow-[0_35px_90px_-70px_rgba(215,161,58,0.3)]"
                >
                  <h2 className="text-center text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">Загрузка документа для анализа</h2>
                  <div className="mt-6 sm:mt-10 space-y-6 sm:space-y-8">
                    <div className="rounded-2xl border border-dashed border-[#d4d9eb] dark:border-[#d7a13a]/50 bg-[#f9faff] dark:bg-[#333333] px-4 sm:px-6 py-8 sm:py-10 text-center transition-colors duration-200 hover:border-[#c5cae3] dark:hover:border-[#d7a13a]">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="flex cursor-pointer flex-col items-center gap-3 sm:gap-4 text-slate-500 dark:text-gray-400">
                        <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white dark:bg-[#d7a13a] shadow-[0_15px_45px_-30px_rgba(15,23,42,0.4)] dark:shadow-[0_15px_45px_-30px_rgba(215,161,58,0.4)]">
                          <svg width="24" height="24" className="sm:w-7 sm:h-7" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M7 12l7-7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M23.5 18v3.5A1.5 1.5 0 0 1 22 23h-16a1.5 1.5 0 0 1-1.5-1.5V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <p className="text-base sm:text-lg font-medium text-slate-700 dark:text-gray-300">Нажмите для загрузки файла</p>
                          <p className="text-sm text-[#9aa2ba] dark:text-gray-500">Поддерживаются форматы: TXT, DOC, DOCX</p>
                        </div>
                      </label>
                      {file && (
                        <div className="mt-4 sm:mt-6 rounded-2xl border border-[#dce4ff] dark:border-[#d7a13a]/50 bg-[#eef2ff] dark:bg-[#333333] px-3 sm:px-4 py-2 sm:py-3 text-left text-sm text-[#445089] dark:text-[#d7a13a]">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-xs text-[#707aa6] dark:text-[#d7a13a]/70">{(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                      )}
                    </div>

                    <div className="text-center text-xs sm:text-sm font-medium uppercase tracking-[0.4em] text-[#c3c7d7] dark:text-gray-500">или</div>

                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-slate-600 dark:text-gray-300">
                        Введите текст документа:
                      </label>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="h-32 sm:h-40 w-full resize-none rounded-2xl border border-[#d5d9eb] dark:border-[#d7a13a]/50 bg-[#fdfdff] dark:bg-[#333333] px-3 sm:px-4 py-3 sm:py-4 text-sm text-slate-700 dark:text-gray-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_rgba(215,161,58,0.1)] outline-none transition focus:border-[#c1c7e5] dark:focus:border-[#d7a13a] focus:ring-2 focus:ring-[#e4e7f6] dark:focus:ring-[#d7a13a]/20"
                        placeholder="Введите название темы и пояснительную записку..."
                      />
                    </div>

                    <motion.button
                      onClick={handleAnalyze}
                      disabled={!file && !content.trim()}
                      className="w-full rounded-2xl bg-[#f3d9a6] dark:bg-[#d7a13a] px-6 py-4 text-base font-semibold text-[#6c4d1d] dark:text-white shadow-[0_20px_45px_-30px_rgba(215,161,58,0.85)] dark:shadow-[0_20px_45px_-30px_rgba(215,161,58,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#eccf97] dark:hover:bg-[#c8921f] disabled:cursor-not-allowed disabled:opacity-60 min-h-[48px]"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      Начать анализ
                    </motion.button>

                    {errorMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300"
                      >
                        {errorMessage}
                      </motion.div>
                    )}
                  </div>
                </motion.section>
              )}

              {(analysisStep === 'processing' || analysisStep === 'vnd' || analysisStep === 'np' || analysisStep === 'summary') && (
                <motion.section
                  key="processing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="rounded-3xl border border-[#e3e6f1] dark:border-[#d7a13a]/30 bg-white dark:bg-[#2a2a2a] p-6 sm:p-10 shadow-[0_35px_90px_-70px_rgba(15,23,42,0.65)] dark:shadow-[0_35px_90px_-70px_rgba(215,161,58,0.3)]"
                >
                  <h2 className="text-center text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">Процесс анализа документа</h2>
                  <div className="mt-6 sm:mt-10 space-y-5 sm:space-y-7">
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
                  className="rounded-3xl border border-[#e3e6f1] dark:border-[#d7a13a]/30 bg-white dark:bg-[#2a2a2a] p-6 sm:p-10 shadow-[0_35px_90px_-70px_rgba(15,23,42,0.65)] dark:shadow-[0_35px_90px_-70px_rgba(215,161,58,0.3)]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                    <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">Результаты анализа</h2>
                    <button
                      onClick={resetAnalysis}
                      className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-[#333333] rounded-lg hover:bg-slate-200 dark:hover:bg-[#404040] transition-colors self-start sm:self-auto"
                    >
                      Новый анализ
                    </button>
                  </div>

                  <div className="mt-6 sm:mt-8 border-b border-[#e5e7f2] dark:border-[#d7a13a]/30">
                    <nav className="flex flex-wrap gap-2 sm:gap-4 -mb-px">
                      {[
                        { id: 'summary' as const, label: 'Итоговое заключение' },
                        { id: 'vnd' as const, label: 'Анализ ВНД' },
                        { id: 'np' as const, label: 'Анализ НПА' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`relative pb-3 px-1 text-sm font-medium transition-colors min-h-[44px] flex items-center ${
                            activeTab === tab.id
                              ? 'text-[#d7a13a]'
                              : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300'
                          }`}
                        >
                          <span className="whitespace-nowrap">{tab.label}</span>
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
                      className="mt-6 sm:mt-8 space-y-6"
                    >
                      {activeTab === 'summary' && (
                        <SummaryView summary={analysisResult.summary} />
                      )}

                      {activeTab === 'vnd' && (
                        <div className="rounded-2xl border border-[#dbe0f2] dark:border-[#d7a13a]/30 bg-[#f8faff] dark:bg-[#333333] p-4 sm:p-6">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Анализ ВНД</h3>
                          <div className="prose prose-sm mt-4 max-w-none text-slate-700 dark:text-gray-300 overflow-x-auto">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {analysisResult.vnd || ''}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {activeTab === 'np' && (
                        <div className="rounded-2xl border border-[#e2e5f2] dark:border-[#d7a13a]/30 bg-[#fafbff] dark:bg-[#333333] p-4 sm:p-6">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Анализ НПА</h3>
                          <div className="prose prose-sm mt-4 max-w-none text-slate-700 dark:text-gray-300 overflow-x-auto">
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
    ? 'bg-[#e8f8ef] dark:bg-green-900/30 border-[#c8ead8] dark:border-green-700 text-[#317a50] dark:text-green-300'
    : active
      ? 'bg-[#f0f5ff] dark:bg-blue-900/30 border-[#c5d4ff] dark:border-blue-700 text-[#3755a5] dark:text-blue-300'
      : idle
        ? 'bg-[#f7f8fc] dark:bg-gray-800/50 border-[#e5e8f4] dark:border-gray-600 text-[#a1a8c2] dark:text-gray-400'
        : 'bg-[#f9fafe] dark:bg-gray-800/30 border-[#e4e7f5] dark:border-gray-600 text-[#7a819b] dark:text-gray-400'

  return (
    <div className={`flex items-center gap-3 sm:gap-4 rounded-2xl border px-4 sm:px-5 py-3 sm:py-4 text-sm font-medium transition ${stateClass}`}>
      <span className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-gray-700 shadow-[0_10px_25px_-20px_rgba(15,23,42,0.55)] dark:shadow-[0_10px_25px_-20px_rgba(0,0,0,0.3)]">
        {done ? (
          <svg width="16" height="16" className="sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12.5L9.5 17L19 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : active ? (
          <span className="relative inline-flex h-3 w-3 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current"></span>
          </span>
        ) : (
          <span className="text-sm font-medium">4</span>
        )}
      </span>
      <span className="flex-1 text-sm sm:text-base leading-relaxed">{title}</span>
    </div>
  )
}

function SummaryView({ summary }: { summary: string }) {
  const summaryText = summary ?? ''
  if (!summaryText.trim()) {
    return <div className="rounded-2xl border border-[#ebeefa] dark:border-[#d7a13a]/30 bg-[#fdfdff] dark:bg-[#333333] p-6 text-sm text-slate-500 dark:text-gray-400">Данные отсутствуют</div>
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