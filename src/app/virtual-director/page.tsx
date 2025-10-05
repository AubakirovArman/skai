'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import * as mammoth from 'mammoth'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import MarkdownRender from '@/components/markdown-render'
import { SummaryView } from './summary-view'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/locales'

interface AnalysisResult {
  vnd: string
  np: string
  summary: string
  fileName?: string
  timestamp?: Date
}

const STORAGE_KEY = 'virtual-director-analysis-history'

export default function VirtualDirectorPage() {
  const { language } = useLanguage()
  const t = translations[language].virtualDirector
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
      alert(t.upload.fileError)
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
      <main className="min-h-screen bg-[#f8f6f1] dark:bg-[#1a1a1a] pt-16 lg:pt-20">
        <div className="px-6 pb-16 pt-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <motion.header
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[#e4dfd0] dark:border-[#d7a13a]/30 bg-white dark:bg-[#2a2a2a] px-6 py-5 shadow-sm dark:shadow-[0_25px_80px_-60px_rgba(215,161,58,0.2)]"
            >
              <div className="flex flex-1 flex-col gap-1 text-left min-w-0">
                <h1 className="text-xl font-semibold leading-tight text-[#2a2a33] dark:text-white sm:text-2xl lg:text-[28px]">
                  {t.title}
                </h1>
              </div>
              
              {/* Круглое видео - показывается только при результатах */}
              {analysisStep === 'complete' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="relative w-80 h-32 sm:w-80 sm:h-40 lg:w-80 lg:h-48 rounded-full border-2 border-slate-300 dark:border-[#d7a13a]/50 overflow-hidden flex-shrink-0"
                >
                  <video
                    autoPlay
                    loop
                    muted={true}
                    playsInline
                    aria-hidden="true"
                    className="w-full h-full object-cover"
                  >
                    <source src="/IMG_3363.MOV" type="video/mp4" />
                  </video>
                </motion.div>
              )}
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
                    {t.status.saved} {analysisResult.fileName}
                    {analysisResult.timestamp && (
                      <span className="ml-2 text-[#3b8561] dark:text-green-400 block sm:inline">
                        ({analysisResult.timestamp.toLocaleString(language === 'ru' ? 'ru-RU' : language === 'kk' ? 'kk-KZ' : 'en-US')})
                      </span>
                    )}
                  </span>
                </div>
                <button
                  onClick={clearAnalysisHistory}
                  className="text-xs font-medium text-[#c05c5c] dark:text-red-400 transition-colors hover:text-[#a13f3f] dark:hover:text-red-300 flex-shrink-0 self-start sm:self-auto"
                >
                  {t.status.clear}
                </button>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {(analysisStep === 'upload' || analysisStep === 'processing' || analysisStep === 'vnd' || analysisStep === 'np' || analysisStep === 'summary') && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                >
                  {/* Блок загрузки документа */}
                  <motion.section
                    className="rounded-3xl border border-[#e3e6f1] dark:border-[#d7a13a]/30 bg-white dark:bg-[#2a2a2a] p-10 shadow-[0_35px_90px_-70px_rgba(15,23,42,0.65)] dark:shadow-[0_35px_90px_-70px_rgba(215,161,58,0.3)]"
                  >
                    <h2 className="text-center text-2xl font-semibold text-slate-900 dark:text-white">{t.upload.title}</h2>
                    <div className="mt-10 space-y-8">
                      <div className="rounded-2xl border border-dashed border-[#d4d9eb] dark:border-[#d7a13a]/50 bg-[#f9faff] dark:bg-[#333333] px-6 py-10 text-center transition-colors duration-200 hover:border-[#c5cae3] dark:hover:border-[#d7a13a]">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".txt,.doc,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload" className="flex cursor-pointer flex-col items-center gap-4 text-slate-500 dark:text-gray-400">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white dark:bg-[#d7a13a] shadow-[0_15px_45px_-30px_rgba(15,23,42,0.4)] dark:shadow-[0_15px_45px_-30px_rgba(215,161,58,0.4)]">
                            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M14 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                              <path d="M7 12l7-7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M23.5 18v3.5A1.5 1.5 0 0 1 22 23h-16a1.5 1.5 0 0 1-1.5-1.5V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                          </div>
                          <div className="space-y-1">
                            <p className="text-lg font-medium text-slate-700 dark:text-gray-300">{t.upload.clickToUpload}</p>
                            <p className="text-sm text-[#9aa2ba] dark:text-gray-500">{t.upload.supportedFormats}</p>
                          </div>
                        </label>
                        {file && (
                          <div className="mt-6 rounded-2xl border border-[#dce4ff] dark:border-[#d7a13a]/50 bg-[#eef2ff] dark:bg-[#333333] px-4 py-3 text-left text-sm text-[#445089] dark:text-[#d7a13a]">
                            <p className="font-medium">{file.name}</p>
                            <p className="text-xs text-[#707aa6] dark:text-[#d7a13a]/70">{(file.size / 1024).toFixed(2)} KB</p>
                          </div>
                        )}
                      </div>

                      <div className="text-center text-sm font-medium uppercase tracking-[0.4em] text-[#c3c7d7] dark:text-gray-500">{t.upload.orText}</div>

                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-600 dark:text-gray-300">
                          {t.upload.textInputLabel}
                        </label>
                        <textarea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          className="h-40 w-full resize-none rounded-2xl border border-[#d5d9eb] dark:border-[#d7a13a]/50 bg-[#fdfdff] dark:bg-[#333333] px-4 py-4 text-sm text-slate-700 dark:text-gray-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_rgba(215,161,58,0.1)] outline-none transition focus:border-[#c1c7e5] dark:focus:border-[#d7a13a] focus:ring-2 focus:ring-[#e4e7f6] dark:focus:ring-[#d7a13a]/20"
                          placeholder={t.upload.textPlaceholder}
                        />
                      </div>

                      <motion.button
                        onClick={handleAnalyze}
                        disabled={analysisStep !== 'upload'}
                        className={`w-full rounded-2xl px-6 py-3 text-base font-semibold shadow-[0_20px_45px_-30px_rgba(215,161,58,0.85)] transition-all duration-200 ${
                          analysisStep !== 'upload' 
                            ? 'cursor-not-allowed bg-gray-300 text-gray-500' 
                            : 'bg-[#f3d9a6] dark:bg-[#d7a13a] text-[#6c4d1d] dark:text-white hover:-translate-y-0.5 hover:bg-[#eccf97] dark:hover:bg-[#c8921f]'
                        }`}
                        whileHover={analysisStep === 'upload' ? { scale: 1.01 } : {}}
                        whileTap={analysisStep === 'upload' ? { scale: 0.99 } : {}}
                      >
                        {analysisStep === 'upload' ? t.upload.startAnalysis : t.upload.analysisInProgress}
                      </motion.button>
                    </div>
                  </motion.section>

                  {/* Блок процесса анализа документа */}
                  <motion.section
                    className="rounded-3xl border border-[#e3e6f1] dark:border-[#d7a13a]/30 bg-white dark:bg-[#2a2a2a] p-10 shadow-[0_35px_90px_-70px_rgba(15,23,42,0.65)] dark:shadow-[0_35px_90px_-70px_rgba(215,161,58,0.3)]"
                  >
                    <h2 className="text-center text-2xl font-semibold text-slate-900 dark:text-white">{t.analysis.title}</h2>
                    
                    {/* Круговой прогресс-бар */}
                    <div className="mt-2 flex justify-center">
                      <div className="relative">
                        <svg className="w-64 h-64 transform -rotate-90" viewBox="0 0 120 120">
                          {/* Фоновый круг */}
                          <circle
                            cx="60"
                            cy="60"
                            r="44"
                            stroke="#e5e7eb"
                            strokeWidth="6"
                            fill="none"
                            className="dark:stroke-gray-600"
                          />
                          {/* Прогресс круг */}
                          <circle
                            cx="60"
                            cy="60"
                            r="44"
                            stroke="#d7a13a"
                            strokeWidth="6"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 44}`}
                            strokeDashoffset={`${2 * Math.PI * 44 * (1 - (
                              analysisStep === 'upload' ? 0 :
                              analysisStep === 'processing' ? 0 :
                              analysisStep === 'vnd' ? 0.25 :
                              analysisStep === 'np' ? 0.5 :
                              analysisStep === 'summary' ? 0.75 :
                              analysisStep === 'complete' ? 1 : 0
                            ))}`}
                            className="transition-all duration-500 ease-in-out"
                          />
                        </svg>
                        {/* Видео и процент в центре */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="w-[180px] h-[180px] rounded-full overflow-hidden">
                            <video
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            >
                              <source src="/789.mp4" type="video/mp4" />
                            </video>
                          </div>
                          {/* Процентный индикатор */}
                          <div className="absolute bottom-4 bg-white/90 dark:bg-[#2a2a2a]/90 backdrop-blur-sm px-3 py-1 rounded-full">
                            <span className="text-lg font-semibold text-[#d7a13a]">
                              {analysisStep === 'upload' ? '0' :
                               analysisStep === 'processing' ? '0' :
                               analysisStep === 'vnd' ? '25' :
                               analysisStep === 'np' ? '50' :
                               analysisStep === 'summary' ? '75' :
                               analysisStep === 'complete' ? '100' : '0'}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 space-y-4">
                      <StepRow
                        title={t.analysis.steps.preparation}
                        active={analysisStep === 'processing'}
                        done={analysisStep === 'vnd' || analysisStep === 'np' || analysisStep === 'summary'}
                        idle={analysisStep === 'upload'}
                      />
                      <StepRow
                        title={t.analysis.steps.vnd}
                        active={analysisStep === 'vnd'}
                        done={analysisStep === 'np' || analysisStep === 'summary'}
                        idle={analysisStep === 'upload' || analysisStep === 'processing'}
                      />
                      <StepRow
                        title={t.analysis.steps.np}
                        active={analysisStep === 'np'}
                        done={analysisStep === 'summary'}
                        idle={analysisStep === 'upload' || analysisStep === 'processing' || analysisStep === 'vnd'}
                      />
                      <StepRow
                        title={t.analysis.steps.summary}
                        active={analysisStep === 'summary'}
                        done={false}
                        idle={analysisStep === 'upload' || analysisStep === 'processing' || analysisStep === 'vnd' || analysisStep === 'np'}
                      />
                    </div>
                  </motion.section>
                </motion.div>
              )}

              {analysisStep === 'complete' && analysisResult && (
                <motion.section
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="rounded-3xl border border-[#e3e6f1] dark:border-[#d7a13a]/30 bg-white dark:bg-[#2a2a2a] p-10 shadow-[0_35px_90px_-70px_rgba(15,23,42,0.65)] dark:shadow-[0_35px_90px_-70px_rgba(215,161,58,0.3)]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{t.results.title}</h2>
                      <p className="text-sm text-slate-500 dark:text-gray-400">{t.results.subtitle}</p>
                    </div>
                    <button
                      onClick={resetAnalysis}
                      className="self-start rounded-xl border border-[#d5d9eb] dark:border-[#d7a13a]/50 bg-[#f6f7fb] dark:bg-[#333333] px-4 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 transition hover:border-[#c8cce4] dark:hover:border-[#d7a13a] hover:bg-[#eef0fb] dark:hover:bg-[#404040]"
                    >
                      {t.results.newAnalysis}
                    </button>
                  </div>

                  <div className="mt-8 border-b border-[#e5e7f2] dark:border-[#d7a13a]/30">
                    <nav className="flex flex-wrap gap-4">
                      {[
                        { id: 'summary' as const, label: t.results.tabs.summary },
                        { id: 'vnd' as const, label: t.results.tabs.vnd },
                        { id: 'np' as const, label: t.results.tabs.np },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`relative pb-3 text-sm font-medium transition-colors ${
                            activeTab === tab.id
                              ? 'text-[#d7a13a]'
                              : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300'
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
                        <div className="rounded-2xl border border-[#dbe0f2] dark:border-[#d7a13a]/30 bg-[#f8faff] dark:bg-[#333333] p-6">
                          <MarkdownRender content={analysisResult.vnd || ''} className="text-slate-700 dark:text-gray-300" />
                        </div>
                      )}

                      {activeTab === 'np' && (
                        <div className="rounded-2xl border border-[#e2e5f2] dark:border-[#d7a13a]/30 bg-[#fafbff] dark:bg-[#333333] p-6">
                          <MarkdownRender content={analysisResult.np || ''} className="text-slate-700 dark:text-gray-300" />
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
    <div className={`flex items-center gap-4 rounded-2xl border px-5 py-4 text-sm font-medium transition ${stateClass}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-gray-700 shadow-[0_10px_25px_-20px_rgba(15,23,42,0.55)] dark:shadow-[0_10px_25px_-20px_rgba(0,0,0,0.3)]">
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
      <span className="leading-snug text-slate-600 dark:text-gray-300">{title}</span>
    </div>
  )
}

