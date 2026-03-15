'use client'
interface Props { label: string; score: number; max?: number }

export default function SubScoreBar({ label, score, max = 5 }: Props) {
  const pct = Math.min((score / max) * 100, 100)
  return (
    <div className="flex items-center gap-3">
      <span className="text-cellar-muted text-xs w-24 shrink-0 text-right">{label}</span>
      <div className="flex-1 h-1.5 bg-cellar-border rounded-full overflow-hidden">
        <div className="h-full bg-cellar-amber rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-cellar-cream text-xs w-6 shrink-0">{score > 0 ? Number(score).toFixed(1) : '—'}</span>
    </div>
  )
}
