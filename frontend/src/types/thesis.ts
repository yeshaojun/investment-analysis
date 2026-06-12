export interface Pillar {
  id: string
  name: string
  description?: string
  status: 'on_track' | 'watch' | 'concerning' | 'invalidated'
}

export interface Catalyst {
  id: number
  thesis_id: number
  symbol: string
  date: string
  event: string
  impact: 'high' | 'medium' | 'low'
  notes?: string
  created_at: string
}

export type Conviction = 'high' | 'medium' | 'low'

export interface Thesis {
  id: number
  symbol: string
  thesis_statement: string
  pillars: Pillar[]
  risks: string[]
  conviction: Conviction
  stop_loss?: number
  version: number
  is_active: boolean
  created_at: string
  updated_at: string
  catalysts?: Catalyst[]
}
