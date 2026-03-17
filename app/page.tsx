'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../hooks/useAuth'
import { WHISKEY_TYPES, PRICE_TIERS, calcMasterScore, type Scores } from '../lib/scoring'
import WhiskeyCard from '../components/whiskey/WhiskeyCard'
import CellarLogo from '../components/ui/CellarLogo'
import HelpButton from '../components/ui/HelpButton'
import type { Whiskey } from '../lib/database.types'
import { createClient } from '@/lib/supabase/client'

type Stats = Record<string, { avgScore: number; avgBFB: number }>

function FilterDropdown({ value, onChange, options, placeholder }: {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const label = value || placeholder

  return (
    <div ref={ref} className="relative flex-1">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 rounded-full px-4 py-2 text-sm font-medium border transition-all ${
          value ? 'bg-cellar-amber border-cellar-amber text-cellar-bg' : 'bg-cellar-surface border-cellar-border text-cellar-muted'
        }`}
      >
        <span>{label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M2 4l4 4 4-4"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-cellar-surface border border-cellar-border rounded-xl overflow-hidden shadow-lg">
          <button
            onClick={() => { onChange(''); setOpen(false) }}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
              !value ? 'text-cellar-amber font-medium' : 'text-cellar-muted hover:text-cellar-text hover:bg-cellar-bg'
            }`}
          >
            {placeholder}
          </button>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-t border-cellar-border/50 ${
                value === opt ? 'text-cellar-amber font-medium' : 'text-cellar-muted hover:text-cellar-text hover:bg-cellar-bg'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CatalogPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [whiskeys, setWhiskeys]     = useState<Whiskey[]>([])
  const [stats, setStats]           = useState<Stats>({})
  const [search, setSearch]         = useState('')
  const [typeFilter, setType]       = useState('')
  const [tierFilter, setTier]       = useState('')
  const [sortBy, setSortBy]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [favorites, setFavorites]   = useState<Set<string>>(new Set())
  const [wishlists, setWishlists]   = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth')
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    async function load() {
      // Kick off user data fetches immediately — no whiskey IDs needed
      const poursPromise = supabase
        .from('pours').select('whiskey_id, master_score, bfb_score, scores')
        .eq('user_id', user!.id)
      const listsPromise = supabase
        .from('user_lists').select('whiskey_id, list_type').eq('user_id', user!.id)

      // Fetch whiskeys (paginated)
      let all: Whiskey[] = []
      let from = 0
      const PAGE = 1000
      while (true) {
        const { data, error } = await supabase
          .from('whiskeys').select('*').order('name').range(from, from + PAGE - 1)
        if (error || !data?.length) break
        all = [...all, ...data]
        if (data.length < PAGE) break
        from += PAGE
      }

      // Wait for user data (was running in parallel with whiskey pagination)
      const [{ data: pours }, { data: lists }] = await Promise.all([poursPromise, listsPromise])

      if (lists) {
        setFavorites(new Set(lists.filter(l => l.list_type === 'favorite').map(l => l.whiskey_id)))
        setWishlists(new Set(lists.filter(l => l.list_type === 'wishlist').map(l => l.whiskey_id)))
      }

      const map: Record<string, { s: number[]; b: number[] }> = {}
      for (const p of pours ?? []) {
        if (!map[p.whiskey_id]) map[p.whiskey_id] = { s: [], b: [] }
        const s = p.master_score ?? calcMasterScore((p.scores ?? {}) as Partial<Scores>)
        if (s) map[p.whiskey_id].s.push(s)
        if (p.bfb_score) map[p.whiskey_id].b.push(p.bfb_score)
      }
      const out: Stats = {}
      for (const [id, { s, b }] of Object.entries(map)) {
        out[id] = {
          avgScore: s.length ? +(s.reduce((a, v) => a + v, 0) / s.length).toFixed(2) : 0,
          avgBFB:   b.length ? +(b.reduce((a, v) => a + v, 0) / b.length).toFixed(2) : 0,
        }
      }

      // Set everything at once so the page renders with complete data
      setWhiskeys(all)
      setStats(out)
      setLoading(false)
    }
    load()
  }, [user])

  async function toggleList(whiskeyId: string, type: 'favorite' | 'wishlist') {
    if (!user) return
    const supabase = createClient()
    const set = type === 'favorite' ? favorites : wishlists
    const setFn = type === 'favorite' ? setFavorites : setWishlists
    if (set.has(whiskeyId)) {
      setFn(prev => { const n = new Set(prev); n.delete(whiskeyId); return n })
      await supabase.from('user_lists').delete()
        .eq('user_id', user.id).eq('whiskey_id', whiskeyId).eq('list_type', type)
    } else {
      setFn(prev => new Set(prev).add(whiskeyId))
      await supabase.from('user_lists').insert({ user_id: user.id, whiskey_id: whiskeyId, list_type: type })
    }
  }

  if (authLoading || !user) return (
    <div className="min-h-screen bg-cellar-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const TIER_RANK: Record<string, number> = { '$': 0, '$$': 1, '$$$': 2, '$$$$': 3, '$$$$$': 4 }

  const filtered = whiskeys
    .filter(w =>
      (!search || w.name.toLowerCase().includes(search.toLowerCase()) || w.distillery.toLowerCase().includes(search.toLowerCase())) &&
      (!typeFilter || w.type === typeFilter) &&
      (!tierFilter || w.price_tier === tierFilter)
    )
    .sort((a, b) => {
      if (sortBy === 'Name A → Z') return a.name.localeCompare(b.name)
      if (sortBy === 'Price ↑') {
        const ai = a.price_tier != null ? (TIER_RANK[a.price_tier] ?? 99) : 99
        const bi = b.price_tier != null ? (TIER_RANK[b.price_tier] ?? 99) : 99
        return ai - bi || a.name.localeCompare(b.name)
      }
      if (sortBy === 'Price ↓') {
        const ai = a.price_tier != null ? (TIER_RANK[a.price_tier] ?? -1) : -1
        const bi = b.price_tier != null ? (TIER_RANK[b.price_tier] ?? -1) : -1
        return bi - ai || a.name.localeCompare(b.name)
      }
      // default (Score ↓): highest rated first
      return (stats[b.id]?.avgScore ?? 0) - (stats[a.id]?.avgScore ?? 0) || a.name.localeCompare(b.name)
    })

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-5">
        <div className="w-8" />
        <CellarLogo size={110} />
        <HelpButton />
      </div>

      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-cellar-muted" width="16" height="16"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input type="search" placeholder="Search whiskeys & distilleries…"
          value={search} onChange={e => setSearch(e.target.value)} className="input pl-9"
          data-tutorial="catalog-search" />
      </div>

      <div className="flex gap-2 mb-4" data-tutorial="catalog-filters">
        <FilterDropdown value={typeFilter} onChange={setType} options={WHISKEY_TYPES} placeholder="All Types" />
        <FilterDropdown value={tierFilter} onChange={setTier} options={PRICE_TIERS} placeholder="All Prices" />
        <FilterDropdown value={sortBy} onChange={setSortBy} options={['Name A → Z', 'Price ↑', 'Price ↓']} placeholder="Score ↓" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-cellar-muted text-sm">No whiskeys found</p>
          <Link href="/log" className="btn-primary inline-block mt-4">Add a Bottle</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((w, i) => (
            <div key={w.id} data-tutorial={i === 0 ? 'first-whiskey-card' : undefined}>
              <WhiskeyCard whiskey={w}
                communityScore={stats[w.id]?.avgScore ?? 0}
                communityBFB={stats[w.id]?.avgBFB ?? 0}
                isFavorite={favorites.has(w.id)}
                isWishlist={wishlists.has(w.id)}
                onToggleFavorite={() => toggleList(w.id, 'favorite')}
                onToggleWishlist={() => toggleList(w.id, 'wishlist')} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
