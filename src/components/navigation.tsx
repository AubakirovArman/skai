'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import { ThemeToggle } from './theme-toggle'

const navigationItems = [
  {
    name: 'Главная',
    href: '/',
  },
  {
    name: 'SK AI - виртуальный член СД',
    href: '/virtual-director',
  },
  {
    name: 'SK AI - ВНД Фонда',
    href: '/vnd',
  },
  {
    name: 'SK AI - НПА Фонда',
    href: '/np',
  },
]

export function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Мобильная навигация - кнопка меню */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#2a2a2a] shadow-sm border-b border-gray-200 dark:border-[#d7a13a]/30">
        <div className="flex items-center justify-between px-4 py-3">
          <Image 
            src="/image.png" 
            alt="SKAI Logo" 
            width={80} 
            height={26} 
            className="h-6 w-auto"
          />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#333333] transition-colors"
              aria-label="Открыть меню"
            >
              <svg 
                className="w-6 h-6 text-gray-900 dark:text-gray-100" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Мобильное меню - выдвижная панель */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-[#2a2a2a] shadow-xl"
          >
            <div className="flex flex-col h-full pt-16">
              {/* Navigation items */}
              <div className="flex-1 px-4 py-6">
                <nav className="space-y-2">
                  {navigationItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center px-4 py-4 text-base font-medium rounded-lg transition-colors duration-200 relative group',
                          isActive
                            ? 'bg-[#d7a13a]/10 text-[#d7a13a] border-r-2 border-[#d7a13a]'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#333333] hover:text-gray-900 dark:hover:text-gray-100'
                        )}
                      >
                        <span className="relative z-10">{item.name}</span>
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 bg-[#d7a13a]/10 rounded-lg"
                            layoutId="activeMobileNavItem"
                            initial={false}
                            transition={{
                              type: 'spring',
                              stiffness: 500,
                              damping: 30,
                            }}
                          />
                        )}
                      </Link>
                    )
                  })}
                </nav>
              </div>

              {/* Footer section */}
              <div className="p-4 border-t border-gray-200 dark:border-[#d7a13a]/30">
                {session ? (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      Добро пожаловать, {session.user?.name || 'Пользователь'}
                    </div>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        signOut({ callbackUrl: '/auth/signin' })
                      }}
                      className="w-full px-4 py-3 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-200"
                    >
                      Выйти
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    SKAI System v1.0
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Десктопная навигация */}
      <nav className="hidden lg:block fixed top-0 left-0 right-0 bg-white dark:bg-[#2a2a2a] shadow-lg border-b border-gray-200 dark:border-[#d7a13a]/30 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo section */}
          <div className="flex items-center">
            <Image 
              src="/image.png" 
              alt="SKAI Logo" 
              width={120} 
              height={40} 
              className="h-10 w-auto"
            />
          </div>

          {/* Navigation items */}
          <div className="flex-1 flex justify-center">
            <nav className="flex space-x-8">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 relative group',
                      isActive
                        ? 'bg-[#d7a13a]/10 text-[#d7a13a] border-b-2 border-[#d7a13a]'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#333333] hover:text-gray-900 dark:hover:text-gray-100'
                    )}
                  >
                    <span className="relative z-10">{item.name}</span>
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 bg-[#d7a13a]/10 rounded-lg"
                        layoutId="activeNavItem"
                        initial={false}
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right section with theme toggle and user info */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {session ? (
              <div className="flex items-center space-x-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {session.user?.name || 'Пользователь'}
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors duration-200"
                >
                  Выйти
                </button>
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                SKAI System v1.0
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}