'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, RefreshCw, Sparkles, DollarSign, Building2 } from 'lucide-react'
import { API_ROUTES, apiFetch } from '@/src/lib/api'
import { renderMarkdown } from '@/src/lib/markdown'
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'

interface InvestmentValueCardProps {
  symbol: string
}

interface AIAnalysis {
  symbol: string
  name: string
  current_price: number
  industry: string
  analysis: string
  sources: string
  error?: string
}

export function InvestmentValueCard({ symbol }: InvestmentValueCardProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalysis = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await apiFetch<AIAnalysis>(API_ROUTES.aiInvestmentValue(symbol), { timeoutMs: 120_000 })
      if (data?.error) throw new Error(data.error)
      setAnalysis(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败')
    } finally {
      setIsLoading(false)
    }
  }, [symbol])

  useEffect(() => { fetchAnalysis() }, [fetchAnalysis])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <RefreshCw className="h-10 w-10 text-primary animate-spin mx-auto mb-4" aria-hidden="true" />
          <p className="font-medium text-sm">AI 正在进行综合投资分析…</p>
          <p className="text-xs text-muted-foreground mt-1.5">包含行业分析、竞争力分析、估值分析等，预计 30–60 秒</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive text-sm mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchAnalysis}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            重新分析
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!analysis) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            <CardTitle className="text-base">AI 综合投资分析</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchAnalysis} aria-label="重新分析" className="h-8 w-8">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          {analysis.name && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              {analysis.name}
            </div>
          )}
          {analysis.current_price > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
              当前价格: {analysis.current_price}
            </div>
          )}
          {analysis.industry && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              {analysis.industry}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div
          className="prose prose-sm max-w-none text-sm text-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis.analysis) }}
        />
        {analysis.sources && (
          <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
            数据来源: {analysis.sources}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
