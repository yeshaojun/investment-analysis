'use client'

import { useState, useCallback } from 'react'
import { apiFetch, API_ROUTES } from '@/src/lib/api'
import type { EarningsPreview } from '@/src/types/earningsPreview'

export function useEarningsPreview() {
  const [data, setData] = useState<EarningsPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (symbol: string, quarter: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiFetch<EarningsPreview>(API_ROUTES.earningsPreview(), {
        method: 'POST',
        body: { symbol, quarter },
      })
      setData(result)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, generate }
}
