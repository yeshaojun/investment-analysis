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
  Bar,
  ReferenceLine,
  Legend
} from 'recharts'
import { Calendar, TrendingUp, BarChart3, Settings } from 'lucide-react'

interface TechnicalAnalysisChartProps {
  symbol: string
  period?: string
  interval?: string
}

interface ChartData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  ma5?: number
  ma10?: number
  ma20?: number
  ma60?: number
  ema12?: number
  ema26?: number
  macd?: number
  signal?: number
  histogram?: number
  rsi?: number
  bb_upper?: number
  bb_middle?: number
  bb_lower?: number
  k?: number
  d?: number
  j?: number
  volume_ma?: number
  volume_ratio?: number
}

interface HistoricalData {
  symbol: string
  period: string
  interval: string
  data: ChartData[]
  indicators?: {
    ma5: number[]
    ma10: number[]
    ma20: number[]
    ma60: number[]
    ema12: number[]
    ema26: number[]
    macd: {
      macd: number[]
      signal: number[]
      histogram: number[]
    }
    rsi: number[]
    bollinger_bands: {
      upper: number[]
      middle: number[]
      lower: number[]
    }
    kdj: {
      k: number[]
      d: number[]
      j: number[]
    }
    volume_analysis: {
      volume_ma: number[]
      volume_ratio: number[]
    }
  }
}

