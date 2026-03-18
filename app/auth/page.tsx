'use client'
import { Suspense, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import CellarLogo from '../../components/ui/CellarLogo'
import Link from 'next/link'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21">
      <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
      <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  )
}

export function PasswordInput({
  placeholder, value, onChange, minLength,
}: {
  placeholder: string
  value: string
  onChange: (v: string) => void
  minLength?: number
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        required
        placeholder={placeholder}
        minLength={minLength}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input pr-11"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-cellar-muted hover:text-cellar-cream transition-colors"
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        )}
      </button>
    </div>
  )
}

function AuthPageInner() {
  const [tab, setTab]         = useState('login')
  const [email, setEmail]     = useState('')
  const [pw, setPw]           = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOAuthLoading] = useState<string | null>(null)

  // Username + display name (signup only)
  const [username,          setUsername]          = useState('')
  const [usernameError,     setUsernameError]     = useState('')
  const [usernameOk,        setUsernameOk]        = useState(false)
  const [checkingUsername,  setCheckingUsername]  = useState(false)
  const [displayName,       setDisplayName]       = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { signIn, signUp, signInWithOAuth } = useAuth()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const oauthError   = searchParams.get('error') === 'oauth'
  const redirectTo   = searchParams.get('redirect') ?? '/'

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
    setError('')

    if (tab === 'signup') {
      if (!displayName.trim()) { setError('Please enter your name'); return }
      if (pw !== confirm) { setError('Passwords do not match.'); return }
      if (!username)       { setUsernameError('Choose a username'); return }
      if (!USERNAME_RE.test(username)) { setUsernameError('Invalid username'); return }
      if (usernameError)   { return }
      if (!usernameOk)     { setError('Please wait for username check to finish'); return }
    }

    setLoading(true)
    try {
      if (tab === 'login') {
        const { error: err } = await signIn(email, pw)
        if (err) { setError((err as Error).message); return }
        router.push(redirectTo)
      } else {
        // 1. Create account
        const { error: err } = await signUp(email, pw)
        if (err) { setError((err as Error).message); return }
        // 2. Sign in immediately
        const { error: signInErr } = await signIn(email, pw)
        if (signInErr) { setError((signInErr as Error).message); return }
        // 3. Claim username + save display name
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (user) {
          const name = displayName.trim() || username
          await Promise.all([
            sb.from('profiles').update({ username, display_name: name }).eq('id', user.id),
            sb.auth.updateUser({ data: { display_name: name } }),
          ])
        }
        router.push(redirectTo)
      }
    } finally { setLoading(false) }
  }

  async function handleOAuth(provider: 'google' | 'azure') {
    setError('')
    setOAuthLoading(provider)
    const { error: err } = await signInWithOAuth(provider)
    if (err) { setError((err as Error).message); setOAuthLoading(null) }
  }

  function handleTabSwitch(t: string) {
    setTab(t)
    setError('')
    setPw('')
    setConfirm('')
    setUsername('')
    setUsernameError('')
    setUsernameOk(false)
    setDisplayName('')
  }

  return (
    <div className="min-h-screen bg-cellar-bg flex flex-col items-center justify-center px-6 py-4">
      {/* Logo */}
      <div className="text-center mb-4">
        <div className="flex justify-center">
          <CellarLogo size={190} />
        </div>
        <p className="text-cellar-muted text-xs tracking-[0.2em] uppercase font-light">
          Your personal whiskey journal
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {oauthError && (
          <p className="text-cellar-red text-sm text-center bg-cellar-red/10 border border-cellar-red/20 rounded-xl px-4 py-2">
            Sign-in failed. Please try again.
          </p>
        )}

        {/* OAuth buttons */}
        <div className="space-y-3">
          <button onClick={() => handleOAuth('google')} disabled={!!oauthLoading}
            className="w-full flex items-center justify-center gap-3 bg-cellar-surface border border-cellar-border rounded-xl px-4 py-3 text-sm font-medium text-cellar-cream active:scale-95 transition-transform disabled:opacity-60">
            {oauthLoading === 'google'
              ? <div className="w-4 h-4 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
              : <GoogleIcon />}
            Continue with Google
          </button>
          <button onClick={() => handleOAuth('azure')} disabled={!!oauthLoading}
            className="w-full flex items-center justify-center gap-3 bg-cellar-surface border border-cellar-border rounded-xl px-4 py-3 text-sm font-medium text-cellar-cream active:scale-95 transition-transform disabled:opacity-60">
            {oauthLoading === 'azure'
              ? <div className="w-4 h-4 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
              : <MicrosoftIcon />}
            Continue with Microsoft
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-cellar-border" />
          <span className="text-cellar-muted text-xs">or</span>
          <div className="flex-1 h-px bg-cellar-border" />
        </div>

        {/* Tab switcher */}
        <div className="flex bg-cellar-surface border border-cellar-border rounded-xl p-1">
          {['login', 'signup'].map(t => (
            <button key={t} onClick={() => handleTabSwitch(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t ? 'bg-cellar-amber text-cellar-bg' : 'text-cellar-muted'}`}>
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Display name — signup only */}
          {tab === 'signup' && (
            <input
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              autoComplete="name"
              className="input"
            />
          )}

          {/* Username — signup only */}
          {tab === 'signup' && (
            <div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cellar-muted text-sm select-none">@</span>
                <input
                  type="text"
                  placeholder="username"
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
                ? <p className="text-red-400 text-xs mt-1">{usernameError}</p>
                : <p className="text-cellar-muted text-xs mt-1">Your unique ID — permanent, cannot be changed later</p>
              }
            </div>
          )}

          <input type="email" required placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} className="input" />

          <PasswordInput placeholder="Password" value={pw} onChange={setPw} minLength={6} />

          {tab === 'signup' && (
            <PasswordInput placeholder="Confirm Password" value={confirm} onChange={setConfirm} minLength={6} />
          )}

          {error && <p className="text-cellar-red text-sm text-center">{error}</p>}

          <button type="submit" disabled={loading || (tab === 'signup' && (!displayName.trim() || !usernameOk || !!usernameError))} className="btn-primary w-full">
            {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <Link href="/auth/forgot-password" className="block text-center text-sm text-cellar-amber hover:underline">
            Forgot Password?
          </Link>
        </form>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageInner />
    </Suspense>
  )
}
