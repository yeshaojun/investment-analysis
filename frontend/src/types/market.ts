export interface HotStock {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
}

export interface HotIndustry {
  name: string
  changePercent: number
  change: number
  leadingStock: string
  leadingPercent: number
  totalMarket: number
  upCount: number
  downCount: number
}

export interface NewsItem {
  title: string
  content: string
  source: string
  time: string
  url: string
}

export interface RankingStock {
  symbol: string
  name: string
  price: number
  change_percent: number
  volume: number
  market_cap: number
  period?: string
}

export interface RankingIndustry {
  industry_name: string
  change_percent: number
  volume: number
  market_cap: number
  period?: string
}
