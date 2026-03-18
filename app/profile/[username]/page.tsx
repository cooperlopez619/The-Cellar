'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { getRank } from '@/lib/ranks'
import ScoreRing from '@/components/ui/ScoreRing'
import TagPill from '@/components/ui/TagPill'
import BFBBadge from '@/components/ui/BFBBadge'
import SubScoreBar from '@/components/ui/SubScoreBar'
import { ALL_SUBSCORES, calcMasterScore, type Scores } from '@/lib/scoring'

const AVATAR_PALETTES = [
  { bg: 'bg-cellar-amber/20', text: 'text-cellar-amber', border: 'border-cellar-amber/30' },
  { bg: 'bg-cellar-green/20', text: 'text-cellar-green', border: 'border-cellar-green/30' },
  { bg: 'bg-cellar-red/20',   text: 'text-cellar-red',   border: 'border-cellar-red/30'   },
] as const
function avatarColour(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_PALETTES[n % AVATAR_PALETTES.length]
}
function getInitial(name: string | null): string {
  if (!name) return '?'
  return name.trim()[0].toUpperCase()
}

function getPricingRating(avg: number | null): string | null {
  if (avg === null) return null
  if (avg < 1.5) return 'Budget Sipper'
  if (avg < 2.5) return 'Value Hunter'
  if (avg < 3.5) return 'Premium Palate'
  if (avg < 4.5) return 'High Roller'
  return 'Unicorn Chaser'
}

interface UserStat {
  id:             string
  display_name:   string | null
  username:       string | null
  pour_count:     number
  fav_type:       string | null
  avg_price_tier: number | null
}

type FriendState = 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'self' | 'loading'

