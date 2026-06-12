'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LineChart, Monitor, Calendar, Newspaper, Star, Rss } from 'lucide-react'
import { Suspense } from 'react'

const navItems = [
  { path: '/', label: '股票工作台', icon: Home },
  { path: '/watchlist', label: '关注', icon: Star },
  { path: '/news', label: '新闻', icon: Rss },
  { path: '/screen', label: '选股', icon: Monitor },
  { path: '/calendar', label: '日历', icon: Calendar },
  { path: '/morning-note', label: '早报', icon: Newspaper },
]

function useIsActive() {
  const pathname = usePathname()

  return (path: string): boolean => {
    if (path === '/') return pathname === '/'
    return pathname === path
  }
}

function NavLinks() {
  const isActive = useIsActive()

  return (
    <div className="hidden md:flex items-center space-x-1">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.path)
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            }`}
          >
            <Icon className="h-4 w-4 mr-1.5" aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

export function Navigation() {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="rounded-lg bg-slate-950 p-1.5 text-white shadow-sm">
              <LineChart className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="font-display text-lg font-bold text-slate-950">投资分析工作台</span>
          </Link>
          <Suspense fallback={<div className="hidden md:flex h-8 w-64 animate-pulse bg-gray-100 rounded" />}>
            <NavLinks />
          </Suspense>
        </div>
      </div>
    </nav>
  )
}
