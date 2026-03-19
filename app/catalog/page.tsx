'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAuth } from '../../hooks/useAuth'
import { WHISKEY_TYPES, PRICE_TIERS } from '../../lib/scoring'
import WhiskeyCard from '../../components/whiskey/WhiskeyCard'
import HelpButton from '../../components/ui/HelpButton'
import type { Whiskey } from '../../lib/database.types'
import { createClient } from '@/lib/supabase/client'

type Stats = Record<string, { avgScore: number; avgBFB: number }>

// Module-level cache — survives navigation within the session.
// Whiskeys and stats are cached (they rarely change); lists are always refreshed.
let _catalogCache: {
  uid: string
  whiskeys: Whiskey[]
  stats: Stats
} | null = null

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

    async function fetchLists() {
      const { data: lists } = await supabase
        .from('user_lists').select('whiskey_id, list_type').eq('user_id', user!.id)
      if (lists) {
        setFavorites(new Set(lists.filter(l => l.list_type === 'favorite').map(l => l.whiskey_id)))
        setWishlists(new Set(lists.filter(l => l.list_type === 'wishlist').map(l => l.whiskey_id)))
      }
    }

    // If we have a cache for this user, show it immediately and only refresh lists
    if (_catalogCache?.uid === user.id) {
      setWhiskeys(_catalogCache.whiskeys)
      setStats(_catalogCache.stats)
      setLoading(false)
      fetchLists() // silently refresh favorites/wishlists in background
      return
    }

    async function load() {
      // Fire community stats + user lists immediately in parallel with whiskey fetch
      const statsPromise = supabase
        .from('whiskey_community_stats').select('whiskey_id, avg_score, avg_bfb')
      const listsPromise = supabase
        .from('user_lists').select('whiskey_id, list_type').eq('user_id', user!.id)

      // Fetch all whiskeys (paginated if needed)
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

      // Resolve user data (was running in parallel with whiskey pagination)
      const [{ data: pours }, { data: lists }] = await Promise.all([statsPromise, listsPromise])

      if (lists) {
        setFavorites(new Set(lists.filter(l => l.list_type === 'favorite').map(l => l.whiskey_id)))
        setWishlists(new Set(lists.filter(l => l.list_type === 'wishlist').map(l => l.whiskey_id)))
      }

      const out: Stats = {}
      for (const row of pours ?? []) {
        out[row.whiskey_id] = { avgScore: row.avg_score ?? 0, avgBFB: row.avg_bfb ?? 0 }
      }

      // Cache whiskeys + stats for instant return visits
      _catalogCache = { uid: user!.id, whiskeys: all, stats: out }

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

  const filtered = useMemo(() => {
    const TIER_RANK: Record<string, number> = { '$': 0, '$$': 1, '$$$': 2, '$$$$': 3, '$$$$$': 4 }
    const normalizedSearch = search.trim().toLowerCase()

    function getSearchRank(w: Whiskey) {
      if (!normalizedSearch) return 0
      const name = w.name.toLowerCase()
      const distillery = w.distillery.toLowerCase()
      if (name === normalizedSearch) return 0
      if (name.startsWith(normalizedSearch)) return 1
      if (name.includes(normalizedSearch)) return 2
      if (distillery.startsWith(normalizedSearch)) return 3
      if (distillery.includes(normalizedSearch)) return 4
      return 5
    }

    return whiskeys
      .filter(w =>
        (!normalizedSearch || w.name.toLowerCase().includes(normalizedSearch) || w.distillery.toLowerCase().includes(normalizedSearch)) &&
        (!typeFilter || w.type === typeFilter) &&
        (!tierFilter || w.price_tier === tierFilter)
      )
      .sort((a, b) => {
        if (normalizedSearch) {
          const rankDiff = getSearchRank(a) - getSearchRank(b)
          if (rankDiff !== 0) return rankDiff
        }

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
  }, [whiskeys, search, typeFilter, tierFilter, sortBy, stats])

  const listRef = useRef<HTMLDivElement>(null)
  // The scroll container is <main> in the root layout (overflow-y-auto),
  // not the window — so we use useVirtualizer with getScrollElement.
  const scrollContainerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    scrollContainerRef.current = document.querySelector('main')
  }, [])

  const [scrollMargin, setScrollMargin] = useState(0)
  // Measure the list's offset from the top of <main> after it mounts.
  useEffect(() => {
    if (!loading && listRef.current && scrollContainerRef.current) {
      const listRect = listRef.current.getBoundingClientRect()
      const containerRect = scrollContainerRef.current.getBoundingClientRect()
      setScrollMargin(listRect.top - containerRect.top + scrollContainerRef.current.scrollTop)
    }
  }, [loading])

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 142,
    overscan: 8,
    scrollMargin,
    measureElement: el => el.getBoundingClientRect().height,
  })

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-serif text-cellar-cream text-2xl font-bold">Catalog</h1>
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
        <div className="space-y-3 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-cellar-surface shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 bg-cellar-surface rounded-lg" style={{ width: `${55 + (i % 4) * 12}%` }} />
                <div className="h-3 bg-cellar-surface rounded-lg w-1/3" />
                <div className="h-5 bg-cellar-surface rounded-full w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-cellar-muted text-sm">No whiskeys found</p>
          <Link href="/log" className="btn-primary inline-block mt-4">Add a Bottle</Link>
        </div>
      ) : (
        <div ref={listRef}>
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map(virtualRow => {
              const w = filtered[virtualRow.index]
              return (
                <div
                  key={w.id}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  data-tutorial={virtualRow.index === 0 ? 'first-whiskey-card' : undefined}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
                    paddingBottom: '12px',
                  }}
                >
                  <WhiskeyCard whiskey={w}
                    communityScore={stats[w.id]?.avgScore ?? 0}
                    communityBFB={stats[w.id]?.avgBFB ?? 0}
                    scoreLabel="Avg. Score"
                    isFavorite={favorites.has(w.id)}
                    isWishlist={wishlists.has(w.id)}
                    onToggleFavorite={() => toggleList(w.id, 'favorite')}
                    onToggleWishlist={() => toggleList(w.id, 'wishlist')} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
