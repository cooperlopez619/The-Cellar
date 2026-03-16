'use client'
import Link from 'next/link'
import ScoreRing from '../ui/ScoreRing'
import TagPill from '../ui/TagPill'
import BFBBadge from '../ui/BFBBadge'
import { PRICE_TIER_RANGE, type PriceTier } from '../../lib/scoring'
import type { Whiskey } from '../../lib/database.types'

interface Props { whiskey: Whiskey; communityScore?: number; communityBFB?: number }

export default function WhiskeyCard({ whiskey, communityScore = 0, communityBFB = 0 }: Props) {
  return (
    <Link href={`/whiskey/${whiskey.id}`} className="card block p-4 active:scale-[0.98] transition-transform">
      <div className="flex items-start gap-3">
        <div className="shrink-0 pt-1">
          <ScoreRing score={communityScore} size={56} strokeWidth={4} />
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
          {communityBFB > 0 && <div className="mt-2"><BFBBadge score={communityBFB} /></div>}
        </div>
      </div>
    </Link>
  )
}
