'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, PieChart, Activity } from 'lucide-react'
import { safeToFixed, safeNumber, formatChange, formatMarketCap as _formatMarketCap } from '@/src/lib/format'
import { API_ROUTES, apiFetch } from '@/src/lib/api'
import { getCurrencySymbol } from '@/src/lib/stockUtils'
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/src/components/ui/tabs'
import { FinancialCardSkeleton } from '@/src/components/base/Loading'

interface FinancialDataCardProps {
  symbol: string
}

interface FinancialData {
  symbol: string
  year: number
  quarter: number
  revenue: number | null
  net_profit: number | null
  gross_margin: number | null
  net_margin: number | null
  operating_cash_flow: number | null
  eps: number | null
  roe: number | null
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

const CURRENCY_UNIT: Record<string, string> = {
  CNY: '人民币', HKD: '港币', USD: '美元',
}

function detectCurrency(symbol: string): string {
  if (/^\d{5}$/.test(symbol)) return 'HKD'
  if (/^\d{6}$/.test(symbol)) return 'CNY'
  return 'USD'
}

function isDataEmpty(item: FinancialData) {
  return safeNumber(item.revenue) === 0 && safeNumber(item.net_profit) === 0
}

function growthRate(current: number, previous: number) {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

function periodSortValue(item: FinancialData) {
  return item.quarter === 0 ? 4 : item.quarter
}

function sortFinancialsDesc(a: FinancialData, b: FinancialData) {
  return a.year !== b.year ? b.year - a.year : periodSortValue(b) - periodSortValue(a)
}

function sortFinancialsAsc(a: FinancialData, b: FinancialData) {
  return a.year !== b.year ? a.year - b.year : periodSortValue(a) - periodSortValue(b)
}

function getPeriodLabel(item: FinancialData) {
  return `${item.year}${item.quarter > 0 ? ` Q${item.quarter}` : ''}`
}

function coalesceNumber(...values: Array<number | null | undefined>) {
  return values.find(value => value != null)
}

export function FinancialDataCard({ symbol }: FinancialDataCardProps) {
  const [financialData, setFinancialData] = useState<FinancialData[]>([])
  const [currency, setCurrency] = useState<string>(detectCurrency(symbol))
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeChart, setActiveChart] = useState<'revenue' | 'profit' | 'margins'>('revenue')

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)

