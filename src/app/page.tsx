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
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Добро пожаловать в <span className="text-slate-700">SK AI</span>
          </h1>
          <p className="text-lg text-gray-700 max-w-4xl mx-auto leading-relaxed">
            SK AI - платформа корпоративных решений и сервисов/продуктов на базе искусственного интеллекта.
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Link href="/virtual-director" className="block">
              <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow h-full">
                <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mb-6">
                  <div className="w-8 h-8 bg-slate-600 rounded"></div>
                </div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900">SK AI - виртуальный член СД</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Система принятия стратегических решений на совете директоров на основе анализа документов и нормативных требований
                </p>
              </div>
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Link href="/vnd" className="block">
              <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow h-full">
                <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mb-6">
                  <div className="w-8 h-8 bg-slate-600 rounded-full"></div>
                </div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900">SK AI - ВНД Фонда</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Анализ и контроль соответствия внутренним политикам, регламентам 
                  и стандартам компании
                </p>
              </div>
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Link href="/np" className="block">
              <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow h-full">
                <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mb-6">
                  <div className="w-8 h-8 bg-slate-600 rounded-lg transform rotate-45"></div>
                </div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900">SK AI - НПА Фонда</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Правовой анализ документов на соответствие законодательств фонда и Республики Казахстан
                </p>
         
              </div>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div 
          className="bg-slate-800 rounded-lg p-10 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <h2 className="text-xl font-semibold mb-4 text-white">Начните работу с системой SKAI</h2>
          <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
            Выберите необходимый модуль для получения профессиональных консультаций 
            и поддержки принятия управленческих решений
          </p>
          <Link href="/virtual-director">
            <motion.button
              className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-8 rounded-lg border border-slate-600 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Перейти к виртуальному директору
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
