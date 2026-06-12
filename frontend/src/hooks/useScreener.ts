'use client'

import { useState, useCallback } from 'react'
import { apiFetch, API_ROUTES } from '@/src/lib/api'
import type { ScreenerResult, SyncStatus, PresetKey } from '@/src/types/screener'

export function useScreener() {
  const [results, setResults] = useState<ScreenerResult[]>([])
  const [loading, setLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [meta, setMeta] = useState<{ count: number; data_as_of?: string }>({ count: 0 })

  const fetchSyncStatus = useCallback(async () => {
    try {
      const data = await apiFetch<SyncStatus>(API_ROUTES.screenerSyncStatus())
      setSyncStatus(data)
    } catch {
      setSyncStatus(null)
    }
  }, [])

  const screen = useCallback(async (preset: PresetKey, overrides?: Record<string, number>) => {
    setLoading(true)
    try {
      const result = await apiFetch<{ results: ScreenerResult[]; count: number; data_as_of?: string }>(
        API_ROUTES.screenerScreen(),
        { method: 'POST', body: { preset, overrides } }
      )
      setResults(result.results || [])
      setMeta({ count: result.count || 0, data_as_of: result.data_as_of })
    } catch {
      setResults([])
      setMeta({ count: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  return { results, loading, syncStatus, meta, screen, fetchSyncStatus }
}
