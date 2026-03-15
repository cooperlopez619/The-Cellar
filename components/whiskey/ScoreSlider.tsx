'use client'
interface Props {
  label:    string
  scoreKey: string
  value:    number
  onChange: (key: string, val: number) => void
}

export default function ScoreSlider({ label, scoreKey, value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-cellar-cream text-sm font-medium">{label}</span>
        <span className="text-cellar-amber font-semibold text-sm tabular-nums">{value > 0 ? value : '—'}</span>
      </div>
      <div className="flex gap-2">
        {[1,2,3,4,5].map(d => (
          <button key={d} type="button" onClick={() => onChange(scoreKey, d)}
            className={`flex-1 h-10 rounded-lg text-sm font-semibold border transition-all
              ${value === d
                ? 'bg-cellar-amber border-cellar-amber text-cellar-bg'
                : 'bg-cellar-surface border-cellar-border text-cellar-muted'}`}
          >{d}</button>
        ))}
      </div>
    </div>
  )
}
