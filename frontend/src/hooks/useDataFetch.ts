/**
 * Base data-fetching hook — low-level only.
 * Business hooks live in src/hooks/{domain}.ts
 */

import { useCallback, useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// In-process cache (module singleton, lives until page reload)
// ---------------------------------------------------------------------------

const memoryCache = new Map<string, { data: unknown; timestamp: number }>()
const inflightRequests = new Map<string, Promise<unknown>>()

function getFromCache<T>(key: string, ttl: number): T | null {
  const cached = memoryCache.get(key)
  if (cached && Date.now() - cached.timestamp < ttl) return cached.data as T
  return null
}

function setToCache<T>(key: string, data: T): void {
  memoryCache.set(key, { data, timestamp: Date.now() })
}

export function clearAllCache(): void {
  memoryCache.clear()
  inflightRequests.clear()
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseDataFetchOptions<T> {
  initialData?: T
  cacheKey?: string
  cacheTTL?: number
  dedupInterval?: number
  onSuccess?: (_data: T) => void
  onError?: (_error: Error) => void
}

export interface UseDataFetchReturn<T> {
  data: T | undefined
  error: Error | null
  isLoading: boolean
  isError: boolean
  mutate: () => void
}

// ---------------------------------------------------------------------------
// useDataFetch
// ---------------------------------------------------------------------------

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
    if (now - lastFetchTime.current < dedupInterval) return
    lastFetchTime.current = now

    if (cacheKey) {
      const hit = getFromCache<T>(cacheKey, cacheTTL)
      if (hit !== null) { setData(hit); return }
    }

    if (cacheKey && inflightRequests.has(cacheKey)) {
      try {
        const result = await inflightRequests.get(cacheKey) as T
        if (mounted.current) setData(result)
      } catch (err) {
        if (mounted.current) setError(err instanceof Error ? err : new Error(String(err)))
      }
      return
    }

    setIsLoading(true)
    setError(null)

    const request = fetcher()
    if (cacheKey) inflightRequests.set(cacheKey, request)

    try {
      const result = await request
      if (mounted.current) {
        setData(result)
        if (cacheKey) setToCache(cacheKey, result)
        onSuccess?.(result)
      }
    } catch (err) {
      if (mounted.current) {
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        onError?.(e)
      }
    } finally {
      if (mounted.current) setIsLoading(false)
      if (cacheKey) inflightRequests.delete(cacheKey)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, cacheKey, cacheTTL, dedupInterval, onSuccess, onError])

  const mutate = useCallback(() => {
    if (cacheKey) memoryCache.delete(cacheKey)
    lastFetchTime.current = 0
    fetchData()
  }, [fetchData, cacheKey])

  useEffect(() => {
    mounted.current = true
    fetchData()
    return () => { mounted.current = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, fetchData])

  return { data, error, isLoading, isError: error !== null, mutate }
}
