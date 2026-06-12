'use client'

import { useState, useEffect } from 'react'
import { useScreener } from '@/src/hooks/useScreener'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import Link from 'next/link'
import type { PresetKey } from '@/src/types/screener'

const PRESETS: Record<PresetKey, { name: string; description: string; icon: string }> = {
  value: { name: '价值股', description: '低估值 + 高分红', icon: '💎' },
  growth: { name: '成长股', description: '高增长 + 高ROE', icon: '🚀' },
  quality: { name: '质量股', description: '高毛利 + 低负债', icon: '🏆' },
}

export default function ScreenPage() {
  const { results, loading, syncStatus, meta, screen, fetchSyncStatus } = useScreener()
  const [selected, setSelected] = useState<PresetKey>('value')
  const [overrides] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchSyncStatus()
  }, [fetchSyncStatus])

  const isReady = syncStatus && syncStatus.status === 'done'

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-950">选股筛选</h1>

      {!isReady && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <p className="text-sm text-amber-800">
              基本面数据未就绪。请先运行 <code className="font-mono bg-amber-100 px-1 rounded">python backend/scripts/refresh_fundamentals.py</code> 初始化数据。
            </p>
            {syncStatus && (
              <p className="text-xs text-amber-600 mt-1">
                状态: {syncStatus.status} | 进度: {syncStatus.progress}/{syncStatus.total}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(PRESETS) as PresetKey[]).map(key => (
          <Card
            key={key}
            className={`cursor-pointer transition-all ${
              selected === key ? 'ring-2 ring-slate-950 shadow-md' : 'hover:shadow-sm'
            }`}
            onClick={() => setSelected(key)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span>{PRESETS[key].icon}</span>
                {PRESETS[key].name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">{PRESETS[key].description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => screen(selected, overrides)}
          disabled={loading || !isReady}
        >
          {loading ? '筛选中...' : '开始筛选'}
        </Button>
        {meta.data_as_of && (
          <span className="text-xs text-slate-400">数据截至 {meta.data_as_of}</span>
        )}
      </div>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              筛选结果
              <Badge variant="outline" className="ml-2">{meta.count} 只</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-2 font-medium">股票</th>
                    <th className="pb-2 font-medium">行业</th>
                    <th className="pb-2 font-medium text-right">ROE%</th>
                    <th className="pb-2 font-medium text-right">营收增速%</th>
                    <th className="pb-2 font-medium text-right">毛利率%</th>
                    <th className="pb-2 font-medium text-right">PE</th>
                    <th className="pb-2 font-medium text-right">股息率%</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.symbol} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2">
                        <Link href={`/?symbol=${r.symbol}`} className="text-slate-950 hover:underline font-medium">
                          {r.name}
                        </Link>
                        <span className="text-slate-400 ml-1">{r.symbol}</span>
                      </td>
                      <td className="py-2 text-slate-500">{r.industry || '-'}</td>
                      <td className="py-2 text-right">{r.roe?.toFixed(1) ?? '-'}</td>
                      <td className="py-2 text-right">{r.revenue_growth?.toFixed(1) ?? '-'}</td>
                      <td className="py-2 text-right">{r.gross_margin?.toFixed(1) ?? '-'}</td>
                      <td className="py-2 text-right">{r.pe?.toFixed(1) ?? '-'}</td>
                      <td className="py-2 text-right">{r.dividend_yield?.toFixed(2) ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length === 0 && !loading && meta.count === 0 && isReady && (
        <div className="text-center py-8 text-sm text-slate-500">
          当前条件下无符合股票，建议适当放宽阈值
        </div>
      )}
    </div>
  )
}
