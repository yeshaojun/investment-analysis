import Link from 'next/link'
import { useRouter } from 'next/router'
import { Home, TrendingUp, Newspaper, BarChart3, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Navigation() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  const navItems = [
    { path: '/', label: '股票查询', icon: Home },
    { path: '/market', label: '市场行情', icon: TrendingUp },
    { path: '/market?tab=news', label: '财经资讯', icon: Newspaper },
    { path: '/market?tab=industries', label: '行业板块', icon: BarChart3 },
  ]
  
  const isActive = (path: string) => {
    if (path === '/') return router.pathname === '/'
    
    const [basePath, query] = path.split('?')
    const currentPath = router.pathname
    const currentQuery = router.query
    
    if (currentPath !== basePath) return false
    
    if (query) {
      const params = new URLSearchParams(query)
      const entries = Array.from(params.entries())
      for (const [key, value] of entries) {
        if (currentQuery[key] !== value) return false
      }
      return true
    }
    
    return !currentQuery.tab
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg text-gray-900">股票分析系统</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-1.5" />
                  {item.label}
                </Link>
              )
            })}
          </div>
          
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        
        {isMenuOpen && (
          <div className="md:hidden py-2 border-t border-gray-100">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center px-4 py-3 text-sm font-medium ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </nav>
  )
}
