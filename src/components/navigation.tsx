'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'

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

  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg border-r border-gray-200 z-50">
      <div className="flex flex-col h-full">
        {/* Logo section */}
        <div className="flex items-center justify-center p-6 border-b border-gray-200">
          <Image 
            src="/image.png" 
            alt="SKAI Logo" 
            width={120} 
            height={40} 
            className="h-10 w-auto"
          />
        </div>

        {/* Navigation items */}
        <div className="flex-1 px-4 py-6">
          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 relative group',
                    isActive
                      ? 'bg-[#CEAD6E]/10 text-[#CEAD6E] border-r-2 border-[#CEAD6E]'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <span className="relative z-10">{item.name}</span>
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-[#CEAD6E]/10 rounded-lg"
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

        {/* Footer section */}
        <div className="p-4 border-t border-gray-200">
          {session ? (
            <div className="space-y-3">
              <div className="text-xs text-gray-500 text-center">
                Добро пожаловать, {session.user?.name || 'Пользователь'}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                Выйти
              </button>
            </div>
          ) : (
            <div className="text-xs text-gray-500 text-center">
              SKAI System v1.0
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}