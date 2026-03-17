'use client'
import Link from 'next/link'
import ScoreRing from '../ui/ScoreRing'
import TagPill from '../ui/TagPill'
import BFBBadge from '../ui/BFBBadge'
import { PRICE_TIER_RANGE, type PriceTier } from '../../lib/scoring'
import type { Whiskey } from '../../lib/database.types'

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

interface Props {
  whiskey: Whiskey
  communityScore?: number
  communityBFB?: number
  isFavorite?: boolean
  isWishlist?: boolean
  onToggleFavorite?: () => void
  onToggleWishlist?: () => void
}

export default function WhiskeyCard({
  whiskey, communityScore = 0, communityBFB = 0,
  isFavorite = false, isWishlist = false,
  onToggleFavorite, onToggleWishlist,
}: Props) {
  return (
    <Link href={`/whiskey/${whiskey.id}`} className="card block p-4 active:scale-[0.98] transition-transform">
      <div className="flex items-start gap-3">
        <div className="shrink-0 flex flex-col items-center gap-1.5 pt-1">
          <ScoreRing score={communityScore} size={56} strokeWidth={4} />
          {communityBFB > 0 && <BFBBadge score={communityBFB} />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-cellar-cream font-semibold text-base leading-tight truncate">{whiskey.name}</h3>
          <p className="text-cellar-muted text-xs mt-0.5 truncate">{whiskey.distillery}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <TagPill label={whiskey.type} variant="type" />
            {whiskey.region && <TagPill label={whiskey.region} />}
            {whiskey.abv && <TagPill label={`${whiskey.abv}%`} />}
            {whiskey.price_tier && (
              <TagPill label={`${whiskey.price_tier} · ${PRICE_TIER_RANGE[whiskey.price_tier as PriceTier] ?? ''}`} />
            )}
          </div>
        </div>
        {(onToggleFavorite || onToggleWishlist) && (
          <div className="shrink-0 flex flex-col gap-2 items-center pt-0.5">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFavorite() }}
                className={`transition-colors ${isFavorite ? 'text-cellar-amber' : 'text-cellar-muted hover:text-cellar-cream'}`}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <StarIcon filled={isFavorite} />
              </button>
            )}
            {onToggleWishlist && (
              <button
                type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleWishlist() }}
                className={`transition-colors ${isWishlist ? 'text-cellar-amber' : 'text-cellar-muted hover:text-cellar-cream'}`}
                aria-label={isWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <BookmarkIcon filled={isWishlist} />
              </button>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
