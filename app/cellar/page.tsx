'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import ScoreRing from '../../components/ui/ScoreRing'
import SubScoreBar from '../../components/ui/SubScoreBar'
import TagPill from '../../components/ui/TagPill'
import BFBBadge from '../../components/ui/BFBBadge'
import BottomNav from '../../components/ui/BottomNav'
import { ALL_SUBSCORES, WHISKEY_TYPES } from '../../lib/scoring'
import type { Pour } from '../../lib/database.types'
import { createClient } from '@/lib/supabase/client'

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
    </svg>
  )
}

export default function MyCellarPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [pours, setPours]       = useState<Pour[]>([])
  const [loading, setLoading]   = useState(true)
  const [typeFilter, setType]   = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth')
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return
    createClient()
      .from('pours').select('*, whiskeys(*)')
      .eq('user_id', user.id)
      .order('master_score', { ascending: false })
      .then(({ data }) => { setPours(data ?? []); setLoading(false) })
  }, [user])

  const filtered = pours.filter(p => !typeFilter || (p.whiskeys as any)?.type === typeFilter)

  const totalPours = pours.length
  const avgScore   = totalPours
    ? +(pours.reduce((a,p) => a+(p.master_score??0), 0)/totalPours).toFixed(2) : 0
  const topType    = totalPours
    ? Object.entries(pours.reduce((acc, p) => {
        const t = (p.whiskeys as any)?.type ?? 'Unknown'
        acc[t] = (acc[t]??0)+1; return acc
      }, {} as Record<string,number>)).sort((a,b)=>b[1]-a[1])[0]?.[0]
    : null

  if (authLoading || loading) return (
    <div className="min-h-screen bg-cellar-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="page">
      <h1 className="font-serif text-cellar-cream text-2xl font-bold mb-5">My Cellar</h1>

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

      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {['', ...WHISKEY_TYPES].map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-all ${
              typeFilter === t ? 'bg-cellar-amber border-cellar-amber text-cellar-bg' : 'bg-cellar-surface border-cellar-border text-cellar-muted'}`}>
            {t || 'All'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-cellar-muted text-sm mb-4">
            {pours.length === 0 ? 'No pours logged yet.' : 'No pours match this filter.'}
          </p>
          {pours.length === 0 && <Link href="/log" className="btn-primary inline-block">Log Your First Pour</Link>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(pour => {
            const w = pour.whiskeys as any
            const isOpen = expanded === pour.id
            const allSubs = ALL_SUBSCORES

            return (
              <div key={pour.id} className="card overflow-hidden">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpanded(isOpen ? null : pour.id)}
                  onKeyDown={e => e.key === 'Enter' && setExpanded(isOpen ? null : pour.id)}
                  className="w-full text-left p-4 cursor-pointer"
                >
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
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); router.push(`/edit/${pour.id}`) }}
                        className="p-1.5 rounded-lg text-cellar-muted hover:text-cellar-amber hover:bg-cellar-surface transition-colors"
                        aria-label="Edit pour"
                      >
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
                    {allSubs.map(s => (
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
      <BottomNav />
    </div>
  )
}
