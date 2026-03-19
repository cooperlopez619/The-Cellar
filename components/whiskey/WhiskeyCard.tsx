'use client'
import Link from 'next/link'
import ScoreRing from '../ui/ScoreRing'
import TagPill from '../ui/TagPill'
import BFBBadge from '../ui/BFBBadge'
import { BookmarkIcon, StarIcon } from '../icons/ActionIcons'
import { PRICE_TIER_RANGE, type PriceTier } from '../../lib/scoring'
import type { Whiskey } from '../../lib/database.types'

interface Props {
  whiskey: Whiskey
  communityScore?: number
  communityBFB?: number
  scoreLabel?: string
  isFavorite?: boolean
  isWishlist?: boolean
  onToggleFavorite?: () => void
  onToggleWishlist?: () => void
}

export default function WhiskeyCard({
  whiskey, communityScore = 0, communityBFB = 0,
  scoreLabel,
  isFavorite = false, isWishlist = false,
  onToggleFavorite, onToggleWishlist,
}: Props) {
  return (
    <Link href={`/whiskey/${whiskey.id}`} className="card block p-4 active:scale-[0.98] transition-transform">
      <div className="flex items-start gap-3">
        <div className="shrink-0 pt-1 flex flex-col items-center gap-0.5">
          <ScoreRing score={communityScore} size={56} strokeWidth={4} />
          {scoreLabel && <p className="text-[9px] text-cellar-muted leading-none">{scoreLabel}</p>}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-cellar-cream font-semibold text-base leading-tight truncate">{whiskey.name}</h3>
          <p className="text-cellar-muted text-xs mt-0.5 truncate">{whiskey.distillery}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <TagPill label={whiskey.type} variant="type" />
            {whiskey.region && <TagPill label={whiskey.region} />}
            {whiskey.abv && <TagPill label={`${whiskey.abv}%`} />}
            {communityBFB > 0
              ? <BFBBadge score={communityBFB} />
              : whiskey.price_tier && (
                  <TagPill label={`${whiskey.price_tier} · ${PRICE_TIER_RANGE[whiskey.price_tier as PriceTier] ?? ''}`} />
                )
            }
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
                <StarIcon filled={isFavorite} size={18} />
              </button>
            )}
            {onToggleWishlist && (
              <button
                type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleWishlist() }}
                className={`transition-colors ${isWishlist ? 'text-cellar-amber' : 'text-cellar-muted hover:text-cellar-cream'}`}
                aria-label={isWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <BookmarkIcon filled={isWishlist} size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
