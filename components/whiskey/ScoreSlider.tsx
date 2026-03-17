'use client'
import { useState } from 'react'

interface Props {
  label:       string
  scoreKey:    string
  value:       number
  onChange:    (key: string, val: number) => void
  description?: string
}

export default function ScoreSlider({ label, scoreKey, value, onChange, description }: Props) {
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-cellar-cream text-sm font-medium">{label}</span>
          {description && (
            <button
              type="button"
              onClick={() => setShowInfo(v => !v)}
              aria-label={`Info about ${label}`}
              className={`transition-colors ${showInfo ? 'text-cellar-amber' : 'text-cellar-muted hover:text-cellar-cream'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </button>
          )}
        </div>
        <span className="text-cellar-amber font-semibold text-sm tabular-nums">{value > 0 ? value : '—'}</span>
      </div>

      {description && showInfo && (
        <p className="text-cellar-muted text-xs leading-relaxed bg-cellar-surface/60 rounded-lg px-3 py-2 border border-cellar-border/50">
          {description}
        </p>
      )}

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
