'use client'
import { TYPE_COLOR, type WhiskeyType } from '../../lib/scoring'

interface Props { label: string; variant?: 'default' | 'type' }

export default function TagPill({ label, variant = 'default' }: Props) {
  const colors = variant === 'type'
    ? (TYPE_COLOR[label as WhiskeyType] ?? 'bg-cellar-border text-cellar-muted border-cellar-border')
    : 'bg-cellar-surface text-cellar-muted border-cellar-border'
  return (
    <span className={`inline-flex items-center border rounded-full px-2.5 py-0.5 text-xs font-medium ${colors}`}>
      {label}
    </span>
  )
}
