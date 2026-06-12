'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/src/lib/api'
import { API_ROUTES } from '@/src/lib/api'

export function useWatchlist(symbol?: string) {
  const [symbols, setSymbols] = useState<Array<{ symbol: string; name: string; added_at: string; has_thesis: boolean }>>([])
  const [isWatching, setIsWatching] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchList = useCallback(async () => {
    try {
      const data = await apiFetch<{ symbols: typeof symbols }>(API_ROUTES.watchlist())
      setSymbols(data.symbols)
      if (symbol) {
        setIsWatching(data.symbols.some(s => s.symbol === symbol))
      }
    } catch {
      // ignore
    }
  }, [symbol])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const toggle = useCallback(async () => {
    if (!symbol) return
    setLoading(true)
    try {
      if (isWatching) {
        await apiFetch(API_ROUTES.watchlistRemove(symbol), { method: 'DELETE' })
        setIsWatching(false)
      } else {
        await apiFetch(API_ROUTES.watchlistAdd(symbol), { method: 'POST' })
        setIsWatching(true)
      }
      fetchList()
    } finally {
      setLoading(false)
    }
  }, [symbol, isWatching, fetchList])

  const remove = useCallback(async (target: string) => {
    try {
      await apiFetch(API_ROUTES.watchlistRemove(target), { method: 'DELETE' })
      fetchList()
    } catch {
      // ignore
    }
  }, [fetchList])

  return { symbols, isWatching, loading, toggle, remove, refresh: fetchList }
}
