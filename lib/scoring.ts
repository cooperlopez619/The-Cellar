export type WhiskeyType = 'Bourbon' | 'Scotch' | 'Japanese' | 'Irish' | 'Rye'
export type PriceTier   = '$' | '$$' | '$$$' | '$$$$' | '$$$$$'

export interface SubScoreDef { key: string; label: string }
export interface Scores {
  nose:    number   // Nose / Aroma
  palate:  number   // Palate / Taste
  finish:  number   // Finish / Aftertaste
  bottle:  number   // Bottle Shape & Design
  label:   number   // Label & Branding
}

export const TASTE_SUBSCORES: SubScoreDef[] = [
  { key: 'nose',   label: 'Nose'   },
  { key: 'palate', label: 'Palate' },
  { key: 'finish', label: 'Finish' },
]

export const APPEARANCE_SUBSCORES: SubScoreDef[] = [
  { key: 'bottle', label: 'Bottle Design'    },
  { key: 'label',  label: 'Label & Branding' },
]

/** All subscores — used for detail page breakdown */
export const ALL_SUBSCORES: SubScoreDef[] = [...TASTE_SUBSCORES, ...APPEARANCE_SUBSCORES]

/** Alias so existing imports still resolve */
export const UNIVERSAL_SUBSCORES = TASTE_SUBSCORES

export function calcMasterScore(scores: Partial<Scores>): number {
  const keys: (keyof Scores)[] = ['nose', 'palate', 'finish', 'bottle', 'label']
  const vals = keys.map(k => Number(scores[k])).filter(v => v > 0)
  if (!vals.length) return 0
  return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2))
}

const BFB_MULT: Record<PriceTier, number> = {
  '$':     2.0,
  '$$':    1.6,
  '$$$':   1.2,
  '$$$$':  0.8,
  '$$$$$': 0.5,
}

export function calcBFB(masterScore: number, priceTier: PriceTier): number {
  return parseFloat((masterScore * (BFB_MULT[priceTier] ?? 1)).toFixed(2))
}

export function bfbBgColor(bfb: number): string {
  if (bfb >= 7) return 'text-cellar-green border-cellar-green/40'
  if (bfb >= 4.5) return 'text-cellar-amber border-cellar-amber/40'
  return 'text-cellar-red border-cellar-red/40'
}

export function bfbLabel(bfb: number): string {
  if (bfb >= 7) return 'Great Value'
  if (bfb >= 4.5) return 'Fair Value'
  return 'Pricey'
}

export const PRICE_TIERS: PriceTier[] = ['$', '$$', '$$$', '$$$$', '$$$$$']
export const PRICE_TIER_RANGE: Record<PriceTier, string> = {
  '$':     '<$30',
  '$$':    '$30–$60',
  '$$$':   '$60–$120',
  '$$$$':  '$120–$300',
  '$$$$$': '$300+',
}

export const WHISKEY_TYPES: WhiskeyType[] = ['Bourbon', 'Scotch', 'Japanese', 'Irish', 'Rye']
export const TYPE_COLOR: Record<WhiskeyType, string> = {
  Bourbon:  'bg-amber-900/40 text-amber-300 border-amber-700/40',
  Scotch:   'bg-slate-700/40 text-slate-300 border-slate-500/40',
  Japanese: 'bg-rose-900/30 text-rose-300 border-rose-700/40',
  Irish:    'bg-emerald-900/30 text-emerald-300 border-emerald-700/40',
  Rye:      'bg-orange-900/30 text-orange-300 border-orange-700/40',
}
