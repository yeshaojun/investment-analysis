import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, BarChart3, DollarSign, RefreshCw } from 'lucide-react'

interface RankingsCardProps {
  type?: 'sectors' | 'stocks'
}

interface RankingItem {
  symbol?: string
  industry_name?: string
  name?: string
  price?: number
  change_percent: number
  volume: number
  market_cap: number
  period: string
}

interface RankingsData {
  rankings: RankingItem[]
  period: string
}

export function RankingsCard({ type = 'stocks' }: RankingsCardProps) {
  const [data, setData] = useState<RankingsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'month' | 'year'>('year')

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const endpoint = type === 'sectors' ? '/api/rankings/sectors' : '/api/rankings/stocks'
        const response = await fetch(`${endpoint}?period=${period}`)
        
        if (!response.ok) {
          throw new Error('获取排行数据失败')
        }
        
        const result: RankingsData = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRankings()
  }, [type, period])

  const formatCurrency = (value: number) => {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`
    }
    return `$${value.toFixed(2)}`
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800'
    if (rank === 2) return 'bg-gray-200 text-gray-800'
    if (rank === 3) return 'bg-orange-100 text-orange-800'
    return 'bg-blue-50 text-blue-800'
  }

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return rank.toString()
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setError(null)
    const endpoint = type === 'sectors' ? '/api/rankings/sectors' : '/api/rankings/stocks'
    fetch(`${endpoint}?period=${period}`)
      .then(response => {
        if (!response.ok) throw new Error('获取排行数据失败')
        return response.json()
      })
      .then((result: RankingsData) => {
        setData(result)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : '未知错误')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            {type === 'sectors' ? '行业' : '股票'}涨跌幅排行
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                period === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              本月
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                period === 'year'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              今年
            </button>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {error && (
        <div className="flex items-center text-red-500 py-8">
          <p>加载失败: {error}</p>
        </div>
      )}

      {!isLoading && !error && data && (
        <div className="space-y-4">
          {data.rankings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>暂无排行数据</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      排名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {type === 'sectors' ? '行业名称' : '代码/名称'}
                    </th>
                    {type === 'stocks' && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          价格
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          市值
                        </th>
                      </>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      涨跌幅
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.rankings.map((item, index) => (
                    <tr 
                      key={item.symbol || item.industry_name} 
                      className={`hover:bg-gray-50 transition-colors ${
                        index < 3 ? 'bg-gradient-to-r from-blue-50 to-transparent' : ''
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${getRankBadge(index + 1)}`}>
                          {getRankEmoji(index + 1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {type === 'sectors' ? item.industry_name : item.symbol}
                          </p>
                          {type === 'stocks' && item.name && (
                            <p className="text-xs text-gray-500">{item.name}</p>
                          )}
                        </div>
                      </td>
                      {type === 'stocks' && item.price && (
                        <>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            ${item.price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(item.market_cap)}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.change_percent >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                          )}
                          <span className={`text-sm font-semibold ${
                            item.change_percent >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {item.change_percent >= 0 ? '+' : ''}{item.change_percent.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">统计周期：</span>
                {period === 'month' ? '本月' : '今年'}
                <span className="mx-2">•</span>
                <span className="font-medium">总计：</span>
                {data.rankings.length} {type === 'sectors' ? '个行业' : '只股票'}
              </div>
              <div className="flex items-center text-gray-400">
                <DollarSign className="h-4 w-4 mr-1" />
                <span>数据仅供参考，不构成投资建议</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
