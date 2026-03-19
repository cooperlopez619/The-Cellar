'use client'
import Link from 'next/link'
import ScoreRing from '../ui/ScoreRing'
import TagPill from '../ui/TagPill'
import { BookmarkIcon, StarIcon } from '../icons/ActionIcons'
import type { Whiskey } from '../../lib/database.types'

interface Props {
  whiskey: Whiskey
  score?: number
  scoreLabel?: string
  isFavorite?: boolean
  isWishlist?: boolean
  onToggleFavorite?: () => void
  onToggleWishlist?: () => void
}

export default function WhiskeyRailCard({
  whiskey,
  score = 0,
  scoreLabel = 'Avg',
  isFavorite = false,
  isWishlist = false,
  onToggleFavorite,
  onToggleWishlist,
}: Props) {
  return (
    <Link href={`/whiskey/${whiskey.id}`} className="card block min-w-[240px] max-w-[240px] p-3.5 snap-start active:scale-[0.98] transition-transform">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-serif text-cellar-cream text-sm font-semibold leading-tight line-clamp-2">{whiskey.name}</p>
          <p className="text-cellar-muted text-xs mt-0.5 truncate">{whiskey.distillery}</p>
          <div className="mt-2">
            <TagPill label={whiskey.type} variant="type" />
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-center">
          <ScoreRing score={score} size={40} strokeWidth={3.5} />
          <p className="text-[9px] text-cellar-muted leading-none mt-0.5">{scoreLabel}</p>
        </div>
      </div>
      {(onToggleFavorite || onToggleWishlist) && (
        <div className="mt-3 pt-2.5 border-t border-cellar-border/70 flex items-center justify-end gap-3">
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
    </Link>
  )
}
