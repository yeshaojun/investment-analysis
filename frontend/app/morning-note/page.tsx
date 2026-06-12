'use client'

import { useState, useEffect } from 'react'
import { useMorningNote } from '@/src/hooks/useMorningNote'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { RefreshCw } from 'lucide-react'

const SECTION_LABELS: Record<string, string> = {
  price_overview: '价格速览',
  company_news: '个股动态',
  industry_news: '产业动态',
  macro_policy: '宏观政策',
  action_bias: '操作倾向',
}

export default function MorningNotePage() {
  const { note, todayStatus, loading, history, fetchNote, triggerGenerate, fetchHistory } = useMorningNote()
  const [showHistory, setShowHistory] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    fetchNote()
    fetchHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDateClick = (date: string) => {
    setSelectedDate(date)
    fetchNote(date)
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-950">每日早报</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
            历史简报
          </Button>
          <Button size="sm" onClick={triggerGenerate} disabled={todayStatus === 'generating'}>
            <RefreshCw className={`h-4 w-4 mr-1 ${todayStatus === 'generating' ? 'animate-spin' : ''}`} />
            {todayStatus === 'generating' ? '生成中...' : '重新生成'}
          </Button>
        </div>
      </div>

      {todayStatus === 'generating' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-3">
            <p className="text-sm text-blue-800">今日简报生成中，请稍候...</p>
          </CardContent>
        </Card>
      )}

      {todayStatus === 'failed' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 flex items-center justify-between">
            <p className="text-sm text-red-800">
              生成失败: {note?.error || '未知错误'}
            </p>
            <Button size="sm" variant="outline" onClick={triggerGenerate}>
              重试
            </Button>
          </CardContent>
        </Card>
      )}

      {note && note.status === 'success' && note.content && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{note.date}</Badge>
            {note.regenerated && <Badge className="bg-amber-100 text-amber-800">重新生成</Badge>}
          </div>

          {note.content.sections ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(SECTION_LABELS).map(([key, label]) => (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">
                      {note.content!.sections?.[key as keyof typeof note.content.sections] || '-'}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-slate-700 whitespace-pre-wrap">
                  {note.content.raw_text}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!note && !loading && (
        <div className="text-center py-12 text-sm text-slate-500">
          暂无简报，点击&quot;重新生成&quot;开始
        </div>
      )}

      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">历史简报（最近30天）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {history.map(h => (
                <button
                  key={h.date}
                  className={`text-xs p-2 rounded border transition-colors ${
                    h.status === 'success'
                      ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                      : h.status === 'missing'
                      ? 'border-slate-200 bg-slate-50 text-slate-400'
                      : 'border-red-200 bg-red-50 text-red-600'
                  } ${selectedDate === h.date ? 'ring-2 ring-slate-950' : ''}`}
                  onClick={() => h.status === 'success' && handleDateClick(h.date)}
                  disabled={h.status !== 'success'}
                >
                  {h.date.slice(5)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
