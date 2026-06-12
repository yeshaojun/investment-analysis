'use client'

import { useState, useEffect } from 'react'
import { useCalendar } from '@/src/hooks/useCalendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const IMPACT_COLORS: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
}

const IMPACT_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay()
}

export default function CalendarPage() {
  const { events, loading, dataPartial, fetchEvents } = useCalendar()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    fetchEvents(year, month)
  }, [year, month, fetchEvents])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)

  const eventsByDate: Record<string, typeof events> = {}
  events.forEach(e => {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = []
    eventsByDate[e.date].push(e)
  })

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDate(null)
  }

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDate(null)
  }

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : []

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-950">催化剂日历</h1>

      {dataPartial && (
        <p className="text-xs text-amber-600">部分数据（akshare 财报日期）获取失败</p>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base">{year}年{month}月</CardTitle>
            <Button variant="ghost" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <div key={d} className="bg-slate-100 p-2 text-center text-xs font-medium text-slate-500">
                {d}
              </div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-white p-2 min-h-[60px]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayEvents = eventsByDate[dateStr] || []
              const isSelected = selectedDate === dateStr
              return (
                <div
                  key={day}
                  className={`bg-white p-2 min-h-[60px] cursor-pointer hover:bg-slate-50 transition-colors ${
                    isSelected ? 'ring-2 ring-slate-950' : ''
                  }`}
                  onClick={() => setSelectedDate(dateStr)}
                >
                  <div className="text-xs font-medium text-slate-700">{day}</div>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap">
                      {dayEvents.slice(0, 3).map((e, j) => (
                        <div
                          key={j}
                          className={`w-1.5 h-1.5 rounded-full ${IMPACT_COLORS[e.impact] || 'bg-slate-400'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{selectedDate} 事件</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-slate-500">无事件</p>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{e.symbol}</span>
                      <span className="text-slate-500 ml-2">{e.event}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {e.source === 'manual' ? '手动' : '自动'}
                      </Badge>
                      <Badge className={`${IMPACT_COLORS[e.impact]} text-white text-xs`}>
                        {IMPACT_LABELS[e.impact]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
