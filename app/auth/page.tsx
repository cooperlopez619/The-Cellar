'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'
import CellarLogo from '../../components/ui/CellarLogo'

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

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function PasswordInput({
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
        <EyeIcon open={show} />
      </button>
    </div>
  )
}

function AuthPageInner() {
  const [tab, setTab]           = useState('login')
  const [email, setEmail]       = useState('')
  const [pw, setPw]             = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [oauthLoading, setOAuthLoading] = useState<string | null>(null)
  const { signIn, signUp, signInWithOAuth } = useAuth()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const oauthError   = searchParams.get('error') === 'oauth'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (tab === 'signup' && pw !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      if (tab === 'login') {
        const { error: err } = await signIn(email, pw)
        if (err) { setError((err as Error).message); return }
        router.push('/')
      } else {
        const { error: err } = await signUp(email, pw)
        if (err) { setError((err as Error).message); return }
        // Auto sign-in immediately after account creation
        const { error: signInErr } = await signIn(email, pw)
        if (signInErr) { setError((signInErr as Error).message); return }
        router.push('/')
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
        {/* OAuth error banner */}
        {oauthError && (
          <p className="text-cellar-red text-sm text-center bg-cellar-red/10 border border-cellar-red/20 rounded-xl px-4 py-2">
            Sign-in failed. Please try again.
          </p>
        )}

        {/* Social login buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleOAuth('google')}
            disabled={!!oauthLoading}
            className="w-full flex items-center justify-center gap-3 bg-cellar-surface border border-cellar-border
                       rounded-xl px-4 py-3 text-sm font-medium text-cellar-cream
                       active:scale-95 transition-transform disabled:opacity-60"
          >
            {oauthLoading === 'google'
              ? <div className="w-4 h-4 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
              : <GoogleIcon />}
            Continue with Google
          </button>

          <button
            onClick={() => handleOAuth('azure')}
            disabled={!!oauthLoading}
            className="w-full flex items-center justify-center gap-3 bg-cellar-surface border border-cellar-border
                       rounded-xl px-4 py-3 text-sm font-medium text-cellar-cream
                       active:scale-95 transition-transform disabled:opacity-60"
          >
            {oauthLoading === 'azure'
              ? <div className="w-4 h-4 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
              : <MicrosoftIcon />}
            Continue with Microsoft
          </button>
        </div>

        {/* Divider */}
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
          <input
            type="email" required placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} className="input"
          />

          <PasswordInput
            placeholder="Password"
            value={pw}
            onChange={setPw}
            minLength={6}
          />

          {/* Confirm password — signup only */}
          {tab === 'signup' && (
            <PasswordInput
              placeholder="Confirm Password"
              value={confirm}
              onChange={setConfirm}
              minLength={6}
            />
          )}

          {error && <p className="text-cellar-red text-sm text-center">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
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
