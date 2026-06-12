'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch, API_ROUTES } from '@/src/lib/api'
import type { MorningNote } from '@/src/types/morningNote'

interface MorningNoteResult {
  note: MorningNote | null
  today_status: string
}

export function useMorningNote() {
  const [note, setNote] = useState<MorningNote | null>(null)
  const [todayStatus, setTodayStatus] = useState<string>('unknown')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Array<{ date: string; status: string }>>([])
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const fetchNote = useCallback(async (date?: string) => {
    setLoading(true)
    try {
      const data = await apiFetch<MorningNoteResult>(API_ROUTES.morningNote(date))
      setNote(data.note)
      setTodayStatus(data.today_status)
      if (data.today_status === 'generating' && !date) {
        startPolling()
      } else {
        stopPolling()
      }
    } catch {
      stopPolling()
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      try {
        const data = await apiFetch<MorningNoteResult>(API_ROUTES.morningNote())
        setNote(data.note)
        setTodayStatus(data.today_status)
        if (data.today_status !== 'generating') {
          stopPolling()
        }
      } catch {
        stopPolling()
      }
    }, 5000)
  }, [stopPolling])

  const triggerGenerate = useCallback(async () => {
    try {
      await apiFetch(API_ROUTES.morningNoteGenerate(), { method: 'POST' })
      setTodayStatus('generating')
      startPolling()
    } catch {
      // ignore
    }
  }, [startPolling])

  const fetchHistory = useCallback(async (days = 30) => {
    try {
      const result = await apiFetch<{ history: Array<{ date: string; status: string }> }>(
        API_ROUTES.morningNoteHistory(days)
      )
      setHistory(result.history || [])
    } catch {
      setHistory([])
    }
  }, [])

  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  return {
    note, todayStatus, loading, history,
    fetchNote, triggerGenerate, fetchHistory,
  }
}
