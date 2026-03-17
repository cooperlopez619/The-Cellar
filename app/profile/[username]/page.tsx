'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { getRank } from '@/lib/ranks'

const AVATAR_COLOURS = [
  'bg-amber-700', 'bg-orange-700', 'bg-yellow-700',
  'bg-teal-700',  'bg-emerald-700', 'bg-violet-700',
  'bg-rose-700',  'bg-slate-600',
]
function avatarColour(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLOURS[n % AVATAR_COLOURS.length]
}
function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
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

  const [profile,     setProfile]     = useState<UserStat | null>(null)
  const [notFound,    setNotFound]     = useState(false)
  const [friendState, setFriendState] = useState<FriendState>('loading')
  const [friendRowId, setFriendRowId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth')
  }, [user, authLoading])

  useEffect(() => {
    if (!user || !usernameParam) return
    const sb = createClient()

    // Load profile via user_stats view
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

        // Check friendship status
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
  const colour = avatarColour(profile.id)

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
        <div className={`w-24 h-24 rounded-full ${colour} flex items-center justify-center text-3xl font-bold text-white mb-3`}>
          {getInitials(profile.display_name)}
        </div>
        <p className="font-serif text-cellar-cream text-xl font-semibold">
          {profile.display_name || 'Whiskey Enthusiast'}
        </p>
        {profile.username && (
          <p className="text-cellar-muted text-sm mt-0.5">@{profile.username}</p>
        )}
      </div>

      {/* Friendship action */}
      {friendState !== 'self' && (
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
          {friendState === 'friends' && (
            <button onClick={removeFriend} className="btn-ghost w-full !text-cellar-red !border-cellar-red/30">
              Remove Drinking Buddy
            </button>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="card p-5">
          <p className="text-cellar-muted text-xs uppercase tracking-wide mb-1">Pours Logged</p>
          <p className="text-cellar-amber font-serif font-bold text-4xl mt-1">{profile.pour_count}</p>
        </div>
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
    </div>
  )
}
