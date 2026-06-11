/**
 * Market-domain hooks.
 * Hot stocks, hot industries, financial news.
 */

import { useDataFetch } from '@/src/hooks/useDataFetch'
import { apiFetch, API_ROUTES } from '@/src/lib/api'
import type { HotStock, HotIndustry, NewsItem } from '@/src/types/market'

export function useHotStocks(limit = 20) {
  return useDataFetch<{ stocks: HotStock[] } | null>(
    () => apiFetch(API_ROUTES.marketHotStocks(limit)),
    [limit],
    {
      cacheKey: `market-hot-stocks:${limit}`,
      cacheTTL: 2 * 60 * 1000,
    }
  )
}

export function useHotIndustries(limit = 20) {
  return useDataFetch<{ industries: HotIndustry[] } | null>(
    () => apiFetch(API_ROUTES.marketHotIndustries(limit)),
    [limit],
    {
      cacheKey: `market-hot-industries:${limit}`,
      cacheTTL: 2 * 60 * 1000,
    }
  )
}

export function useMarketNews(limit = 20) {
  return useDataFetch<{ news: NewsItem[] } | null>(
    () => apiFetch(API_ROUTES.marketNews(limit)),
    [limit],
    {
      cacheKey: `market-news:${limit}`,
      cacheTTL: 5 * 60 * 1000,
    }
  )
}

export function usePopularStocks(limit = 10) {
  return useDataFetch<{ stocks: Array<{ symbol: string; name: string; searchCount: number }> } | null>(
    () => apiFetch(API_ROUTES.popular(limit)),
    [limit],
    {
      cacheKey: `popular:${limit}`,
      cacheTTL: 5 * 60 * 1000,
    }
  )
}
