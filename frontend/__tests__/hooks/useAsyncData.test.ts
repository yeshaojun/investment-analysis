/**
 * useAsyncData hook tests
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { useAsyncData } from '@/src/hooks/useAsyncData'

describe('useAsyncData', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() =>
      useAsyncData(() => new Promise<string>(() => {}))
    )
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('resolves data on success', async () => {
    const { result } = renderHook(() =>
      useAsyncData(() => Promise.resolve({ value: 42 }))
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({ value: 42 })
    expect(result.current.error).toBeNull()
  })

  it('sets error on failure', async () => {
    const { result } = renderHook(() =>
      useAsyncData(() => Promise.reject(new Error('load failed')))
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('load failed')
    expect(result.current.data).toBeNull()
  })

  it('sets generic error message for non-Error rejections', async () => {
    const { result } = renderHook(() =>
      useAsyncData(() => Promise.reject('string error'))
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('加载失败')
  })

  it('reloads data when reload is called', async () => {
    let callCount = 0
    const fetcher = () => Promise.resolve(++callCount)
    const { result } = renderHook(() => useAsyncData(fetcher))

    await waitFor(() => expect(result.current.data).toBe(1))

    await act(async () => { result.current.reload() })
    await waitFor(() => expect(result.current.data).toBe(2))
  })

  it('shows loading state during reload', async () => {
    let resolve: (v: string) => void
    const { result, rerender } = renderHook(() =>
      useAsyncData<string>(() => new Promise(r => { resolve = r }))
    )
    // initial load
    act(() => resolve('first'))
    await waitFor(() => expect(result.current.data).toBe('first'))

    // reload
    act(() => {
      result.current.reload()
    })
    expect(result.current.loading).toBe(true)
  })
})
