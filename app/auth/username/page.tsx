'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import CellarLogo from '@/components/ui/CellarLogo'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

function ClaimUsernamePageInner() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'

  const [displayName,      setDisplayName]      = useState('')
  const [username,         setUsername]         = useState('')
  const [usernameError,    setUsernameError]    = useState('')
  const [usernameOk,       setUsernameOk]       = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [error,            setError]            = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/auth'); return }
    // If user already has a username, skip this page
    createClient()
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.username) router.replace(next)
      })
    // Pre-fill display name from OAuth provider if available
    const oauthName = user.user_metadata?.full_name || user.user_metadata?.name || ''
    if (oauthName) setDisplayName(oauthName)
  }, [user, authLoading])

  function handleUsernameChange(val: string) {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(clean)
    setUsernameOk(false)
    setUsernameError('')
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!clean) return
    if (!USERNAME_RE.test(clean)) {
      setUsernameError('3–20 chars · letters, numbers, and _ only')
      return
    }
    setCheckingUsername(true)
    timerRef.current = setTimeout(async () => {
      const { data } = await createClient()
        .from('profiles')
        .select('id')
        .eq('username', clean)
        .neq('id', user!.id)
        .maybeSingle()
      setCheckingUsername(false)
      if (data) {
        setUsernameError('Username already taken')
      } else {
        setUsernameOk(true)
      }
    }, 400)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !usernameOk || usernameError) return
    if (!displayName.trim()) { setError('Please enter your name'); return }
    setSaving(true)
    const sb = createClient()
    const name = displayName.trim()
    const { error: err } = await sb
      .from('profiles')
      .update({ username, display_name: name })
      .eq('id', user.id)
    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    await sb.auth.updateUser({ data: { display_name: name } })
    router.push(next)
  }

  if (authLoading) return (
    <div className="min-h-screen bg-cellar-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-cellar-bg flex flex-col items-center justify-center px-6">
      <div className="mb-8 flex justify-center">
        <CellarLogo size={120} />
      </div>

      <div className="w-full max-w-sm">
        <h1 className="font-serif text-cellar-cream text-2xl font-semibold text-center mb-2">
          Set up your profile
        </h1>
        <p className="text-cellar-muted text-sm text-center mb-6">
          Just a couple things before you dive in.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display name */}
          <div>
            <label className="text-cellar-muted text-xs uppercase tracking-wide block mb-1.5">Your name</label>
            <input
              type="text"
              placeholder="First name or full name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              autoComplete="name"
              autoFocus
              className="input"
            />
          </div>

          {/* Username */}
          <div>
            <label className="text-cellar-muted text-xs uppercase tracking-wide block mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cellar-muted text-sm select-none">@</span>
              <input
                type="text"
                placeholder="yourname"
                value={username}
                onChange={e => handleUsernameChange(e.target.value)}
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                className={`input pl-7 ${usernameError ? 'border-red-500/70' : usernameOk ? 'border-emerald-500/70' : ''}`}
              />
              {checkingUsername && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
              )}
              {usernameOk && !checkingUsername && (
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
              )}
            </div>
            {usernameError
              ? <p className="text-red-400 text-xs mt-1.5">{usernameError}</p>
              : usernameOk
              ? <p className="text-emerald-400 text-xs mt-1.5">@{username} is available!</p>
              : <p className="text-cellar-muted text-xs mt-1.5">
                  Letters, numbers, and _ · 3–20 chars ·{' '}
                  <span className="text-cellar-amber">permanent</span>
                </p>
            }
          </div>

          {error && <p className="text-cellar-red text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={saving || !displayName.trim() || !usernameOk || !!usernameError || checkingUsername}
            className="btn-primary w-full"
          >
            {saving ? 'Saving…' : 'Get started'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ClaimUsernamePage() {
  return (
    <Suspense>
      <ClaimUsernamePageInner />
    </Suspense>
  )
}
