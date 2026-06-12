export type NoteStatus = 'generating' | 'success' | 'failed' | 'missing'

export interface NoteSections {
  price_overview?: string
  company_news?: string
  industry_news?: string
  macro_policy?: string
  action_bias?: string
}

export interface MorningNote {
  id: number
  date: string
  status: NoteStatus
  content?: {
    raw_text: string
    sections: NoteSections | null
  }
  regenerated: boolean
  error?: string
  created_at: string
  updated_at: string
}
