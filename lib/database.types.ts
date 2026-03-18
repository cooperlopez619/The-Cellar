import type { WhiskeyType, PriceTier, Scores } from './scoring'

export interface Profile {
  id:            string
  username:      string | null
  display_name:  string | null
  avatar_url:    string | null
  tutorial_done: boolean
  created_at:    string
}

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
  bottle_photo_url:     string | null
  price_tier_override:  PriceTier | null
  created_at:           string
  whiskeys?:            Whiskey
}

export interface UserList {
  id:          string
  user_id:     string
  whiskey_id:  string
  list_type:   'favorite' | 'wishlist'
  created_at:  string
}

export interface Friendship {
  id:           string
  requester_id: string
  addressee_id: string
  status:       'pending' | 'accepted'
  created_at:   string
}

export interface UserStat {
  id:             string
  display_name:   string | null
  username:       string | null
  pour_count:     number
  fav_type:       string | null
  avg_price_tier: number | null
}

// eslint-disable-next-line @typescript-eslint/ban-types
type EmptyRecord = {}

export type Database = {
  public: {
    Tables: {
      whiskeys: {
        Row:           Whiskey
        Insert:        Omit<Whiskey, 'id' | 'created_at'>
        Update:        Partial<Whiskey>
        Relationships: []
      }
      pours: {
        Row:           Pour
        Insert:        Omit<Pour, 'id' | 'created_at' | 'whiskeys'>
        Update:        Partial<Pour>
        Relationships: []
      }
      user_lists: {
        Row:           UserList
        Insert:        Omit<UserList, 'id' | 'created_at'>
        Update:        Partial<UserList>
        Relationships: []
      }
      profiles: {
        Row:           Profile
        Insert:        Omit<Profile, 'created_at'>
        Update:        Partial<Profile>
        Relationships: []
      }
      friendships: {
        Row:           Friendship
        Insert:        Omit<Friendship, 'id' | 'created_at'>
        Update:        Partial<Friendship>
        Relationships: []
      }
    }
    Views:          EmptyRecord
    Functions:      EmptyRecord
    Enums:          EmptyRecord
    CompositeTypes: EmptyRecord
  }
}
