/**
 * FinancialDataCard component tests
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { FinancialDataCard } from '@/src/components/stock/FinancialDataCard'
import { API_ROUTES, apiFetch } from '@/src/lib/api'

// recharts uses DOM APIs unavailable in jsdom — mock it
jest.mock('recharts', () => {
  const MockComp = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  return {
    BarChart: MockComp, Bar: MockComp, LineChart: MockComp, Line: MockComp,
    XAxis: MockComp, YAxis: MockComp, CartesianGrid: MockComp,
    Tooltip: MockComp, Legend: MockComp, ResponsiveContainer: MockComp,
  }
})

jest.mock('@/src/lib/api', () => ({
  apiFetch: jest.fn(),
  API_ROUTES: {
    stockInfo: (s: string) => `/api/stock/${s}`,
    stockFinancials: (s: string) => `/api/stock/${s}/financials`,
  },
}))

const mockApiFetch = apiFetch as jest.Mock

const MOCK_FINANCIALS = {
  symbol: 'AAPL',
  financials: [
    {
      symbol: 'AAPL', year: 2023, quarter: 0,
      revenue: 383285000000, net_profit: 96995000000,
      gross_margin: 44.1, net_margin: 25.3,
      operating_cash_flow: 114000000000, eps: 6.13, roe: 26.4,
      revenue_yoy: -2.8, profit_yoy: -2.8, price_yoy: null,
    },
    {
      symbol: 'AAPL', year: 2022, quarter: 0,
      revenue: 394328000000, net_profit: 99803000000,
      gross_margin: 43.3, net_margin: 25.3,
      operating_cash_flow: 122000000000, eps: 6.11, roe: 28.3,
      revenue_yoy: null, profit_yoy: null, price_yoy: null,
    },
  ],
}

const MOCK_STOCK = { symbol: 'AAPL', name: 'Apple Inc.', currency: 'USD' }

describe('FinancialDataCard', () => {
  beforeEach(() => jest.resetAllMocks())

  it('shows loading skeleton initially', () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {}))
    const { container } = render(<FinancialDataCard symbol="AAPL" />)
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('renders financial data after load', async () => {
    mockApiFetch
      .mockResolvedValueOnce(MOCK_STOCK)   // stockInfo
      .mockResolvedValueOnce(MOCK_FINANCIALS) // financials

    render(<FinancialDataCard symbol="AAPL" />)

    await screen.findByText(/2023/)
    expect(screen.getByText(/2022/)).toBeInTheDocument()
  })

  it('shows no-data message when financials is empty', async () => {
    mockApiFetch
      .mockResolvedValueOnce(MOCK_STOCK)
      .mockResolvedValueOnce({ symbol: 'AAPL', financials: [] })

    render(<FinancialDataCard symbol="AAPL" />)

    await screen.findByText(/暂无财务数据/)
  })

  it('shows error state on fetch failure', async () => {
    mockApiFetch
      .mockResolvedValueOnce(MOCK_STOCK)
      .mockRejectedValueOnce(new Error('网络超时'))

    render(<FinancialDataCard symbol="AAPL" />)

    // Component renders err.message directly
    await screen.findByText(/网络超时/)
  })

  it('switches chart tab on click', async () => {
    mockApiFetch
      .mockResolvedValueOnce(MOCK_STOCK)
      .mockResolvedValueOnce(MOCK_FINANCIALS)

    render(<FinancialDataCard symbol="AAPL" />)
    await screen.findByText(/2023/)

    fireEvent.click(screen.getByText('利润分析'))
    expect(screen.getByText('利润分析')).toBeInTheDocument()
  })

  it('uses USD currency symbol for US stocks', async () => {
    mockApiFetch
      .mockResolvedValueOnce(MOCK_STOCK)
      .mockResolvedValueOnce(MOCK_FINANCIALS)

    render(<FinancialDataCard symbol="AAPL" />)
    await screen.findByText(/2023/)
    // USD unit should appear in the notes
    expect(screen.getByText(/美元/)).toBeInTheDocument()
  })

  it('shows 待公布 for zero-revenue rows', async () => {
    const withFuture = {
      ...MOCK_FINANCIALS,
      financials: [
        ...MOCK_FINANCIALS.financials,
        {
          symbol: 'AAPL', year: 2026, quarter: 0,
          revenue: 0, net_profit: 0, gross_margin: 0, net_margin: 0,
          operating_cash_flow: 0, eps: 0, roe: 0,
          revenue_yoy: null, profit_yoy: null, price_yoy: null,
        },
      ],
    }
    mockApiFetch
      .mockResolvedValueOnce(MOCK_STOCK)
      .mockResolvedValueOnce(withFuture)

    render(<FinancialDataCard symbol="AAPL" />)

    await screen.findByText(/待公布/)
  })

  it('sorts annual financial rows before quarters in the same year', async () => {
    const withQuarters = {
      symbol: 'AAPL',
      financials: [
        { ...MOCK_FINANCIALS.financials[0], year: 2025, quarter: 3 },
        { ...MOCK_FINANCIALS.financials[0], year: 2025, quarter: 0 },
        { ...MOCK_FINANCIALS.financials[0], year: 2025, quarter: 1 },
      ],
    }
    mockApiFetch
      .mockResolvedValueOnce(MOCK_STOCK)
      .mockResolvedValueOnce(withQuarters)

    const { container } = render(<FinancialDataCard symbol="AAPL" />)

    await screen.findByText('2025')
    const text = container.textContent ?? ''
    expect(text.indexOf('2025')).toBeLessThan(text.indexOf('2025 Q3'))
  })

  it('uses same-period YoY values for metric card changes', async () => {
    const q1Data = {
      symbol: 'AAPL',
      financials: [
        {
          symbol: 'AAPL', year: 2026, quarter: 1,
          revenue: 110, net_profit: 60,
          gross_margin: 44, net_margin: 24,
          operating_cash_flow: 0, eps: 0, roe: 0,
          revenue_yoy: 10, profit_yoy: 20, price_yoy: null,
        },
        {
          symbol: 'AAPL', year: 2025, quarter: 0,
          revenue: 900, net_profit: 300,
          gross_margin: 40, net_margin: 20,
          operating_cash_flow: 0, eps: 0, roe: 0,
          revenue_yoy: null, profit_yoy: null, price_yoy: null,
        },
        {
          symbol: 'AAPL', year: 2025, quarter: 1,
          revenue: 100, net_profit: 50,
          gross_margin: 40, net_margin: 20,
          operating_cash_flow: 0, eps: 0, roe: 0,
          revenue_yoy: null, profit_yoy: null, price_yoy: null,
        },
      ],
    }
    mockApiFetch
      .mockResolvedValueOnce(MOCK_STOCK)
      .mockResolvedValueOnce(q1Data)

    render(<FinancialDataCard symbol="AAPL" />)

    await screen.findByText('2026 Q1')
    expect(screen.getAllByText('+10.00%').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('+20.00%').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('-87.78%')).not.toBeInTheDocument()
  })
})
