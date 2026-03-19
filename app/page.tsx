'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CellarLogo from '../components/ui/CellarLogo'
import HelpButton from '../components/ui/HelpButton'
import WhiskeyRailCard from '../components/whiskey/WhiskeyRailCard'
import { useAuth } from '../hooks/useAuth'
import type { Pour, Whiskey } from '../lib/database.types'
import { createClient } from '@/lib/supabase/client'

type Stats = Record<string, { avgScore: number; avgBFB: number }>

function RailSection({
  title,
  items,
  stats,
  emptyText,
  ctaHref,
  ctaLabel,
  favorites,
  wishlists,
  onToggleFavorite,
  onToggleWishlist,
}: {
  title: string
  items: Whiskey[]
  stats: Stats
  emptyText: string
  ctaHref?: string
  ctaLabel?: string
  favorites: Set<string>
  wishlists: Set<string>
  onToggleFavorite: (whiskeyId: string) => void
  onToggleWishlist: (whiskeyId: string) => void
}) {
  return (
    <section className="mb-7">
      <div className="flex items-center justify-between px-1 mb-2.5">
        <h2 className="font-serif text-cellar-cream text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-3">
          {ctaHref && ctaLabel && (
            <Link href={ctaHref} className="text-cellar-amber text-xs font-semibold">
              {ctaLabel}
            </Link>
          )}
          <p className="text-cellar-muted text-xs">{items.length}</p>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="card p-4">
          <p className="text-cellar-muted text-sm">{emptyText}</p>
        </div>
      ) : (
        <div
          className="-mx-4 pl-4 pr-1 overflow-x-auto"
          onWheel={e => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              e.currentTarget.scrollLeft += e.deltaY
              e.preventDefault()
            }
          }}
        >
          <div className="flex gap-3 w-max pb-1">
            {items.map(w => (
              <WhiskeyRailCard
                key={w.id}
                whiskey={w}
                score={stats[w.id]?.avgScore ?? 0}
                scoreLabel="Avg."
                isFavorite={favorites.has(w.id)}
                isWishlist={wishlists.has(w.id)}
                onToggleFavorite={() => onToggleFavorite(w.id)}
                onToggleWishlist={() => onToggleWishlist(w.id)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [whiskeys, setWhiskeys] = useState<Whiskey[]>([])
  const [stats, setStats] = useState<Stats>({})
  const [pours, setPours] = useState<Pick<Pour, 'whiskey_id' | 'created_at'>[]>([])
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [wishlists, setWishlists] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth')
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return
    const userId = user.id
    const supabase = createClient()

    async function load() {
      const statsPromise = supabase
        .from('whiskey_community_stats').select('whiskey_id, avg_score, avg_bfb')
      const listsPromise = supabase
        .from('user_lists').select('whiskey_id, list_type').eq('user_id', userId)
      const poursPromise = supabase
        .from('pours').select('whiskey_id, created_at').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(200)

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

      const [{ data: statsRows }, { data: listRows }, { data: pourRows }] = await Promise.all([
        statsPromise, listsPromise, poursPromise,
      ])

      const out: Stats = {}
      for (const row of statsRows ?? []) {
        out[row.whiskey_id] = { avgScore: row.avg_score ?? 0, avgBFB: row.avg_bfb ?? 0 }
      }

      setWhiskeys(all)
      setStats(out)
      setPours((pourRows ?? []) as Pick<Pour, 'whiskey_id' | 'created_at'>[])
      setFavorites(new Set((listRows ?? []).filter(r => r.list_type === 'favorite').map(r => r.whiskey_id)))
      setWishlists(new Set((listRows ?? []).filter(r => r.list_type === 'wishlist').map(r => r.whiskey_id)))
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

  const whiskeyById = useMemo(() => {
    const map: Record<string, Whiskey> = {}
    for (const w of whiskeys) map[w.id] = w
    return map
  }, [whiskeys])

  const recentWhiskeys = useMemo(() => {
    const seen = new Set<string>()
    const out: Whiskey[] = []
    for (const p of pours) {
      if (seen.has(p.whiskey_id)) continue
      const whiskey = whiskeyById[p.whiskey_id]
      if (!whiskey) continue
      seen.add(p.whiskey_id)
      out.push(whiskey)
      if (out.length >= 10) break
    }
    return out
  }, [pours, whiskeyById])

  const recommendedWhiskeys = useMemo(() => {
    const recentIds = new Set(recentWhiskeys.map(w => w.id))
    const typeCounts: Record<string, number> = {}
    for (const p of pours) {
      const t = whiskeyById[p.whiskey_id]?.type
      if (t) typeCounts[t] = (typeCounts[t] ?? 0) + 1
    }
    const favoredType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

    return whiskeys
      .filter(w => !recentIds.has(w.id) && !favorites.has(w.id))
      .sort((a, b) => {
        const typeDiff = Number((b.type === favoredType)) - Number((a.type === favoredType))
        if (typeDiff !== 0) return typeDiff
        const scoreDiff = (stats[b.id]?.avgScore ?? 0) - (stats[a.id]?.avgScore ?? 0)
        if (scoreDiff !== 0) return scoreDiff
        const bfbDiff = (stats[b.id]?.avgBFB ?? 0) - (stats[a.id]?.avgBFB ?? 0)
        if (bfbDiff !== 0) return bfbDiff
        return a.name.localeCompare(b.name)
      })
      .slice(0, 12)
  }, [whiskeys, stats, pours, whiskeyById, recentWhiskeys, favorites])

  const trendingWhiskeys = useMemo(() => {
    return whiskeys
      .filter(w => !w.is_custom)
      .sort((a, b) => {
        const bfbDiff = (stats[b.id]?.avgBFB ?? 0) - (stats[a.id]?.avgBFB ?? 0)
        if (bfbDiff !== 0) return bfbDiff
        const scoreDiff = (stats[b.id]?.avgScore ?? 0) - (stats[a.id]?.avgScore ?? 0)
        if (scoreDiff !== 0) return scoreDiff
        return a.name.localeCompare(b.name)
      })
      .slice(0, 12)
  }, [whiskeys, stats])

  const newReleaseWhiskeys = useMemo(() => {
    return whiskeys
      .filter(w => !w.is_custom)
      .sort((a, b) => {
        const dateDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        if (dateDiff !== 0) return dateDiff
        const scoreDiff = (stats[b.id]?.avgScore ?? 0) - (stats[a.id]?.avgScore ?? 0)
        if (scoreDiff !== 0) return scoreDiff
        return a.name.localeCompare(b.name)
      })
      .slice(0, 12)
  }, [whiskeys, stats])

  if (authLoading || loading) {
    return (
      <div className="page animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="w-8" />
          <div className="h-6 w-28 rounded-lg bg-cellar-surface" />
          <div className="h-8 w-8 rounded-full bg-cellar-surface" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="mb-6">
            <div className="h-5 w-28 rounded bg-cellar-surface mb-3" />
            <div className="-mx-4 pl-4 overflow-x-auto">
              <div className="flex gap-3 w-max">
                {[...Array(3)].map((__, idx) => (
                  <div key={idx} className="card min-w-[240px] h-[132px]" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-5">
        <div className="w-8" />
        <CellarLogo size={110} />
        <HelpButton />
      </div>

      <div className="flex items-center justify-between mb-5">
        <h1 className="font-serif text-cellar-cream text-2xl font-bold">Home</h1>
        <Link href="/log"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-cellar-amber text-cellar-bg">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Log Pour
        </Link>
      </div>

      <RailSection
        title="Recommended for You"
        items={recommendedWhiskeys}
        stats={stats}
        emptyText="No recommendations yet. Add a few pours to tune this rail."
        favorites={favorites}
        wishlists={wishlists}
        onToggleFavorite={id => toggleList(id, 'favorite')}
        onToggleWishlist={id => toggleList(id, 'wishlist')}
      />

      <RailSection
        title="Trending in the Community"
        items={trendingWhiskeys}
        stats={stats}
        emptyText="Not enough community activity yet to show trending bottles."
        ctaHref="/catalog"
        ctaLabel="Browse all"
        favorites={favorites}
        wishlists={wishlists}
        onToggleFavorite={id => toggleList(id, 'favorite')}
        onToggleWishlist={id => toggleList(id, 'wishlist')}
      />

      <RailSection
        title="New Releases"
        items={newReleaseWhiskeys}
        stats={stats}
        emptyText="No recent releases available yet."
        ctaHref="/catalog"
        ctaLabel="Browse all"
        favorites={favorites}
        wishlists={wishlists}
        onToggleFavorite={id => toggleList(id, 'favorite')}
        onToggleWishlist={id => toggleList(id, 'wishlist')}
      />

      <RailSection
        title="Recent Pours"
        items={recentWhiskeys}
        stats={stats}
        emptyText="No recent pours yet. Log your first pour to get started."
        ctaHref="/cellar"
        ctaLabel="See all"
        favorites={favorites}
        wishlists={wishlists}
        onToggleFavorite={id => toggleList(id, 'favorite')}
        onToggleWishlist={id => toggleList(id, 'wishlist')}
      />
    </div>
  )
}
