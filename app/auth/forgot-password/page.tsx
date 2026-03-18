'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import CellarLogo from '@/components/ui/CellarLogo'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-cellar-bg flex flex-col items-center justify-center px-6 gap-5">
        <CellarLogo size={90} />
        <div className="w-full max-w-sm card p-6 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-cellar-green/20 border border-cellar-green/30 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-cellar-green">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </div>
          <h1 className="font-serif text-cellar-cream text-xl font-semibold">Check your email</h1>
          <p className="text-cellar-muted text-sm">
            We sent a reset link to <span className="text-cellar-cream">{email}</span>.
            Follow the link in your inbox to set a new password.
          </p>
          <Link href="/auth" className="btn-primary w-full text-center mt-1">Back to Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cellar-bg flex flex-col items-center justify-center px-6 gap-6">
      <CellarLogo size={90} />
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="font-serif text-cellar-cream text-2xl font-bold mb-1">Forgot Password</h1>
          <p className="text-cellar-muted text-sm">Enter your email and we&apos;ll send you a reset link.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="input"
          />
          {error && <p className="text-cellar-red text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Sending\u2026' : 'Send Reset Link'}
          </button>
        </form>
        <Link href="/auth" className="block text-center text-sm text-cellar-amber hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  )
}
