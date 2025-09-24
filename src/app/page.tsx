'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Добро пожаловать в <span className="text-blue-600">SKAI</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            SKAI — независимый (цифровой) член СД. Система искусственного интеллекта 
            для поддержки принятия решений советом директоров с ИИ-ассистентами для работы 
            с внутренними документами и нормативно-правовыми актами
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <motion.div
            whileHover={{ scale: 1.05, y: -10 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Link href="/virtual-director" className="block">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-8 text-white h-full">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mb-6">
                  <div className="w-8 h-8 bg-white rounded"></div>
                </div>
                <h3 className="text-2xl font-semibold mb-4">Виртуальный директор</h3>
                <p className="text-blue-100 mb-6">
                  ИИ-ассистент для управленческих решений и стратегического планирования бизнеса
                </p>
                <div className="text-sm text-blue-200">
                  Стратегия • Планирование • Управленческие решения
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -10 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Link href="/vnd" className="block">
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-8 text-white h-full">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mb-6">
                  <div className="w-8 h-8 bg-white rounded-full"></div>
                </div>
                <h3 className="text-2xl font-semibold mb-4">Нормативно-правовые акты</h3>
                <p className="text-green-100 mb-6">
                  ИИ-ассистент для работы с правовыми документами и нормативными актами Казахстана
                </p>
                <div className="text-sm text-green-200">
                  Правовые консультации • Нормативы • Законодательство
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -10 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Link href="/np" className="block">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-8 text-white h-full">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mb-6">
                  <div className="w-8 h-8 bg-white rounded-lg transform rotate-45"></div>
                </div>
                <h3 className="text-2xl font-semibold mb-4">НП</h3>
                <p className="text-purple-100 mb-6">
                  Стратегическое налоговое планирование и оптимизация налоговой нагрузки
                </p>
                <div className="text-sm text-purple-200">
                  КПН • НДС • Социальный налог • Отчетность
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div 
          className="bg-white rounded-lg shadow-lg p-8 mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-center mb-12">Ключевые возможности</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              className="text-center p-6 bg-white rounded-lg shadow-lg"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full"></div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Поиск по документам</h3>
              <p className="text-gray-600">
                Быстрый поиск и анализ информации в базе внутренних документов и правовых актов
              </p>
            </motion.div>

            <motion.div 
              className="text-center p-6 bg-white rounded-lg shadow-lg"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-green-600 rounded-full"></div>
              </div>
              <h3 className="text-xl font-semibold mb-3">ИИ-консультации</h3>
              <p className="text-gray-600">
                Получение экспертных рекомендаций на основе анализа документов и знаний
              </p>
            </motion.div>

            <motion.div 
              className="text-center p-6 bg-white rounded-lg shadow-lg"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-purple-600 rounded-full"></div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Актуальная информация</h3>
              <p className="text-gray-600">
                Работа с актуальными версиями документов и нормативно-правовых актов
              </p>
            </motion.div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-8 text-white text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <h2 className="text-2xl font-semibold mb-4">Готовы начать работу с SKAI?</h2>
          <p className="text-gray-300 mb-6">
            Выберите нужный ИИ-ассистент и начните получать экспертные консультации прямо сейчас
          </p>
          <motion.button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Начать работу
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  )
}
