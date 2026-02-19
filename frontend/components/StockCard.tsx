import { useStockInfo } from '@/hooks/useDataFetch'
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react'
import { safeToFixed, safeNumber } from '@/utils/format'
import { StockCardSkeleton } from '@/components/Loading'

interface StockCardProps {
  symbol: string
}

export function StockCard({ symbol }: StockCardProps) {
  const { data: stockInfo, isLoading, error, mutate } = useStockInfo(symbol)

  const getCurrencySymbol = () => {
    if (!stockInfo) return ''
    switch (stockInfo.currency) {
      case 'CNY':
        return '¥'
      case 'HKD':
        return 'HK$'
      case 'USD':
        return '$'
      default:
        return ''
    }
  }

  const getMarketLabel = () => {
    if (!stockInfo?.market) return ''
    return stockInfo.market
  }

  const formatVolume = (volume: unknown) => {
    const v = safeNumber(volume)
    if (v >= 1e8) {
      return `${safeToFixed(v / 1e8, 2)}亿`
    } else if (v >= 1e6) {
      return `${safeToFixed(v / 1e6, 1)}M`
    } else if (v >= 1e4) {
      return `${safeToFixed(v / 1e4, 1)}万`
    }
    return v.toString()
  }

  const formatMarketCap = (marketCap: unknown) => {
    const m = safeNumber(marketCap)
    if (m >= 1e12) {
      return `${safeToFixed(m / 1e12, 2)}万亿`
    } else if (m >= 1e8) {
      return `${safeToFixed(m / 1e8, 0)}亿`
    } else if (m >= 1e6) {
      return `${safeToFixed(m / 1e6, 0)}万`
    }
    return m.toString()
  }

  if (isLoading) {
    return <StockCardSkeleton />
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-red-500">
          <p>加载失败: {error.message}</p>
          <button 
            onClick={mutate}
            className="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!stockInfo) {
    return null
  }

  const isPositive = stockInfo.change >= 0

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-900">{stockInfo.symbol}</h3>
            {getMarketLabel() && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                {getMarketLabel()}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{stockInfo.name}</p>
        </div>
        <button 
          onClick={mutate}
          className="text-xs text-gray-400 hover:text-blue-500"
          title="刷新"
        >
          刷新
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">
            {getCurrencySymbol()}{safeToFixed(stockInfo.price, 2)}
          </span>
          <span className={`flex items-center text-sm font-medium ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
            {isPositive ? '+' : ''}{safeToFixed(stockInfo.change, 2)} ({isPositive ? '+' : ''}{safeToFixed(stockInfo.changePercent, 2)}%)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center">
          <BarChart3 className="h-4 w-4 text-gray-400 mr-2" />
          <div>
            <p className="text-xs text-gray-500">成交量</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatVolume(stockInfo.volume)}
            </p>
          </div>
        </div>
        {stockInfo.marketCap > 0 && (
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
            <div>
              <p className="text-xs text-gray-500">总市值</p>
              <p className="text-sm font-semibold text-gray-900">
                {getCurrencySymbol()}{formatMarketCap(stockInfo.marketCap)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400 mt-4">
        更新时间: {new Date(stockInfo.lastUpdated).toLocaleString('zh-CN')}
      </div>
    </div>
  )
}
