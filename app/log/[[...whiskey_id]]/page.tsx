'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import ScoreSlider from '../../../components/whiskey/ScoreSlider'
import ScoreRing from '../../../components/ui/ScoreRing'
import BFBBadge from '../../../components/ui/BFBBadge'
import TagPill from '../../../components/ui/TagPill'
import BottomNav from '../../../components/ui/BottomNav'
import {
  UNIVERSAL_SUBSCORES, TYPE_SUBSCORES, PRICE_TIERS,
  calcMasterScore, calcBFB, type WhiskeyType, type PriceTier, type Scores,
} from '../../../lib/scoring'
import type { Whiskey } from '../../../lib/database.types'

const EMPTY: Partial<Scores> = { nose:0, palate:0, finish:0, type_score_1:0, type_score_2:0 }

export default function LogPourPage() {
  const params   = useParams<{ whiskey_id?: string[] }>()
  const prefillId = params.whiskey_id?.[0] ?? ''
  const router   = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [whiskeys, setWhiskeys]   = useState<Whiskey[]>([])
  const [selectedId, setSelectedId] = useState(prefillId)
  const [selected, setSelected]   = useState<Whiskey | null>(null)
  const [scores, setScores]       = useState<Partial<Scores>>({ ...EMPTY })
  const [priceTier, setPriceTier] = useState<PriceTier | ''>('')
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth')
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return
    getSupabase().from('whiskeys').select('*').order('name').then(({ data }) => {
      setWhiskeys(data ?? [])
      if (prefillId) {
        const w = data?.find(w => w.id === prefillId)
        if (w) { setSelected(w); setPriceTier(w.price_tier ?? '') }
      }
    })
  }, [user])

  function pickWhiskey(id: string) {
    setSelectedId(id)
    const w = whiskeys.find(w => w.id === id) ?? null
    setSelected(w)
    setPriceTier(w?.price_tier ?? '')
    setScores({ ...EMPTY })
  }

  function handleScore(key: string, val: number) {
    setScores(prev => ({ ...prev, [key]: val }))
  }

  const masterScore = calcMasterScore(scores)
  const tier        = (priceTier || selected?.price_tier) as PriceTier | undefined
  const bfbScore    = tier ? calcBFB(masterScore, tier) : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId)  { setError('Select a whiskey first'); return }
    if (!priceTier)   { setError('Select a price tier'); return }
    setSaving(true); setError('')
    const { error: err } = await getSupabase().from('pours').insert({
      user_id: user!.id, whiskey_id: selectedId,
      scores, master_score: masterScore, bfb_score: bfbScore,
      tasting_notes: notes || null,
      price_tier_override: priceTier as PriceTier,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    router.push('/cellar')
  }

  const typeScoreDefs = selected ? (TYPE_SUBSCORES[selected.type as WhiskeyType] ?? []) : []

  if (authLoading) return (
    <div className="min-h-screen bg-cellar-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="page">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-cellar-muted">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="font-serif text-cellar-cream text-xl font-semibold">Log a Pour</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Whiskey */}
        <div>
          <label className="text-cellar-muted text-xs uppercase tracking-wide mb-2 block">Whiskey</label>
          {selected ? (
            <div className="card p-3 flex items-center justify-between">
              <div>
                <p className="text-cellar-cream font-medium text-sm">{selected.name}</p>
                <p className="text-cellar-muted text-xs">{selected.distillery}</p>
              </div>
              <div className="flex items-center gap-2">
                <TagPill label={selected.type} variant="type" />
                <button type="button" onClick={() => { setSelected(null); setSelectedId('') }}
                  className="text-cellar-muted text-xs underline">change</button>
              </div>
            </div>
          ) : (
            <select value={selectedId} onChange={e => pickWhiskey(e.target.value)} className="input" required>
              <option value="">Select a whiskey…</option>
              {whiskeys.map(w => <option key={w.id} value={w.id}>{w.name} — {w.distillery}</option>)}
            </select>
          )}
        </div>

        {/* Price tier */}
        <div>
          <label className="text-cellar-muted text-xs uppercase tracking-wide mb-2 block">Price Tier</label>
          <div className="flex gap-2 flex-wrap">
            {PRICE_TIERS.map(t => (
              <button key={t} type="button" onClick={() => setPriceTier(t)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                  priceTier === t ? 'bg-cellar-amber border-cellar-amber text-cellar-bg' : 'bg-cellar-surface border-cellar-border text-cellar-muted'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Scores */}
        {selected && (
          <div className="card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Your Scores</h2>
              <div className="flex items-center gap-3">
                <ScoreRing score={masterScore} size={52} strokeWidth={4} />
                {bfbScore > 0 && <BFBBadge score={bfbScore} />}
              </div>
            </div>
            {UNIVERSAL_SUBSCORES.map(s => (
              <ScoreSlider key={s.key} label={s.label} scoreKey={s.key}
                value={(scores as Record<string,number>)[s.key] ?? 0} onChange={handleScore} />
            ))}
            {typeScoreDefs.length > 0 && (
              <div className="border-t border-cellar-border pt-4">
                <p className="text-cellar-muted text-xs uppercase tracking-wide mb-4">{selected.type}-specific</p>
                {typeScoreDefs.map((s, i) => (
                  <div key={s.key} className="mb-5 last:mb-0">
                    <ScoreSlider label={s.label} scoreKey={`type_score_${i+1}`}
                      value={(scores as Record<string,number>)[`type_score_${i+1}`] ?? 0} onChange={handleScore} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-cellar-muted text-xs uppercase tracking-wide mb-2 block">
            Tasting Notes <span className="normal-case">(optional)</span>
          </label>
          <textarea rows={3} placeholder="Notes on the nose, palate, finish…"
            value={notes} onChange={e => setNotes(e.target.value)} className="input resize-none" />
        </div>

        {error && <p className="text-cellar-red text-sm">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save Pour'}
        </button>
      </form>
      <BottomNav />
    </div>
  )
}
