/**
 * RankingsCard component tests
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RankingsCard } from '@/src/components/market/RankingsCard'
import { apiFetch } from '@/src/lib/api'

jest.mock('@/src/lib/api', () => ({
  apiFetch: jest.fn(),
  API_ROUTES: {
    rankingsStocks: (p: string) => `/api/rankings/stocks?period=${p}`,
    rankingsIndustries: (p: string) => `/api/rankings/industries?period=${p}`,
  },
}))

const mockApiFetch = apiFetch as jest.Mock

const MOCK_STOCK_RANKINGS = {
  period: 'year',
  rankings: [
    { symbol: 'NVDA', name: 'NVIDIA', price: 450, change_percent: 85.6,
      volume: 50000000, market_cap: 1100000000000 },
    { symbol: '300750', name: '宁德时代', price: 185, change_percent: -3.2,
      volume: 28000000, market_cap: 810000000000 },
  ],
}

const MOCK_INDUSTRY_RANKINGS = {
  period: 'year',
  rankings: [
    { industry_name: '新能源', change_percent: 25.6, volume: 30000000000, market_cap: 2000000000000 },
    { industry_name: '银行', change_percent: -5.2, volume: 40000000000, market_cap: 3000000000000 },
  ],
}

describe('RankingsCard', () => {
  beforeEach(() => jest.resetAllMocks())

  it('shows stock rankings by default', async () => {
    mockApiFetch.mockResolvedValue(MOCK_STOCK_RANKINGS)
    render(<RankingsCard type="stocks" />)

    await waitFor(() => {
      expect(screen.getByText('NVDA')).toBeInTheDocument()
      expect(screen.getByText('宁德时代')).toBeInTheDocument()
    })
  })

  it('shows industry rankings when type is sectors', async () => {
    mockApiFetch.mockResolvedValue(MOCK_INDUSTRY_RANKINGS)
    render(<RankingsCard type="sectors" />)

    await waitFor(() => {
      expect(screen.getByText('新能源')).toBeInTheDocument()
      expect(screen.getByText('银行')).toBeInTheDocument()
    })
  })

  it('shows positive change badge for gainers', async () => {
    mockApiFetch.mockResolvedValue(MOCK_STOCK_RANKINGS)
    render(<RankingsCard type="stocks" />)

    await waitFor(() => screen.getByText('NVDA'))
    // Badge splits number and % into separate DOM nodes — use container text
    expect(document.body.textContent).toContain('85.60')
  })

  it('shows loading skeleton initially', () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {}))
    const { container } = render(<RankingsCard type="stocks" />)
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('shows error and retry button on failure', async () => {
    mockApiFetch.mockRejectedValue(new Error('加载失败'))
    render(<RankingsCard type="stocks" />)

    await waitFor(() => screen.getByText('重新加载'))
    expect(screen.getByText('重新加载')).toBeInTheDocument()
  })

  it('shows empty state for zero rankings', async () => {
    mockApiFetch.mockResolvedValue({ period: 'year', rankings: [] })
    render(<RankingsCard type="stocks" />)

    await waitFor(() => screen.getByText(/暂无排行数据/))
  })

  it('shows month tab and year tab', async () => {
    mockApiFetch.mockResolvedValue(MOCK_STOCK_RANKINGS)
    render(<RankingsCard type="stocks" />)

    await waitFor(() => screen.getByText('NVDA'))
    expect(screen.getByText('本月')).toBeInTheDocument()
    expect(screen.getByText('今年')).toBeInTheDocument()
  })
})
