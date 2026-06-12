'use client'

import { Star } from 'lucide-react'
import { useWatchlist } from '@/src/hooks/useWatchlist'
import { Button } from '@/src/components/ui/button'

export function WatchlistButton({ symbol }: { symbol: string }) {
  const { isWatching, loading, toggle } = useWatchlist(symbol)

  return (
    <Button
      variant={isWatching ? 'default' : 'outline'}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className="gap-1.5"
    >
      <Star className={`h-4 w-4 ${isWatching ? 'fill-current' : ''}`} />
      {isWatching ? '取消关注' : '关注'}
    </Button>
  )
}
