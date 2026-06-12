export type EventImpact = 'high' | 'medium' | 'low'
export type EventSource = 'manual' | 'auto'

export interface CatalystEvent {
  id?: number
  thesis_id?: number
  symbol: string
  date: string
  event: string
  impact: EventImpact
  source: EventSource
  notes?: string
}
