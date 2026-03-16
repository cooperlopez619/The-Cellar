'use client'
import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../hooks/useAuth'
import ScoreRing from '../../../components/ui/ScoreRing'
import SubScoreBar from '../../../components/ui/SubScoreBar'
import TagPill from '../../../components/ui/TagPill'
import BFBBadge from '../../../components/ui/BFBBadge'
import BottomNav from '../../../components/ui/BottomNav'
import { PRICE_TIER_RANGE, UNIVERSAL_SUBSCORES, TYPE_SUBSCORES, type WhiskeyType } from '../../../lib/scoring'
import type { Whiskey, Pour } from '../../../lib/database.types'
import { createClient } from '@/lib/supabase/client'

export default function Page() {
  return (
    <Suspense>
      <WhiskeyDetailPage />
    </Suspense>
  )
}

function WhiskeyDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const router    = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [whiskey, setWhiskey] = useState<Whiskey | null>(null)
  const [pours, setPours]     = useState<Pour[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth')
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return
    const sb = createClient()
    Promise.all([
      sb.from('whiskeys').select('*').eq('id', id).single(),
      sb.from('pours').select('*').eq('whiskey_id', id),
    ]).then(([{ data: w }, { data: p }]) => {
      setWhiskey(w)
      setPours(p ?? [])
      setLoading(false)
    })
  }, [user, id])

  if (authLoading || loading) return (
    <div className="min-h-screen bg-cellar-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!whiskey) return <div className="page text-cellar-muted text-center pt-20">Whiskey not found.</div>

  const avgMaster = pours.length
    ? +(pours.reduce((a, p) => a + (p.master_score ?? 0), 0) / pours.length).toFixed(2) : 0
  const avgBFB = pours.length
    ? +(pours.reduce((a, p) => a + (p.bfb_score ?? 0), 0) / pours.length).toFixed(2) : 0

  const typeScoreDefs = TYPE_SUBSCORES[whiskey.type as WhiskeyType] ?? []
  const allSubs = [...UNIVERSAL_SUBSCORES, ...typeScoreDefs]

  const avgSubScore = (key: string, idx: number): number => {
    const scoreKey = idx < 3 ? key : `type_score_${idx - 2}`
    const vals = pours.map(p => (p.scores as Record<string,number>)?.[scoreKey]).filter(v => v > 0)
    return vals.length ? +(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2) : 0
  }

  return (
    <div className="page">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-cellar-muted text-sm mb-5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        Back
      </button>

      <div className="card p-5 mb-4">
        <div className="flex items-start gap-4">
          <ScoreRing score={avgMaster} size={72} />
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-cellar-cream text-xl font-bold leading-tight">{whiskey.name}</h1>
            <p className="text-cellar-muted text-sm mt-1">{whiskey.distillery}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <TagPill label={whiskey.type} variant="type" />
              {whiskey.region && <TagPill label={whiskey.region} />}
              {whiskey.abv && <TagPill label={`${whiskey.abv}% ABV`} />}
              {whiskey.price_tier && <TagPill label={`${whiskey.price_tier} · ${PRICE_TIER_RANGE[whiskey.price_tier]}`} />}
            </div>
            {avgBFB > 0 && <div className="mt-2"><BFBBadge score={avgBFB} /></div>}
          </div>
        </div>
        <p className="text-cellar-muted text-xs mt-3">{pours.length} community {pours.length === 1 ? 'pour' : 'pours'}</p>
      </div>

      {pours.length > 0 && (
        <div className="card p-5 mb-4">
          <h2 className="section-title mb-4">Community Breakdown</h2>
          <div className="space-y-3">
            {allSubs.map((s, i) => <SubScoreBar key={s.key} label={s.label} score={avgSubScore(s.key, i)} />)}
          </div>
        </div>
      )}

      {pours.some(p => p.tasting_notes) && (
        <div className="card p-5 mb-4">
          <h2 className="section-title mb-3">Tasting Notes</h2>
          <div className="space-y-3">
            {pours.filter(p => p.tasting_notes).slice(0, 5).map(p => (
              <div key={p.id} className="border-l-2 border-cellar-amber/40 pl-3">
                <p className="text-cellar-cream text-sm italic">&ldquo;{p.tasting_notes}&rdquo;</p>
                <p className="text-cellar-muted text-xs mt-1">
                  Score {p.master_score?.toFixed(1) ?? '—'} · {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link href={`/log/${whiskey.id}`} className="btn-primary">Log a Pour</Link>
      <BottomNav />
    </div>
  )
}
