'use client'

import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { useDebounce } from '@/src/hooks/useDebounce'
import { API_ROUTES, apiFetch } from '@/src/lib/api'
import { Input } from '@/src/components/ui/input'
import { cn } from '@/src/lib/utils'

interface SearchBarProps {
  onStockSelect: (_symbol: string) => void
}

interface SearchResult {
  symbol: string
  name: string
}

export function SearchBar({ onStockSelect }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    let active = true
    setIsLoading(true)
    apiFetch<{ results: SearchResult[] }>(API_ROUTES.search(debouncedQuery))
      .then((data) => {
        if (!active) return
        setResults(data?.results ?? [])
        setOpen((data?.results?.length ?? 0) > 0)
      })
      .catch(() => { if (active) setResults([]) })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [debouncedQuery])

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (symbol: string) => {
    onStockSelect(symbol)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-label="搜索股票"
          placeholder="搜索股票代码或公司名称..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 h-11 text-base"
        />
      </div>

      {(open || isLoading) && (
        <div
          role="listbox"
          className={cn(
            'absolute z-20 w-full mt-1 rounded-md border border-border bg-popover shadow-md overflow-hidden',
            'animate-in fade-in-0 zoom-in-95'
          )}
        >
          {isLoading && (
            <div className="px-4 py-3 text-sm text-muted-foreground">搜索中…</div>
          )}
          {!isLoading && results.map((r) => (
            <button
              key={r.symbol}
              role="option"
              aria-selected={false}
              onClick={() => handleSelect(r.symbol)}
              className="w-full px-4 py-3 text-left hover:bg-accent focus:bg-accent focus:outline-none border-b border-border/40 last:border-b-0 transition-colors"
            >
              <span className="font-medium text-sm">{r.symbol}</span>
              <span className="ml-2 text-sm text-muted-foreground">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
