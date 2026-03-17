'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { getRank } from '@/lib/ranks'

// ─── invite helpers ──────────────────────────────────────────────────────────
function getInviteUrl(username: string): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/add/${username}`
}

// ─── helpers ────────────────────────────────────────────────────────────────

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

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// Seed-based colour from user id for avatar fallback
const AVATAR_COLOURS = [
  'bg-amber-700', 'bg-orange-700', 'bg-yellow-700',
  'bg-teal-700',  'bg-emerald-700', 'bg-violet-700',
  'bg-rose-700',  'bg-slate-600',
]
function avatarColour(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLOURS[n % AVATAR_COLOURS.length]
}

// ─── types ───────────────────────────────────────────────────────────────────

interface UserStat {
  id:             string
  display_name:   string | null
  username:       string | null
  pour_count:     number
  fav_type:       string | null
  avg_price_tier: number | null
}

interface Friendship {
  id:           string
  requester_id: string
  addressee_id: string
  status:       'pending' | 'accepted'
}

// ─── sub-components ──────────────────────────────────────────────────────────

function Avatar({ name, colour, size = 'md' }: { name: string | null; colour: string; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-9 h-9 text-sm' : 'w-11 h-11 text-base'
  return (
    <div className={`${sz} ${colour} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}>
      {getInitials(name)}
    </div>
  )
}

