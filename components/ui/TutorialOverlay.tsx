'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'

const STORAGE_KEY = 'cellar_tutorial_done'

const STEPS = [
  {
    page: null,
    title: 'Welcome to The Cellar',
    description: 'Your personal whiskey journal. Let\'s take a quick tour so you know your way around.',
    emoji: '🥃',
  },
  {
    page: '/',
    title: 'Search & Discover',
    description: 'Use the search bar to find any whiskey or distillery. The dropdowns let you filter by type and price range.',
    emoji: '🔍',
  },
  {
    page: '/',
    title: 'Favorites & Wishlist',
    description: 'Tap the ★ star on any whiskey card to add it to your Favorites. Tap the bookmark to add it to your Wishlist.',
    emoji: '★',
  },
  {
    page: '/log',
    title: 'Log a Pour',
    description: 'Search for a whiskey, rate it on taste and appearance, add tasting notes, and snap a photo of the bottle.',
    emoji: '📝',
  },
  {
    page: '/cellar',
    title: 'My Cellar',
    description: 'All your logged pours live here. Switch between the Pours, Favorites, and Wishlist tabs to explore your collection.',
    emoji: '📚',
  },
  {
    page: '/profile',
    title: 'Your Profile',
    description: 'See your pours logged and unlock new ranks as your collection grows. Tap the gear icon to update your name, location, and photo.',
    emoji: '👤',
  },
  {
    page: null,
    title: 'You\'re all set!',
    description: 'Start exploring, logging, and building your whiskey collection. Cheers!',
    emoji: '🎉',
  },
]

export default function TutorialOverlay() {
  const { user, loading } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const [step, setStep]       = useState(0)
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) return
    if (pathname === '/auth' || pathname?.startsWith('/auth')) return
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) setVisible(true)
  }, [loading, user, pathname])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  function advance(nextStep: number) {
    setAnimating(true)
    setTimeout(() => {
      setStep(nextStep)
      setAnimating(false)
      const targetPage = STEPS[nextStep]?.page
      if (targetPage && targetPage !== pathname) {
        router.push(targetPage)
      }
    }, 150)
  }

  function next() {
    const nextStep = step + 1
    if (nextStep >= STEPS.length) { dismiss(); return }
    advance(nextStep)
  }

  if (!visible) return null

  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
      {/* Backdrop — only backdrop is non-interactive so tapping it skips */}
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        onClick={dismiss}
      />

      {/* Sheet */}
      <div
        className={`relative pointer-events-auto bg-cellar-surface border-t border-cellar-border rounded-t-2xl px-6 pt-5 pb-8 transition-opacity duration-150 ${animating ? 'opacity-0' : 'opacity-100'}`}
      >
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
              className={`h-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-cellar-amber' : 'bg-cellar-border'}`}
              style={{ flex: i <= step ? 2 : 1 }}
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
          <span className="text-cellar-muted text-xs">
            {step + 1} of {STEPS.length}
          </span>
          <button
            onClick={next}
            className="btn-primary !py-2.5 !px-7 !text-sm"
          >
            {isLast ? 'Get Started' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
