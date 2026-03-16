'use client'
import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import ScoreSlider from '../../../components/whiskey/ScoreSlider'
import ScoreRing from '../../../components/ui/ScoreRing'
import BFBBadge from '../../../components/ui/BFBBadge'
import TagPill from '../../../components/ui/TagPill'
import BottomNav from '../../../components/ui/BottomNav'
import {
  TASTE_SUBSCORES, APPEARANCE_SUBSCORES, PRICE_TIERS, PRICE_TIER_RANGE,
  calcMasterScore, calcBFB, type PriceTier, type Scores,
} from '../../../lib/scoring'
import type { Pour } from '../../../lib/database.types'
import { createClient } from '@/lib/supabase/client'

const EMPTY: Partial<Scores> = { nose: 0, palate: 0, finish: 0, bottle: 0, label: 0 }

export default function Page() {
  return (
    <Suspense>
      <EditPourPage />
    </Suspense>
  )
}

function EditPourPage() {
  const { pour_id } = useParams<{ pour_id: string }>()
  const router      = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [pour, setPour]           = useState<Pour | null>(null)
  const [whiskey, setWhiskey]     = useState<{ name: string; distillery: string; type: string } | null>(null)
  const [scores, setScores]       = useState<Partial<Scores>>({ ...EMPTY })
  const [priceTier, setPriceTier] = useState<PriceTier | ''>('')
  const [notes, setNotes]         = useState('')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth')
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return
    createClient()
      .from('pours')
      .select('*, whiskeys(name, distillery, type)')
      .eq('id', pour_id)
      .eq('user_id', user.id)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) { router.replace('/cellar'); return }
        setPour(data)
        setWhiskey(data.whiskeys as any)
        setScores((data.scores as Partial<Scores>) ?? { ...EMPTY })
        setPriceTier((data.price_tier_override ?? '') as PriceTier | '')
        setNotes(data.tasting_notes ?? '')
        setLoading(false)
      })
  }, [user, pour_id])

  function handleScore(key: string, val: number) {
    setScores(prev => ({ ...prev, [key]: val }))
  }

  const masterScore = calcMasterScore(scores)
  const bfbScore    = priceTier ? calcBFB(masterScore, priceTier) : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!priceTier) { setError('Select a price tier'); return }
    setSaving(true); setError('')
    const { error: err } = await createClient()
      .from('pours')
      .update({
        scores,
        master_score: masterScore,
        bfb_score:    bfbScore,
        tasting_notes: notes || null,
        price_tier_override: priceTier,
      })
      .eq('id', pour_id)
      .eq('user_id', user!.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    router.push('/cellar')
  }

  if (authLoading || loading) return (
    <div className="min-h-screen bg-cellar-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="page">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-cellar-muted">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="font-serif text-cellar-cream text-xl font-semibold">Edit Pour</h1>
      </div>

      {/* Whiskey info — read-only */}
      {whiskey && (
        <div className="card p-3 flex items-center gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <p className="text-cellar-cream font-medium text-sm">{whiskey.name}</p>
            <p className="text-cellar-muted text-xs">{whiskey.distillery}</p>
          </div>
          <TagPill label={whiskey.type} variant="type" />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Price — dollar signs */}
        <div>
          <label className="text-cellar-muted text-xs uppercase tracking-wide mb-2 block">Price</label>
          <div className="flex gap-2">
            {PRICE_TIERS.map(t => (
              <button key={t} type="button" onClick={() => setPriceTier(t)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold border transition-all ${
                  priceTier === t
                    ? 'bg-cellar-amber border-cellar-amber text-cellar-bg'
                    : 'bg-cellar-surface border-cellar-border text-cellar-muted'
                }`}>
                {t}
              </button>
            ))}
          </div>
          {priceTier && (
            <p className="text-cellar-muted text-xs mt-1.5 text-center">{PRICE_TIER_RANGE[priceTier]}</p>
          )}
        </div>

        {/* Scores */}
        <div className="card p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Your Scores</h2>
            <div className="flex items-center gap-3">
              <ScoreRing score={masterScore} size={52} strokeWidth={4} />
              {bfbScore > 0 && <BFBBadge score={bfbScore} />}
            </div>
          </div>

          {/* Taste */}
          <div className="space-y-5">
            <p className="text-cellar-muted text-xs uppercase tracking-wide">Taste</p>
            {TASTE_SUBSCORES.map(s => (
              <ScoreSlider key={s.key} label={s.label} scoreKey={s.key}
                value={(scores as Record<string, number>)[s.key] ?? 0} onChange={handleScore} />
            ))}
          </div>

          {/* Appearance */}
          <div className="border-t border-cellar-border pt-5 space-y-5">
            <p className="text-cellar-muted text-xs uppercase tracking-wide">Appearance</p>
            {APPEARANCE_SUBSCORES.map(s => (
              <ScoreSlider key={s.key} label={s.label} scoreKey={s.key}
                value={(scores as Record<string, number>)[s.key] ?? 0} onChange={handleScore} />
            ))}
          </div>
        </div>

        {/* Tasting notes */}
        <div>
          <label className="text-cellar-muted text-xs uppercase tracking-wide mb-2 block">
            Tasting Notes <span className="normal-case">(optional)</span>
          </label>
          <textarea rows={3} placeholder="Notes on the nose, palate, finish…"
            value={notes} onChange={e => setNotes(e.target.value)} className="input resize-none" />
        </div>

        {error && <p className="text-cellar-red text-sm">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
      <BottomNav />
    </div>
  )
}