export function TechnicalAnalysisChart({ 
  symbol, 
  period = '1mo', 
  interval = '1d'
}: TechnicalAnalysisChartProps) {
  const [data, setData] = useState<HistoricalData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(period)
  const [selectedInterval, setSelectedInterval] = useState(interval)
  const [activeChart, setActiveChart] = useState<'price' | 'macd' | 'rsi' | 'kdj' | 'volume'>('price')

  useEffect(() => {
    const fetchStockHistory = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(
          `/api/stock/${symbol}/history?period=${selectedPeriod}&interval=${selectedInterval}&indicators=true`
        )
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
          <div className="h-96 bg-gray-200 rounded mb-4"></div>
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

  // 合并数据和技术指标
  const chartData = data.data.map((item, index) => {
    const result: ChartData = { ...item }
    
    if (data.indicators) {
      // 添加移动平均线
      if (data.indicators.ma5 && data.indicators.ma5[index]) result.ma5 = data.indicators.ma5[index]
      if (data.indicators.ma10 && data.indicators.ma10[index]) result.ma10 = data.indicators.ma10[index]
      if (data.indicators.ma20 && data.indicators.ma20[index]) result.ma20 = data.indicators.ma20[index]
      if (data.indicators.ma60 && data.indicators.ma60[index]) result.ma60 = data.indicators.ma60[index]
      
      // 添加EMA
      if (data.indicators.ema12 && data.indicators.ema12[index]) result.ema12 = data.indicators.ema12[index]
      if (data.indicators.ema26 && data.indicators.ema26[index]) result.ema26 = data.indicators.ema26[index]
      
      // 添加MACD
      if (data.indicators.macd) {
        if (data.indicators.macd.macd[index]) result.macd = data.indicators.macd.macd[index]
        if (data.indicators.macd.signal[index]) result.signal = data.indicators.macd.signal[index]
        if (data.indicators.macd.histogram[index]) result.histogram = data.indicators.macd.histogram[index]
      }
      
      // 添加RSI
      if (data.indicators.rsi && data.indicators.rsi[index]) result.rsi = data.indicators.rsi[index]
      
      // 添加布林带
      if (data.indicators.bollinger_bands) {
        if (data.indicators.bollinger_bands.upper[index]) result.bb_upper = data.indicators.bollinger_bands.upper[index]
        if (data.indicators.bollinger_bands.middle[index]) result.bb_middle = data.indicators.bollinger_bands.middle[index]
        if (data.indicators.bollinger_bands.lower[index]) result.bb_lower = data.indicators.bollinger_bands.lower[index]
      }
      
      // 添加KDJ
      if (data.indicators.kdj) {
        if (data.indicators.kdj.k[index]) result.k = data.indicators.kdj.k[index]
        if (data.indicators.kdj.d[index]) result.d = data.indicators.kdj.d[index]
        if (data.indicators.kdj.j[index]) result.j = data.indicators.kdj.j[index]
      }
      
      // 添加成交量分析
      if (data.indicators.volume_analysis) {
        if (data.indicators.volume_analysis.volume_ma[index]) result.volume_ma = data.indicators.volume_analysis.volume_ma[index]
        if (data.indicators.volume_analysis.volume_ratio[index]) result.volume_ratio = data.indicators.volume_analysis.volume_ratio[index]
      }
    }
    
    return result
  })

  const renderPriceChart = () => (
    <LineChart data={chartData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" tickFormatter={formatXAxisLabel} />
      <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
      <Tooltip labelFormatter={formatTooltipLabel} />
      <Legend />
      
      {/* 布林带 */}
      {data.indicators?.bollinger_bands && (
        <>
          <Area type="monotone" dataKey="bb_upper" stroke="#94a3b8" fill="#e2e8f0" fillOpacity={0.2} />
          <Line type="monotone" dataKey="bb_upper" stroke="#94a3b8" strokeWidth={1} dot={false} />
          <Line type="monotone" dataKey="bb_lower" stroke="#94a3b8" strokeWidth={1} dot={false} />
        </>
      )}
      
      {/* 价格线 */}
      <Line type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} name="收盘价" />
      
      {/* 移动平均线 */}
      {data.indicators?.ma5 && <Line type="monotone" dataKey="ma5" stroke="#10b981" strokeWidth={1} dot={false} name="MA5" />}
      {data.indicators?.ma10 && <Line type="monotone" dataKey="ma10" stroke="#f59e0b" strokeWidth={1} dot={false} name="MA10" />}
      {data.indicators?.ma20 && <Line type="monotone" dataKey="ma20" stroke="#ef4444" strokeWidth={1} dot={false} name="MA20" />}
      {data.indicators?.ma60 && <Line type="monotone" dataKey="ma60" stroke="#8b5cf6" strokeWidth={1} dot={false} name="MA60" />}
      
      <Brush dataKey="date" height={30} stroke="#9ca3af" />
    </LineChart>
  )

  const renderMACDChart = () => (
    <LineChart data={chartData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" tickFormatter={formatXAxisLabel} />
      <YAxis />
      <Tooltip labelFormatter={formatTooltipLabel} />
      <Legend />
      
      {data.indicators?.macd && (
        <>
          <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={2} name="MACD" />
          <Line type="monotone" dataKey="signal" stroke="#ef4444" strokeWidth={1} dot={false} name="Signal" />
          <Bar dataKey="histogram" fill="#10b981" name="Histogram" />
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
        </>
      )}
      
      <Brush dataKey="date" height={30} stroke="#9ca3af" />
    </LineChart>
  )

  const renderRSIChart = () => (
    <LineChart data={chartData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" tickFormatter={formatXAxisLabel} />
      <YAxis domain={[0, 100]} />
      <Tooltip labelFormatter={formatTooltipLabel} />
      <Legend />
      
      {data.indicators?.rsi && (
        <>
          <Line type="monotone" dataKey="rsi" stroke="#3b82f6" strokeWidth={2} name="RSI" />
          <ReferenceLine y={70} stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" />
          <ReferenceLine y={30} stroke="#10b981" strokeWidth={1} strokeDasharray="5 5" />
          <ReferenceLine y={50} stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 5" />
        </>
      )}
      
      <Brush dataKey="date" height={30} stroke="#9ca3af" />
    </LineChart>
  )

  const renderKDJChart = () => (
    <LineChart data={chartData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" tickFormatter={formatXAxisLabel} />
      <YAxis domain={[0, 100]} />
      <Tooltip labelFormatter={formatTooltipLabel} />
      <Legend />
      
      {data.indicators?.kdj && (
        <>
          <Line type="monotone" dataKey="k" stroke="#3b82f6" strokeWidth={2} name="K" />
          <Line type="monotone" dataKey="d" stroke="#ef4444" strokeWidth={1} dot={false} name="D" />
          <Line type="monotone" dataKey="j" stroke="#10b981" strokeWidth={1} dot={false} name="J" />
          <ReferenceLine y={20} stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 5" />
          <ReferenceLine y={80} stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 5" />
          <ReferenceLine y={50} stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 5" />
        </>
      )}
      
      <Brush dataKey="date" height={30} stroke="#9ca3af" />
    </LineChart>
  )

  const renderVolumeChart = () => (
    <BarChart data={chartData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" tickFormatter={formatXAxisLabel} />
      <YAxis />
      <Tooltip labelFormatter={formatTooltipLabel} />
      <Legend />
      
      <Bar dataKey="volume" fill="#3b82f6" name="成交量" />
      {data.indicators?.volume_analysis?.volume_ma && (
        <Line type="monotone" dataKey="volume_ma" stroke="#ef4444" strokeWidth={1} dot={false} name="成交量MA" />
      )}
      
      <Brush dataKey="date" height={30} stroke="#9ca3af" />
    </BarChart>
  )

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Settings className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            {symbol} 技术分析
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
          <span className="text-sm font-medium text-gray-700">技术指标:</span>
          <button
            onClick={() => setActiveChart('price')}
            className={`px-3 py-1 text-sm rounded-md ${
              activeChart === 'price'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            价格&MA
          </button>
          <button
            onClick={() => setActiveChart('macd')}
            className={`px-3 py-1 text-sm rounded-md ${
              activeChart === 'macd'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            MACD
          </button>
          <button
            onClick={() => setActiveChart('rsi')}
            className={`px-3 py-1 text-sm rounded-md ${
              activeChart === 'rsi'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            RSI
          </button>
          <button
            onClick={() => setActiveChart('kdj')}
            className={`px-3 py-1 text-sm rounded-md ${
              activeChart === 'kdj'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            KDJ
          </button>
          <button
            onClick={() => setActiveChart('volume')}
            className={`px-3 py-1 text-sm rounded-md ${
              activeChart === 'volume'
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
        {activeChart === 'price' && (
          <ResponsiveContainer width="100%" height="100%">
            {renderPriceChart()}
          </ResponsiveContainer>
        )}
        {activeChart === 'macd' && (
          <ResponsiveContainer width="100%" height="100%">
            {renderMACDChart()}
          </ResponsiveContainer>
        )}
        {activeChart === 'rsi' && (
          <ResponsiveContainer width="100%" height="100%">
            {renderRSIChart()}
          </ResponsiveContainer>
        )}
        {activeChart === 'kdj' && (
          <ResponsiveContainer width="100%" height="100%">
            {renderKDJChart()}
          </ResponsiveContainer>
        )}
        {activeChart === 'volume' && (
          <ResponsiveContainer width="100%" height="100%">
            {renderVolumeChart()}
          </ResponsiveContainer>
        )}
      </div>

      {/* 技术指标说明 */}
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">技术指标说明:</h4>
        <ul className="space-y-1">
          <li>• <strong>MA</strong>: 移动平均线，反映价格趋势</li>
          <li>• <strong>MACD</strong>: 异同移动平均线，判断趋势强弱</li>
          <li>• <strong>RSI</strong>: 相对强弱指数，衡量超买超卖</li>
          <li>• <strong>KDJ</strong>: 随机指标，判断买卖时机</li>
          <li>• <strong>布林带</strong>: 价格波动范围和趋势</li>
        </ul>
      </div>
    </div>
  )
}