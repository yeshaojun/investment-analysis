'use client'

import { useState, useCallback } from 'react'
import { apiFetch, API_ROUTES } from '@/src/lib/api'
import type { CatalystEvent } from '@/src/types/calendar'

export function useCalendar() {
  const [events, setEvents] = useState<CatalystEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [dataPartial, setDataPartial] = useState(false)

  const fetchEvents = useCallback(async (year: number, month: number) => {
    setLoading(true)
    try {
      const result = await apiFetch<{ events: CatalystEvent[]; data_partial: boolean }>(
        API_ROUTES.calendarEvents(year, month)
      )
      setEvents(result.events || [])
      setDataPartial(result.data_partial || false)
    } catch {
      setEvents([])
      setDataPartial(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUpcoming = useCallback(async (days = 7) => {
    try {
      const result = await apiFetch<{ events: CatalystEvent[] }>(
        API_ROUTES.calendarUpcoming(days)
      )
      return result.events || []
    } catch {
      return []
    }
  }, [])

  return { events, loading, dataPartial, fetchEvents, fetchUpcoming }
}
