import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  Area,
  AreaChart,
  BarChart,
  Bar
} from 'recharts'
import { Calendar, TrendingUp, BarChart3 } from 'lucide-react'

interface StockChartProps {
  symbol: string
  period?: string
  interval?: string
  chartType?: 'line' | 'candlestick' | 'area' | 'volume'
}

interface ChartData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface HistoricalData {
  symbol: string
  period: string
  interval: string
  data: ChartData[]
}

export function StockChart({ 
  symbol, 
  period = '1mo', 
  interval = '1d',
  chartType = 'line' 
}: StockChartProps) {
  const [data, setData] = useState<HistoricalData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(period)
  const [selectedInterval, setSelectedInterval] = useState(interval)

  useEffect(() => {
    const fetchStockHistory = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/stock/${symbol}/history?period=${selectedPeriod}&interval=${selectedInterval}`)
        if (!response.ok) {
          throw new Error('获取历史数据失败')
        }
        const historicalData = await response.json()
        setData(historicalData)
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStockHistory()
  }, [symbol, selectedPeriod, selectedInterval])

  const formatXAxisLabel = (value: string) => {
    const date = new Date(value)
    if (selectedInterval === '1d' || selectedInterval === '1h') {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    }
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' })
  }

  const formatTooltipLabel = (value: string) => {
    return new Date(value).toLocaleString('zh-CN')
  }

  const periodOptions = [
    { value: '1d', label: '1天' },
    { value: '5d', label: '5天' },
    { value: '1mo', label: '1月' },
    { value: '3mo', label: '3月' },
    { value: '6mo', label: '6月' },
    { value: '1y', label: '1年' }
  ]

  const intervalOptions = [
    { value: '1m', label: '1分钟' },
    { value: '5m', label: '5分钟' },
    { value: '15m', label: '15分钟' },
    { value: '1h', label: '1小时' },
    { value: '1d', label: '1天' }
  ]

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-red-500">
          <p>加载失败: {error}</p>
        </div>
      </div>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-gray-500">
          <p>暂无数据</p>
        </div>
      </div>
    )
  }

  const chartData = data.data.map(item => ({
    ...item,
    date: item.date,
    // 计算移动平均线 (简单实现，实际应该使用更准确的算法)
    ma5: data.data[data.data.indexOf(item)]?.close || 0,
    ma10: data.data[Math.max(0, data.data.indexOf(item) - 10)]?.close || 0,
    ma20: data.data[Math.max(0, data.data.indexOf(item) - 20)]?.close || 0
  }))

  const renderChart = () => {
    switch (chartType) {
      case 'area':
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatXAxisLabel} />
            <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
            <Tooltip labelFormatter={formatTooltipLabel} />
            <Area type="monotone" dataKey="close" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            <Line type="monotone" dataKey="ma5" stroke="#10b981" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="ma10" stroke="#f59e0b" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="ma20" stroke="#ef4444" strokeWidth={1} dot={false} />
            <Brush dataKey="date" height={30} stroke="#9ca3af" />
          </AreaChart>
        )
      case 'volume':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatXAxisLabel} />
            <YAxis />
            <Tooltip labelFormatter={formatTooltipLabel} />
            <Bar dataKey="volume" fill="#3b82f6" />
            <Brush dataKey="date" height={30} stroke="#9ca3af" />
          </BarChart>
        )
      default:
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatXAxisLabel} />
            <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
            <Tooltip labelFormatter={formatTooltipLabel} />
            <Line type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ma5" stroke="#10b981" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="ma10" stroke="#f59e0b" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="ma20" stroke="#ef4444" strokeWidth={1} dot={false} />
            <Brush dataKey="date" height={30} stroke="#9ca3af" />
          </LineChart>
        )
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <TrendingUp className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            {symbol} 价格走势
          </h3>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="h-4 w-4 mr-1" />
          <span>{selectedPeriod} • {selectedInterval}</span>
        </div>
      </div>

      {/* 图表控制按钮 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">时间周期:</span>
          {periodOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setSelectedPeriod(option.value)}
              className={`px-3 py-1 text-sm rounded-md ${
                selectedPeriod === option.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">数据间隔:</span>
          {intervalOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setSelectedInterval(option.value)}
              className={`px-3 py-1 text-sm rounded-md ${
                selectedInterval === option.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">图表类型:</span>
          <button
            onClick={() => chartType = 'line'}
            className={`px-3 py-1 text-sm rounded-md ${
              chartType === 'line'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            价格线
          </button>
          <button
            onClick={() => chartType = 'area'}
            className={`px-3 py-1 text-sm rounded-md ${
              chartType === 'area'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            面积图
          </button>
          <button
            onClick={() => chartType = 'volume'}
            className={`px-3 py-1 text-sm rounded-md ${
              chartType === 'volume'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            成交量
          </button>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="h-96 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-gray-600">收盘价</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-gray-600">MA5</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
          <span className="text-gray-600">MA10</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          <span className="text-gray-600">MA20</span>
        </div>
      </div>
    </div>
  )
}