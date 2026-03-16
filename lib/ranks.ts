export interface Rank {
  title: string
  min: number
  max: number | null // null = no cap (final rank)
}

export const RANKS: Rank[] = [
  { title: 'Newcomer',          min: 0,   max: 4   },
  { title: 'Sipper',            min: 5,   max: 9   },
  { title: 'Enthusiast',        min: 10,  max: 19  },
  { title: 'Connoisseur',       min: 20,  max: 34  },
  { title: 'Barrel Chaser',     min: 35,  max: 49  },
  { title: 'Cask Keeper',       min: 50,  max: 74  },
  { title: 'Master Distiller',  min: 75,  max: 99  },
  { title: 'Mash Bill Master',  min: 100, max: 149 },
  { title: 'Whiskey Sage',      min: 150, max: 199 },
  { title: 'Whiskey Sommelier', min: 200, max: null },
]

export function getRank(pours: number) {
  const current = [...RANKS].reverse().find(r => pours >= r.min) ?? RANKS[0]
  const nextIndex = RANKS.indexOf(current) + 1
  const next = nextIndex < RANKS.length ? RANKS[nextIndex] : null

  const progress = next
    ? (pours - current.min) / (next.min - current.min)
    : 1

  return { current, next, progress: Math.min(progress, 1) }
}
