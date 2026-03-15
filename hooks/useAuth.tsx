'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Provider } from '@supabase/supabase-js'
import { getSupabase } from '../lib/supabase'

interface AuthContextValue {
  user:             User | null
  loading:          boolean
  signUp:           (email: string, password: string) => Promise<{ error: unknown }>
  signIn:           (email: string, password: string) => Promise<{ error: unknown }>
  signInWithOAuth:  (provider: Provider) => Promise<{ error: unknown }>
  signOut:          () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = getSupabase()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{
      user, loading,
      signUp:  (e, p) => supabase.auth.signUp({ email: e, password: p }),
      signIn:  (e, p) => supabase.auth.signInWithPassword({ email: e, password: p }),
      signInWithOAuth: (provider) =>
        supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        }),
      signOut: () => supabase.auth.signOut().then(),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
