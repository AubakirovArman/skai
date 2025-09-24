'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { AuthGuard } from '@/components/auth-guard'

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
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'vnd' | 'np'>('summary')
  const [analysisStep, setAnalysisStep] = useState<'upload' | 'processing' | 'vnd' | 'np' | 'summary' | 'complete'>('upload')
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
      const reader = new FileReader()
      reader.onload = (event) => {
        setContent(event.target?.result as string || '')
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleAnalyze = async () => {
    if (!file && !content.trim()) {
      alert('Пожалуйста, загрузите файл или введите текст для анализа')
      return
    }

    setIsAnalyzing(true)
    setAnalysisStep('processing')

    try {
      const formData = new FormData()
      if (file) {
        formData.append('file', file)
      }
      formData.append('content', content)

      // Симуляция этапов анализа
      setTimeout(() => setAnalysisStep('vnd'), 2000)
      setTimeout(() => setAnalysisStep('np'), 4000)
      setTimeout(() => setAnalysisStep('summary'), 6000)

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        const analysisWithMetadata = {
          ...result.analysis,
          fileName: file?.name || 'Текстовый ввод',
          timestamp: new Date()
        }
        setAnalysisResult(analysisWithMetadata)
        setAnalysisStep('complete')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Ошибка анализа:', error)
      alert('Произошла ошибка при анализе документа')
      setAnalysisStep('upload')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetAnalysis = () => {
    setFile(null)
    setContent('')
    setAnalysisResult(null)
    setAnalysisStep('upload')
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
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          <motion.h1 
            className="text-4xl font-bold text-gray-900 mb-8 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            SK AI — независимый (цифровой) член СД
          </motion.h1>

        {/* Индикатор сохраненного анализа */}
        {analysisResult && analysisStep === 'complete' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex justify-between items-center"
          >
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700">
                Сохранен анализ: {analysisResult.fileName} 
                {analysisResult.timestamp && (
                  <span className="text-green-600 ml-2">
                    ({analysisResult.timestamp.toLocaleString('ru-RU')})
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={clearAnalysisHistory}
              className="text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              Очистить
            </button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {analysisStep === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-lg shadow-lg p-8"
            >
              <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                Загрузка документа для анализа
              </h2>
              
              <div className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="text-gray-600">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="text-lg">Нажмите для загрузки файла</p>
                      <p className="text-sm text-gray-500">Поддерживаются форматы: TXT, DOC, DOCX</p>
                    </div>
                  </label>
                  {file && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-blue-800 font-medium">{file.name}</p>
                      <p className="text-blue-600 text-sm">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  )}
                </div>

                <div className="text-center text-gray-500">или</div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Введите текст документа:
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Введите название темы и пояснительную записку..."
                  />
                </div>

                <motion.button
                  onClick={handleAnalyze}
                  disabled={!file && !content.trim()}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-700 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Начать анализ
                </motion.button>
              </div>
            </motion.div>
          )}

          {(analysisStep === 'processing' || analysisStep === 'vnd' || analysisStep === 'np' || analysisStep === 'summary') && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-lg shadow-lg p-8"
            >
              <h2 className="text-2xl font-semibold text-gray-800 mb-8 text-center">
                Процесс анализа документа
              </h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      analysisStep === 'processing' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                    }`}>
                      {analysisStep === 'processing' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-lg font-medium">Подготовка к анализу</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      analysisStep === 'vnd' ? 'bg-blue-500 text-white' : 
                      (analysisStep === 'np' || analysisStep === 'summary') ? 'bg-green-500 text-white' : 'bg-gray-300'
                    }`}>
                      {analysisStep === 'vnd' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (analysisStep === 'np' || analysisStep === 'summary') ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : null}
                    </div>
                    <span className="text-lg font-medium">Анализ ВНД (Внутренние нормативные документы)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      analysisStep === 'np' ? 'bg-blue-500 text-white' : 
                      analysisStep === 'summary' ? 'bg-green-500 text-white' : 'bg-gray-300'
                    }`}>
                      {analysisStep === 'np' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : analysisStep === 'summary' ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : null}
                    </div>
                    <span className="text-lg font-medium">Анализ НП (Нормативные права)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      analysisStep === 'summary' ? 'bg-blue-500 text-white' : 'bg-gray-300'
                    }`}>
                      {analysisStep === 'summary' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <span className="text-sm font-medium">4</span>
                      )}
                    </div>
                    <span className="text-lg font-medium">Формирование итогового заключения</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {analysisStep === 'complete' && analysisResult && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-lg shadow-lg p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Результаты анализа
                </h2>
                <button
                  onClick={resetAnalysis}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Новый анализ
                </button>
              </div>

              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'summary'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Итоговое заключение
                  </button>
                  <button
                    onClick={() => setActiveTab('vnd')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'vnd'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Анализ ВНД
                  </button>
                  <button
                    onClick={() => setActiveTab('np')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'np'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Анализ НП
                  </button>
                </nav>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="prose max-w-none"
                >
                  {activeTab === 'summary' && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">Решение виртуального директора</h3>
                      <div className="whitespace-pre-wrap text-gray-700 space-y-4">
                        {analysisResult.summary.split('\n').map((line, index) => {
                          if (line.includes('**РЕШЕНИЕ ВИРТУАЛЬНОГО ДИРЕКТОРА:**')) {
                            const decision = line.replace('**РЕШЕНИЕ ВИРТУАЛЬНОГО ДИРЕКТОРА:**', '').trim()
                            const isPositive = decision.includes('ЗА')
                            return (
                              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                                isPositive 
                                  ? 'bg-green-100 border-green-500 text-green-800' 
                                  : 'bg-red-100 border-red-500 text-red-800'
                              }`}>
                                <div className="font-bold text-lg">
                                  РЕШЕНИЕ: <span className={isPositive ? 'text-green-600' : 'text-red-600'}>{decision}</span>
                                </div>
                              </div>
                            )
                          } else if (line.includes('**ТЕМА ПОВЕСТКИ ДНЯ:**')) {
                            return (
                              <div key={index} className="bg-blue-100 p-4 rounded-lg border-l-4 border-blue-500">
                                <div className="font-bold text-blue-800">{line.replace('**', '').replace('**', '')}</div>
                              </div>
                            )
                          } else if (line.includes('**КРАТКОЕ ОБОСНОВАНИЕ:**')) {
                            return (
                              <div key={index} className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                                <div className="font-semibold text-yellow-800 mb-2">КРАТКОЕ ОБОСНОВАНИЕ:</div>
                                <div className="text-gray-700">{line.replace('**КРАТКОЕ ОБОСНОВАНИЕ:**', '').trim()}</div>
                              </div>
                            )
                          } else if (line.includes('**ОБОСНОВАНИЕ ПО ВОПРОСУ:**')) {
                            return (
                              <div key={index} className="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400">
                                <div className="font-semibold text-gray-800 mb-2">ПОДРОБНОЕ ОБОСНОВАНИЕ:</div>
                                <div className="text-gray-700">{line.replace('**ОБОСНОВАНИЕ ПО ВОПРОСУ:**', '').trim()}</div>
                              </div>
                            )
                          } else if (line.trim() && !line.includes('**')) {
                            return (
                              <div key={index} className="text-gray-700 leading-relaxed">
                                {line}
                              </div>
                            )
                          }
                          return null
                        })}
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'vnd' && (
                    <div className="bg-orange-50 p-6 rounded-lg">
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">Анализ ВНД</h3>
                      <div className="whitespace-pre-wrap text-gray-700">{analysisResult.vnd}</div>
                    </div>
                  )}
                  
                  {activeTab === 'np' && (
                    <div className="bg-purple-50 p-6 rounded-lg">
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">Анализ НП</h3>
                      <div className="whitespace-pre-wrap text-gray-700">{analysisResult.np}</div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
    </AuthGuard>
  )
}