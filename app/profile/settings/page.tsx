'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cellar-muted">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

export default function ProfileSettingsPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState('')
  const [username,    setUsername]    = useState('')   // read-only after set
  const [location,    setLocation]    = useState('')
  const [avatarUrl,   setAvatarUrl]   = useState('')
  const [saving,      setSaving]      = useState(false)
  const [uploading,   setUploading]   = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
  }, [user, loading])

  useEffect(() => {
    if (!user) return
    setDisplayName(user.user_metadata?.display_name ?? '')
    setLocation(user.user_metadata?.location ?? '')
    setAvatarUrl(user.user_metadata?.avatar_url ?? '')
    // Load username from profiles table
    createClient()
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.username) setUsername(data.username)
      })
  }, [user])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await createClient().auth.updateUser({
      data: {
        display_name: displayName.trim(),
        location: location.trim(),
        avatar_url: avatarUrl,
      },
    })
    setSaving(false)
    router.push('/profile')
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`)
    }
    setUploading(false)
  }

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
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/profile')} className="text-cellar-muted">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="font-serif text-cellar-cream text-2xl font-bold">Settings</h1>
      </div>

      {/* Avatar */}
      <div className="flex justify-center mb-6">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative w-24 h-24 rounded-full bg-cellar-surface border-2 border-cellar-border overflow-hidden group"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-cellar-muted">
              <CameraIcon />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <CameraIcon />}
          </div>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
      </div>

      {/* Edit fields */}
      <div className="space-y-3 mb-5">
        <div>
          <label className="text-cellar-muted text-xs uppercase tracking-wide block mb-1.5">Display Name</label>
          <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name" className="input" />
        </div>

        {/* Username — permanent, read-only */}
        <div>
          <label className="text-cellar-muted text-xs uppercase tracking-wide block mb-1.5">Username</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cellar-muted text-sm select-none">@</span>
            <input
              type="text"
              value={username}
              disabled
              className="input pl-7 opacity-60 cursor-not-allowed"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-cellar-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
          </div>
          <p className="text-cellar-muted text-xs mt-1">Your unique ID — permanent and cannot be changed</p>
        </div>

        <div>
          <label className="text-cellar-muted text-xs uppercase tracking-wide block mb-1.5">Location</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2"><PinIcon /></div>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="City, State" className="input pl-8" />
          </div>
        </div>

        <div>
          <label className="text-cellar-muted text-xs uppercase tracking-wide block mb-1.5">Email</label>
          <input type="email" value={user.email ?? ''} disabled className="input opacity-50 cursor-not-allowed" />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full mb-3">
        {saving ? 'Saving…' : 'Save Changes'}
      </button>

      <button onClick={handleSignOut} className="btn-ghost w-full !text-cellar-red !border-cellar-red/30">
        Sign Out
      </button>
    </div>
  )
}
