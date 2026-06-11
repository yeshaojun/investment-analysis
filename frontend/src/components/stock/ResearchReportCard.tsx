'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, RefreshCw, Sparkles, TrendingUp, Building2, ExternalLink } from 'lucide-react'
import { API_ROUTES, apiFetch } from '@/src/lib/api'
import { renderMarkdown } from '@/src/lib/markdown'
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'

interface ResearchReportCardProps {
  symbol: string
}

interface Report {
  title: string
  rating: string
  institution: string
  date: string
  industry: string
  pdf_url: string
  eps_forecast: Record<string, { eps: number; pe: number | null }>
}

interface ResearchSummary {
  symbol: string
  name: string
  current_price: number
  report_count: number
  summary: string
  reports: Report[]
  sources: string
  error?: string
}

function getRatingVariant(rating: string): 'up' | 'down' | 'secondary' | 'neutral' {
  if (rating.includes('买入') || rating.includes('强烈推荐')) return 'up'
  if (rating.includes('卖出') || rating.includes('减持')) return 'down'
  if (rating.includes('增持') || rating.includes('推荐')) return 'secondary'
  return 'neutral'
}

export function ResearchReportCard({ symbol }: ResearchReportCardProps) {
  const [data, setData] = useState<ResearchSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await apiFetch<ResearchSummary>(API_ROUTES.aiResearchSummary(symbol, 5), { timeoutMs: 120_000 })
      if (result?.error) throw new Error(result.error)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败')
    } finally {
      setIsLoading(false)
    }
  }, [symbol])

  useEffect(() => { fetchData() }, [fetchData])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <RefreshCw className="h-10 w-10 text-primary animate-spin mx-auto mb-4" aria-hidden="true" />
          <p className="font-medium text-sm">AI 正在分析券商研报…</p>
          <p className="text-xs text-muted-foreground mt-1.5">预计需要 15–30 秒</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive text-sm mb-3">研报分析失败: {error}</p>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            重新分析
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" aria-hidden="true" />
          <p className="text-muted-foreground text-sm mb-4">暂无研报数据</p>
          <Button variant="outline" size="sm" onClick={fetchData}>获取研报</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
            <CardTitle className="text-base flex items-center gap-1.5">
              券商研报分析
              <Sparkles className="h-3.5 w-3.5 text-yellow-500" aria-hidden="true" />
            </CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchData} aria-label="重新分析" className="h-8 w-8">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          {data.name && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              {data.name}
            </span>
          )}
          {data.current_price > 0 && (
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
              ¥{data.current_price.toFixed(2)}
            </Badge>
          )}
          {data.report_count > 0 && (
            <Badge variant="outline">{data.report_count} 篇研报</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {data.reports?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              最近研报列表
            </h4>
            <div className="space-y-2">
              {data.reports.map((report, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5 mb-1">
                      <Badge variant={getRatingVariant(report.rating)}>{report.rating}</Badge>
                      <span className="text-xs text-muted-foreground">{report.institution}</span>
                      <span className="text-xs text-muted-foreground/60">{report.date}</span>
                    </div>
                    <p className="text-sm truncate">{report.title}</p>
                    {report.eps_forecast && Object.keys(report.eps_forecast).length > 0 && (
                      <div className="flex gap-3 mt-1">
                        {Object.entries(report.eps_forecast).slice(0, 3).map(([year, forecast]) => (
                          <span key={year} className="text-xs text-primary">
                            {year} EPS: {forecast.eps.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {report.pdf_url && (
                    <a
                      href={report.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`查看 ${report.title} PDF`}
                      className="ml-3 p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-yellow-500" aria-hidden="true" />
            AI 研报总结
          </h4>
          <div
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(data.summary) }}
          />
        </div>

        {data.sources && (
          <p className="text-xs text-muted-foreground pt-3 border-t border-border">
            {data.sources} · {new Date().toLocaleString('zh-CN')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
