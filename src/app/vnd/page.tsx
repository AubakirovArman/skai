'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthGuard } from '@/components/auth-guard'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

const STORAGE_KEY = 'vnd-chat-history'

export default function VNDPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Добро пожаловать в чат-бот по внутренним нормативным документам! Я помогу вам найти информацию по регламентам, процедурам и политикам компании. Задайте ваш вопрос.',
      isUser: false,
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Функция для автоматического изменения высоты textarea
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    const scrollHeight = textarea.scrollHeight
    const lineHeight = 24 // примерная высота одной строки
    const maxHeight = lineHeight * 7 // максимум 7 строк
    
    if (scrollHeight <= maxHeight) {
      textarea.style.height = scrollHeight + 'px'
    } else {
      textarea.style.height = maxHeight + 'px'
    }
  }

  // Обработчик изменения текста в textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value)
    adjustTextareaHeight(e.target)
  }

  // Загрузка истории чата из localStorage при монтировании компонента
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY)
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        setMessages(parsedMessages)
      } catch (error) {
        console.error('Ошибка при загрузке истории чата:', error)
      }
    }
  }, [])

  // Сохранение истории чата в localStorage при изменении сообщений
  useEffect(() => {
    if (messages.length > 1) { // Сохраняем только если есть сообщения кроме приветственного
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    }
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const inputText = inputMessage.trim()
    setInputMessage('')
    setIsLoading(true)

    // Сбрасываем высоту textarea после отправки
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Добавляем сообщение пользователя
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    // Создаем пустое сообщение бота для streaming
    const botMessageId = (Date.now() + 1).toString()
    const botMessage: Message = {
      id: botMessageId,
      text: '',
      isUser: false,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, botMessage])

    try {
      const response = await fetch('/api/vnd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputText }),
      })

      if (!response.ok) {
        throw new Error('Ошибка сети')
      }

      const data = await response.json()
      
      // Обновляем сообщение бота с полученным ответом
      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId 
          ? { ...msg, text: data.response || 'Получен пустой ответ' }
          : msg
      ))

    } catch (error) {
      // Обновляем сообщение бота с ошибкой
      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId 
          ? { ...msg, text: 'Извините, произошла ошибка. Попробуйте еще раз.' }
          : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChatHistory = () => {
    const initialMessage = {
      id: '1',
      text: 'Добро пожаловать в чат-бот по внутренним нормативным документам! Я помогу вам найти информацию по регламентам, процедурам и политикам компании. Задайте ваш вопрос.',
      isUser: false,
      timestamp: new Date()
    }
    setMessages([initialMessage])
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <AuthGuard>
      <div className="h-screen flex flex-col">
        {/* Заголовок */}
        <motion.div
          className="flex-shrink-0 px-4 py-7 bg-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.h1 
            className="text-2x font-bold text-gray-900 mb-2 text-left"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            SK AI — ВНД Фонда
          </motion.h1>
          <motion.p 
            className="text-gray-600 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
          </motion.p>
        </motion.div>

        {/* Область сообщений */}
        <motion.div 
          className="flex-1 overflow-y-auto p-4 bg-gray-50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <div className="max-w-4xl mx-auto">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`mb-4 flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.isUser
                        ? 'bg-[#CEAD6E] text-white'
                        : 'bg-white text-gray-800 shadow-md border border-[#CEAD6E]/20'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    <p className={`text-xs mt-1 ${
                      message.isUser ? 'text-white/70' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start mb-4"
              >
                <div className="bg-white text-gray-800 shadow-md border max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-gray-500">Печатает...</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </motion.div>

        {/* Поле ввода - закреплено снизу */}
        <motion.div 
          className="flex-shrink-0 p-4 bg-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500">
                {messages.length > 1 ? 'История сохранена' : 'Новый чат'}
              </span>
              {messages.length > 1 && (
                <button
                  onClick={clearChatHistory}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  Очистить историю
                </button>
              )}
            </div>
            <div className="flex space-x-2">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Задайте вопрос по внутренним документам..."
                className="flex-1 p-3 border border-[#CEAD6E]/30 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#CEAD6E] focus:border-transparent overflow-y-auto"
                rows={1}
                disabled={isLoading}
                style={{ minHeight: '48px', maxHeight: '168px' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="px-6 py-3 bg-[#CEAD6E] text-white rounded-lg hover:bg-[#CEAD6E]/90 focus:outline-none focus:ring-2 focus:ring-[#CEAD6E] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Отправить'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AuthGuard>
  )
}