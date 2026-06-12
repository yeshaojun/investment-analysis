'use client'

import { useState } from 'react'
import { useThesis } from '@/src/hooks/useThesis'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Badge } from '@/src/components/ui/badge'
import { Button } from '@/src/components/ui/button'
import { Trash2, Plus } from 'lucide-react'
import type { Conviction } from '@/src/types/thesis'

const CONVICTION_COLORS: Record<Conviction, string> = {
  high: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-red-100 text-red-800',
}

const PILLAR_STATUS_COLORS: Record<string, string> = {
  on_track: 'bg-emerald-100 text-emerald-800',
  watch: 'bg-amber-100 text-amber-800',
  concerning: 'bg-red-100 text-red-800',
  invalidated: 'bg-gray-100 text-gray-500',
}

const PILLAR_STATUS_LABELS: Record<string, string> = {
  on_track: '正常',
  watch: '关注',
  concerning: '担忧',
  invalidated: '已失效',
}

export function ThesisTracker({ symbol }: { symbol: string }) {
  const { thesis, loading, create, updatePillar, deleteCatalyst } = useThesis(symbol)
  const [creating, setCreating] = useState(false)
  const [statement, setStatement] = useState('')
  const [pillarName, setPillarName] = useState('')
  const [riskText, setRiskText] = useState('')

  if (loading) {
    return <div className="text-sm text-slate-500 py-4">加载中...</div>
  }

  if (!thesis && !creating) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-slate-500">暂无投资逻辑</p>
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          创建投资逻辑
        </Button>
      </div>
    )
  }

  if (creating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">创建投资逻辑</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium">核心论点</label>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={statement}
              onChange={e => setStatement(e.target.value)}
              placeholder="描述你的核心投资逻辑..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">逻辑支柱（每行一个）</label>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={pillarName}
              onChange={e => setPillarName(e.target.value)}
              placeholder="支柱1&#10;支柱2&#10;支柱3"
            />
          </div>
          <div>
            <label className="text-sm font-medium">风险因素（每行一个）</label>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              value={riskText}
              onChange={e => setRiskText(e.target.value)}
              placeholder="风险1&#10;风险2"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                const pillars = pillarName.split('\n').filter(Boolean).map(name => ({
                  id: '', name, status: 'on_track' as const,
                }))
                const risks = riskText.split('\n').filter(Boolean)
                await create({ thesis_statement: statement, pillars, risks } as any)
                setCreating(false)
              }}
              disabled={!statement}
            >
              创建
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCreating(false)}>
              取消
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">投资逻辑</CardTitle>
            <Badge className={CONVICTION_COLORS[thesis!.conviction]}>
              信心: {thesis!.conviction === 'high' ? '高' : thesis!.conviction === 'medium' ? '中' : '低'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700">{thesis!.thesis_statement}</p>
          <p className="text-xs text-slate-400 mt-2">版本 {thesis!.version}</p>
        </CardContent>
      </Card>

      {thesis!.pillars.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">逻辑支柱</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {thesis!.pillars.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                <span className="text-sm">{p.name}</span>
                <select
                  className={`text-xs rounded px-2 py-1 border-0 ${PILLAR_STATUS_COLORS[p.status]}`}
                  value={p.status}
                  onChange={e => updatePillar(p.id, e.target.value)}
                >
                  {Object.entries(PILLAR_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {thesis!.risks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">风险因素</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {thesis!.risks.map((r, i) => (
                <li key={i} className="text-sm text-slate-600">{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {thesis!.catalysts && thesis!.catalysts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">催化剂事件</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {thesis!.catalysts.map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span>
                  <span className="text-slate-400">{c.date}</span> {c.event}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => deleteCatalyst(c.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
