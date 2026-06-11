'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { API_ROUTES, apiFetch } from '@/src/lib/api'
import { formatMarketCap } from '@/src/lib/format'
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/src/components/ui/tabs'
import { TableSkeleton } from '@/src/components/base/Loading'

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

const RANK_BADGE: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
}

export function RankingsCard({ type = 'stocks' }: RankingsCardProps) {
  const [data, setData] = useState<RankingsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'month' | 'year'>('year')

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const url = type === 'sectors'
        ? API_ROUTES.rankingsIndustries(period)
        : API_ROUTES.rankingsStocks(period)
      setData(await apiFetch<RankingsData>(url))
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setIsLoading(false)
    }
  }, [type, period])

  useEffect(() => { fetchData() }, [fetchData])

  const title = type === 'sectors' ? '行业涨跌幅排行' : '股票涨跌幅排行'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as 'month' | 'year')}>
              <TabsList className="h-7">
                <TabsTrigger value="month" className="text-xs px-2.5 h-6">本月</TabsTrigger>
                <TabsTrigger value="year" className="text-xs px-2.5 h-6">今年</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchData}
              disabled={isLoading}
              aria-label="刷新排行榜"
              className="h-7 w-7"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && <TableSkeleton rows={6} />}

        {!isLoading && error && (
          <div className="py-8 text-center">
            <p className="text-destructive text-sm mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchData}>重新加载</Button>
          </div>
        )}

        {!isLoading && !error && data && (
          <>
            {data.rankings.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">暂无排行数据</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 px-2 font-medium w-10">排名</th>
                      <th className="text-left py-2 px-2 font-medium">
                        {type === 'sectors' ? '行业' : '代码/名称'}
                      </th>
                      {type === 'stocks' && (
                        <>
                          <th className="text-right py-2 px-2 font-medium hidden sm:table-cell">价格</th>
                          <th className="text-right py-2 px-2 font-medium hidden md:table-cell">市值</th>
                        </>
                      )}
                      <th className="text-right py-2 px-2 font-medium">涨跌幅</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rankings.map((item, idx) => {
                      const rank = idx + 1
                      const isUp = item.change_percent >= 0
                      return (
                        <tr
                          key={item.symbol ?? item.industry_name ?? idx}
                          className={`border-b border-border/40 hover:bg-muted/40 transition-colors ${
                            rank <= 3 ? 'bg-primary/5' : ''
                          }`}
                        >
                          <td className="py-3 px-2">
                            <span className="text-sm">
                              {RANK_BADGE[rank] ?? (
                                <span className="text-xs text-muted-foreground w-6 inline-block text-center">
                                  {rank}
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <p className="font-medium">
                              {type === 'sectors' ? item.industry_name : item.symbol}
                            </p>
                            {type === 'stocks' && item.name && (
                              <p className="text-xs text-muted-foreground">{item.name}</p>
                            )}
                          </td>
                          {type === 'stocks' && (
                            <>
                              <td className="py-3 px-2 text-right tabular-nums hidden sm:table-cell">
                                {item.price != null ? item.price.toFixed(2) : '—'}
                              </td>
                              <td className="py-3 px-2 text-right text-muted-foreground hidden md:table-cell tabular-nums">
                                {formatMarketCap(item.market_cap)}
                              </td>
                            </>
                          )}
                          <td className="py-3 px-2 text-right">
                            <Badge variant={isUp ? 'up' : 'down'}>
                              {isUp
                                ? <TrendingUp className="h-3 w-3 mr-0.5" aria-hidden="true" />
                                : <TrendingDown className="h-3 w-3 mr-0.5" aria-hidden="true" />}
                              {isUp ? '+' : ''}{item.change_percent.toFixed(2)}%
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-4 text-right">
              {period === 'month' ? '本月' : '今年'} · 共 {data.rankings.length}{' '}
              {type === 'sectors' ? '个行业' : '只股票'} · 数据仅供参考
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
