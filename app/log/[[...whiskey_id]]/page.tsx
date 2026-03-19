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
import type { Whiskey } from '../../../lib/database.types'
import { createClient } from '@/lib/supabase/client'
import HelpButton from '@/components/ui/HelpButton'

const EMPTY: Partial<Scores> = { nose: 0, palate: 0, finish: 0, bottle: 0, label: 0 }

const TASTE_DESCRIPTIONS: Record<string, string> = {
  nose:   'Rate the aroma when you bring the glass to your nose. Consider complexity, intensity, and the scents you detect — fruits, oak, spice, or smoke.',
  palate: 'Rate the taste on your tongue. Consider balance, depth of flavor, and how the character of the spirit develops as you sip.',
  finish: 'Rate the lingering sensation after swallowing. Consider length, warmth, and how pleasant the aftertaste is.',
}

function WhiskeySearch({ onSelect }: { onSelect: (w: Whiskey) => void }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<Whiskey[]>([])
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const ref                   = useRef<HTMLDivElement>(null)
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)

  function getSearchRank(w: Whiskey, search: string) {
    const name = w.name.toLowerCase()
    const distillery = w.distillery.toLowerCase()
    if (name === search) return 0
    if (name.startsWith(search)) return 1
    if (name.includes(search)) return 2
    if (distillery.startsWith(search)) return 3
    if (distillery.includes(search)) return 4
    return 5
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(value: string) {
    setQuery(value)
    setOpen(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    const normalizedSearch = value.trim().toLowerCase()
    if (!normalizedSearch) { setResults([]); setLoading(false); return }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      const sb = createClient()
      const { data } = await sb
        .from('whiskeys')
        .select('*')
        .or(`name.ilike.%${normalizedSearch}%,distillery.ilike.%${normalizedSearch}%`)
        .limit(120)

      const ranked = (data ?? [])
        .sort((a, b) => {
          const rankDiff = getSearchRank(a, normalizedSearch) - getSearchRank(b, normalizedSearch)
          if (rankDiff !== 0) return rankDiff
          return a.name.localeCompare(b.name)
        })
        .slice(0, 30)

      setResults(ranked)
      setLoading(false)
    }, 200)
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => query && setOpen(true)}
        placeholder="Search whiskeys & distilleries…"
        className="input w-full"
        data-tutorial="log-search"
      />
      {open && query.trim() && (
        <div className="absolute top-full mt-1 left-0 right-0 z-30 bg-cellar-surface border border-cellar-border rounded-xl overflow-hidden shadow-xl max-h-64 overflow-y-auto">
          {loading ? (
            <p className="text-cellar-muted text-sm px-4 py-3">Searching…</p>
          ) : results.length === 0 ? (
            <p className="text-cellar-muted text-sm px-4 py-3">No whiskeys found.</p>
          ) : (
            results.map(w => (
              <button
                key={w.id}
                type="button"
                onMouseDown={() => { onSelect(w); setOpen(false); setQuery('') }}
                className="w-full text-left px-4 py-2.5 border-b border-cellar-border/40 last:border-0 hover:bg-cellar-bg transition-colors"
              >
                <p className="text-cellar-cream text-sm font-medium">{w.name}</p>
                <p className="text-cellar-muted text-xs">{w.distillery}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense>
      <LogPourPage />
    </Suspense>
  )
}

function LogPourPage() {
  const params    = useParams<{ whiskey_id?: string[] }>()
  const prefillId = params.whiskey_id?.[0] ?? ''
  const router    = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [selectedWhiskey, setSelectedWhiskey] = useState<Whiskey | null>(null)
  const [scores, setScores]                   = useState<Partial<Scores>>({ ...EMPTY })
  const [priceTier, setPriceTier]             = useState<PriceTier | ''>('')
  const [notes, setNotes]                     = useState('')
  const [photo, setPhoto]                     = useState<File | null>(null)
  const [photoPreview, setPhotoPreview]       = useState<string | null>(null)
  const [saving, setSaving]                   = useState(false)
  const [error, setError]                     = useState('')
  const [scoreError, setScoreError]           = useState(false)
  const [isFavorite, setIsFavorite]           = useState(false)
  const [isWishlist, setIsWishlist]           = useState(false)
  const [pourId, setPourId]                   = useState<string | null>(null)
  const [existingPourNotice, setExistingPourNotice] = useState(false)
  const fileInputRef                          = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth')
  }, [user, authLoading])

  // Load existing pour data for a given whiskey (if any) and pre-fill the form
  async function loadPourData(whiskeyId: string, showNotice = false) {
    if (!user) return
    const sb = createClient()
    const [{ data: pours }, { data: lists }] = await Promise.all([
      sb.from('pours').select('*').eq('user_id', user.id).eq('whiskey_id', whiskeyId)
        .order('created_at', { ascending: false }).limit(1),
      sb.from('user_lists').select('list_type').eq('user_id', user.id).eq('whiskey_id', whiskeyId),
    ])
    const pour = pours?.[0] ?? null
    if (pour) {
      setPourId(pour.id)
      setScores((pour.scores as Partial<Scores>) ?? { ...EMPTY })
      setPriceTier((pour.price_tier_override as PriceTier) ?? '')
      setNotes(pour.tasting_notes ?? '')
      if (pour.bottle_photo_url) setPhotoPreview(pour.bottle_photo_url)
      if (showNotice) setExistingPourNotice(true)
    }
    setIsFavorite(lists?.some(r => r.list_type === 'favorite') ?? false)
    setIsWishlist(lists?.some(r => r.list_type === 'wishlist') ?? false)
  }

  useEffect(() => {
    if (!user || !prefillId) return
    const sb = createClient()
    sb.from('whiskeys').select('*').eq('id', prefillId).single().then(({ data }) => {
      if (data) {
        setSelectedWhiskey(data)
        setPriceTier((data.price_tier as PriceTier) ?? '')
        loadPourData(prefillId)
      }
    })
  }, [user, prefillId])

  async function handleWhiskeySelect(whiskey: Whiskey) {
    setSelectedWhiskey(whiskey)
    setPriceTier((whiskey.price_tier as PriceTier) ?? '')
    setScores({ ...EMPTY })
    setNotes('')
    setPhoto(null)
    setPhotoPreview(null)
    setPourId(null)
    setExistingPourNotice(false)
    await loadPourData(whiskey.id, true)
  }

  async function toggleList(type: 'favorite' | 'wishlist') {
    if (!user || !selectedWhiskey) return
    const sb = createClient()
    const active = type === 'favorite' ? isFavorite : isWishlist
    const setFn  = type === 'favorite' ? setIsFavorite : setIsWishlist
    setFn(!active)
    if (active) {
      await sb.from('user_lists').delete()
        .eq('user_id', user.id).eq('whiskey_id', selectedWhiskey.id).eq('list_type', type)
    } else {
      await sb.from('user_lists').insert({ user_id: user.id, whiskey_id: selectedWhiskey.id, list_type: type })
    }
  }

  function handleScore(key: string, val: number) {
    setScores(prev => ({ ...prev, [key]: val }))
    if (scoreError) setScoreError(false)
    if (error) setError('')
  }

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

  const masterScore = calcMasterScore(scores)
  const tier        = (priceTier || selectedWhiskey?.price_tier) as PriceTier | undefined
  const bfbScore    = tier ? calcBFB(masterScore, tier) : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedWhiskey) { setError('Select a whiskey first'); return }
    if (!priceTier)        { setError('Select a price tier'); return }

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

    let bottlePhotoUrl: string | null = null
    if (photo && user) {
      const ext  = photo.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const sb   = createClient()
      const { error: uploadErr } = await sb.storage.from('pours').upload(path, photo, { upsert: true })
      if (uploadErr) {
        setError(`Photo upload failed: ${uploadErr.message}`)
        setSaving(false)
        return
      }
      const { data: urlData } = sb.storage.from('pours').getPublicUrl(path)
      bottlePhotoUrl = urlData.publicUrl
    }

    const sb = createClient()
    const payload = {
      scores,
      master_score: masterScore,
      bfb_score:    bfbScore,
      tasting_notes: notes || null,
      bottle_photo_url: bottlePhotoUrl,
      price_tier_override: priceTier as PriceTier,
    }
    const { error: err } = pourId
      ? await sb.from('pours').update(payload).eq('id', pourId)
      : await sb.from('pours').insert({ user_id: user!.id, whiskey_id: selectedWhiskey.id, ...payload })
    setSaving(false)
    if (err) { setError(err.message); return }
    router.push('/cellar')
  }

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
        <h1 className="font-serif text-cellar-cream text-xl font-semibold">{pourId ? 'Edit Pour' : 'Log a Pour'}</h1>
        <div className="ml-auto"><HelpButton /></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Whiskey selector */}
        <div>
          <label className="text-cellar-muted text-xs uppercase tracking-wide mb-2 block">Whiskey</label>
          {selectedWhiskey ? (
            <div className="card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-cellar-cream font-medium text-sm">{selectedWhiskey.name}</p>
                <p className="text-cellar-muted text-xs">{selectedWhiskey.distillery}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <TagPill label={selectedWhiskey.type} variant="type" />
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-center gap-2">
                <button type="button" onClick={() => toggleList('favorite')}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  className={`transition-colors ${isFavorite ? 'text-cellar-amber' : 'text-cellar-muted hover:text-cellar-cream'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
                <button type="button" onClick={() => toggleList('wishlist')}
                  aria-label={isWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                  className={`transition-colors ${isWishlist ? 'text-cellar-amber' : 'text-cellar-muted hover:text-cellar-cream'}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                </button>
                <button type="button" onClick={() => setSelectedWhiskey(null)}
                  className="text-cellar-muted text-xs underline">change</button>
              </div>
            </div>
          ) : (
            <WhiskeySearch onSelect={handleWhiskeySelect} />
          )}
        </div>

        {/* Existing pour notice */}
        {existingPourNotice && pourId && (
          <div className="flex items-start gap-3 bg-cellar-amber/10 border border-cellar-amber/30 rounded-xl px-4 py-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cellar-amber shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            <p className="text-cellar-amber text-sm leading-snug">
              You&apos;ve already rated this whiskey. Your existing scores are loaded below — saving will update your rating, not create a new one.
            </p>
          </div>
        )}

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
        {selectedWhiskey && (
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
                  value={(scores as Record<string, number>)[s.key] ?? 0} onChange={handleScore}
                  description={TASTE_DESCRIPTIONS[s.key]} />
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
        )}

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
            id="bottle-photo"
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
            <label htmlFor="bottle-photo"
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
          {saving ? 'Saving…' : pourId ? 'Update Pour' : 'Save Pour'}
        </button>
      </form>
    </div>
  )
}
