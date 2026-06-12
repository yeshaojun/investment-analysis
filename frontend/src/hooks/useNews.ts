'use client'

import { useState, useCallback } from 'react'
import { apiFetch, API_ROUTES } from '@/src/lib/api'
import type { NewsItem, NewsDate } from '@/src/types/news'

export function useNews() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [dates, setDates] = useState<NewsDate[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLatest = useCallback(async (limit = 20) => {
    setLoading(true)
    try {
      const result = await apiFetch<{ news: NewsItem[] }>(API_ROUTES.newsLatest(limit))
      setNews(result.news || [])
    } catch {
      setNews([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchByDate = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const result = await apiFetch<{ news: NewsItem[] }>(API_ROUTES.newsByDate(date))
      setNews(result.news || [])
    } catch {
      setNews([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDates = useCallback(async (days = 30) => {
    try {
      const result = await apiFetch<{ dates: NewsDate[] }>(API_ROUTES.newsDates(days))
      setDates(result.dates || [])
    } catch {
      setDates([])
    }
  }, [])

  const query = useCallback(async (params: {
    symbol?: string; layer?: string; start_date?: string; end_date?: string; min_score?: number
  }) => {
    setLoading(true)
    try {
      const result = await apiFetch<{ news: NewsItem[] }>(API_ROUTES.newsQuery(params))
      setNews(result.news || [])
    } catch {
      setNews([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { news, dates, loading, fetchLatest, fetchByDate, fetchDates, query }
}
