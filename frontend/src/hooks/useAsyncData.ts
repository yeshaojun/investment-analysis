import { useState, useCallback, useEffect, useRef } from 'react'

interface UseAsyncDataReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * One-shot async data fetcher with stable reload callback.
 * Designed for fire-and-forget loads (not cache-backed).
 * For cache-backed scenarios use useDataFetch.
 */
export function useAsyncData<T>(fetcher: () => Promise<T>): UseAsyncDataReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetcherRef.current())
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}
