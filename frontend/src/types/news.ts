export type NewsLayer = 'company' | 'industry' | 'macro'

export interface NewsItem {
  id: number
  symbol: string
  date: string
  title: string
  snippet: string
  source_url: string
  layer: NewsLayer
  score: number
  published_at: string
  created_at: string
}

export interface NewsDate {
  date: string
  count: number
  max_score: number
}

export const LAYER_LABELS: Record<NewsLayer, string> = {
  company: '个股',
  industry: '产业',
  macro: '宏观',
}

export const LAYER_COLORS: Record<NewsLayer, string> = {
  company: 'bg-blue-100 text-blue-700',
  industry: 'bg-amber-100 text-amber-700',
  macro: 'bg-purple-100 text-purple-700',
}
