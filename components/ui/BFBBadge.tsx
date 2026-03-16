'use client'
import { bfbBgColor, bfbLabel } from '../../lib/scoring'

export default function BFBBadge({ score }: { score: number }) {
  if (!score || score <= 0) return null
  return (
    <span className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-xs ${bfbBgColor(score)}`}>
      <span className="font-bold">{score.toFixed(1)}</span>
      <span className="font-normal">{bfbLabel(score)}</span>
    </span>
  )
}
