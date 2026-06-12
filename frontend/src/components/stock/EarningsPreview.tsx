'use client'

import { useState } from 'react'
import { useEarningsPreview } from '@/src/hooks/useEarningsPreview'
import { Card, CardContent } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'

const QUARTERS = ['2025Q1', '2025Q2', '2025Q3', '2025Q4', '2024Q4']

export function EarningsPreview({ symbol }: { symbol: string }) {
  const { data, loading, error, generate } = useEarningsPreview()
  const [quarter, setQuarter] = useState(QUARTERS[0])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm"
          value={quarter}
          onChange={e => setQuarter(e.target.value)}
        >
          {QUARTERS.map(q => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={() => generate(symbol, quarter)}
          disabled={loading}
        >
          {loading ? '分析中...' : '生成前瞻'}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              数据来源: {data.data_source === 'analyst_forecast' ? '分析师预测' : '网络搜索'}
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            共识数据来源于公开信息，仅供参考，非精确市场共识
          </p>

          {data.analysis && (
            <Card>
              <CardContent className="pt-4">
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                  {data.analysis}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="text-center py-8 text-sm text-slate-500">
          选择季度后点击&quot;生成前瞻&quot;开始分析
        </div>
      )}
    </div>
  )
}
