'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { getRank } from '@/lib/ranks'
import HelpButton from '@/components/ui/HelpButton'

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [pourCount, setPourCount] = useState<number | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
  }, [user, loading])

  useEffect(() => {
    if (!user) return
    createClient()
      .from('pours')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setPourCount(count ?? 0))
  }, [user])

  if (loading || !user) return (
    <div className="min-h-screen bg-cellar-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const displayName = user.user_metadata?.display_name
  const location    = user.user_metadata?.location
  const avatarUrl   = user.user_metadata?.avatar_url

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-cellar-cream text-2xl font-bold">Profile</h1>
        <div className="flex items-center gap-2">
          <HelpButton />
          <Link href="/profile/settings" className="p-2 rounded-xl text-cellar-muted hover:text-cellar-cream transition-colors">
            <GearIcon />
          </Link>
        </div>
      </div>

      {/* Avatar + identity */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-24 h-24 rounded-full bg-cellar-surface border-2 border-cellar-border overflow-hidden mb-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🥃</div>
          )}
        </div>
        <p className="font-serif text-cellar-cream text-xl font-semibold">
          {displayName || 'Whiskey Enthusiast'}
        </p>
        {location && (
          <div className="flex items-center gap-1 text-cellar-muted text-sm mt-1">
            <PinIcon />
            <span>{location}</span>
          </div>
        )}
      </div>

      {/* Pours stat */}
      <div className="card p-5 flex items-center justify-between mb-3">
        <div>
          <p className="text-cellar-muted text-xs uppercase tracking-wide">Pours Logged</p>
          <p className="text-cellar-amber font-serif font-bold text-4xl mt-1">
            {pourCount === null ? '—' : pourCount}
          </p>
        </div>
        <div className="text-5xl opacity-50">🥃</div>
      </div>

      {/* Rank */}
      {pourCount !== null && (() => {
        const { current, next, progress } = getRank(pourCount)
        return (
          <div className="card p-5" data-tutorial="profile-rank">
            <p className="text-cellar-muted text-xs uppercase tracking-wide mb-1">Rank</p>
            <p className="font-serif text-cellar-amber text-xl font-semibold mb-3">{current.title}</p>
            {next ? (
              <>
                <div className="w-full h-1.5 bg-cellar-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cellar-amber rounded-full transition-all"
                    style={{ width: `${progress * 100}%` }}
                  />
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
    </div>
  )
}
