export type WhiskeyType = 'Bourbon' | 'Scotch' | 'Japanese' | 'Irish' | 'Rye'
export type PriceTier   = 'Budget' | 'Mid' | 'Premium' | 'Luxury' | 'Unicorn'

export interface SubScoreDef { key: string; label: string }
export interface Scores {
  nose:         number
  palate:       number
  finish:       number
  type_score_1: number
  type_score_2: number
}

export const TYPE_SUBSCORES: Record<WhiskeyType, [SubScoreDef, SubScoreDef]> = {
  Bourbon:  [{ key: 'oak_vanilla', label: 'Oak & Vanilla' }, { key: 'sweetness',  label: 'Sweetness'    }],
  Scotch:   [{ key: 'peat_smoke',  label: 'Peat & Smoke'  }, { key: 'brine_fruit', label: 'Brine & Fruit' }],
  Japanese: [{ key: 'balance',     label: 'Balance'        }, { key: 'refinement',  label: 'Refinement'   }],
  Irish:    [{ key: 'smoothness',  label: 'Smoothness'     }, { key: 'lightness',   label: 'Lightness'    }],
  Rye:      [{ key: 'spice',       label: 'Spice'          }, { key: 'dryness',     label: 'Dryness'      }],
}

export const UNIVERSAL_SUBSCORES: SubScoreDef[] = [
  { key: 'nose',   label: 'Nose'   },
  { key: 'palate', label: 'Palate' },
  { key: 'finish', label: 'Finish' },
]

export function calcMasterScore(scores: Partial<Scores>): number {
  const keys: (keyof Scores)[] = ['nose', 'palate', 'finish', 'type_score_1', 'type_score_2']
  const vals = keys.map(k => Number(scores[k])).filter(v => v > 0)
  if (!vals.length) return 0
  return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2))
}

const BFB_MULT: Record<PriceTier, number> = {
  Budget: 2.0, Mid: 1.6, Premium: 1.2, Luxury: 0.8, Unicorn: 0.5,
}

export function calcBFB(masterScore: number, priceTier: PriceTier): number {
  return parseFloat((masterScore * (BFB_MULT[priceTier] ?? 1)).toFixed(2))
}

export function bfbBgColor(bfb: number): string {
  if (bfb >= 8) return 'bg-cellar-green/20 text-cellar-green border-cellar-green/30'
  if (bfb >= 5) return 'bg-cellar-amber/20 text-cellar-amber border-cellar-amber/30'
  return 'bg-cellar-red/20 text-cellar-red border-cellar-red/30'
}

export function bfbLabel(bfb: number): string {
  if (bfb >= 8) return 'Great Value'
  if (bfb >= 5) return 'Fair Value'
  return 'Pricey'
}

export const PRICE_TIERS: PriceTier[] = ['Budget', 'Mid', 'Premium', 'Luxury', 'Unicorn']
export const PRICE_TIER_RANGE: Record<PriceTier, string> = {
  Budget: '<$30', Mid: '$30–$60', Premium: '$60–$120', Luxury: '$120–$300', Unicorn: '$300+',
}
export const WHISKEY_TYPES: WhiskeyType[] = ['Bourbon', 'Scotch', 'Japanese', 'Irish', 'Rye']
export const TYPE_COLOR: Record<WhiskeyType, string> = {
  Bourbon:  'bg-amber-900/40 text-amber-300 border-amber-700/40',
  Scotch:   'bg-slate-700/40 text-slate-300 border-slate-500/40',
  Japanese: 'bg-rose-900/30 text-rose-300 border-rose-700/40',
  Irish:    'bg-emerald-900/30 text-emerald-300 border-emerald-700/40',
  Rye:      'bg-orange-900/30 text-orange-300 border-orange-700/40',
}
