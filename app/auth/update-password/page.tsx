'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PasswordInput } from '../page'
import { createClient } from '@/lib/supabase/client'
import CellarLogo from '@/components/ui/CellarLogo'
import Link from 'next/link'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [done,      setDone]      = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    setError('')
    const { error: err } = await createClient().auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
    setTimeout(() => router.push('/'), 2500)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-cellar-bg flex flex-col items-center justify-center px-6 gap-5">
        <CellarLogo size={90} />
        <div className="w-full max-w-sm card p-6 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-cellar-green/20 border border-cellar-green/30 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-cellar-green">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </div>
          <h1 className="font-serif text-cellar-cream text-xl font-semibold">Password updated</h1>
          <p className="text-cellar-muted text-sm">Your password has been changed. Redirecting you to the app&hellip;</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cellar-bg flex flex-col items-center justify-center px-6 gap-6">
      <CellarLogo size={90} />
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="font-serif text-cellar-cream text-2xl font-bold mb-1">Update Password</h1>
          <p className="text-cellar-muted text-sm">Enter and confirm your new password.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <PasswordInput placeholder="New Password" value={password} onChange={setPassword} minLength={6} />
          <PasswordInput placeholder="Confirm New Password" value={confirm} onChange={setConfirm} minLength={6} />
          {error && <p className="text-cellar-red text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Saving\u2026' : 'Update Password'}
          </button>
        </form>
        <Link href="/auth" className="block text-center text-sm text-cellar-amber hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  )
}
