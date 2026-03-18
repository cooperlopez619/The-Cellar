'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { getRank } from '@/lib/ranks'
import QRCode from '@/components/ui/QRCode'

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

const PRICE_TIER_VALUE: Record<string, number> = {
  '$': 1, '$$': 2, '$$$': 3, '$$$$': 4, '$$$$$': 5,
}

function getPricingRating(avg: number | null): string | null {
  if (avg === null) return null
  if (avg < 1.5) return 'Budget Sipper'
  if (avg < 2.5) return 'Value Hunter'
  if (avg < 3.5) return 'Premium Palate'
  if (avg < 4.5) return 'High Roller'
  return 'Unicorn Chaser'
}

export default function MyProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [pourCount,  setPourCount]  = useState<number | null>(null)
  const [favType,    setFavType]    = useState<string | null>(null)
  const [avgPrice,   setAvgPrice]   = useState<number | null>(null)
  const [username,   setUsername]   = useState<string | null>(null)
  const [showQR,     setShowQR]     = useState(false)
  const [copied,     setCopied]     = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
  }, [user, loading])

  useEffect(() => {
    if (!user) return
    const sb = createClient()

    // Pour count
    sb.from('pours')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setPourCount(count ?? 0))

    // Fav type + avg price
    sb.from('pours')
      .select('whiskeys(type, price_tier), price_tier_override')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!data?.length) return
        const typeCounts: Record<string, number> = {}
        const tiers: number[] = []
        data.forEach((p: any) => {
          const t = p.whiskeys?.type
          if (t) typeCounts[t] = (typeCounts[t] ?? 0) + 1
          const tier = p.price_tier_override ?? p.whiskeys?.price_tier
          const val  = tier ? PRICE_TIER_VALUE[tier] : null
          if (val) tiers.push(val)
        })
        const top = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]
        if (top) setFavType(top[0])
        if (tiers.length) setAvgPrice(tiers.reduce((a, v) => a + v, 0) / tiers.length)
      })

    // Username from profiles
    sb.from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setUsername(data?.username ?? null))
  }, [user])

  if (loading || !user) return (
    <div className="min-h-screen bg-cellar-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const displayName  = user.user_metadata?.display_name
  const location     = user.user_metadata?.location
  const avatarUrl    = user.user_metadata?.avatar_url
  const pricingLabel = getPricingRating(avgPrice)

  const inviteUrl = typeof window !== 'undefined' && username
    ? `${window.location.origin}/add/${username}`
    : null

  async function copyInviteLink() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function shareInviteLink() {
    if (!inviteUrl) return
    if (navigator.share) {
      await navigator.share({
        title: 'Join me on The Cellar',
        text: `Add me as a Drinking Buddy on The Cellar 🥃`,
        url: inviteUrl,
      })
    } else {
      copyInviteLink()
    }
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-cellar-muted">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="font-serif text-cellar-cream text-2xl font-bold">My Profile</h1>
        <Link href="/profile/settings" className="ml-auto p-2 rounded-xl text-cellar-muted hover:text-cellar-cream transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </Link>
      </div>

      {/* Avatar + identity */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-24 h-24 rounded-full bg-cellar-amber/20 border-2 border-cellar-amber/30 overflow-hidden mb-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-cellar-amber">
              {displayName ? displayName.trim()[0].toUpperCase() : '?'}
            </div>
          )}
        </div>
        <p className="font-serif text-cellar-cream text-xl font-semibold">
          {displayName || (username ? `@${username}` : 'New Member')}
        </p>
        {username && (
          <p className="text-cellar-muted text-sm mt-0.5">@{username}</p>
        )}
        {location && (
          <div className="flex items-center gap-1 text-cellar-muted text-sm mt-1">
            <PinIcon />
            <span>{location}</span>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="card p-5">
          <p className="text-cellar-muted text-xs uppercase tracking-wide">Pours Logged</p>
          <p className="text-cellar-amber font-serif font-bold text-4xl mt-1">
            {pourCount === null ? '—' : pourCount}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-cellar-muted text-xs uppercase tracking-wide">Favorite Type</p>
          <p className="text-cellar-cream font-serif font-bold text-xl mt-1 leading-tight">
            {favType ?? (pourCount === 0 ? 'None yet' : '—')}
          </p>
        </div>
        <div className="card p-5 col-span-2">
          <p className="text-cellar-muted text-xs uppercase tracking-wide">Pricing Style</p>
          <p className="text-cellar-cream font-serif font-bold text-xl mt-1 leading-tight">
            {pricingLabel ?? (pourCount === 0 ? 'None yet' : '—')}
          </p>
          {avgPrice !== null && (
            <p className="text-cellar-muted text-xs mt-1">
              Avg tier: {'$'.repeat(Math.round(avgPrice))}
            </p>
          )}
        </div>
      </div>

      {/* Rank */}
      {pourCount !== null && (() => {
        const { current, next, progress } = getRank(pourCount)
        return (
          <div className="card p-5 mb-3">
            <p className="text-cellar-muted text-xs uppercase tracking-wide mb-1">Rank</p>
            <p className="font-serif text-cellar-amber text-xl font-semibold mb-3">{current.title}</p>
            {next ? (
              <>
                <div className="w-full h-1.5 bg-cellar-border rounded-full overflow-hidden">
                  <div className="h-full bg-cellar-amber rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
                </div>
                <p className="text-cellar-muted text-xs mt-2">
                  {next.min - pourCount} pour{next.min - pourCount !== 1 ? 's' : ''} to <span className="text-cellar-cream">{next.title}</span>
                </p>
              </>
            ) : (
              <p className="text-cellar-muted text-xs">You&apos;ve reached the highest rank.</p>
            )}
          </div>
        )
      })()}

      {/* Invite / QR section */}
      {username ? (
        <div className="card p-5">
          <p className="text-cellar-muted text-xs uppercase tracking-wide mb-3">Share Your Profile</p>

          {/* Link row */}
          <div className="flex items-center gap-2 bg-cellar-bg rounded-xl px-3 py-2.5 mb-3">
            <p className="flex-1 text-cellar-cream text-sm truncate font-mono">
              {inviteUrl ?? `…/add/${username}`}
            </p>
            <button onClick={copyInviteLink} className="text-cellar-muted hover:text-cellar-cream transition-colors shrink-0" aria-label="Copy link">
              {copied
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              }
            </button>
            <button onClick={shareInviteLink} className="text-cellar-muted hover:text-cellar-cream transition-colors shrink-0" aria-label="Share link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
          </div>

          {/* QR toggle */}
          <button
            onClick={() => setShowQR(v => !v)}
            className="flex items-center gap-2 text-cellar-amber text-sm font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              <path d="M14 14h.01M14 17h.01M17 14h.01M17 17h.01M20 14h.01M20 17h.01M20 20h.01M17 20h.01M14 20h.01"/>
            </svg>
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </button>

          {showQR && inviteUrl && (
            <div className="flex flex-col items-center gap-2 mt-4">
              <div className="p-3 bg-[#1a1208] rounded-2xl border border-cellar-border">
                <QRCode value={inviteUrl} size={190} />
              </div>
              <p className="text-cellar-muted text-xs text-center">Scan to add you as a Drinking Buddy</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-5">
          <p className="text-cellar-muted text-xs uppercase tracking-wide mb-2">Share Your Profile</p>
          <p className="text-cellar-muted text-sm mb-3">Set a username to get your invite link and QR code.</p>
          <Link href="/profile/settings" className="btn-primary text-center block text-sm">
            Set Username in Settings
          </Link>
        </div>
      )}
    </div>
  )
}
