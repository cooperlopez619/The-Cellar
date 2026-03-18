'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { getRank } from '@/lib/ranks'
import CellarLogo from '@/components/ui/CellarLogo'

interface ProfileData {
  id:           string
  display_name: string | null
  username:     string | null
  pour_count:   number
  fav_type:     string | null
}

type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'self'

function getInitials(name: string | null) {
  if (!name) return '?'
  return name.trim()[0].toUpperCase()
}

export default function AddFriendPage() {
  const { username } = useParams<{ username: string }>()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [profile,    setProfile]    = useState<ProfileData | null>(null)
  const [status,     setStatus]     = useState<FriendStatus>('none')
  const [notFound,   setNotFound]   = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [acting,     setActing]     = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      // Redirect to auth then come back
      router.replace(`/auth?redirect=/add/${username}`)
      return
    }
    load()
  }, [authLoading, user])

  async function load() {
    if (!user) return
    const sb = createClient()

    // Look up the profile by username
    const { data: prof } = await sb
      .from('user_stats')
      .select('*')
      .eq('username', username)
      .maybeSingle()

    if (!prof) { setNotFound(true); setPageLoading(false); return }
    setProfile(prof as ProfileData)

    // Am I looking at myself?
    if (prof.id === user.id) { setStatus('self'); setPageLoading(false); return }

    // Check existing friendship
    const { data: fs } = await sb
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${prof.id}),and(requester_id.eq.${prof.id},addressee_id.eq.${user.id})`)
      .maybeSingle()

    if (fs) {
      if ((fs as any).status === 'accepted') {
        setStatus('friends')
      } else if ((fs as any).requester_id === user.id) {
        setStatus('pending_sent')
      } else {
        setStatus('pending_received')
      }
    }

    setPageLoading(false)
  }

  async function sendRequest() {
    if (!user || !profile) return
    setActing(true)
    // Invite link = the profile owner already expressed intent to be friends,
    // so skip the pending state and create an accepted friendship immediately.
    await createClient().from('friendships').insert({
      requester_id: user.id,
      addressee_id: profile.id,
      status: 'accepted',
    })
    setStatus('friends')
    setActing(false)
  }

  async function acceptRequest() {
    if (!user || !profile) return
    setActing(true)
    // Find the friendship row
    const { data: fs } = await createClient()
      .from('friendships')
      .select('id')
      .eq('requester_id', profile.id)
      .eq('addressee_id', user.id)
      .maybeSingle()
    if (fs) {
      await createClient().from('friendships').update({ status: 'accepted' }).eq('id', (fs as any).id)
      setStatus('friends')
    }
    setActing(false)
  }

  if (authLoading || pageLoading) return (
    <div className="min-h-screen bg-cellar-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-cellar-bg flex flex-col items-center justify-center gap-4 px-6">
      <CellarLogo size={90} />
      <p className="text-cellar-muted text-center">No user found with username <span className="text-cellar-cream font-medium">@{username}</span>.</p>
      <Link href="/" className="btn-primary text-center">Go to Catalog</Link>
    </div>
  )

  if (!profile) return null

  const rank = getRank(profile.pour_count).current.title

  return (
    <div className="min-h-screen bg-cellar-bg flex flex-col items-center justify-center px-6 gap-0">
      {/* Logo */}
      <div className="mb-8">
        <CellarLogo size={90} />
      </div>

      {/* Profile card */}
      <div className="w-full max-w-sm card p-6 flex flex-col items-center gap-3 mb-6">
        {/* Avatar placeholder */}
        <div className="w-20 h-20 rounded-full bg-cellar-amber/20 border-2 border-cellar-amber/40 flex items-center justify-center text-3xl font-semibold text-cellar-amber mb-1">
          {getInitials(profile.display_name)}
        </div>

        <div className="text-center">
          <p className="font-serif text-cellar-cream text-xl font-semibold">{profile.display_name ?? `@${username}`}</p>
          <p className="text-cellar-muted text-sm">@{username}</p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <p className="text-cellar-amber font-semibold">{profile.pour_count}</p>
            <p className="text-cellar-muted text-xs">Pours</p>
          </div>
          <div className="w-px h-8 bg-cellar-border" />
          <div className="text-center">
            <p className="text-cellar-cream font-medium">{rank}</p>
            <p className="text-cellar-muted text-xs">Rank</p>
          </div>
          {profile.fav_type && (
            <>
              <div className="w-px h-8 bg-cellar-border" />
              <div className="text-center">
                <p className="text-cellar-cream font-medium">{profile.fav_type}</p>
                <p className="text-cellar-muted text-xs">Fav Type</p>
              </div>
            </>
          )}
        </div>

        {/* Invite message */}
        <p className="text-cellar-muted text-sm text-center mt-1">
          {status === 'self'
            ? 'This is your profile.'
            : status === 'friends'
            ? `You and ${profile.display_name ?? `@${username}`} are already Drinking Buddies! 🥃`
            : `${profile.display_name ?? `@${username}`} wants to be your Drinking Buddy on The Cellar.`}
        </p>
      </div>

      {/* Action button */}
      {status === 'none' && (
        <button onClick={sendRequest} disabled={acting} className="btn-primary w-full max-w-sm">
          {acting ? 'Adding…' : '🥃 Become Drinking Buddies'}
        </button>
      )}
      {status === 'pending_received' && (
        <button onClick={acceptRequest} disabled={acting} className="btn-primary w-full max-w-sm">
          {acting ? 'Accepting…' : 'Accept Friend Request'}
        </button>
      )}
      {status === 'friends' && (
        <Link href="/profile" className="btn-primary text-center w-full max-w-sm block">
          View Social Page
        </Link>
      )}
      {status === 'self' && (
        <Link href="/profile" className="btn-primary text-center w-full max-w-sm block">
          Go to My Social Page
        </Link>
      )}

      <p className="text-cellar-muted text-xs text-center mt-6">
        Don&apos;t have The Cellar yet?{' '}
        <Link href="/auth" className="text-cellar-amber underline">Sign up free</Link>
      </p>
    </div>
  )
}
