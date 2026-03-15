'use client'
interface Props { score?: number; size?: number; strokeWidth?: number }

export default function ScoreRing({ score = 0, size = 64, strokeWidth = 5 }: Props) {
  const r    = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const pct  = Math.min(score / 5, 1)
  const fs   = size < 56 ? 10 : 13

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#2E2018" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#C8832A" strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
        fill="#F0D9B5" fontSize={fs} fontWeight={600} fontFamily="Inter,sans-serif"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}
      >
        {score > 0 ? score.toFixed(1) : '—'}
      </text>
    </svg>
  )
}
