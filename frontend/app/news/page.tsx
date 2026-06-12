'use client'

import { useState, useEffect } from 'react'
import { useNews } from '@/src/hooks/useNews'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { LAYER_LABELS, LAYER_COLORS } from '@/src/types/news'
import type { NewsLayer } from '@/src/types/news'

function ScoreBar({ score }: { score: number }) {
  const color = score >= 0.7 ? 'bg-red-500' : score >= 0.4 ? 'bg-amber-500' : 'bg-slate-300'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score * 100}%` }} />
      </div>
      <span className="text-xs text-slate-500">{(score * 100).toFixed(0)}</span>
    </div>
  )
}

export default function NewsPage() {
  const { news, dates, loading, fetchLatest, fetchByDate, fetchDates, query } = useNews()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [filterLayer, setFilterLayer] = useState<NewsLayer | null>(null)
  const [filterSymbol, setFilterSymbol] = useState('')

  useEffect(() => {
    fetchDates()
    fetchLatest()
  }, [])

  const handleDateClick = (date: string) => {
    setSelectedDate(date)
    fetchByDate(date)
  }

  const handleFilter = () => {
    const params: Record<string, string | number> = {}
    if (filterLayer) params.layer = filterLayer
    if (filterSymbol) params.symbol = filterSymbol
    if (selectedDate) { params.start_date = selectedDate; params.end_date = selectedDate }
    query(params)
  }

  const handleReset = () => {
    setFilterLayer(null)
    setFilterSymbol('')
    setSelectedDate(null)
    fetchLatest()
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-950">新闻回溯</h1>
        <span className="text-sm text-slate-500">{news.length} 条新闻</span>
      </div>

      {/* Date sidebar + Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
        {/* Date list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">日期</CardTitle>
          </CardHeader>
          <CardContent className="p-2 max-h-[600px] overflow-y-auto">
            {dates.length === 0 && (
              <p className="text-xs text-slate-400 p-2">暂无历史新闻</p>
            )}
            {dates.map(d => (
              <button
                key={d.date}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  selectedDate === d.date
                    ? 'bg-slate-950 text-white'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
                onClick={() => handleDateClick(d.date)}
              >
                <div className="flex items-center justify-between">
                  <span>{d.date.slice(5)}</span>
                  <span className={`text-xs ${selectedDate === d.date ? 'text-slate-300' : 'text-slate-400'}`}>
                    {d.count}条
                  </span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* News list */}
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="py-3 flex flex-wrap items-center gap-3">
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={filterLayer === null ? 'default' : 'outline'}
                  onClick={() => setFilterLayer(null)}
                >
                  全部
                </Button>
                {(Object.keys(LAYER_LABELS) as NewsLayer[]).map(layer => (
                  <Button
                    key={layer}
                    size="sm"
                    variant={filterLayer === layer ? 'default' : 'outline'}
                    onClick={() => setFilterLayer(filterLayer === layer ? null : layer)}
                  >
                    {LAYER_LABELS[layer]}
                  </Button>
                ))}
              </div>
              <input
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm w-32"
                placeholder="股票代码"
                value={filterSymbol}
                onChange={e => setFilterSymbol(e.target.value)}
              />
              <Button size="sm" onClick={handleFilter}>筛选</Button>
              <Button size="sm" variant="ghost" onClick={handleReset}>重置</Button>
            </CardContent>
          </Card>

          {/* News items */}
          {loading && <p className="text-sm text-slate-500">加载中...</p>}

          {!loading && news.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-slate-500">
                暂无新闻数据。早报生成时会自动归档新闻。
              </CardContent>
            </Card>
          )}

          {news.map(n => (
            <Card key={n.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${LAYER_COLORS[n.layer]} text-xs`}>
                        {LAYER_LABELS[n.layer]}
                      </Badge>
                      {n.symbol && (
                        <span className="text-xs text-slate-400 font-mono">{n.symbol}</span>
                      )}
                      <span className="text-xs text-slate-400">{n.date}</span>
                    </div>
                    <h3 className="text-sm font-medium text-slate-900 line-clamp-2">
                      {n.title}
                    </h3>
                    {n.snippet && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.snippet}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <ScoreBar score={n.score} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
