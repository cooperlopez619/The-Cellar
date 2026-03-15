import type { WhiskeyType, PriceTier, Scores } from './scoring'

export interface Whiskey {
  id:          string
  name:        string
  distillery:  string
  type:        WhiskeyType
  region:      string | null
  abv:         number | null
  price_tier:  PriceTier | null
  is_custom:   boolean
  created_by:  string | null
  created_at:  string
}

export interface Pour {
  id:                   string
  user_id:              string
  whiskey_id:           string
  scores:               Partial<Scores>
  master_score:         number | null
  bfb_score:            number | null
  tasting_notes:        string | null
  price_tier_override:  PriceTier | null
  created_at:           string
  whiskeys?:            Whiskey
}

export type Database = {
  public: {
    Tables: {
      whiskeys: { Row: Whiskey; Insert: Omit<Whiskey, 'id' | 'created_at'>; Update: Partial<Whiskey> }
      pours:    { Row: Pour;    Insert: Omit<Pour, 'id' | 'created_at' | 'whiskeys'>; Update: Partial<Pour> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
