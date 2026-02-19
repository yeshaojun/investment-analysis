import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Newspaper, BarChart3, RefreshCw, ExternalLink, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface MarketContentProps {
  activeTab: string
}

interface Stock {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  amount: number
  amplitude: number
  high: number
  low: number
  turnover: number
}

interface Industry {
  name: string
  changePercent: number
  change: number
  leadingStock: string
  leadingPercent: number
  totalMarket: number
  avgTurnover: number
  upCount: number
  downCount: number
}

interface News {
  title: string
  content: string
  source: string
  time: string
  url: string
}

export function MarketContent({ activeTab }: MarketContentProps) {
  const router = useRouter()
  const [currentTab, setCurrentTab] = useState(activeTab)
  
  useEffect(() => {
    setCurrentTab(activeTab)
  }, [activeTab])

  const tabs = [
    { id: 'stocks', label: '热门股票', icon: TrendingUp },
    { id: 'industries', label: '热门行业', icon: BarChart3 },
    { id: 'news', label: '财经资讯', icon: Newspaper },
  ]

  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId)
    router.push(`/market?tab=${tabId}`, undefined, { shallow: true })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">市场行情</h1>
        <p className="text-gray-600">实时热门股票、行业板块和财经资讯</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 flex items-center justify-center px-4 py-4 text-sm font-medium transition-colors ${
                    currentTab === tab.id
                      ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-4">
          {currentTab === 'stocks' && <HotStocksList />}
          {currentTab === 'industries' && <HotIndustriesList />}
          {currentTab === 'news' && <FinancialNewsList />}
        </div>
      </div>
    </div>
  )
}

function HotStocksList() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/market/hot-stocks?limit=30')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStocks(data.stocks || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorDisplay error={error} onRetry={fetchData} />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">按涨跌幅排序</span>
        <button onClick={fetchData} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 border-b">
              <th className="text-left py-2 px-2">股票</th>
              <th className="text-right py-2 px-2">最新价</th>
              <th className="text-right py-2 px-2">涨跌幅</th>
              <th className="text-right py-2 px-2 hidden sm:table-cell">成交额</th>
              <th className="text-right py-2 px-2 hidden md:table-cell">换手率</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock, index) => (
              <tr key={stock.symbol} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-2">
                  <div className="flex items-center">
                    <span className="w-6 text-xs text-gray-400">{index + 1}</span>
                    <div>
                      <div className="font-medium text-gray-900">{stock.name}</div>
                      <div className="text-xs text-gray-400">{stock.symbol}</div>
                    </div>
                  </div>
                </td>
                <td className="text-right py-3 px-2 font-medium">{stock.price.toFixed(2)}</td>
                <td className="text-right py-3 px-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-medium ${
                    stock.changePercent >= 0 
                      ? 'bg-red-50 text-red-600' 
                      : 'bg-green-50 text-green-600'
                  }`}>
                    {stock.changePercent >= 0 
                      ? <ArrowUpRight className="h-3 w-3 mr-0.5" />
                      : <ArrowDownRight className="h-3 w-3 mr-0.5" />
                    }
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </span>
                </td>
                <td className="text-right py-3 px-2 text-sm text-gray-600 hidden sm:table-cell">
                  {(stock.amount / 1e8).toFixed(2)}亿
                </td>
                <td className="text-right py-3 px-2 text-sm text-gray-600 hidden md:table-cell">
                  {stock.turnover.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HotIndustriesList() {
  const [industries, setIndustries] = useState<Industry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/market/hot-industries?limit=30')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setIndustries(data.industries || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorDisplay error={error} onRetry={fetchData} />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">按涨跌幅排序</span>
        <button onClick={fetchData} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {industries.map((industry, index) => (
          <div key={industry.name} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                <span className="w-6 text-xs text-gray-400">{index + 1}</span>
                <span className="font-medium text-gray-900">{industry.name}</span>
              </div>
              <span className={`text-sm font-semibold ${
                industry.changePercent >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {industry.changePercent >= 0 ? '+' : ''}{industry.changePercent.toFixed(2)}%
              </span>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>领涨股</span>
                <span className="text-gray-900">{industry.leadingStock} ({industry.leadingPercent >= 0 ? '+' : ''}{industry.leadingPercent.toFixed(2)}%)</span>
              </div>
              <div className="flex justify-between">
                <span>涨跌比</span>
                <span>
                  <span className="text-red-600">{industry.upCount}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-green-600">{industry.downCount}</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FinancialNewsList() {
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/market/news?limit=30')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setNews(data.news || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorDisplay error={error} onRetry={fetchData} />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">实时财经资讯</span>
        <button onClick={fetchData} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      <div className="space-y-3">
        {news.map((item, index) => (
          <a
            key={index}
            href={item.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 group-hover:text-blue-600 line-clamp-2 mb-1">
                  {item.title}
                </h3>
                {item.content && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">{item.content}</p>
                )}
                <div className="flex items-center text-xs text-gray-400">
                  <span>{item.source}</span>
                  <span className="mx-2">·</span>
                  <span>{item.time}</span>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-blue-500 ml-3 flex-shrink-0" />
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />
      <span className="ml-2 text-gray-500">加载中...</span>
    </div>
  )
}

function ErrorDisplay({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <p className="text-red-500 mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        重新加载
      </button>
    </div>
  )
}
