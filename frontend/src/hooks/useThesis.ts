'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch, API_ROUTES } from '@/src/lib/api'
import type { Thesis } from '@/src/types/thesis'

export function useThesis(symbol: string) {
  const [thesis, setThesis] = useState<Thesis | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchThesis = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<Thesis>(API_ROUTES.thesis(symbol))
      setThesis(data)
    } catch {
      setThesis(null)
    } finally {
      setLoading(false)
    }
  }, [symbol])

  useEffect(() => {
    fetchThesis()
  }, [fetchThesis])

  const create = useCallback(async (data: Partial<Thesis>) => {
    const result = await apiFetch<Thesis>(API_ROUTES.thesisList(), {
      method: 'POST',
      body: { symbol, ...data },
    })
    setThesis(result)
    return result
  }, [symbol])

  const update = useCallback(async (data: Partial<Thesis>) => {
    const result = await apiFetch<Thesis>(API_ROUTES.thesis(symbol), {
      method: 'PATCH',
      body: data,
    })
    setThesis(result)
    return result
  }, [symbol])

  const updatePillar = useCallback(async (pillarUuid: string, status: string) => {
    const result = await apiFetch<Thesis>(API_ROUTES.thesisPillar(symbol, pillarUuid), {
      method: 'PATCH',
      body: { status },
    })
    setThesis(result)
    return result
  }, [symbol])

  const addCatalyst = useCallback(async (data: { date: string; event: string; impact?: string }) => {
    await apiFetch(API_ROUTES.thesisCatalysts(symbol), {
      method: 'POST',
      body: data,
    })
    fetchThesis()
  }, [symbol, fetchThesis])

  const deleteCatalyst = useCallback(async (catalystId: number) => {
    await apiFetch(API_ROUTES.thesisCatalystDelete(symbol, catalystId), {
      method: 'DELETE',
    })
    fetchThesis()
  }, [symbol, fetchThesis])

  return { thesis, loading, create, update, updatePillar, addCatalyst, deleteCatalyst, refresh: fetchThesis }
}
