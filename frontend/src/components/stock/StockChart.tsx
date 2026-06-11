'use client'

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Brush, Area, AreaChart, BarChart, Bar,
} from 'recharts'
import { Calendar, TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { ChartSkeleton } from '@/src/components/base/Loading'
import { useStockHistory } from '@/src/hooks/useStock'

interface StockChartProps {
  symbol: string
  period?: string
  interval?: string
  chartType?: 'line' | 'area' | 'volume'
}

const PERIOD_OPTIONS = [
  { value: '1d', label: '1天' }, { value: '5d', label: '5天' },
  { value: '1mo', label: '1月' }, { value: '3mo', label: '3月' },
  { value: '6mo', label: '6月' }, { value: '1y', label: '1年' },
]

const CHART_OPTIONS = [
  { value: 'line', label: '价格线' },
  { value: 'area', label: '面积图' },
  { value: 'volume', label: '成交量' },
]

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

export function StockChart({
  symbol,
  period = '1mo',
  interval = '1d',
  chartType: initialChartType = 'line',
}: StockChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(period)
  const [chartType, setChartType] = useState(initialChartType)

  const { data, isLoading, error } = useStockHistory(symbol, selectedPeriod, interval)

  const fmtLabel = (v: string) =>
    new Date(v).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })

  if (isLoading) return <Card><CardContent className="pt-6"><ChartSkeleton /></CardContent></Card>

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive text-sm">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm">暂无价格走势数据</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.data

  const renderChart = () => {
    if (chartType === 'area') {
      return (
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tickFormatter={fmtLabel} tick={{ fontSize: 11 }} />
          <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11 }} />
          <Tooltip labelFormatter={(v) => new Date(v).toLocaleString('zh-CN')} />
          <Area type="monotone" dataKey="close" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} dot={false} />
          <Brush dataKey="date" height={24} stroke="hsl(var(--border))" />
        </AreaChart>
      )
    }
    if (chartType === 'volume') {
      return (
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tickFormatter={fmtLabel} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip labelFormatter={(v) => new Date(v).toLocaleString('zh-CN')} />
          <Bar dataKey="volume" fill="hsl(var(--primary))" />
          <Brush dataKey="date" height={24} stroke="hsl(var(--border))" />
        </BarChart>
      )
    }
    return (
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tickFormatter={fmtLabel} tick={{ fontSize: 11 }} />
        <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11 }} />
        <Tooltip labelFormatter={(v) => new Date(v).toLocaleString('zh-CN')} />
        <Line type="monotone" dataKey="close" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        <Brush dataKey="date" height={24} stroke="hsl(var(--border))" />
      </LineChart>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-base">{symbol} 价格走势</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            {selectedPeriod}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap gap-3 mb-4">
          <OptionBar label="周期" options={PERIOD_OPTIONS} value={selectedPeriod} onChange={setSelectedPeriod} />
          <OptionBar label="图表" options={CHART_OPTIONS} value={chartType} onChange={(v) => setChartType(v as typeof chartType)} />
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>

        <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
            收盘价
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
