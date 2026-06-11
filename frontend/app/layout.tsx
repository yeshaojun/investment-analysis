import type { Metadata } from 'next'
import { DM_Sans, Outfit } from 'next/font/google'
import '../styles/globals.css'
import { Navigation } from '@/src/components/base/Navigation'
import { ErrorBoundary } from '@/src/components/base/ErrorBoundary'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '股票投资分析系统',
  description: '专业的股票投资分析平台，提供实时行情、财务数据、技术分析和AI智能投资分析',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${dmSans.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Navigation />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
