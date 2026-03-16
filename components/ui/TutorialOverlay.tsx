'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'

const STORAGE_KEY = 'cellar_tutorial_done'
const PAD = 10 // padding around highlighted element

const STEPS = [
  {
    page: null,
    title: 'Welcome to The Cellar',
    description: 'Your personal whiskey journal. Let\'s take a quick tour so you know your way around.',
    emoji: '🥃',
    selector: null,
  },
  {
    page: '/',
    title: 'Search & Discover',
    description: 'Use the search bar to find any whiskey or distillery by name.',
    emoji: '🔍',
    selector: '[data-tutorial="catalog-search"]',
  },
  {
    page: '/',
    title: 'Filter by Type & Price',
    description: 'Narrow down the catalog by whiskey type or price range using these dropdowns.',
    emoji: '🔽',
    selector: '[data-tutorial="catalog-filters"]',
  },
  {
    page: '/',
    title: 'Favorites & Wishlist',
    description: 'Tap ★ on any whiskey card to save it to Favorites. Tap the bookmark icon to add it to your Wishlist.',
    emoji: '★',
    selector: '[data-tutorial="whiskey-cards"]',
  },
  {
    page: '/log',
    title: 'Log a Pour',
    description: 'Search for a whiskey, score it on taste and appearance, add tasting notes, and snap a bottle photo.',
    emoji: '📝',
    selector: '[data-tutorial="log-search"]',
  },
  {
    page: '/cellar',
    title: 'My Cellar',
    description: 'All your pours, favorites, and wishlisted bottles live here. Switch between tabs to explore.',
    emoji: '📚',
    selector: '[data-tutorial="cellar-tabs"]',
  },
  {
    page: '/profile',
    title: 'Your Profile & Rank',
    description: 'Track your pours and unlock new ranks as your collection grows. Tap the gear ⚙ to update your name, location, and photo.',
    emoji: '👤',
    selector: '[data-tutorial="profile-rank"]',
  },
  {
    page: null,
    title: "You're all set!",
    description: 'Start exploring, logging, and building your whiskey collection. Cheers! 🥃',
    emoji: '🎉',
    selector: null,
  },
]

export default function TutorialOverlay() {
  const { user, loading } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  const [step, setStep]           = useState(0)
  const [visible, setVisible]     = useState(false)
  const [animating, setAnimating] = useState(false)
  const [rect, setRect]           = useState<DOMRect | null>(null)
  const findTimerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Show on first sign-in
  useEffect(() => {
    if (loading || !user) return
    if (pathname?.startsWith('/auth')) return
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
  }, [loading, user, pathname])

  // Find and highlight the target element when step/page changes
  useEffect(() => {
    if (!visible) return
    const selector = STEPS[step]?.selector
    if (!selector) { setRect(null); return }

    if (findTimerRef.current) clearTimeout(findTimerRef.current)

    let attempts = 0
    function tryFind() {
      const el = document.querySelector(selector!)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        // Wait for scroll to settle before capturing rect
        findTimerRef.current = setTimeout(() => {
          setRect(el.getBoundingClientRect())
        }, 350)
      } else if (attempts < 8) {
        attempts++
        findTimerRef.current = setTimeout(tryFind, 250)
      }
    }
    findTimerRef.current = setTimeout(tryFind, 400)

    return () => { if (findTimerRef.current) clearTimeout(findTimerRef.current) }
  }, [step, visible, pathname])

  // Recalculate rect on resize
  useEffect(() => {
    if (!visible) return
    function onResize() {
      const selector = STEPS[step]?.selector
      if (!selector) return
      const el = document.querySelector(selector)
      if (el) setRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [step, visible])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setRect(null)
    setVisible(false)
  }

  function next() {
    const nextStep = step + 1
    if (nextStep >= STEPS.length) { dismiss(); return }

    setAnimating(true)
    setRect(null)
    setTimeout(() => {
      setStep(nextStep)
      setAnimating(false)
      const targetPage = STEPS[nextStep].page
      if (targetPage && targetPage !== pathname) {
        router.push(targetPage)
      }
    }, 150)
  }

  if (!visible) return null

  const current  = STEPS[step]
  const isLast   = step === STEPS.length - 1

  // Position card at bottom if element is in top half, else at top
  const cardAtBottom = !rect || (rect.top + rect.height / 2) < window.innerHeight * 0.55

  return (
    <div className="fixed inset-0 z-50">

      {/* SVG spotlight backdrop */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
        aria-hidden
      >
        <defs>
          <mask id="tutorial-spotlight">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - PAD}
                y={rect.top - PAD}
                width={rect.width + PAD * 2}
                height={rect.height + PAD * 2}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.68)"
          mask="url(#tutorial-spotlight)"
          style={{ pointerEvents: 'all', cursor: 'pointer' }}
          onClick={dismiss}
        />
      </svg>

      {/* Amber ring around highlighted element */}
      {rect && (
        <div
          className="absolute pointer-events-none rounded-xl transition-all duration-300"
          style={{
            top:    rect.top    - PAD,
            left:   rect.left   - PAD,
            width:  rect.width  + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 2px #c2883a, 0 0 18px rgba(194,136,58,0.45)',
          }}
        />
      )}

      {/* Tutorial card */}
      <div
        className={`absolute left-0 right-0 pointer-events-auto transition-opacity duration-150 ${animating ? 'opacity-0' : 'opacity-100'} ${cardAtBottom ? 'bottom-0' : 'top-0'}`}
      >
        <div className={`bg-cellar-surface border-cellar-border px-6 pt-5 pb-8 ${cardAtBottom ? 'border-t rounded-t-2xl' : 'border-b rounded-b-2xl'}`}>

          {/* Skip */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-5 text-cellar-muted text-xs hover:text-cellar-cream transition-colors"
          >
            Skip tutorial
          </button>

          {/* Progress bar */}
          <div className="flex gap-1 mb-5 pr-20">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  flex:            i <= step ? 2 : 1,
                  backgroundColor: i <= step ? '#c2883a' : '#2a3a42',
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="flex items-start gap-4 mb-6">
            <span className="text-3xl leading-none mt-0.5">{current.emoji}</span>
            <div>
              <h2 className="font-serif text-cellar-cream text-lg font-semibold mb-1">
                {current.title}
              </h2>
              <p className="text-cellar-muted text-sm leading-relaxed">
                {current.description}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-cellar-muted text-xs">{step + 1} of {STEPS.length}</span>
            <button onClick={next} className="btn-primary !py-2.5 !px-7 !text-sm">
              {isLast ? 'Get Started' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
