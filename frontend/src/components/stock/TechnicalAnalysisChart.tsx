'use client'

import { useState, useEffect } from 'react'
import { API_ROUTES, apiFetch } from '@/src/lib/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Brush, Area, BarChart, Bar,
  ReferenceLine, Legend,
} from 'recharts'
import { Calendar, Settings } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { ChartSkeleton } from '@/src/components/base/Loading'

interface TechnicalAnalysisChartProps {
  symbol: string
  period?: string
  interval?: string
}

interface ChartData {
  date: string
  open: number; high: number; low: number; close: number; volume: number
  ma5?: number; ma10?: number; ma20?: number; ma60?: number
  ema12?: number; ema26?: number
  macd?: number; signal?: number; histogram?: number
  rsi?: number
  bb_upper?: number; bb_middle?: number; bb_lower?: number
  k?: number; d?: number; j?: number
  volume_ma?: number; volume_ratio?: number
}

interface HistoricalData {
  symbol: string; period: string; interval: string
  data: ChartData[]
  indicators?: {
    ma5: number[]; ma10: number[]; ma20: number[]; ma60: number[]
    ema12: number[]; ema26: number[]
    macd: { macd: number[]; signal: number[]; histogram: number[] }
    rsi: number[]
    bollinger_bands: { upper: number[]; middle: number[]; lower: number[] }
    kdj: { k: number[]; d: number[]; j: number[] }
    volume_analysis: { volume_ma: number[]; volume_ratio: number[] }
  }
}

const PERIOD_OPTIONS = [
  { value: '1mo', label: '1月' }, { value: '3mo', label: '3月' },
  { value: '6mo', label: '6月' }, { value: '1y', label: '1年' },
]

const INTERVAL_OPTIONS = [
  { value: '1d', label: '日线' }, { value: '1h', label: '小时' },
]

const CHART_TABS = [
  { value: 'price', label: '价格&MA' },
  { value: 'macd', label: 'MACD' },
  { value: 'rsi', label: 'RSI' },
  { value: 'kdj', label: 'KDJ' },
  { value: 'volume', label: '成交量' },
] as const

type ActiveChart = typeof CHART_TABS[number]['value']

function OptionBar({ label, options, value, onChange }: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (_: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-muted-foreground">{label}:</span>
      {options.map((opt) => (
        <Button
          key={opt.value}
          variant={value === opt.value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange(opt.value)}
          className="h-7 px-2.5 text-xs"
        >
          {opt.label}
        </Button>
      ))}
    </div>
  )
}

