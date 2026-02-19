import { useState, useEffect, useCallback, useRef } from 'react'

interface UseDataFetchOptions<T> {
  initialData?: T
  cacheKey?: string
  cacheTTL?: number
  dedupInterval?: number
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

interface UseDataFetchReturn<T> {
  data: T | undefined
  error: Error | null
  isLoading: boolean
  isError: boolean
  mutate: () => void
}

const memoryCache = new Map<string, { data: unknown; timestamp: number }>()
const inflightRequests = new Map<string, Promise<unknown>>()

function getFromCache<T>(key: string, ttl: number): T | null {
  const cached = memoryCache.get(key)
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data as T
  }
  return null
}

function setToCache<T>(key: string, data: T): void {
  memoryCache.set(key, { data, timestamp: Date.now() })
}

export function useDataFetch<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
  options: UseDataFetchOptions<T> = {}
): UseDataFetchReturn<T> {
  const {
    initialData,
    cacheKey,
    cacheTTL = 5 * 60 * 1000,
    dedupInterval = 1000,
    onSuccess,
    onError,
  } = options

  const [data, setData] = useState<T | undefined>(initialData)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const lastFetchTime = useRef(0)
  const mounted = useRef(true)

  const fetchData = useCallback(async () => {
    if (!mounted.current) return
    
    const now = Date.now()
    if (now - lastFetchTime.current < dedupInterval) {
      return
    }
    lastFetchTime.current = now

    if (cacheKey) {
      const cachedData = getFromCache<T>(cacheKey, cacheTTL)
      if (cachedData) {
        setData(cachedData)
        return
      }
    }

    if (cacheKey && inflightRequests.has(cacheKey)) {
      try {
        const result = await inflightRequests.get(cacheKey) as T
        if (mounted.current) {
          setData(result)
        }
      } catch (err) {
        if (mounted.current) {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      }
      return
    }

    setIsLoading(true)
    setError(null)

    const request = fetcher()
    if (cacheKey) {
      inflightRequests.set(cacheKey, request)
    }

    try {
      const result = await request
      if (mounted.current) {
        setData(result)
        if (cacheKey) {
          setToCache(cacheKey, result)
        }
        onSuccess?.(result)
      }
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)))
        onError?.(err instanceof Error ? err : new Error(String(err)))
      }
    } finally {
      if (mounted.current) {
        setIsLoading(false)
      }
      if (cacheKey) {
        inflightRequests.delete(cacheKey)
      }
    }
  }, [fetcher, cacheKey, cacheTTL, dedupInterval, onSuccess, onError])

  const mutate = useCallback(() => {
    if (cacheKey) {
      memoryCache.delete(cacheKey)
    }
    lastFetchTime.current = 0
    fetchData()
  }, [fetchData, cacheKey])

  useEffect(() => {
    mounted.current = true
    fetchData()
    return () => {
      mounted.current = false
    }
  }, [...deps, fetchData])

  return {
    data,
    error,
    isLoading,
    isError: error !== null,
    mutate,
  }
}

export function useStockInfo(symbol: string | null) {
  return useDataFetch(
    async () => {
      if (!symbol) return null
      const res = await fetch(`/api/stock/${symbol}`)
      if (!res.ok) throw new Error('获取股票信息失败')
      return res.json()
    },
    [symbol],
    {
      cacheKey: symbol ? `stock-info-${symbol}` : undefined,
      cacheTTL: 5 * 60 * 1000,
    }
  )
}

export function useStockHistory(symbol: string | null, period = '1mo') {
  return useDataFetch(
    async () => {
      if (!symbol) return null
      const res = await fetch(`/api/stock/${symbol}/history?period=${period}`)
      if (!res.ok) throw new Error('获取历史数据失败')
      return res.json()
    },
    [symbol, period],
    {
      cacheKey: symbol ? `stock-history-${symbol}-${period}` : undefined,
      cacheTTL: 5 * 60 * 1000,
    }
  )
}

export function useFinancialData(symbol: string | null) {
  return useDataFetch(
    async () => {
      if (!symbol) return null
      const res = await fetch(`/api/stock/${symbol}/financials`)
      if (!res.ok) throw new Error('获取财务数据失败')
      return res.json()
    },
    [symbol],
    {
      cacheKey: symbol ? `financial-data-${symbol}` : undefined,
      cacheTTL: 10 * 60 * 1000,
    }
  )
}

export function clearAllCache() {
  memoryCache.clear()
  inflightRequests.clear()
}