function Medal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>
  if (rank === 2) return <span className="text-lg">🥈</span>
  if (rank === 3) return <span className="text-lg">🥉</span>
  return <span className="text-cellar-muted text-sm font-semibold w-6 text-center">#{rank}</span>
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function SocialPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // My stats
  const [myStats,    setMyStats]    = useState<UserStat | null>(null)
  const [myAvatar,   setMyAvatar]   = useState<string | null>(null)
  const [myUsername, setMyUsername] = useState<string | null>(null)
  const [copied,     setCopied]     = useState(false)

  // Friendships
  const [friends,   setFriends]   = useState<UserStat[]>([])
  const [pending,   setPending]   = useState<UserStat[]>([])   // requests I received
  const [sent,      setSent]      = useState<string[]>([])      // addressee IDs I've requested
  const [friendIds, setFriendIds] = useState<Record<string, Friendship>>({}) // all raw rows

  // Add-friend search
  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState<UserStat[]>([])
  const [searching,   setSearching]   = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth')
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return
    setMyAvatar(user.user_metadata?.avatar_url ?? null)
    // Load username from profiles table
    createClient()
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setMyUsername(data?.username ?? null))
    loadAll()
  }, [user])

  async function loadAll() {
    if (!user) return
    const sb = createClient()

    // Fetch my stats row
    const { data: me } = await sb
      .from('user_stats')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    setMyStats(me ?? null)

    // Fetch all my friendship rows
    const { data: fs } = await sb
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    const rows = (fs ?? []) as Friendship[]

    // IDs of accepted friends + pending receivers
    const acceptedIds: string[] = []
    const pendingIds:  string[] = []  // people who sent ME a request
    const sentIds:     string[] = []  // people I sent a request to (not yet accepted)
    const rawMap: Record<string, Friendship> = {}

    rows.forEach(f => {
      const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id
      rawMap[otherId] = f
      if (f.status === 'accepted') {
        acceptedIds.push(otherId)
      } else if (f.requester_id === user.id) {
        sentIds.push(otherId)
      } else {
        pendingIds.push(otherId)
      }
    })
    setFriendIds(rawMap)
    setSent(sentIds)

    // Fetch stats for all relevant users
    const allIds = [...acceptedIds, ...pendingIds]
    if (allIds.length) {
      const { data: stats } = await sb
        .from('user_stats')
        .select('*')
        .in('id', allIds)

      const statsMap = Object.fromEntries((stats ?? []).map((s: UserStat) => [s.id, s]))
      setFriends(acceptedIds.map(id => statsMap[id]).filter(Boolean))
      setPending(pendingIds.map(id => statsMap[id]).filter(Boolean))
    }

    setLoadingData(false)
  }

  async function sendRequest(addresseeId: string) {
    if (!user) return
    const sb = createClient()
    await sb.from('friendships').insert({ requester_id: user.id, addressee_id: addresseeId })
    setSent(prev => [...prev, addresseeId])
  }

  async function acceptRequest(requesterId: string) {
    if (!user) return
    const sb = createClient()
    const row = friendIds[requesterId]
    if (!row) return
    await sb.from('friendships').update({ status: 'accepted' }).eq('id', row.id)
    // Move from pending → friends
    const accepted = pending.find(p => p.id === requesterId)
    if (accepted) {
      setFriends(prev => [...prev, accepted])
      setPending(prev => prev.filter(p => p.id !== requesterId))
    }
  }

  async function removeFriend(otherId: string) {
    if (!user) return
    const sb = createClient()
    const row = friendIds[otherId]
    if (!row) return
    await sb.from('friendships').delete().eq('id', row.id)
    setFriends(prev => prev.filter(f => f.id !== otherId))
    setSent(prev => prev.filter(id => id !== otherId))
    setFriendIds(prev => { const n = { ...prev }; delete n[otherId]; return n })
  }

  function handleSearch(value: string) {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!value.trim()) { setResults([]); return }
    setSearching(true)
    timerRef.current = setTimeout(async () => {
      const sb = createClient()
      const { data } = await sb
        .from('user_stats')
        .select('*')
        .or(`display_name.ilike.%${value}%,username.ilike.%${value}%`)
        .neq('id', user!.id)
        .limit(10)
      setResults((data ?? []) as UserStat[])
      setSearching(false)
    }, 300)
  }

  if (authLoading || !user) return (
    <div className="min-h-screen bg-cellar-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // Leaderboard: me + accepted friends sorted by pour_count desc
  const leaderboard: (UserStat & { isMe?: boolean })[] = [
    ...(myStats ? [{ ...myStats, isMe: true }] : []),
    ...friends,
  ].sort((a, b) => b.pour_count - a.pour_count)

  const myRank = leaderboard.findIndex(u => u.isMe) + 1

  return (
    <div className="page space-y-6">
      {/* Header */}
      <h1 className="font-serif text-cellar-cream text-2xl font-bold">Social</h1>

      {/* ── My Profile Card ─────────────────────────────────────────────── */}
      <Link href="/profile/me" className="card p-4 flex items-center gap-4 active:opacity-80 transition-opacity block">
        <div className="w-14 h-14 rounded-full bg-cellar-surface border-2 border-cellar-border overflow-hidden shrink-0">
          {myAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={myAvatar} alt="me" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">🥃</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-cellar-cream font-semibold text-base truncate">
            {user.user_metadata?.display_name || 'Whiskey Enthusiast'}
          </p>
          {myStats && (
            <p className="text-cellar-amber text-xs font-medium mt-0.5">
              {getRank(myStats.pour_count).current.title}
              {myRank > 0 && friends.length > 0 && (
                <span className="text-cellar-muted font-normal"> · #{myRank} on leaderboard</span>
              )}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-cellar-muted text-xs">{myStats?.pour_count ?? 0} pours</span>
            {myStats?.fav_type && <span className="text-cellar-muted text-xs">· {myStats.fav_type}</span>}
            {myStats && getPricingRating(myStats.avg_price_tier) && (
              <span className="text-cellar-muted text-xs">· {getPricingRating(myStats.avg_price_tier)}</span>
            )}
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cellar-muted shrink-0"><path d="m9 18 6-6-6-6"/></svg>
      </Link>

      {/* ── Pending requests ────────────────────────────────────────────── */}
      {pending.length > 0 && (
        <div>
          <p className="text-cellar-muted text-xs uppercase tracking-wide mb-2">Friend Requests</p>
          <div className="space-y-2">
            {pending.map(u => (
              <div key={u.id} className="card p-3 flex items-center gap-3">
                <Avatar name={u.display_name} colour={avatarColour(u.id)} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-cellar-cream text-sm font-medium truncate">{u.display_name ?? u.username ?? 'Unknown'}</p>
                  <p className="text-cellar-muted text-xs">{u.pour_count} pours</p>
                </div>
                <button
                  onClick={() => acceptRequest(u.id)}
                  className="rounded-full px-3 py-1 text-xs font-semibold bg-cellar-amber text-cellar-bg">
                  Accept
                </button>
                <button
                  onClick={() => removeFriend(u.id)}
                  className="rounded-full px-3 py-1 text-xs font-semibold bg-cellar-surface border border-cellar-border text-cellar-muted">
                  Decline
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Drinking Buddies ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-cellar-muted text-xs uppercase tracking-wide">Drinking Buddies</p>
          <span className="text-cellar-muted text-xs">{friends.length} {friends.length === 1 ? 'buddy' : 'buddies'}</span>
        </div>

        {/* Invite row */}
        {myUsername ? (
          <div className="flex items-center gap-2 card px-3 py-2.5 mb-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cellar-amber shrink-0">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <p className="flex-1 text-cellar-muted text-xs truncate font-mono">/add/{myUsername}</p>
            <button
              onClick={async () => {
                const url = getInviteUrl(myUsername)
                if (navigator.share) {
                  await navigator.share({ title: 'Join me on The Cellar', text: 'Add me as a Drinking Buddy 🥃', url })
                } else {
                  await navigator.clipboard.writeText(url)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }
              }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-cellar-amber text-cellar-bg shrink-0"
            >
              {copied
                ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg> Copied</>
                : 'Share Invite'
              }
            </button>
          </div>
        ) : (
          <Link href="/profile/settings"
            className="flex items-center gap-2 card px-3 py-2.5 mb-3 text-cellar-muted text-xs hover:text-cellar-cream transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cellar-amber shrink-0">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Set a username to get your invite link
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto shrink-0"><path d="m9 18 6-6-6-6"/></svg>
          </Link>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-cellar-muted" width="14" height="14"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="search"
            placeholder="Find friends by name or username…"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            className="input pl-8 text-sm"
          />
        </div>

        {/* Search results */}
        {query.trim() && (
          <div className="card overflow-hidden mb-3">
            {searching ? (
              <p className="text-cellar-muted text-sm px-4 py-3">Searching…</p>
            ) : results.length === 0 ? (
              <p className="text-cellar-muted text-sm px-4 py-3">No users found.</p>
            ) : (
              results.map(u => {
                const isFriend  = friends.some(f => f.id === u.id)
                const isPending = pending.some(p => p.id === u.id)
                const isSent    = sent.includes(u.id)
                return (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-cellar-border/40 last:border-0">
                    <Avatar name={u.display_name} colour={avatarColour(u.id)} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-cellar-cream text-sm font-medium truncate">{u.display_name ?? u.username ?? 'Unknown'}</p>
                      <p className="text-cellar-muted text-xs">{u.pour_count} pours · {getRank(u.pour_count).current.title}</p>
                    </div>
                    {isFriend ? (
                      <span className="text-cellar-muted text-xs">Friends</span>
                    ) : isPending ? (
                      <button onClick={() => acceptRequest(u.id)}
                        className="rounded-full px-3 py-1 text-xs font-semibold bg-cellar-amber text-cellar-bg">Accept</button>
                    ) : isSent ? (
                      <span className="text-cellar-muted text-xs">Pending</span>
                    ) : (
                      <button onClick={() => sendRequest(u.id)}
                        className="rounded-full px-3 py-1 text-xs font-semibold bg-cellar-surface border border-cellar-border text-cellar-cream">
                        + Add
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Friends list */}
        {loadingData ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
          </div>
        ) : friends.length === 0 ? (
          <div className="card p-5 text-center">
            <p className="text-cellar-muted text-sm">No buddies yet — search above to add friends.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map(u => (
              <div key={u.id} className="card p-3 flex items-center gap-3">
                <Avatar name={u.display_name} colour={avatarColour(u.id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-cellar-cream text-sm font-medium truncate">{u.display_name ?? u.username ?? 'Unknown'}</p>
                  <p className="text-cellar-amber text-xs">{getRank(u.pour_count).current.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-cellar-muted text-xs">{u.pour_count} pours</span>
                    {u.fav_type && <span className="text-cellar-muted text-xs">· {u.fav_type}</span>}
                    {getPricingRating(u.avg_price_tier) && (
                      <span className="text-cellar-muted text-xs">· {getPricingRating(u.avg_price_tier)}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => removeFriend(u.id)}
                  className="text-cellar-muted hover:text-cellar-red transition-colors p-1" aria-label="Remove friend">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Leaderboard ─────────────────────────────────────────────────── */}
      {leaderboard.length > 1 && (
        <div>
          <p className="text-cellar-muted text-xs uppercase tracking-wide mb-2">Leaderboard</p>
          <div className="card overflow-hidden">
            {leaderboard.map((u, i) => (
              <div key={u.id}
                className={`flex items-center gap-3 px-4 py-3 border-b border-cellar-border/40 last:border-0 ${u.isMe ? 'bg-cellar-amber/5' : ''}`}>
                <div className="w-7 flex items-center justify-center shrink-0">
                  <Medal rank={i + 1} />
                </div>
                {u.isMe && myAvatar ? (
                  <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-cellar-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={myAvatar} alt="me" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <Avatar name={u.display_name} colour={avatarColour(u.id)} size="sm" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${u.isMe ? 'text-cellar-amber' : 'text-cellar-cream'}`}>
                    {u.isMe ? 'You' : (u.display_name ?? u.username ?? 'Unknown')}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-cellar-muted text-xs">{u.pour_count} pours</span>
                    {u.fav_type && <span className="text-cellar-muted text-xs">· {u.fav_type}</span>}
                    {getPricingRating(u.avg_price_tier) && (
                      <span className="text-cellar-muted text-xs">· {getPricingRating(u.avg_price_tier)}</span>
                    )}
                  </div>
                </div>
                <span className="text-cellar-muted text-xs shrink-0">{getRank(u.pour_count).current.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
