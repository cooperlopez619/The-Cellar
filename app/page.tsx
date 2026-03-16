'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../hooks/useAuth'
import { WHISKEY_TYPES, PRICE_TIERS } from '../lib/scoring'
import WhiskeyCard from '../components/whiskey/WhiskeyCard'
import BottomNav from '../components/ui/BottomNav'
import type { Whiskey } from '../lib/database.types'
import { createClient } from '@/lib/supabase/client'

type Stats = Record<string, { avgScore: number; avgBFB: number }>

export default function CatalogPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [whiskeys, setWhiskeys] = useState<Whiskey[]>([])
  const [stats, setStats]       = useState<Stats>({})
  const [search, setSearch]     = useState('')
  const [typeFilter, setType]   = useState('')
  const [tierFilter, setTier]   = useState('')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth')
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    async function load() {
      const { data } = await supabase.from('whiskeys').select('*').order('name')
      setWhiskeys(data ?? [])
      setLoading(false)
      if (data?.length) {
        const { data: pours } = await supabase
          .from('pours').select('whiskey_id, master_score, bfb_score')
          .in('whiskey_id', data.map(w => w.id))
        const map: Record<string, { s: number[]; b: number[] }> = {}
        for (const p of pours ?? []) {
          if (!map[p.whiskey_id]) map[p.whiskey_id] = { s: [], b: [] }
          if (p.master_score) map[p.whiskey_id].s.push(p.master_score)
          if (p.bfb_score)   map[p.whiskey_id].b.push(p.bfb_score)
        }
        const out: Stats = {}
        for (const [id, { s, b }] of Object.entries(map)) {
          out[id] = {
            avgScore: s.length ? +(s.reduce((a, v) => a + v, 0) / s.length).toFixed(2) : 0,
            avgBFB:   b.length ? +(b.reduce((a, v) => a + v, 0) / b.length).toFixed(2) : 0,
          }
        }
        setStats(out)
      }
    }
    load()
  }, [user])

  if (authLoading || !user) return (
    <div className="min-h-screen bg-cellar-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const filtered = whiskeys.filter(w =>
    (!search || w.name.toLowerCase().includes(search.toLowerCase()) || w.distillery.toLowerCase().includes(search.toLowerCase())) &&
    (!typeFilter || w.type === typeFilter) &&
    (!tierFilter || w.price_tier === tierFilter)
  )

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-serif text-cellar-cream text-2xl font-bold">The Cellar</h1>
        <Link href="/log" className="btn-primary text-xs px-3 py-2 inline-block">+ Log Pour</Link>
      </div>

      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-cellar-muted" width="16" height="16"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input type="search" placeholder="Search whiskeys & distilleries…"
          value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
        {['', ...WHISKEY_TYPES].map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-all ${
              typeFilter === t ? 'bg-cellar-amber border-cellar-amber text-cellar-bg' : 'bg-cellar-surface border-cellar-border text-cellar-muted'}`}>
            {t || 'All Types'}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {['', ...PRICE_TIERS].map(t => (
          <button key={t} onClick={() => setTier(t)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-all ${
              tierFilter === t ? 'bg-cellar-amber border-cellar-amber text-cellar-bg' : 'bg-cellar-surface border-cellar-border text-cellar-muted'}`}>
            {t || 'All Prices'}
          </button>
        ))}
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
          {filtered.map(w => (
            <WhiskeyCard key={w.id} whiskey={w}
              communityScore={stats[w.id]?.avgScore ?? 0}
              communityBFB={stats[w.id]?.avgBFB ?? 0} />
          ))}
        </div>
      )}
      <BottomNav />
    </div>
  )
}
