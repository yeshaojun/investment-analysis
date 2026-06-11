// Shared stock-domain types.
// Keep in sync with backend/api/schemas/stock.py.

export interface StockInfo {
  symbol: string
  name: string
  price: number | null
  change: number | null
  changePercent: number | null
  volume: number | null
  marketCap: number | null
  sector: string
  industry: string
  market: string
  currency: string
  lastUpdated: string
  available?: boolean
  source?: string | null
  as_of?: string | null
  data_version?: string | null
  is_stale?: boolean
  reason?: string | null
}

export interface OHLCVItem {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  amount?: number | null
  interval?: string | null
  adjust_type?: string | null
  source?: string | null
}

export interface StockHistory {
  symbol: string
  period: string
  interval: string
  data: OHLCVItem[]
  indicators?: Record<string, unknown>
}

export interface FinancialItem {
  symbol: string
  year: number
  quarter: number
  revenue: number | null
  net_profit: number | null
  gross_margin: number | null
  net_margin: number | null
  operating_cash_flow: number | null
  eps: number | null
  roe: number | null
  revenue_yoy?: number | null
  profit_yoy?: number | null
  price_yoy?: number | null
  report_date?: string | null
  announced_at?: string | null
  period_type?: string | null
  currency?: string | null
  source?: string | null
  data_version?: string | null
  is_restated?: boolean
  total_assets?: number | null
  total_liabilities?: number | null
  shareholder_equity?: number | null
  cash_and_equivalents?: number | null
  interest_bearing_debt?: number | null
  accounts_receivable?: number | null
  inventory?: number | null
  gross_profit?: number | null
  operating_profit?: number | null
  investing_cash_flow?: number | null
  financing_cash_flow?: number | null
  free_cash_flow?: number | null
  capex?: number | null
}

export interface StockSearchResult {
  symbol: string
  name: string
  market?: string
}

export interface EPSForecast {
  eps: number
  pe?: number | null
}

export interface ResearchReport {
  title: string
  rating: string
  institution: string
  date: string
  industry: string
  pdf_url: string
  eps_forecast: Record<string, EPSForecast>
}

export interface AIAnalysisResult {
  symbol: string
  name: string
  current_price?: number
  industry?: string
  analysis: string
  sources: string
  error?: string
}

export interface ResearchSummaryResult {
  symbol: string
  name: string
  current_price?: number
  report_count?: number
  summary: string
  reports: ResearchReport[]
  sources: string
  error?: string
}
