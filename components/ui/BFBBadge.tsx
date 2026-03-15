'use client'
import { bfbBgColor, bfbLabel } from '../../lib/scoring'

export default function BFBBadge({ score }: { score: number }) {
  if (!score || score <= 0) return null
  return (
    <span className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-xs font-semibold ${bfbBgColor(score)}`}>
      {score.toFixed(1)} <span className="opacity-70 font-normal">{bfbLabel(score)}</span>
    </span>
  )
}