export function TechnicalAnalysisChart({ symbol, period = '1mo', interval = '1d' }: TechnicalAnalysisChartProps) {
  const [data, setData] = useState<HistoricalData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(period)
  const [selectedInterval, setSelectedInterval] = useState(interval)
  const [activeChart, setActiveChart] = useState<ActiveChart>('price')

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    apiFetch<HistoricalData>(
      API_ROUTES.stockHistory(symbol, selectedPeriod, selectedInterval) + '&indicators=true'
    )
      .then((d) => { if (active) setData(d) })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : '加载失败') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [symbol, selectedPeriod, selectedInterval])

  const fmtLabel = (v: string) => new Date(v).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  const fmtTooltip = (v: string) => new Date(v).toLocaleString('zh-CN')

  const GRID = <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
  const XAXIS = <XAxis dataKey="date" tickFormatter={fmtLabel} tick={{ fontSize: 11 }} />
  const BRUSH = <Brush dataKey="date" height={22} stroke="hsl(var(--border))" />

  if (isLoading) return <Card><CardContent className="pt-6"><ChartSkeleton /></CardContent></Card>

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive text-sm">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm">暂无技术分析数据</p>
        </CardContent>
      </Card>
    )
  }

  const ind = data.indicators
  const chartData: ChartData[] = data.data.map((item, i) => ({
    ...item,
    ma5: ind?.ma5?.[i], ma10: ind?.ma10?.[i], ma20: ind?.ma20?.[i], ma60: ind?.ma60?.[i],
    ema12: ind?.ema12?.[i], ema26: ind?.ema26?.[i],
    macd: ind?.macd?.macd[i], signal: ind?.macd?.signal[i], histogram: ind?.macd?.histogram[i],
    rsi: ind?.rsi?.[i],
    bb_upper: ind?.bollinger_bands?.upper[i],
    bb_middle: ind?.bollinger_bands?.middle[i],
    bb_lower: ind?.bollinger_bands?.lower[i],
    k: ind?.kdj?.k[i], d: ind?.kdj?.d[i], j: ind?.kdj?.j[i],
    volume_ma: ind?.volume_analysis?.volume_ma[i],
    volume_ratio: ind?.volume_analysis?.volume_ratio[i],
  }))

  const renderChart = () => {
    switch (activeChart) {
      case 'macd': return (
        <LineChart data={chartData}>
          {GRID}<XAxis dataKey="date" tickFormatter={fmtLabel} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip labelFormatter={fmtTooltip} /><Legend />
          <Line type="monotone" dataKey="macd" stroke="hsl(var(--primary))" strokeWidth={2} name="MACD" dot={false} />
          <Line type="monotone" dataKey="signal" stroke="#ef4444" strokeWidth={1} name="Signal" dot={false} />
          <Bar dataKey="histogram" fill="#10b981" name="Histogram" />
          <ReferenceLine y={0} stroke="hsl(var(--border))" />{BRUSH}
        </LineChart>
      )
      case 'rsi': return (
        <LineChart data={chartData}>
          {GRID}{XAXIS}<YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip labelFormatter={fmtTooltip} /><Legend />
          <Line type="monotone" dataKey="rsi" stroke="hsl(var(--primary))" strokeWidth={2} name="RSI" dot={false} />
          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" />
          <ReferenceLine y={30} stroke="#10b981" strokeDasharray="4 4" />
          <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="4 4" />{BRUSH}
        </LineChart>
      )
      case 'kdj': return (
        <LineChart data={chartData}>
          {GRID}{XAXIS}<YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip labelFormatter={fmtTooltip} /><Legend />
          <Line type="monotone" dataKey="k" stroke="hsl(var(--primary))" strokeWidth={2} name="K" dot={false} />
          <Line type="monotone" dataKey="d" stroke="#ef4444" strokeWidth={1} name="D" dot={false} />
          <Line type="monotone" dataKey="j" stroke="#10b981" strokeWidth={1} name="J" dot={false} />
          <ReferenceLine y={80} stroke="hsl(var(--border))" strokeDasharray="4 4" />
          <ReferenceLine y={20} stroke="hsl(var(--border))" strokeDasharray="4 4" />{BRUSH}
        </LineChart>
      )
      case 'volume': return (
        <BarChart data={chartData}>
          {GRID}{XAXIS}<YAxis tick={{ fontSize: 11 }} />
          <Tooltip labelFormatter={fmtTooltip} /><Legend />
          <Bar dataKey="volume" fill="hsl(var(--primary))" name="成交量" />
          {ind?.volume_analysis?.volume_ma && (
            <Line type="monotone" dataKey="volume_ma" stroke="#ef4444" strokeWidth={1} name="成交量MA" dot={false} />
          )}{BRUSH}
        </BarChart>
      )
      default: return (
        <LineChart data={chartData}>
          {GRID}{XAXIS}<YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11 }} />
          <Tooltip labelFormatter={fmtTooltip} /><Legend />
          {ind?.bollinger_bands && (
            <Area type="monotone" dataKey="bb_upper" stroke="hsl(var(--border))" fill="hsl(var(--border))" fillOpacity={0.15} name="布林带" dot={false} />
          )}
          <Line type="monotone" dataKey="close" stroke="hsl(var(--primary))" strokeWidth={2} name="收盘价" dot={false} />
          {ind?.ma5 && <Line type="monotone" dataKey="ma5" stroke="#10b981" strokeWidth={1} name="MA5" dot={false} />}
          {ind?.ma10 && <Line type="monotone" dataKey="ma10" stroke="#f59e0b" strokeWidth={1} name="MA10" dot={false} />}
          {ind?.ma20 && <Line type="monotone" dataKey="ma20" stroke="#ef4444" strokeWidth={1} name="MA20" dot={false} />}
          {ind?.ma60 && <Line type="monotone" dataKey="ma60" stroke="#8b5cf6" strokeWidth={1} name="MA60" dot={false} />}
          {BRUSH}
        </LineChart>
      )
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-base">{symbol} 技术分析</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            {selectedPeriod} · {selectedInterval}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap gap-3 mb-4">
          <OptionBar label="周期" options={PERIOD_OPTIONS} value={selectedPeriod} onChange={setSelectedPeriod} />
          <OptionBar label="间隔" options={INTERVAL_OPTIONS} value={selectedInterval} onChange={setSelectedInterval} />
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">指标:</span>
            {CHART_TABS.map((tab) => (
              <Button
                key={tab.value}
                variant={activeChart === tab.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveChart(tab.value)}
                className="h-7 px-2.5 text-xs"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/40 rounded p-3 space-y-0.5">
          <p className="font-medium mb-1">指标说明</p>
          <p>• <strong>MA</strong>：移动平均线，反映价格趋势</p>
          <p>• <strong>MACD</strong>：异同移动平均线，判断趋势强弱</p>
          <p>• <strong>RSI</strong>：相对强弱指数，衡量超买超卖（70超买 / 30超卖）</p>
          <p>• <strong>KDJ</strong>：随机指标，判断买卖时机（80超买 / 20超卖）</p>
          <p>• <strong>布林带</strong>：价格波动范围与趋势通道</p>
        </div>
      </CardContent>
    </Card>
  )
}
