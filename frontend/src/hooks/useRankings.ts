/**
 * Rankings hooks.
 */

import { useDataFetch } from '@/src/hooks/useDataFetch'
import { apiFetch, API_ROUTES } from '@/src/lib/api'
import type { RankingStock, RankingIndustry } from '@/src/types/market'

export function useStockRankings(period = 'year', limit = 50) {
  return useDataFetch<{ rankings: RankingStock[]; period: string } | null>(
    () => apiFetch(API_ROUTES.rankingsStocks(period, limit)),
    [period, limit],
    {
      cacheKey: `rankings-stocks:${period}:${limit}`,
      cacheTTL: 10 * 60 * 1000,
    }
  )
}

export function useIndustryRankings(period = 'year') {
  return useDataFetch<{ rankings: RankingIndustry[]; period: string } | null>(
    () => apiFetch(API_ROUTES.rankingsIndustries(period)),
    [period],
    {
      cacheKey: `rankings-industries:${period}`,
      cacheTTL: 10 * 60 * 1000,
    }
  )
}
