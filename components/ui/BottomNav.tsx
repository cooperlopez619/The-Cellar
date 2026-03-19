'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

interface NavItem { href: string; label: string; icon: (active: boolean) => ReactNode }

const NAV: NavItem[] = [
  { href: '/',        label: 'Home',
    icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.2:1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.8V21h14V9.8"/></svg> },
  { href: '/catalog', label: 'Catalog',
    icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.2:1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg> },
  { href: '/cellar',  label: 'My Cellar',
    icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.2:1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V11a8 8 0 0 1 16 0v10H4z"/><line x1="4" y1="21" x2="20" y2="21"/><line x1="12" y1="11" x2="12" y2="21"/><circle cx="9.5" cy="17" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="17" r="1" fill="currentColor" stroke="none"/></svg> },
  { href: '/profile', label: 'Social',
    icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.2:1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
]

export default function BottomNav() {
  const path = usePathname()
  if (path.startsWith('/auth')) return null
  return (
    <nav className="shrink-0 bg-cellar-surface border-t border-cellar-border flex items-center justify-around px-2 h-16">
      {NAV.map(({ href, label, icon }) => {
        const active = href === '/' ? path === '/' : path.startsWith(href)
        return (
          <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 text-xs transition-colors ${active ? 'text-cellar-amber' : 'text-cellar-muted'}`}>
            {icon(active)}
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
