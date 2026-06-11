/**
 * StockCard component tests
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { StockCard } from '@/src/components/stock/StockCard'
import * as useStockHooks from '@/src/hooks/useStock'

jest.mock('@/src/hooks/useStock')
const mockUseStockInfo = useStockHooks.useStockInfo as jest.Mock

const MOCK_STOCK = {
  symbol: '600519',
  name: '贵州茅台',
  price: 1685.5,
  change: 12.3,
  changePercent: 0.73,
  volume: 3200000,
  marketCap: 2120000000000,
  sector: '食品饮料',
  industry: '白酒',
  market: 'A股',
  currency: 'CNY',
  lastUpdated: '2024-01-01T00:00:00.000000',
}

describe('StockCard', () => {
  afterEach(() => jest.clearAllMocks())

  it('shows skeleton while loading', () => {
    mockUseStockInfo.mockReturnValue({ data: undefined, isLoading: true, error: null, mutate: jest.fn() })
    const { container } = render(<StockCard symbol="600519" />)
    // Skeleton renders animate-pulse divs
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('renders stock info when data is available', () => {
    mockUseStockInfo.mockReturnValue({
      data: MOCK_STOCK, isLoading: false, error: null, mutate: jest.fn(),
    })
    render(<StockCard symbol="600519" />)

    expect(screen.getByText('600519')).toBeInTheDocument()
    expect(screen.getByText('贵州茅台')).toBeInTheDocument()
    expect(screen.getByText('A股')).toBeInTheDocument()
    expect(screen.getByText(/1685.50/)).toBeInTheDocument()
  })

  it('shows positive change in red (A-share convention)', () => {
    mockUseStockInfo.mockReturnValue({
      data: MOCK_STOCK, isLoading: false, error: null, mutate: jest.fn(),
    })
    render(<StockCard symbol="600519" />)
    const changeEl = screen.getByText(/\+12\.30/)
    expect(changeEl.className).toContain('red')
  })

  it('shows negative change in green', () => {
    mockUseStockInfo.mockReturnValue({
      data: { ...MOCK_STOCK, change: -5.2, changePercent: -0.31 },
      isLoading: false, error: null, mutate: jest.fn(),
    })
    render(<StockCard symbol="600519" />)
    const changeEl = screen.getByText(/-5\.20/)
    expect(changeEl.className).toContain('green')
  })

  it('shows error state with retry button', () => {
    const mutate = jest.fn()
    mockUseStockInfo.mockReturnValue({
      data: undefined, isLoading: false,
      error: new Error('网络超时'), mutate,
    })
    render(<StockCard symbol="600519" />)
    expect(screen.getByText(/加载失败/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('重试'))
    expect(mutate).toHaveBeenCalledTimes(1)
  })

  it('returns null when no data and not loading', () => {
    mockUseStockInfo.mockReturnValue({
      data: null, isLoading: false, error: null, mutate: jest.fn(),
    })
    const { container } = render(<StockCard symbol="600519" />)
    expect(container.firstChild).toBeNull()
  })

  it('calls mutate when refresh button is clicked', () => {
    const mutate = jest.fn()
    mockUseStockInfo.mockReturnValue({
      data: MOCK_STOCK, isLoading: false, error: null, mutate,
    })
    render(<StockCard symbol="600519" />)
    fireEvent.click(screen.getByLabelText('刷新股票数据'))
    expect(mutate).toHaveBeenCalledTimes(1)
  })
})
