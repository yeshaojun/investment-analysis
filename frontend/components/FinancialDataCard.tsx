import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, PieChart, Activity } from 'lucide-react'
import { safeToFixed, safeNumber } from '@/utils/format'

interface FinancialDataCardProps {
  symbol: string
}

interface FinancialData {
  symbol: string
  year: number
  quarter: number
  revenue: number
  net_profit: number
  gross_margin: number
  net_margin: number
  operating_cash_flow: number
  eps: number
  roe: number
  revenue_yoy?: number | null
  profit_yoy?: number | null
  price_yoy?: number | null
}

interface StockInfo {
  symbol: string
  name: string
  market?: string
  currency?: string
}

interface FinancialResponse {
  symbol: string
  financials: FinancialData[]
}

export function FinancialDataCard({ symbol }: FinancialDataCardProps) {
  const [financialData, setFinancialData] = useState<FinancialData[]>([])
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeChart, setActiveChart] = useState<'revenue' | 'profit' | 'margins'>('revenue')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // 获取股票信息以确定货币类型
        const stockResponse = await fetch(`/api/stock/${symbol}`)
        if (stockResponse.ok) {
          const stockData = await stockResponse.json()
          setStockInfo(stockData)
        }
        
        // 获取财务数据
        const response = await fetch(`/api/stock/${symbol}/financials`)
        if (!response.ok) {
          throw new Error('获取财务数据失败')
        }
        const data: FinancialResponse = await response.json()
        setFinancialData(data.financials || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [symbol])

  const getCurrencySymbol = () => {
    if (stockInfo?.currency === 'CNY') return '¥'
    if (stockInfo?.currency === 'HKD') return 'HK$'
    if (stockInfo?.currency === 'USD') return '$'
    
    if (symbol) {
      if (/^\d{5}$/.test(symbol)) return 'HK$'
      if (/^\d{6}$/.test(symbol)) return '¥'
    }
    
    return ''
  }

  const getCurrencyUnit = () => {
    if (stockInfo?.currency === 'CNY') return '人民币'
    if (stockInfo?.currency === 'HKD') return '港币'
    if (stockInfo?.currency === 'USD') return '美元'
    
    if (symbol) {
      if (/^\d{5}$/.test(symbol)) return '港币'
      if (/^\d{6}$/.test(symbol)) return '人民币'
    }
    
    return ''
  }

  const formatCurrency = (value: unknown) => {
    const v = safeNumber(value)
    if (v === 0) return '-'
    const symbol = getCurrencySymbol()
    if (v >= 1e8) {
      return `${symbol}${safeToFixed(v / 1e8, 2)}亿`
    } else if (v >= 1e4) {
      return `${symbol}${safeToFixed(v / 1e4, 2)}万`
    }
    return `${symbol}${safeToFixed(v, 2)}`
  }

  const formatPercentage = (value: unknown) => {
    if (value === null || value === undefined) return '-'
    const v = Number(value)
    if (isNaN(v)) return '-'
    return `${v >= 0 ? '+' : ''}${safeToFixed(v, 2)}%`
  }

  const formatMargin = (value: unknown) => {
    return formatPercentage(value)
  }

  const formatEps = (value: unknown) => {
    const v = safeNumber(value)
    if (v === 0) return '-'
    return `${getCurrencySymbol()}${safeToFixed(v, 2)}`
  }

  const isDataEmpty = (item: FinancialData) => {
    return item.revenue === 0 && item.net_profit === 0
  }

  const getSortedData = () => {
    // 按年份降序、季度降序排序（最新的在前面）
    return [...financialData].sort((a, b) => {
      if (a.year !== b.year) {
        return b.year - a.year
      }
      return b.quarter - a.quarter
    })
  }

  const getLatestData = () => {
    const sorted = getSortedData()
    const validData = sorted.find(item => item.revenue > 0 || item.net_profit > 0)
    return validData || (sorted.length > 0 ? sorted[0] : null)
  }

  const getLatestDataIndex = () => {
    const sorted = getSortedData()
    return sorted.findIndex(item => item.revenue > 0 || item.net_profit > 0)
  }

  const getChartData = () => {
    return [...financialData]
      .filter(item => item.revenue > 0)
      .sort((a, b) => a.year - b.year)
      .map(item => ({
        year: item.year,
        revenue: Number((item.revenue / 1e8).toFixed(2)),
        netProfit: Number((item.net_profit / 1e8).toFixed(2)),
        grossMargin: Number(item.gross_margin.toFixed(2)),
        netMargin: Number(item.net_margin.toFixed(2)),
        eps: Number(item.eps.toFixed(2))
      }))
  }

  const getGrowthRate = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded mt-4"></div>
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

  if (financialData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-gray-500">
          <p>暂无财务数据</p>
        </div>
      </div>
    )
  }

  const latestData = getLatestData()
  const latestDataIndex = getLatestDataIndex()
  const sortedData = getSortedData()
  const chartData = getChartData()
  const previousYear = latestDataIndex >= 0 && sortedData.length > latestDataIndex + 1 ? sortedData[latestDataIndex + 1] : null

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <PieChart className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            {symbol} 财务数据
          </h3>
        </div>
        <div className="text-sm text-gray-500">
          最近更新: {new Date().toLocaleDateString('zh-CN')}
        </div>
      </div>

      {/* 关键财务指标 */}
      {latestData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">营收</span>
            </div>
            <div className="mt-1">
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(latestData.revenue)}
              </p>
              {previousYear && (
                <p className={`text-xs flex items-center ${
                  getGrowthRate(latestData.revenue, previousYear.revenue) >= 0 
                    ? 'text-green-600' : 'text-red-600'
                }`}>
                  {getGrowthRate(latestData.revenue, previousYear.revenue) >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {formatPercentage(getGrowthRate(latestData.revenue, previousYear.revenue))}
                </p>
              )}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <Activity className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">净利润</span>
            </div>
            <div className="mt-1">
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(latestData.net_profit)}
              </p>
              {previousYear && (
                <p className={`text-xs flex items-center ${
                  getGrowthRate(latestData.net_profit, previousYear.net_profit) >= 0 
                    ? 'text-green-600' : 'text-red-600'
                }`}>
                  {getGrowthRate(latestData.net_profit, previousYear.net_profit) >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {formatPercentage(getGrowthRate(latestData.net_profit, previousYear.net_profit))}
                </p>
              )}
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <PieChart className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-purple-600 font-medium">毛利率</span>
            </div>
            <div className="mt-1">
              <p className="text-lg font-semibold text-gray-900">
                {formatPercentage(latestData.gross_margin)}
              </p>
              {previousYear && (
                <p className={`text-xs flex items-center ${
                  (latestData.gross_margin - previousYear.gross_margin) >= 0 
                    ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(latestData.gross_margin - previousYear.gross_margin) >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {formatPercentage(latestData.gross_margin - previousYear.gross_margin)}
                </p>
              )}
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <Activity className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-orange-600 font-medium">净利率</span>
            </div>
            <div className="mt-1">
              <p className="text-lg font-semibold text-gray-900">
                {formatPercentage(latestData.net_margin)}
              </p>
              {previousYear && (
                <p className={`text-xs flex items-center ${
                  (latestData.net_margin - previousYear.net_margin) >= 0 
                    ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(latestData.net_margin - previousYear.net_margin) >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {formatPercentage(latestData.net_margin - previousYear.net_margin)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 图表控制按钮 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveChart('revenue')}
          className={`px-3 py-1 text-sm rounded-md ${
            activeChart === 'revenue'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          营收趋势
        </button>
        <button
          onClick={() => setActiveChart('profit')}
          className={`px-3 py-1 text-sm rounded-md ${
            activeChart === 'profit'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          利润分析
        </button>
        <button
          onClick={() => setActiveChart('margins')}
          className={`px-3 py-1 text-sm rounded-md ${
            activeChart === 'margins'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          利润率分析
        </button>
      </div>

      {/* 图表区域 */}
      <div className="h-80 mb-4">
        {activeChart === 'revenue' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip formatter={(value, name) => [
                `${getCurrencySymbol()}${value}亿`,
                name === 'revenue' ? '营收' : '净利润'
              ]} />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" name="营收" />
              <Bar dataKey="netProfit" fill="#10b981" name="净利润" />
            </BarChart>
          </ResponsiveContainer>
        )}
        
        {activeChart === 'profit' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip formatter={(value) => [`${getCurrencySymbol()}${value}亿`, '金额']} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="营收" strokeWidth={2} />
              <Line type="monotone" dataKey="netProfit" stroke="#10b981" name="净利润" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
        
        {activeChart === 'margins' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}%`, '利润率']} />
              <Legend />
              <Line type="monotone" dataKey="grossMargin" stroke="#8b5cf6" name="毛利率" strokeWidth={2} />
              <Line type="monotone" dataKey="netMargin" stroke="#f97316" name="净利率" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 详细数据表格 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                年份
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                营收
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                营收同比
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                净利润
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                利润同比
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                毛利率
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                净利率
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                EPS
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ROE
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                年度涨幅
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((item, index) => (
              <tr key={`${item.year}-${item.quarter}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.year}{item.quarter > 0 ? ` Q${item.quarter}` : ''}
                  {isDataEmpty(item) && <span className="ml-1 text-xs text-gray-400">(待公布)</span>}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatCurrency(item.revenue)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <span className={`font-medium ${
                    (item.revenue_yoy || 0) >= 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatPercentage(item.revenue_yoy)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatCurrency(item.net_profit)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <span className={`font-medium ${
                    (item.profit_yoy || 0) >= 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatPercentage(item.profit_yoy)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatMargin(item.gross_margin)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatMargin(item.net_margin)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatEps(item.eps)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatMargin(item.roe)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <span className={`font-medium ${
                    (item.price_yoy || 0) >= 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatPercentage(item.price_yoy)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 数据说明 */}
      <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <p className="font-medium mb-1">数据说明：</p>
        <ul className="space-y-1">
          <li>• 货币单位：{getCurrencyUnit()}</li>
          <li>• 财务数据来源于公开财报，年度数据</li>
          <li>• 同比 = (本期 - 去年同期) / 去年同期 × 100%</li>
          <li>• 毛利率 = 毛利 / 营收 × 100%</li>
          <li>• 净利率 = 净利润 / 营收 × 100%</li>
          <li>• EPS: 每股收益</li>
          <li>• ROE: 净资产收益率</li>
        </ul>
      </div>
    </div>
  )
}