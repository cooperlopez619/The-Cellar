'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import ScoreRing from '../../components/ui/ScoreRing'
import SubScoreBar from '../../components/ui/SubScoreBar'
import TagPill from '../../components/ui/TagPill'
import BFBBadge from '../../components/ui/BFBBadge'
import WhiskeyCard from '../../components/whiskey/WhiskeyCard'
import { ALL_SUBSCORES, WHISKEY_TYPES } from '../../lib/scoring'
import HelpButton from '../../components/ui/HelpButton'
import type { Pour, Whiskey } from '../../lib/database.types'
import { createClient } from '@/lib/supabase/client'

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

  return (
    <div ref={ref} className="relative w-48">
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 rounded-full px-4 py-2 text-sm font-medium border transition-all ${
          value ? 'bg-cellar-amber border-cellar-amber text-cellar-bg' : 'bg-cellar-surface border-cellar-border text-cellar-muted'}`}>
        <span>{value || placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M2 4l4 4 4-4"/>
        </svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-cellar-surface border border-cellar-border rounded-xl overflow-hidden shadow-lg">
          <button onClick={() => { onChange(''); setOpen(false) }}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!value ? 'text-cellar-amber font-medium' : 'text-cellar-muted hover:text-cellar-text hover:bg-cellar-bg'}`}>
            {placeholder}
          </button>
          {options.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-t border-cellar-border/50 ${value === opt ? 'text-cellar-amber font-medium' : 'text-cellar-muted hover:text-cellar-text hover:bg-cellar-bg'}`}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
    </svg>
  )
}

type Tab = 'pours' | 'favorites' | 'wishlist'

export default function MyCellarPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [pours, setPours]         = useState<Pour[]>([])
  const [favorites, setFavorites] = useState<Whiskey[]>([])
  const [wishlist, setWishlist]   = useState<Whiskey[]>([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<Tab>('pours')
  const [typeFilter, setType]     = useState('')
  const [expanded, setExpanded]   = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth')
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    Promise.all([
      supabase.from('pours').select('*, whiskeys(*)').eq('user_id', user.id).order('master_score', { ascending: false }),
      supabase.from('user_lists').select('whiskey_id, list_type, whiskeys(*)').eq('user_id', user.id),
    ]).then(([{ data: poursData }, { data: listsData }]) => {
      setPours(poursData ?? [])
      setFavorites((listsData ?? []).filter(l => l.list_type === 'favorite').map(l => l.whiskeys as unknown as Whiskey))
      setWishlist((listsData ?? []).filter(l => l.list_type === 'wishlist').map(l => l.whiskeys as unknown as Whiskey))
      setLoading(false)
    })
  }, [user])

  const filteredPours = pours.filter(p => !typeFilter || (p.whiskeys as any)?.type === typeFilter)
  const totalPours = pours.length
  const avgScore = totalPours ? +(pours.reduce((a, p) => a + (p.master_score ?? 0), 0) / totalPours).toFixed(2) : 0
  const topType  = totalPours
    ? Object.entries(pours.reduce((acc, p) => {
        const t = (p.whiskeys as any)?.type ?? 'Unknown'; acc[t] = (acc[t] ?? 0) + 1; return acc
      }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0]?.[0]
    : null

  if (authLoading || loading) return (
    <div className="min-h-screen bg-cellar-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'pours',     label: 'Pours',     count: pours.length },
    { key: 'favorites', label: 'Favorites', count: favorites.length },
    { key: 'wishlist',  label: 'Wishlist',  count: wishlist.length },
  ]

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-serif text-cellar-cream text-2xl font-bold">My Cellar</h1>
        <HelpButton />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Pours',     value: totalPours },
          { label: 'Avg Score', value: avgScore > 0 ? avgScore.toFixed(1) : '—' },
          { label: 'Top Type',  value: topType ?? '—' },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <p className="text-cellar-amber font-serif font-bold text-xl">{s.value}</p>
            <p className="text-cellar-muted text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-cellar-surface border border-cellar-border rounded-xl p-1 mb-4" data-tutorial="cellar-tabs">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === t.key ? 'bg-cellar-amber text-cellar-bg' : 'text-cellar-muted'}`}>
            {t.label}{t.count > 0 ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {/* Pours */}
      {tab === 'pours' && (
        <>
          <div className="mb-4">
            <FilterDropdown value={typeFilter} onChange={setType} options={WHISKEY_TYPES} placeholder="All Types" />
          </div>
          {filteredPours.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-cellar-muted text-sm mb-4">
                {pours.length === 0 ? 'No pours logged yet.' : 'No pours match this filter.'}
              </p>
              {pours.length === 0 && <Link href="/log" className="btn-primary inline-block">Log Your First Pour</Link>}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPours.map(pour => {
                const w = pour.whiskeys as any
                const isOpen = expanded === pour.id
                return (
                  <div key={pour.id} className="card overflow-hidden">
                    <div role="button" tabIndex={0}
                      onClick={() => setExpanded(isOpen ? null : pour.id)}
                      onKeyDown={e => e.key === 'Enter' && setExpanded(isOpen ? null : pour.id)}
                      className="w-full text-left p-4 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 pt-1"><ScoreRing score={pour.master_score ?? 0} size={52} strokeWidth={4} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-serif text-cellar-cream font-semibold text-sm leading-tight truncate">{w?.name ?? 'Unknown'}</p>
                          <p className="text-cellar-muted text-xs mt-0.5">{w?.distillery}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {w?.type && <TagPill label={w.type} variant="type" />}
                            {(pour.bfb_score ?? 0) > 0 && <BFBBadge score={pour.bfb_score!} />}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button type="button" onClick={e => { e.stopPropagation(); router.push(`/edit/${pour.id}`) }}
                            className="p-1.5 rounded-lg text-cellar-muted hover:text-cellar-amber hover:bg-cellar-surface transition-colors" aria-label="Edit pour">
                            <PencilIcon />
                          </button>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            className={`text-cellar-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                            <path d="m6 9 6 6 6-6"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="border-t border-cellar-border px-4 py-4 space-y-3">
                        {ALL_SUBSCORES.map(s => (
                          <SubScoreBar key={s.key} label={s.label} score={(pour.scores as Record<string, number>)?.[s.key] ?? 0} />
                        ))}
                        {pour.tasting_notes && (
                          <div className="border-t border-cellar-border pt-3">
                            <p className="text-cellar-muted text-xs uppercase tracking-wide mb-1">Notes</p>
                            <p className="text-cellar-cream text-sm italic">&ldquo;{pour.tasting_notes}&rdquo;</p>
                          </div>
                        )}
                        <p className="text-cellar-muted text-xs">Logged {new Date(pour.created_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Favorites */}
      {tab === 'favorites' && (
        favorites.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-cellar-muted text-sm">No favorites yet.</p>
            <p className="text-cellar-muted text-xs mt-1">Tap the ★ on any whiskey in the catalog.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.filter(Boolean).map(w => <WhiskeyCard key={w.id} whiskey={w} />)}
          </div>
        )
      )}

      {/* Wishlist */}
      {tab === 'wishlist' && (
        wishlist.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-cellar-muted text-sm">Your wishlist is empty.</p>
            <p className="text-cellar-muted text-xs mt-1">Tap the bookmark on any whiskey in the catalog.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {wishlist.filter(Boolean).map(w => <WhiskeyCard key={w.id} whiskey={w} />)}
          </div>
        )
      )}
    </div>
  )
}