export default function BuddyProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const usernameParam = params.username as string

  const [profile,       setProfile]       = useState<UserStat | null>(null)
  const [notFound,      setNotFound]       = useState(false)
  const [friendState,   setFriendState]   = useState<FriendState>('loading')
  const [friendRowId,   setFriendRowId]   = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)

  // Pours list
  const [showPours,    setShowPours]    = useState(false)
  const [buddyPours,   setBuddyPours]   = useState<any[]>([])
  const [poursLoading, setPoursLoading] = useState(false)
  const [poursFetched, setPoursFetched] = useState(false)
  const [expanded,     setExpanded]     = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth')
  }, [user, authLoading])

  useEffect(() => {
    if (!user || !usernameParam) return
    const sb = createClient()

    sb.from('user_stats')
      .select('*')
      .eq('username', usernameParam)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setNotFound(true); return }
        setProfile(data as UserStat)

        if (data.id === user.id) {
          setFriendState('self')
          return
        }

        sb.from('friendships')
          .select('*')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .or(`requester_id.eq.${data.id},addressee_id.eq.${data.id}`)
          .then(({ data: rows }) => {
            const row = (rows ?? []).find((r: any) =>
              (r.requester_id === user.id && r.addressee_id === data.id) ||
              (r.requester_id === data.id && r.addressee_id === user.id)
            )
            if (!row) { setFriendState('none'); return }
            setFriendRowId(row.id)
            if (row.status === 'accepted') {
              setFriendState('friends')
            } else if (row.requester_id === user.id) {
              setFriendState('pending_sent')
            } else {
              setFriendState('pending_received')
            }
          })
      })
  }, [user, authLoading, usernameParam])

  async function fetchPours(profileId: string) {
    if (poursFetched) return
    setPoursLoading(true)
    const { data } = await createClient()
      .from('pours')
      .select('*, whiskeys(*)')
      .eq('user_id', profileId)
      .order('master_score', { ascending: false })
    setBuddyPours(data ?? [])
    setPoursFetched(true)
    setPoursLoading(false)
  }

  function togglePours() {
    if (!profile) return
    if (!showPours && !poursFetched) fetchPours(profile.id)
    setShowPours(v => !v)
  }

  async function sendRequest() {
    if (!user || !profile) return
    const sb = createClient()
    const { data } = await sb.from('friendships')
      .insert({ requester_id: user.id, addressee_id: profile.id })
      .select().maybeSingle()
    if (data) { setFriendRowId(data.id); setFriendState('pending_sent') }
  }

  async function acceptRequest() {
    if (!friendRowId) return
    await createClient().from('friendships').update({ status: 'accepted' }).eq('id', friendRowId)
    setFriendState('friends')
  }

  async function removeFriend() {
    if (!friendRowId) return
    await createClient().from('friendships').delete().eq('id', friendRowId)
    setFriendRowId(null)
    setFriendState('none')
    setConfirmRemove(false)
  }

  if (authLoading || !user) return (
    <div className="min-h-screen bg-cellar-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound) return (
    <div className="page">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-cellar-muted">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="font-serif text-cellar-cream text-2xl font-bold">Profile</h1>
      </div>
      <div className="card p-8 text-center">
        <p className="text-cellar-muted">User @{usernameParam} not found.</p>
      </div>
    </div>
  )

  if (!profile) return (
    <div className="min-h-screen bg-cellar-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const { current: rank, next, progress } = getRank(profile.pour_count)
  const pricingLabel = getPricingRating(profile.avg_price_tier)
  const palette = avatarColour(profile.id)

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-cellar-muted">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="font-serif text-cellar-cream text-2xl font-bold">Profile</h1>
      </div>

      {/* Avatar + identity */}
      <div className="flex flex-col items-center mb-6">
        <div className={`w-24 h-24 rounded-full ${palette.bg} ${palette.text} border-2 ${palette.border} flex items-center justify-center text-3xl font-bold mb-3`}>
          {getInitial(profile.display_name ?? profile.username)}
        </div>
        <p className="font-serif text-cellar-cream text-xl font-semibold">
          {profile.display_name || 'Whiskey Enthusiast'}
        </p>
        {profile.username && (
          <p className="text-cellar-muted text-sm mt-0.5">@{profile.username}</p>
        )}
      </div>

      {/* Friendship action — add/accept/pending only (remove is at bottom) */}
      {friendState !== 'self' && friendState !== 'friends' && (
        <div className="mb-5">
          {friendState === 'loading' && (
            <div className="btn-primary w-full flex items-center justify-center opacity-60">
              <div className="w-4 h-4 border-2 border-cellar-bg border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {friendState === 'none' && (
            <button onClick={sendRequest} className="btn-primary w-full">
              + Add as Drinking Buddy
            </button>
          )}
          {friendState === 'pending_sent' && (
            <button disabled className="btn-ghost w-full opacity-60 cursor-default">
              Request Sent
            </button>
          )}
          {friendState === 'pending_received' && (
            <button onClick={acceptRequest} className="btn-primary w-full">
              Accept Buddy Request
            </button>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Pours Logged — tappable */}
        <button
          onClick={togglePours}
          className="card p-5 text-left active:opacity-70 transition-opacity"
        >
          <p className="text-cellar-muted text-xs uppercase tracking-wide mb-1">Pours Logged</p>
          <div className="flex items-end justify-between mt-1">
            <p className="text-cellar-amber font-serif font-bold text-4xl">{profile.pour_count}</p>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`text-cellar-muted mb-1 transition-transform ${showPours ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </div>
        </button>

        <div className="card p-5">
          <p className="text-cellar-muted text-xs uppercase tracking-wide mb-1">Favorite Type</p>
          <p className="text-cellar-cream font-serif font-bold text-xl mt-1 leading-tight">
            {profile.fav_type ?? (profile.pour_count === 0 ? 'None yet' : '—')}
          </p>
        </div>
        {pricingLabel && (
          <div className="card p-5 col-span-2">
            <p className="text-cellar-muted text-xs uppercase tracking-wide mb-1">Pricing Style</p>
            <p className="text-cellar-cream font-serif font-bold text-xl mt-1 leading-tight">{pricingLabel}</p>
          </div>
        )}
      </div>

      {/* Pours list — expands when Pours Logged is tapped */}
      {showPours && (
        <div className="mb-3">
          {poursLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
            </div>
          ) : buddyPours.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-cellar-muted text-sm">No pours logged yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {buddyPours.map(pour => {
                const w = pour.whiskeys as any
                const score = pour.master_score ?? calcMasterScore((pour.scores ?? {}) as Partial<Scores>)
                const isOpen = expanded === pour.id
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
                        <div className="shrink-0 flex flex-col items-center gap-1.5 pt-1">
                          <ScoreRing score={score} size={52} strokeWidth={4} />
                          {(pour.bfb_score ?? 0) > 0 && <BFBBadge score={pour.bfb_score} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/whiskey/${w?.id}`}
                            onClick={e => e.stopPropagation()}
                            className="font-serif text-cellar-cream font-semibold text-sm leading-tight truncate block"
                          >
                            {w?.name ?? 'Unknown'}
                          </Link>
                          <p className="text-cellar-muted text-xs mt-0.5 truncate">{w?.distillery}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {w?.type && <TagPill label={w.type} variant="type" />}
                            {w?.price_tier && <TagPill label={w.price_tier} />}
                          </div>
                        </div>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          className={`text-cellar-muted shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        >
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
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
        </div>
      )}

      {/* Rank */}
      <div className="card p-5">
        <p className="text-cellar-muted text-xs uppercase tracking-wide mb-1">Rank</p>
        <p className="font-serif text-cellar-amber text-xl font-semibold mb-3">{rank.title}</p>
        {next ? (
          <>
            <div className="w-full h-1.5 bg-cellar-border rounded-full overflow-hidden">
              <div className="h-full bg-cellar-amber rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="text-cellar-muted text-xs mt-2">
              {next.min - profile.pour_count} pour{next.min - profile.pour_count !== 1 ? 's' : ''} to <span className="text-cellar-cream">{next.title}</span>
            </p>
          </>
        ) : (
          <p className="text-cellar-muted text-xs">Highest rank achieved.</p>
        )}
      </div>

      {/* Remove Drinking Buddy — bottom of page */}
      {friendState === 'friends' && !confirmRemove && (
        <button onClick={() => setConfirmRemove(true)} className="btn-ghost w-full !text-cellar-red !border-cellar-red/30 mt-3">
          Remove Drinking Buddy
        </button>
      )}
      {friendState === 'friends' && confirmRemove && (
        <div className="flex flex-col gap-2 mt-3">
          <p className="text-cellar-muted text-sm text-center">
            Remove <span className="text-cellar-cream">{profile.display_name ?? `@${usernameParam}`}</span> as a Drinking Buddy?
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmRemove(false)} className="btn-ghost flex-1">
              Cancel
            </button>
            <button onClick={removeFriend} className="btn-ghost flex-1 !text-cellar-red !border-cellar-red/30">
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
