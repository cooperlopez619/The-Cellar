'use client'
import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../hooks/useAuth'
import ScoreRing from '../../../components/ui/ScoreRing'
import SubScoreBar from '../../../components/ui/SubScoreBar'
import TagPill from '../../../components/ui/TagPill'
import BFBBadge from '../../../components/ui/BFBBadge'
import { PRICE_TIER_RANGE, TASTE_SUBSCORES, APPEARANCE_SUBSCORES } from '../../../lib/scoring'
import type { Whiskey, Pour } from '../../../lib/database.types'
import { createClient } from '@/lib/supabase/client'

type VoteMap = Record<string, { up: number; down: number; mine: 1 | -1 | null }>

export default function Page() {
  return (
    <Suspense>
      <WhiskeyDetailPage />
    </Suspense>
  )
}

function WhiskeyDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const router    = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [whiskey, setWhiskey]       = useState<Whiskey | null>(null)
  const [pours, setPours]           = useState<Pour[]>([])
  const [communityStats, setCommunityStats] = useState<{
    avgScore: number; avgBFB: number; pourCount: number
    avgNose: number; avgPalate: number; avgFinish: number
    avgBottle: number; avgLabel: number
  } | null>(null)
  const [votes, setVotes]           = useState<VoteMap>({})
  const [contributors, setContributors] = useState<Record<string, { display_name: string | null; username: string | null }>>({})
  const [isFavorite, setIsFavorite] = useState(false)
  const [isWishlist, setIsWishlist] = useState(false)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth')
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return
    const sb = createClient()
    Promise.all([
      sb.from('whiskeys').select('*').eq('id', id).single(),
      sb.from('pours').select('*').eq('whiskey_id', id).order('created_at', { ascending: false }),
      sb.from('user_lists').select('list_type').eq('user_id', user.id).eq('whiskey_id', id),
      sb.from('whiskey_community_stats').select('avg_score, avg_bfb, pour_count, avg_nose, avg_palate, avg_finish, avg_bottle, avg_label').eq('whiskey_id', id).maybeSingle(),
    ]).then(async ([{ data: w }, { data: p }, { data: lists }, { data: community }]) => {
      setWhiskey(w)
      const pourList = p ?? []
      setPours(pourList)
      setIsFavorite(lists?.some(l => l.list_type === 'favorite') ?? false)
      setIsWishlist(lists?.some(l => l.list_type === 'wishlist') ?? false)

      if (community) {
        const c = community as Record<string, number | null>
        setCommunityStats({
          avgScore:  c.avg_score  ?? 0,
          avgBFB:    c.avg_bfb    ?? 0,
          pourCount: c.pour_count ?? 0,
          avgNose:   c.avg_nose   ?? 0,
          avgPalate: c.avg_palate ?? 0,
          avgFinish: c.avg_finish ?? 0,
          avgBottle: c.avg_bottle ?? 0,
          avgLabel:  c.avg_label  ?? 0,
        })
      }

      // Fetch contributors + votes in parallel (previously sequential)
      const userIds = [...new Set(pourList.map((x: Pour) => x.user_id))]
      const pourIds = pourList.map((x: Pour) => x.id)

      await Promise.all([
        // Contributor display names
        (async () => {
          if (!userIds.length) return
          const { data: userData } = await sb
            .from('user_stats').select('id, display_name, username').in('id', userIds)
          const cmap: Record<string, { display_name: string | null; username: string | null }> = {}
          for (const u of userData ?? []) cmap[u.id] = { display_name: u.display_name, username: u.username }
          setContributors(cmap)
        })(),
        // Comment votes
        (async () => {
          if (!pourIds.length) return
          const { data: voteRows } = await sb
            .from('comment_votes').select('pour_id, user_id, vote').in('pour_id', pourIds)
          const map: VoteMap = {}
          for (const row of (voteRows ?? [])) {
            if (!map[row.pour_id]) map[row.pour_id] = { up: 0, down: 0, mine: null }
            if (row.vote === 1)  map[row.pour_id].up++
            if (row.vote === -1) map[row.pour_id].down++
            if (row.user_id === user.id) map[row.pour_id].mine = row.vote
          }
          setVotes(map)
        })(),
      ])

      setLoading(false)
    })
  }, [user, id])

  async function toggleList(type: 'favorite' | 'wishlist') {
    if (!user) return
    const sb = createClient()
    if (type === 'favorite') {
      if (isFavorite) {
        setIsFavorite(false)
        await sb.from('user_lists').delete().eq('user_id', user.id).eq('whiskey_id', id).eq('list_type', 'favorite')
      } else {
        setIsFavorite(true)
        await sb.from('user_lists').insert({ user_id: user.id, whiskey_id: id, list_type: 'favorite' })
      }
    } else {
      if (isWishlist) {
        setIsWishlist(false)
        await sb.from('user_lists').delete().eq('user_id', user.id).eq('whiskey_id', id).eq('list_type', 'wishlist')
      } else {
        setIsWishlist(true)
        await sb.from('user_lists').insert({ user_id: user.id, whiskey_id: id, list_type: 'wishlist' })
      }
    }
  }

  async function handleVote(pourId: string, direction: 1 | -1) {
    if (!user) return
    const sb   = createClient()
    const cur  = votes[pourId] ?? { up: 0, down: 0, mine: null }
    const same = cur.mine === direction

    // Optimistic update
    setVotes(prev => {
      const entry = prev[pourId] ?? { up: 0, down: 0, mine: null }
      const next  = { ...entry }
      if (same) {
        // Remove vote
        if (direction === 1)  next.up--
        if (direction === -1) next.down--
        next.mine = null
      } else {
        // Switch or new vote
        if (entry.mine === 1)  next.up--
        if (entry.mine === -1) next.down--
        if (direction === 1)  next.up++
        if (direction === -1) next.down++
        next.mine = direction
      }
      return { ...prev, [pourId]: next }
    })

    if (same) {
      await sb.from('comment_votes').delete()
        .eq('pour_id', pourId).eq('user_id', user.id)
    } else {
      await sb.from('comment_votes').upsert(
        { pour_id: pourId, user_id: user.id, vote: direction },
        { onConflict: 'pour_id,user_id' }
      )
    }
  }

  if (authLoading || loading) return (
    <div className="min-h-screen bg-cellar-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!whiskey) return <div className="page text-cellar-muted text-center pt-20">Whiskey not found.</div>

  // Separate my pours from all pours — used for edit button and personal score ring
  const myPours = pours.filter(p => p.user_id === user?.id)
  const avgMaster = myPours.length
    ? +(myPours.reduce((a, p) => a + (p.master_score ?? 0), 0) / myPours.length).toFixed(2) : 0
  const avgBFB = myPours.length
    ? +(myPours.reduce((a, p) => a + (p.bfb_score ?? 0), 0) / myPours.length).toFixed(2) : 0

  function communitySubScore(key: string): number {
    if (!communityStats) return 0
    const map: Record<string, number> = {
      nose:   communityStats.avgNose,
      palate: communityStats.avgPalate,
      finish: communityStats.avgFinish,
      bottle: communityStats.avgBottle,
      label:  communityStats.avgLabel,
    }
    return map[key] ?? 0
  }

  const commentedPours = pours.filter(p => p.tasting_notes && p.tasting_notes.trim())

  return (
    <div className="page">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-cellar-muted text-sm mb-5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        Back
      </button>

      {/* Header card */}
      <div className="card p-5 mb-4">
        {/* Bottle image — full width banner when available */}
        {whiskey.image_url && (
          <div className="flex justify-center mb-4 -mt-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={whiskey.image_url}
              alt={whiskey.name}
              className="h-48 w-auto object-contain"
            />
          </div>
        )}
        <div className="flex items-start gap-4">
          <div className="shrink-0 flex flex-col items-center gap-1">
            <ScoreRing score={avgMaster} size={72} />
            {avgMaster > 0 && <p className="text-[9px] text-cellar-muted leading-none">My Score</p>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h1 className="font-serif text-cellar-cream text-xl font-bold leading-tight">{whiskey.name}</h1>
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                <button
                  type="button"
                  onClick={() => toggleList('favorite')}
                  className={`transition-colors ${isFavorite ? 'text-cellar-amber' : 'text-cellar-muted hover:text-cellar-amber'}`}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => toggleList('wishlist')}
                  className={`transition-colors ${isWishlist ? 'text-cellar-amber' : 'text-cellar-muted hover:text-cellar-amber'}`}
                  aria-label={isWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={isWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-cellar-muted text-sm mt-1">{whiskey.distillery}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <TagPill label={whiskey.type} variant="type" />
              {whiskey.region && <TagPill label={whiskey.region} />}
              {whiskey.abv && <TagPill label={`${whiskey.abv}% ABV`} />}
              {whiskey.price_tier && (
                <TagPill label={`${whiskey.price_tier} · ${PRICE_TIER_RANGE[whiskey.price_tier as keyof typeof PRICE_TIER_RANGE] ?? ''}`} />
              )}
            </div>
            {avgBFB > 0 && <div className="mt-2"><BFBBadge score={avgBFB} /></div>}
          </div>
        </div>
      </div>

      {/* Log / Edit pour button — scoped to the current user's most recent pour */}
      {myPours.length > 0 ? (
        <Link href={`/edit/${myPours[0].id}`} className="btn-primary mb-4 block text-center">Edit Pour</Link>
      ) : (
        <Link href={`/log/${whiskey.id}`} className="btn-primary mb-4 block text-center">Log a Pour</Link>
      )}

      {/* Score breakdown */}
      <div className="card p-5 mb-4">
        <h2 className="section-title mb-4">Community Breakdown</h2>

        {communityStats && communityStats.pourCount > 0 ? (
          <>
            {/* Community overall scores */}
            <div className="flex items-center gap-5 mb-5">
              <div className="flex flex-col items-center gap-1">
                <ScoreRing score={communityStats.avgScore} size={52} strokeWidth={4} />
                <p className="text-[9px] text-cellar-muted leading-none">Avg. Score</p>
              </div>
              {communityStats.avgBFB > 0 && (
                <div className="flex flex-col items-center gap-1.5">
                  <BFBBadge score={communityStats.avgBFB} />
                  <p className="text-[9px] text-cellar-muted leading-none">Avg. BFB</p>
                </div>
              )}
              <p className="text-cellar-muted text-xs ml-auto self-end pb-0.5">
                {communityStats.pourCount} community {communityStats.pourCount === 1 ? 'pour' : 'pours'}
              </p>
            </div>

            {/* Community sub-score breakdown */}
            <div className="border-t border-cellar-border pt-4 space-y-1 mb-4">
              <p className="text-cellar-muted text-xs uppercase tracking-wide mb-2">Avg. Taste Breakdown</p>
              <div className="space-y-3">
                {TASTE_SUBSCORES.map(s => (
                  <SubScoreBar key={s.key} label={s.label} score={communitySubScore(s.key)} />
                ))}
              </div>
            </div>

            <div className="border-t border-cellar-border pt-4 space-y-1">
              <p className="text-cellar-muted text-xs uppercase tracking-wide mb-2">Avg. Appearance Breakdown</p>
              <div className="space-y-3">
                {APPEARANCE_SUBSCORES.map(s => (
                  <SubScoreBar key={s.key} label={s.label} score={communitySubScore(s.key)} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-cellar-muted/50">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            <p className="text-cellar-muted text-sm">No community ratings yet.</p>
            <p className="text-cellar-muted/70 text-xs">Be the first to log a pour!</p>
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="card p-5 mb-4">
        <h2 className="section-title mb-3">Comments</h2>
        {commentedPours.length > 0 ? (
          <div className="space-y-5">
            {commentedPours.map(p => {
              const v = votes[p.id] ?? { up: 0, down: 0, mine: null }
              const contributor = contributors[p.user_id]
              const isMe = p.user_id === user?.id
              const authorName = isMe
                ? 'You'
                : contributor?.display_name ?? (contributor?.username ? `@${contributor.username}` : 'Community Member')
              return (
                <div key={p.id} className="border-l-2 border-cellar-amber/40 pl-3">
                  <p className="text-cellar-amber text-xs font-medium mb-1">{authorName}</p>
                  <p className="text-cellar-cream text-sm leading-relaxed">&ldquo;{p.tasting_notes}&rdquo;</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <ScoreRing score={p.master_score ?? 0} size={28} strokeWidth={3} />
                      <span className="text-cellar-muted text-xs">
                        {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {/* Vote buttons */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleVote(p.id, 1)}
                        className={`flex items-center gap-1 text-xs transition-colors ${v.mine === 1 ? 'text-cellar-green' : 'text-cellar-muted hover:text-cellar-green'}`}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill={v.mine === 1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                          <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                        </svg>
                        <span>{v.up > 0 ? v.up : ''}</span>
                      </button>
                      <button
                        onClick={() => handleVote(p.id, -1)}
                        className={`flex items-center gap-1 text-xs transition-colors ${v.mine === -1 ? 'text-cellar-red' : 'text-cellar-muted hover:text-cellar-red'}`}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill={v.mine === -1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                          <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                        </svg>
                        <span>{v.down > 0 ? v.down : ''}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-cellar-muted text-sm">No comments yet. Log a pour to leave one.</p>
        )}
      </div>

    </div>
  )
}
