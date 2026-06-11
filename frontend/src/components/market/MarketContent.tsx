'use client'

import { useRouter } from 'next/navigation'
import { API_ROUTES, apiFetch } from '@/src/lib/api'
import { ArrowUpRight, ArrowDownRight, ExternalLink, RefreshCw, TrendingUp, BarChart3, Newspaper } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/src/components/ui/tabs'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { Card, CardContent } from '@/src/components/ui/card'
import { LoadingSpinner } from '@/src/components/base/Loading'
import { useAsyncData } from '@/src/hooks/useAsyncData'

interface MarketContentProps {
  activeTab: string
}

interface Stock {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  amount: number
  amplitude: number
  high: number
  low: number
  turnover: number
}

interface Industry {
  name: string
  changePercent: number
  change: number
  leadingStock: string
  leadingPercent: number
  totalMarket: number
  avgTurnover: number
  upCount: number
  downCount: number
}

interface News {
  title: string
  content: string
  source: string
  time: string
  url: string
}

function ErrorCard({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <p className="text-destructive mb-4 text-sm">{error}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
        重新加载
      </Button>
    </div>
  )
}

function HotStocksList() {
  const { data, loading, error, reload } = useAsyncData<{ stocks: Stock[] }>(
    () => apiFetch(API_ROUTES.marketHotStocks(30))
  )

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorCard error={error} onRetry={reload} />

  const stocks = data?.stocks ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">按涨跌幅排序</span>
        <Button variant="ghost" size="icon" onClick={reload} aria-label="刷新热门股票" className="h-8 w-8">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="text-left py-2 px-2 font-medium">股票</th>
              <th className="text-right py-2 px-2 font-medium">最新价</th>
              <th className="text-right py-2 px-2 font-medium">涨跌幅</th>
              <th className="text-right py-2 px-2 font-medium hidden sm:table-cell">成交额</th>
              <th className="text-right py-2 px-2 font-medium hidden md:table-cell">换手率</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock, idx) => (
              <tr key={stock.symbol} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-xs text-muted-foreground">{idx + 1}</span>
                    <div>
                      <div className="font-medium">{stock.name}</div>
                      <div className="text-xs text-muted-foreground">{stock.symbol}</div>
                    </div>
                  </div>
                </td>
                <td className="text-right py-3 px-2 font-medium tabular-nums">{stock.price.toFixed(2)}</td>
                <td className="text-right py-3 px-2">
                  <Badge variant={stock.changePercent >= 0 ? 'up' : 'down'}>
                    {stock.changePercent >= 0
                      ? <ArrowUpRight className="h-3 w-3 mr-0.5" aria-hidden="true" />
                      : <ArrowDownRight className="h-3 w-3 mr-0.5" aria-hidden="true" />}
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </Badge>
                </td>
                <td className="text-right py-3 px-2 text-muted-foreground hidden sm:table-cell tabular-nums">
                  {(stock.amount / 1e8).toFixed(2)}亿
                </td>
                <td className="text-right py-3 px-2 text-muted-foreground hidden md:table-cell tabular-nums">
                  {stock.turnover.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HotIndustriesList() {
  const { data, loading, error, reload } = useAsyncData<{ industries: Industry[] }>(
    () => apiFetch(API_ROUTES.marketHotIndustries(30))
  )

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorCard error={error} onRetry={reload} />

  const industries = data?.industries ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">按涨跌幅排序</span>
        <Button variant="ghost" size="icon" onClick={reload} aria-label="刷新热门行业" className="h-8 w-8">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {industries.map((industry, idx) => (
          <Card key={industry.name} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground w-5">{idx + 1}</span>
                  <span className="font-medium text-sm">{industry.name}</span>
                </div>
                <Badge variant={industry.changePercent >= 0 ? 'up' : 'down'}>
                  {industry.changePercent >= 0 ? '+' : ''}{industry.changePercent.toFixed(2)}%
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>领涨股</span>
                  <span className="text-foreground">
                    {industry.leadingStock}{' '}
                    <span className={industry.leadingPercent >= 0 ? 'text-red-500' : 'text-green-500'}>
                      ({industry.leadingPercent >= 0 ? '+' : ''}{industry.leadingPercent.toFixed(2)}%)
                    </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>涨跌比</span>
                  <span>
                    <span className="text-red-500">{industry.upCount}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-green-500">{industry.downCount}</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function FinancialNewsList() {
  const { data, loading, error, reload } = useAsyncData<{ news: News[] }>(
    () => apiFetch(API_ROUTES.marketNews(30))
  )

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorCard error={error} onRetry={reload} />

  const news = data?.news ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">实时财经资讯</span>
        <Button variant="ghost" size="icon" onClick={reload} aria-label="刷新财经资讯" className="h-8 w-8">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-2">
        {news.map((item, idx) => (
          <a
            key={idx}
            href={item.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm group-hover:text-primary line-clamp-2 mb-1">
                  {item.title}
                </h3>
                {item.content && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.content}</p>
                )}
                <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                  <span>{item.source}</span>
                  <span>·</span>
                  <span>{item.time}</span>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

export function MarketContent({ activeTab }: MarketContentProps) {
  const router = useRouter()

  const handleTabChange = (value: string) => {
    router.push(`/market?tab=${value}`)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">市场行情</h1>
        <p className="text-muted-foreground text-sm">实时热门股票、行业板块和财经资讯</p>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="stocks" className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            热门股票
          </TabsTrigger>
          <TabsTrigger value="industries" className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            热门行业
          </TabsTrigger>
          <TabsTrigger value="news" className="flex items-center gap-1.5">
            <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
            财经资讯
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stocks"><HotStocksList /></TabsContent>
        <TabsContent value="industries"><HotIndustriesList /></TabsContent>
        <TabsContent value="news"><FinancialNewsList /></TabsContent>
      </Tabs>
    </div>
  )
}
