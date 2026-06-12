export interface KeyMetric {
  name: string
  value: string
  reason: string
}

export interface Scenario {
  type: 'bull' | 'base' | 'bear'
  revenue: string
  eps: string
  key_driver: string
  stock_reaction: string
}

export interface EarningsPreview {
  symbol: string
  quarter: string
  analysis?: string
  consensus?: Record<string, string>
  key_metrics?: KeyMetric[]
  scenarios?: Scenario[]
  catalysts?: string[]
  data_source: 'analyst_forecast' | 'web_search'
}
