'use client'

import Link from 'next/link'
import { useWatchlist } from '@/src/hooks/useWatchlist'
import { Card, CardContent } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Star, Trash2, ExternalLink } from 'lucide-react'

export default function WatchlistPage() {
  const { symbols, loading, remove } = useWatchlist()

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-950">关注列表</h1>
        <span className="text-sm text-slate-500">{symbols.length} 只股票</span>
      </div>

      {loading && <p className="text-sm text-slate-500">加载中...</p>}

      {!loading && symbols.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">暂无关注股票</p>
            <p className="text-sm text-slate-400 mt-1">在股票详情页点击&quot;关注&quot;按钮添加</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {symbols.map(s => (
          <Card key={s.symbol} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <Link
                    href={`/?symbol=${s.symbol}`}
                    className="font-medium text-slate-950 hover:underline flex items-center gap-1"
                  >
                    {s.name}
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </Link>
                  <p className="text-sm text-slate-500 mt-0.5">{s.symbol}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {s.has_thesis && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        有投资逻辑
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {new Date(s.added_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                  onClick={() => remove(s.symbol)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
