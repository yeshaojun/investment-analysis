/**
 * Tests for useStock hooks
 */

import { renderHook, waitFor } from '@testing-library/react'
import { useStockInfo, useFinancialData } from '@/src/hooks/useStock'
import { clearAllCache } from '@/src/hooks/useDataFetch'
import { apiFetch } from '@/src/lib/api'

jest.mock('@/src/lib/api', () => ({
  apiFetch: jest.fn(),
  API_ROUTES: {
    stockInfo: (s: string) => `/api/stock/${s}`,
    stockFinancials: (s: string) => `/api/stock/${s}/financials`,
  },
}))

const mockApiFetch = apiFetch as jest.Mock

const MOCK_STOCK = {
  symbol: '600519', name: '贵州茅台', price: 1685.5,
  change: 12.3, changePercent: 0.73, volume: 3200000,
  marketCap: 2120000000000, sector: '食品饮料', industry: '白酒',
  market: 'A股', currency: 'CNY', lastUpdated: '2024-01-01T00:00:00.000000',
}

describe('useStockInfo', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    clearAllCache()
  })

  it('starts in loading state', () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useStockInfo('600519'))
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toBeNull()
  })

  it('resolves data on success', async () => {
    mockApiFetch.mockResolvedValue(MOCK_STOCK)
    const { result } = renderHook(() => useStockInfo('600519'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual(MOCK_STOCK)
    expect(result.current.error).toBeNull()
  })

  it('sets error on failure', async () => {
    mockApiFetch.mockRejectedValue(new Error('API error'))
    const { result } = renderHook(() => useStockInfo('600519'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isError).toBe(true)
    expect(result.current.error?.message).toBe('API error')
    expect(result.current.data).toBeUndefined()
  })

  it('returns null immediately for null symbol', async () => {
    const { result } = renderHook(() => useStockInfo(null))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('does not call apiFetch when symbol is null', async () => {
    const { result } = renderHook(() => useStockInfo(null))
    await waitFor(() => !result.current.isLoading)
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('useFinancialData', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    clearAllCache()
  })

  it('resolves financial data', async () => {
    const mockData = { symbol: 'AAPL', financials: [{ year: 2023, quarter: 0 }] }
    mockApiFetch.mockResolvedValue(mockData)
    const { result } = renderHook(() => useFinancialData('AAPL'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual(mockData)
  })

  it('returns null for null symbol', async () => {
    const { result } = renderHook(() => useFinancialData(null))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})
