'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import ScoreSlider from '../../../components/whiskey/ScoreSlider'
import ScoreRing from '../../../components/ui/ScoreRing'
import BFBBadge from '../../../components/ui/BFBBadge'
import TagPill from '../../../components/ui/TagPill'
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
  const [photo, setPhoto]         = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError]         = useState('')
  const [scoreError, setScoreError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        // Coerce all score values to numbers — JSONB can sometimes return strings
        const raw = (data.scores ?? {}) as Record<string, unknown>
        const keys: (keyof Scores)[] = ['nose', 'palate', 'finish', 'bottle', 'label']
        const loaded: Partial<Scores> = {}
        for (const k of keys) {
          const v = Number(raw[k])
          if (v > 0) loaded[k] = v
        }
        setScores(Object.keys(loaded).length > 0 ? loaded : { ...EMPTY })
        setPriceTier((data.price_tier_override ?? '') as PriceTier | '')
        setNotes(data.tasting_notes ?? '')
        if (data.bottle_photo_url) setPhotoPreview(data.bottle_photo_url)
        setLoading(false)
      })
  }, [user, pour_id])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function removePhoto() {
    setPhoto(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleScore(key: string, val: number) {
    setScores(prev => ({ ...prev, [key]: val }))
    if (scoreError) setScoreError(false)
    if (error) setError('')
  }

  const masterScore = calcMasterScore(scores)
  const bfbScore    = priceTier ? calcBFB(masterScore, priceTier) : 0

  async function handleDelete() {
    setDeleting(true); setError('')
    const { error: err } = await createClient()
      .from('pours')
      .delete()
      .eq('id', pour_id)
      .eq('user_id', user!.id)
    setDeleting(false)
    if (err) { setError(err.message); setConfirmDelete(false); return }
    router.push('/cellar')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!priceTier) { setError('Select a price tier'); return }

    const scoreKeys: (keyof Scores)[] = ['nose', 'palate', 'finish', 'bottle', 'label']
    const missingScores = scoreKeys.some(k => !scores[k] || scores[k] === 0)
    if (missingScores) {
      setScoreError(true)
      setError('Please rate all 5 categories before saving')
      document.querySelector('[data-scores-section]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setScoreError(false)
    setSaving(true); setError('')
    const sb = createClient()

    // Handle photo: upload new, preserve existing, or clear if removed
    let bottlePhotoUrl: string | null = pour?.bottle_photo_url ?? null
    if (photo && user) {
      const ext  = photo.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/${pour_id}.${ext}`
      const { error: uploadErr } = await sb.storage.from('pours').upload(path, photo, { upsert: true })
      if (uploadErr) {
        setError(`Photo upload failed: ${uploadErr.message}`)
        setSaving(false)
        return
      }
      const { data: urlData } = sb.storage.from('pours').getPublicUrl(path)
      bottlePhotoUrl = urlData.publicUrl
    } else if (!photoPreview) {
      // User removed the existing photo
      bottlePhotoUrl = null
    }

    const { error: err } = await sb
      .from('pours')
      .update({
        scores,
        master_score: masterScore,
        bfb_score:    bfbScore,
        tasting_notes: notes || null,
        price_tier_override: priceTier,
        bottle_photo_url: bottlePhotoUrl,
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
        <div
          data-scores-section
          className={`card p-5 space-y-5 transition-colors ${scoreError ? 'border-red-500/70' : ''}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="section-title">Your Scores</h2>
            <div className="flex items-center gap-5">
              <div className="flex flex-col items-center gap-1">
                <ScoreRing score={masterScore} size={52} strokeWidth={4} />
                <span className="text-cellar-muted text-xs text-center">Overall</span>
              </div>
              {bfbScore > 0 && (
                <div className="flex flex-col items-center gap-1">
                  <div className="h-[52px] flex items-center justify-center">
                    <BFBBadge score={bfbScore} />
                  </div>
                  <span className="text-cellar-muted text-xs text-center">Bang for Buck</span>
                </div>
              )}
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

        {/* Comments */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-cellar-muted text-xs uppercase tracking-wide">
              Comments <span className="normal-case">(optional)</span>
            </label>
            <span className={`text-xs ${notes.length > 450 ? 'text-cellar-red' : 'text-cellar-muted'}`}>
              {notes.length}/500
            </span>
          </div>
          <textarea rows={3} placeholder="Share your thoughts on this pour…"
            value={notes} onChange={e => setNotes(e.target.value.slice(0, 500))}
            className="input resize-none" />
        </div>

        {/* Bottle photo */}
        <div>
          <label className="text-cellar-muted text-xs uppercase tracking-wide mb-2 block">
            Bottle Photo <span className="normal-case">(optional)</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
            id="bottle-photo-edit"
          />
          {photoPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="Bottle preview" className="w-full rounded-xl object-cover max-h-64" />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-2 right-2 bg-cellar-bg/80 rounded-full p-1.5 text-cellar-muted hover:text-cellar-cream transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ) : (
            <label htmlFor="bottle-photo-edit"
              className="flex flex-col items-center gap-2 p-6 rounded-xl border border-dashed border-cellar-border text-cellar-muted hover:border-cellar-amber hover:text-cellar-amber transition-colors cursor-pointer">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span className="text-sm">Take or upload a photo</span>
            </label>
          )}
        </div>

        {error && <p className="text-cellar-red text-sm">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      {/* Delete */}
      <div className="mt-6 mb-8">
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full py-3 rounded-xl text-sm font-medium text-cellar-red border border-cellar-red/30 bg-cellar-red/5 transition-colors hover:bg-cellar-red/10"
          >
            Delete Pour
          </button>
        ) : (
          <div className="card p-4 border border-cellar-red/40 space-y-3">
            <p className="text-cellar-cream text-sm text-center">Delete this pour? This can't be undone.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-cellar-border text-cellar-muted bg-cellar-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-cellar-red text-white border border-cellar-red transition-colors"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
