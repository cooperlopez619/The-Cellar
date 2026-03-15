'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'
import BottomNav from '../../components/ui/BottomNav'

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
  }, [user, loading])

  async function handleSignOut() {
    await signOut()
    router.push('/auth')
  }

  if (loading || !user) return (
    <div className="min-h-screen bg-cellar-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cellar-amber border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="page">
      <h1 className="font-serif text-cellar-cream text-2xl font-bold mb-6">Profile</h1>

      <div className="card p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-cellar-amber/20 border border-cellar-amber/30 flex items-center justify-center text-2xl">
            🥃
          </div>
          <div>
            <p className="text-cellar-cream font-medium">{user.email}</p>
            <p className="text-cellar-muted text-xs mt-0.5">
              Member since {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <button onClick={handleSignOut} className="btn-ghost w-full !text-cellar-red !border-cellar-red/30">
        Sign Out
      </button>
      <BottomNav />
    </div>
  )
}
