'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

interface NavItem { href: string; label: string; fab: boolean; icon: (active: boolean) => ReactNode }

const NAV: NavItem[] = [
  { href: '/',        label: 'Catalog',   fab: false,
    icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.2:1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { href: '/cellar',  label: 'My Cellar', fab: false,
    icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.2:1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M8 2h8l2 6H6L8 2z"/><path d="M6 8v12a2 2 0 002 2h8a2 2 0 002-2V8"/><line x1="12" y1="12" x2="12" y2="18"/></svg> },
  { href: '/log',     label: 'Log',       fab: true,
    icon: (_) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
  { href: '/profile', label: 'Profile',   fab: false,
    icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.2:1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
]

export default function BottomNav() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-cellar-surface border-t border-cellar-border flex items-center justify-around px-2 h-16 max-w-lg mx-auto">
      {NAV.map(({ href, label, icon, fab }) => {
        const active = href === '/' ? path === '/' : path.startsWith(href)
        return fab ? (
          <Link key={href} href={href} className="flex items-center justify-center w-12 h-12 rounded-full bg-cellar-amber text-cellar-bg -mt-4 shadow-lg shadow-cellar-amber/30">
            {icon(false)}
          </Link>
        ) : (
          <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 text-xs transition-colors ${active ? 'text-cellar-amber' : 'text-cellar-muted'}`}>
            {icon(active)}
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
