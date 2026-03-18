'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

// Module-level cache — survives navigation within a session.
// Stores the last user ID we checked so we only hit the DB once per session.
let _checkedUserId: string | null = null
let _hasUsername: boolean | null = null

/** Redirects any authenticated user who hasn't claimed a username to /auth/username. */
export default function UsernameGate() {
  const { user, loading } = useAuth()
  const router   = usePathname()
  const nav      = useRouter()
  const pathname = router

  // Skip the check on auth pages — they handle their own flow
  const isAuthPage = pathname.startsWith('/auth')

  useEffect(() => {
    if (loading || !user || isAuthPage) return

    // Build the username-setup URL — preserve current page so we return here after.
    const returnTo = pathname !== '/' ? `/auth/username?next=${encodeURIComponent(pathname)}` : '/auth/username'

    // If we already checked for this user this session, use the cached result
    if (_checkedUserId === user.id) {
      if (!_hasUsername) nav.replace(returnTo)
      return
    }

    createClient()
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        _checkedUserId = user.id
        _hasUsername = !!data?.username
        if (!_hasUsername) nav.replace(returnTo)
      })
  }, [user, loading, isAuthPage])

  return null
}

/** Call this after a user successfully claims a username so the cache stays fresh. */
export function markUsernameSet() {
  _hasUsername = true
}
