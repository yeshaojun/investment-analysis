/**
 * SearchBar component tests
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from '@/src/components/search/SearchBar'
import { API_ROUTES, apiFetch } from '@/src/lib/api'

jest.mock('@/src/lib/api', () => ({
  apiFetch: jest.fn(),
  API_ROUTES: {
    search: (q: string) => `/api/search?q=${q}`,
  },
}))

jest.mock('@/src/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}))

const mockApiFetch = apiFetch as jest.Mock

describe('SearchBar', () => {
  const onStockSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders search input', () => {
    render(<SearchBar onStockSelect={onStockSelect} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/搜索股票/)).toBeInTheDocument()
  })

  it('shows results when API returns matches', async () => {
    mockApiFetch.mockResolvedValue({
      results: [
        { symbol: '600519', name: '贵州茅台' },
        { symbol: '000858', name: '五粮液' },
      ],
    })
    render(<SearchBar onStockSelect={onStockSelect} />)

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '茅台' } })
    })

    await waitFor(() => {
      expect(screen.getByText('贵州茅台')).toBeInTheDocument()
      expect(screen.getByText('五粮液')).toBeInTheDocument()
    })
  })

  it('calls onStockSelect with symbol when result is clicked', async () => {
    mockApiFetch.mockResolvedValue({
      results: [{ symbol: '600519', name: '贵州茅台' }],
    })
    render(<SearchBar onStockSelect={onStockSelect} />)

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '茅台' } })
    })

    await waitFor(() => screen.getByText('贵州茅台'))
    fireEvent.click(screen.getByRole('option'))

    expect(onStockSelect).toHaveBeenCalledWith('600519')
    expect(screen.getByRole('combobox')).toHaveValue('')
  })

  it('clears results after selection', async () => {
    mockApiFetch.mockResolvedValue({
      results: [{ symbol: '600519', name: '贵州茅台' }],
    })
    render(<SearchBar onStockSelect={onStockSelect} />)

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '茅台' } })
    })
    await waitFor(() => screen.getByText('贵州茅台'))
    fireEvent.click(screen.getByRole('option'))

    await waitFor(() => {
      expect(screen.queryByText('贵州茅台')).not.toBeInTheDocument()
    })
  })

  it('shows loading state while fetching', async () => {
    let resolve: (v: unknown) => void
    mockApiFetch.mockImplementation(() => new Promise((r) => { resolve = r }))

    render(<SearchBar onStockSelect={onStockSelect} />)

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '茅台' } })
    })

    expect(screen.getByText('搜索中…')).toBeInTheDocument()
  })

  it('closes dropdown on Escape', async () => {
    mockApiFetch.mockResolvedValue({
      results: [{ symbol: '600519', name: '贵州茅台' }],
    })
    render(<SearchBar onStockSelect={onStockSelect} />)

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '茅台' } })
    })
    await waitFor(() => screen.getByText('贵州茅台'))

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByText('贵州茅台')).not.toBeInTheDocument()
    })
  })

  it('shows nothing when query is less than 2 chars', () => {
    render(<SearchBar onStockSelect={onStockSelect} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'A' } })
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})
