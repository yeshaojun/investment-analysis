import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useDebounce } from '../hooks/useDebounce'

interface SearchBarProps {
  onStockSelect: (symbol: string) => void
}

interface SearchResult {
  symbol: string
  name: string
}

export function SearchBar({ onStockSelect }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
  }, [query])

  useEffect(() => {
    const searchStocks = async () => {
      if (debouncedQuery.length < 2) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
        const data = await response.json()
        setResults(data.results || [])
      } catch (error) {
        console.error('搜索失败:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }

    searchStocks()
  }, [debouncedQuery])

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          placeholder="搜索股票代码或公司名称..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-3 pl-12 pr-4 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
        <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
      </div>

      {results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {results.map((result) => (
            <button
              key={result.symbol}
              onClick={() => {
                onStockSelect(result.symbol)
                setQuery('')
                setResults([])
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">{result.symbol}</div>
              <div className="text-sm text-gray-500">{result.name}</div>
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg px-4 py-3">
          <div className="text-sm text-gray-500">搜索中...</div>
        </div>
      )}
    </div>
  )
}