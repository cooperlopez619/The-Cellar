'use client'
import { useRouter } from 'next/navigation'

const STORAGE_KEY = 'cellar_tutorial_done'

const SECTIONS = [
  {
    title: 'Search & Discover',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    ),
    items: [
      { q: 'How do I find a specific whiskey?', a: 'Use the search bar at the top of the Catalog. Type any part of the whiskey name or distillery — results appear as you type.' },
      { q: 'Can I filter by type or price?', a: 'Yes. Use the "All Types" and "All Prices" dropdowns below the search bar to narrow the catalog by whiskey style or price range.' },
    ],
  },
  {
    title: 'Favorites & Wishlist',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    items: [
      { q: 'How do I save a Favorite?', a: 'Tap the star icon on any whiskey card in the Catalog. The star turns amber when saved. Find all your favorites under My Cellar → Favorites.' },
      { q: 'How do I add to my Wishlist?', a: 'Tap the bookmark icon on any whiskey card. Find your wishlist under My Cellar → Wishlist.' },
      { q: 'Can I favorite from the Log a Pour screen?', a: 'Yes — once you select a whiskey on the Log a Pour screen, star and bookmark buttons appear on its card.' },
    ],
  },
  {
    title: 'Logging a Pour',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>
      </svg>
    ),
    items: [
      { q: 'How do I log a pour?', a: 'Tap the Log tab in the bottom navigation. Search for your whiskey, then rate it across five dimensions: Nose, Palate, Finish, Bottle, and Label. Add tasting notes and an optional bottle photo, then tap Submit.' },
      { q: 'What is the price tier for?', a: 'The price tier is used to calculate your Bang for Buck score. You can override it per pour if the bottle you have differs from the listed tier.' },
      { q: 'Can I add a bottle photo?', a: 'Yes — scroll to the "Bottle Photo" section of the log form. Tap the camera area to take a new photo or choose one from your library.' },
    ],
  },
  {
    title: 'Scores Explained',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
      </svg>
    ),
    items: [
      { q: 'How is the Master Score calculated?', a: 'Your Master Score is the average of all five sub-scores (Nose, Palate, Finish, Bottle, Label), each rated 1–5. The result is displayed as a score out of 5.' },
      { q: 'What is Bang for Buck (BFB)?', a: 'BFB rewards high scores on affordable bottles. A budget whiskey scored 5/5 earns a 10 BFB, while a luxury bottle scored 5/5 earns a 2.5. Green = great value, amber = good, red = poor value for the price.' },
    ],
  },
  {
    title: 'My Cellar',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    items: [
      { q: 'What are the three tabs in My Cellar?', a: 'Pours — all your logged bottles sorted by score. Favorites — whiskeys you\'ve starred. Wishlist — bottles you\'ve bookmarked to try.' },
      { q: 'Can I edit a logged pour?', a: 'Yes — tap the pencil icon on any pour card in the Pours tab to edit your scores and notes.' },
      { q: 'How do I filter my pours?', a: 'Use the type dropdown above the Pours list to filter by whiskey style (Bourbon, Scotch, etc.).' },
    ],
  },
  {
    title: 'Profile & Rank',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    items: [
      { q: 'How does ranking work?', a: 'Your rank increases as you log more pours. Start as a Newcomer and work up to Master Distiller as your collection grows. The progress bar on your profile shows how close you are to the next rank.' },
      { q: 'How do I update my name, location, or photo?', a: 'Tap the gear icon in the top right of your Profile page to open Settings.' },
    ],
  },
]

export default function HelpPage() {
  const router = useRouter()

  function replayTutorial() {
    localStorage.removeItem(STORAGE_KEY)
    router.push('/')
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-cellar-muted hover:text-cellar-cream transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="font-serif text-cellar-cream text-xl font-semibold">Help & FAQ</h1>
      </div>

      {/* Replay tutorial */}
      <div className="card p-4 flex items-center justify-between mb-6">
        <div>
          <p className="text-cellar-cream text-sm font-medium">Replay the tutorial</p>
          <p className="text-cellar-muted text-xs mt-0.5">Walk through the app guide again</p>
        </div>
        <button
          onClick={replayTutorial}
          className="btn-primary !py-2 !px-4 !text-xs shrink-0"
        >
          Start tour
        </button>
      </div>

      {/* FAQ sections */}
      <div className="space-y-5 pb-6">
        {SECTIONS.map(section => (
          <div key={section.title}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-cellar-amber">{section.icon}</span>
              <h2 className="font-serif text-cellar-cream text-base font-semibold">{section.title}</h2>
            </div>
            <div className="space-y-2">
              {section.items.map(item => (
                <div key={item.q} className="card p-4">
                  <p className="text-cellar-cream text-sm font-medium mb-1">{item.q}</p>
                  <p className="text-cellar-muted text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
