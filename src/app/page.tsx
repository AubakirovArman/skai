'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

import imageMain from '../../image_main.png'

const offerings = [
  {
    href: '/virtual-director',
    title: 'Виртуальный член СД',
    description:
      'Система принятия стратегических решений на совете директоров на основе анализа документов и нормативных требований.',
  },
  {
    href: '/vnd',
    title: 'ВНД Фонда',
    description:
      'Анализ и контроль соответствия внутренним политикам, регламентам и стандартам компании.',
  },
  {
    href: '/np',
    title: 'НПА Фонда',
    description:
      'Правовой анализ документов на соответствие законодательству фонда и Республики Казахстан.',
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8f9fb] dark:bg-[#1a1a1a]">
      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 pb-24 pt-20 sm:pt-24 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center"
        >
          <div className="mb-10 flex h-28 w-28 items-center justify-center rounded-full bg-white dark:bg-[#d7a13a] shadow-[0_30px_70px_-40px_rgba(15,23,42,0.35)] dark:shadow-[0_30px_70px_-40px_rgba(215,161,58,0.4)]">
            <Image
              src={imageMain}
              alt="Логотип SK AI"
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl md:text-6xl">
            Добро пожаловать в{' '}
            <span className="text-[#d7a13a]">SK AI</span>
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-relaxed text-slate-600 dark:text-gray-300 sm:text-xl">
            Платформа корпоративных решений и сервисов/продуктов на базе искусственного интеллекта.
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-600 dark:text-gray-300 sm:text-base">
            Выберите необходимого ИИ-агента для получения профессиональных консультаций и поддержки принятия управленческих решений.
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          {offerings.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex h-full flex-col justify-between rounded-3xl border border-slate-200 dark:border-[#d7a13a]/30 bg-white dark:bg-[#2a2a2a] p-7 shadow-[0_25px_80px_-60px_rgba(15,23,42,0.65)] dark:shadow-[0_25px_80px_-60px_rgba(215,161,58,0.3)] transition-all duration-300 hover:-translate-y-1 hover:border-[#d7a13a]/60 hover:shadow-[0_40px_90px_-60px_rgba(215,161,58,0.55)]"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center rounded-full border border-[#d7a13a]/40 bg-[#fff8ea] dark:bg-[#d7a13a]/10 px-3 py-1 text-4xs font-semibold uppercase text-[#d7a13a] transition-colors duration-300 group-hover:border-[#d7a13a] group-hover:bg-[#d7a13a] group-hover:text-white">
                  SK AI
                </span>
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 dark:border-gray-600 text-slate-500 dark:text-gray-400 transition-colors duration-300 group-hover:border-[#d7a13a] group-hover:bg-[#fff8ea] dark:group-hover:bg-[#d7a13a]/10 group-hover:text-[#d7a13a]">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    <path
                      d="M5 12h13"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <path
                      d="M13 6l5.5 6L13 18"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
                <div className="mt-6 flex flex-1 flex-col text-left">
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-slate-500 dark:text-gray-300">

                  {item.description}
                </p>
              </div>
              <div className="mt-6 text-sm font-medium text-[#d7a13a] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                Подробнее
              </div>
            </Link>
          ))}
        </motion.section>
      </div>
    </main>
  )
}
