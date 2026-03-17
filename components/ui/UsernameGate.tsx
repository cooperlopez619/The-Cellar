'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

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
    createClient()
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.username) nav.replace('/auth/username')
      })
  }, [user, loading, isAuthPage])

  return null
}
