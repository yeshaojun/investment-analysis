'use client'

import { useStockInfo } from '@/src/hooks/useStock'
import { TrendingUp, TrendingDown, DollarSign, BarChart3, RefreshCw } from 'lucide-react'
import { safeToFixed, formatVolume, formatMarketCap } from '@/src/lib/format'
import { StockCardSkeleton } from '@/src/components/base/Loading'
import { Card, CardHeader, CardContent, CardTitle } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { getCurrencySymbol, getMarketLabel } from '@/src/lib/stockUtils'

interface StockCardProps {
  symbol: string
}

export function StockCard({ symbol }: StockCardProps) {
  const { data: stockInfo, isLoading, error, mutate } = useStockInfo(symbol)

  if (isLoading) return <StockCardSkeleton />

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive text-sm mb-3">加载失败: {error.message}</p>
          <Button variant="outline" size="sm" onClick={mutate}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            重试
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!stockInfo) return null

  const currencySymbol = getCurrencySymbol(stockInfo.currency)
  const marketLabel = getMarketLabel(stockInfo.market)
  const isPositive = (stockInfo.change ?? 0) >= 0
  const marketCap = stockInfo.marketCap ?? 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{stockInfo.symbol}</CardTitle>
              {marketLabel && <Badge variant="secondary">{marketLabel}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{stockInfo.name}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={mutate}
            aria-label="刷新股票数据"
            className="h-8 w-8 text-muted-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {currencySymbol}{safeToFixed(stockInfo.price, 2)}
            </span>
            <span className={`flex items-center text-sm font-medium ${
              isPositive ? 'text-red-500' : 'text-green-500'
            }`}>
              {isPositive
                ? <TrendingUp className="h-4 w-4 mr-1" aria-hidden="true" />
                : <TrendingDown className="h-4 w-4 mr-1" aria-hidden="true" />}
              {isPositive ? '+' : ''}{safeToFixed(stockInfo.change, 2)}{' '}
              ({isPositive ? '+' : ''}{safeToFixed(stockInfo.changePercent, 2)}%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <BarChart3 className="h-4 w-4 text-muted-foreground mr-2" aria-hidden="true" />
            <div>
              <p className="text-xs text-muted-foreground">成交量</p>
              <p className="text-sm font-semibold">{formatVolume(stockInfo.volume)}</p>
            </div>
          </div>
          {marketCap > 0 && (
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-muted-foreground mr-2" aria-hidden="true" />
              <div>
                <p className="text-xs text-muted-foreground">总市值</p>
                <p className="text-sm font-semibold">
                  {currencySymbol}{formatMarketCap(marketCap)}
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          更新时间: {stockInfo.lastUpdated ? new Date(stockInfo.lastUpdated).toLocaleString('zh-CN') : '-'}
        </p>
      </CardContent>
    </Card>
  )
}
