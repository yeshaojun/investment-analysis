/**
 * Search hook.
 */

import { useDataFetch } from '@/src/hooks/useDataFetch'
import { apiFetch, API_ROUTES } from '@/src/lib/api'
import type { StockSearchResult } from '@/src/types/stock'

export function useSearchStocks(query: string) {
  const trimmed = query.trim()
  return useDataFetch<{ results: StockSearchResult[] } | null>(
    () => {
      if (trimmed.length < 2) return Promise.resolve(null)
      return apiFetch(API_ROUTES.search(trimmed))
    },
    [trimmed],
    {
      cacheKey: trimmed.length >= 2 ? `search:${trimmed}` : undefined,
      cacheTTL: 2 * 60 * 1000,
    }
  )
}