    const load = async () => {
      try {
        try {
          const stockData = await apiFetch<StockInfo>(API_ROUTES.stockInfo(symbol))
          if (active && stockData?.currency) setCurrency(stockData.currency)
        } catch { /* non-fatal */ }

        const data = await apiFetch<FinancialResponse>(API_ROUTES.stockFinancials(symbol))
        if (active) setFinancialData(data?.financials ?? [])
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [symbol])

  const currSymbol = getCurrencySymbol(currency)
  const currUnit = CURRENCY_UNIT[currency] ?? ''

  const formatCurrency = (v: unknown) => {
    const n = safeNumber(v)
    return n === 0 ? '-' : _formatMarketCap(n, currSymbol)
  }

  const formatEps = (v: unknown) => {
    const n = safeNumber(v)
    return n === 0 ? '-' : `${currSymbol}${safeToFixed(n, 2)}`
  }

  const sortedData = [...financialData].sort(sortFinancialsDesc)

  const latestIdx = sortedData.findIndex(d => safeNumber(d.revenue) > 0 || safeNumber(d.net_profit) > 0)
  const latestData = latestIdx >= 0 ? sortedData[latestIdx] : sortedData[0] ?? null
  const samePeriodPreviousYear = latestData
    ? sortedData.find(d => d.year === latestData.year - 1 && d.quarter === latestData.quarter) ?? null
    : null
  const revenueDiff = latestData
    ? coalesceNumber(
      latestData.revenue_yoy,
      samePeriodPreviousYear ? growthRate(safeNumber(latestData.revenue), safeNumber(samePeriodPreviousYear.revenue)) : null
    )
    : null
  const profitDiff = latestData
    ? coalesceNumber(
      latestData.profit_yoy,
      samePeriodPreviousYear ? growthRate(safeNumber(latestData.net_profit), safeNumber(samePeriodPreviousYear.net_profit)) : null
    )
    : null

  const chartData = [...financialData]
    .filter(d => safeNumber(d.revenue) > 0)
    .sort(sortFinancialsAsc)
    .map(d => ({
      period: getPeriodLabel(d),
      revenue: Number((safeNumber(d.revenue) / 1e8).toFixed(2)),
      netProfit: Number((safeNumber(d.net_profit) / 1e8).toFixed(2)),
      grossMargin: Number(safeNumber(d.gross_margin).toFixed(2)),
      netMargin: Number(safeNumber(d.net_margin).toFixed(2)),
    }))

  if (isLoading) return <FinancialCardSkeleton />

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive text-sm">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (financialData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm">暂无财务数据</p>
        </CardContent>
      </Card>
    )
  }

  const MetricCard = ({
    icon: Icon, label, value, prev, current, diff: diffProp, color,
  }: {
    icon: React.ElementType
    label: string
    value: string
    prev?: number | null
    current?: number | null
    diff?: number | null
    color: string
  }) => {
    const diff = diffProp ?? (prev != null && current != null ? growthRate(current, prev) : null)
    const isUp = diff != null && diff >= 0
    return (
      <div className={`rounded-lg p-4 ${color}`}>
        <div className="flex items-center justify-between mb-1">
          <Icon className="h-4 w-4 opacity-70" aria-hidden="true" />
          <span className="text-xs font-medium opacity-80">{label}</span>
        </div>
        <p className="text-base font-semibold">{value}</p>
        {diff != null && (
          <p className={`text-xs flex items-center mt-0.5 ${isUp ? 'text-red-500' : 'text-green-500'}`}>
            {isUp
              ? <TrendingUp className="h-3 w-3 mr-0.5" aria-hidden="true" />
              : <TrendingDown className="h-3 w-3 mr-0.5" aria-hidden="true" />}
            {formatChange(diff)}
          </p>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-base">{symbol} 财务数据</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString('zh-CN')}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key metrics */}
        {latestData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              icon={DollarSign} label="营收" color="bg-blue-50 text-blue-900"
              value={formatCurrency(latestData.revenue)}
              diff={revenueDiff}
            />
            <MetricCard
              icon={Activity} label="净利润" color="bg-green-50 text-green-900"
              value={formatCurrency(latestData.net_profit)}
              diff={profitDiff}
            />
            <MetricCard
              icon={PieChart} label="毛利率" color="bg-purple-50 text-purple-900"
              value={formatChange(latestData.gross_margin)}
              current={latestData.gross_margin} prev={samePeriodPreviousYear?.gross_margin}
            />
            <MetricCard
              icon={Activity} label="净利率" color="bg-orange-50 text-orange-900"
              value={formatChange(latestData.net_margin)}
              current={latestData.net_margin} prev={samePeriodPreviousYear?.net_margin}
            />
          </div>
        )}

        {/* Chart tabs */}
        <div>
          <Tabs value={activeChart} onValueChange={(v) => setActiveChart(v as typeof activeChart)}>
            <TabsList className="mb-3">
              <TabsTrigger value="revenue" className="text-xs">营收趋势</TabsTrigger>
              <TabsTrigger value="profit" className="text-xs">利润分析</TabsTrigger>
              <TabsTrigger value="margins" className="text-xs">利润率</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="h-72">
            {activeChart === 'revenue' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v, name) => [
                    `${currSymbol}${v}亿`,
                    name === 'revenue' ? '营收' : '净利润',
                  ]} />
                  <Legend />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" name="营收" />
                  <Bar dataKey="netProfit" fill="#10b981" name="净利润" />
                </BarChart>
              </ResponsiveContainer>
            )}
            {activeChart === 'profit' && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${currSymbol}${v}亿`, '金额']} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="营收" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="netProfit" stroke="#10b981" name="净利润" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
            {activeChart === 'margins' && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v}%`, '利润率']} />
                  <Legend />
                  <Line type="monotone" dataKey="grossMargin" stroke="#8b5cf6" name="毛利率" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="netMargin" stroke="#f97316" name="净利率" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Data table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                {['年份','营收','营收同比','净利润','利润同比','毛利率','净利率','EPS','ROE','年涨幅'].map(h => (
                  <th key={h} className="text-left py-2 px-2 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item) => (
                <tr key={`${item.year}-${item.quarter}`}
                  className="border-b border-border/40 hover:bg-muted/40 transition-colors">
                  <td className="py-2.5 px-2 font-medium whitespace-nowrap">
                    {getPeriodLabel(item)}
                    {isDataEmpty(item) && (
                      <span className="ml-1 text-xs text-muted-foreground">(待公布)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground tabular-nums">{formatCurrency(item.revenue)}</td>
                  <td className="py-2.5 px-2 tabular-nums">
                    <span className={`font-medium ${(item.revenue_yoy ?? 0) >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {formatChange(item.revenue_yoy)}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground tabular-nums">{formatCurrency(item.net_profit)}</td>
                  <td className="py-2.5 px-2 tabular-nums">
                    <span className={`font-medium ${(item.profit_yoy ?? 0) >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {formatChange(item.profit_yoy)}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground">{formatChange(item.gross_margin)}</td>
                  <td className="py-2.5 px-2 text-muted-foreground">{formatChange(item.net_margin)}</td>
                  <td className="py-2.5 px-2 text-muted-foreground tabular-nums">{formatEps(item.eps)}</td>
                  <td className="py-2.5 px-2 text-muted-foreground">{formatChange(item.roe)}</td>
                  <td className="py-2.5 px-2">
                    <span className={`font-medium ${(item.price_yoy ?? 0) >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {formatChange(item.price_yoy)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Note */}
        <p className="text-xs text-muted-foreground bg-muted/40 rounded p-3">
          货币单位：{currUnit} · 财务数据来源于公开财报 ·
          同比 = (本期 - 去年同期) / 去年同期 × 100%
        </p>
      </CardContent>
    </Card>
  )
}
