export interface ScreenerResult {
  symbol: string
  name: string
  industry: string
  year: number
  report_date: string
  roe: number
  revenue_growth: number
  net_profit_growth: number
  gross_margin: number
  pe: number
  pb: number
  dividend_yield: number
  debt_ratio: number
  fcf_ratio: number
}

export interface SyncStatus {
  task: string
  status: string
  progress: number
  total: number
  started_at: string
  finished_at: string
  error: string
}

export type PresetKey = 'value' | 'growth' | 'quality'

export interface PresetConfig {
  name: string
  description: string
  defaults: Record<string, number>
}
