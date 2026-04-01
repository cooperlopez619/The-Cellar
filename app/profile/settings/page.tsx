'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
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

/** Canvas-based crop: returns a JPEG File of the cropped square region */
async function getCroppedFile(imageSrc: string, pixelCrop: Area): Promise<File> {
  const img = new Image()
  img.src = imageSrc
  await new Promise<void>(resolve => { img.onload = () => resolve() })

  const canvas = document.createElement('canvas')
  // Output at 400×400 — plenty for an avatar, keeps file size small
  const SIZE = 400
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    img,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, SIZE, SIZE,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob
        ? resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
        : reject(new Error('Canvas crop failed')),
      'image/jpeg',
      0.92,
    )
  })
}

export default function ProfileSettingsPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [displayName,    setDisplayName]    = useState('')
  const [username,       setUsername]       = useState('')
  const [location,       setLocation]       = useState('')
  const [nameError,      setNameError]      = useState('')
  const [locationError,  setLocationError]  = useState('')
  const [avatarUrl,      setAvatarUrl]      = useState('')
  const [previewUrl,     setPreviewUrl]     = useState('')
  const [pendingFile,    setPendingFile]    = useState<File | null>(null)
  const [saving,         setSaving]         = useState(false)
  const [saveError,      setSaveError]      = useState('')

  // Crop modal state
  const [cropSrc,            setCropSrc]            = useState('')
  const [showCrop,           setShowCrop]           = useState(false)
  const [crop,               setCrop]               = useState({ x: 0, y: 0 })
  const [zoom,               setZoom]               = useState(1)
  const [croppedAreaPixels,  setCroppedAreaPixels]  = useState<Area | null>(null)

  const LOCATION_RE = /^[^,]+,\s*[^,]+$/

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
  }, [user, loading])

  useEffect(() => {
    if (!user) return
    const metaAvatarUrl = user.user_metadata?.avatar_url ?? ''
    setDisplayName(user.user_metadata?.display_name ?? '')
    setLocation(user.user_metadata?.location ?? '')
    setAvatarUrl(metaAvatarUrl)
    createClient()
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.username) setUsername(data.username)
        const profileAvatarUrl = (data as any)?.avatar_url ?? null
        if (metaAvatarUrl && metaAvatarUrl !== profileAvatarUrl) {
          createClient()
            .from('profiles')
            .update({ avatar_url: metaAvatarUrl })
            .eq('id', user.id)
            .then(() => {})
        }
      })
  }, [user])

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (cropSrc)    URL.revokeObjectURL(cropSrc)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Open the crop modal when a file is selected
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(URL.createObjectURL(file))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setShowCrop(true)
    e.target.value = ''
  }

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleCropConfirm() {
    if (!croppedAreaPixels) return
    try {
      const file = await getCroppedFile(cropSrc, croppedAreaPixels)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(file))
      setPendingFile(file)
    } catch (err) {
      console.error('Crop error:', err)
    } finally {
      URL.revokeObjectURL(cropSrc)
      setCropSrc('')
      setShowCrop(false)
    }
  }

  function handleCropCancel() {
    URL.revokeObjectURL(cropSrc)
    setCropSrc('')
    setShowCrop(false)
  }

  async function handleSave() {
    if (!user) return
    if (!displayName.trim()) {
      setNameError('Display name cannot be empty')
      return
    }
    setNameError('')
    const trimmedLocation = location.trim()
    if (trimmedLocation && !LOCATION_RE.test(trimmedLocation)) {
      setLocationError('Enter as City, State/Province (e.g. Nashville, TN)')
      return
    }
    setLocationError('')
    setSaveError('')
    setSaving(true)

    const sb = createClient()
    let finalAvatarUrl = avatarUrl

    if (pendingFile) {
      const path = `${user.id}/avatar.jpg`
      const { error } = await sb.storage
        .from('avatars')
        .upload(path, pendingFile, { upsert: true, contentType: 'image/jpeg' })
      if (error) {
        console.error('Avatar upload failed:', error)
        setSaveError(`Photo upload failed: ${error.message}`)
        setSaving(false)
        return
      }
      const { data } = sb.storage.from('avatars').getPublicUrl(path)
      finalAvatarUrl = `${data.publicUrl}?t=${Date.now()}`
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl('')
      setPendingFile(null)
    }

    await Promise.all([
      sb.auth.updateUser({
        data: {
          display_name: displayName.trim(),
          location: location.trim(),
          avatar_url: finalAvatarUrl,
        },
      }),
      sb.from('profiles').update({ avatar_url: finalAvatarUrl || null }).eq('id', user.id),
    ])

    setSaving(false)
    router.push('/profile')
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

  const displayAvatar = previewUrl || avatarUrl

  return (
    <>
      {/* ── Crop modal ── */}
      {showCrop && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Cropper fills the available space */}
          <div className="relative flex-1">
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Controls */}
          <div className="bg-cellar-surface px-5 pt-4 pb-8 space-y-4">
            <div className="flex items-center gap-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cellar-muted shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              <input
                type="range"
                min={1} max={3} step={0.01}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="flex-1 accent-cellar-amber"
              />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cellar-muted shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCropCancel} className="btn-ghost flex-1">
                Cancel
              </button>
              <button onClick={handleCropConfirm} className="btn-primary flex-1">
                Use Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings form ── */}
      <div className="page">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/profile')} className="text-cellar-muted">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 className="font-serif text-cellar-cream text-2xl font-bold">Settings</h1>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6 gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-24 h-24 rounded-full bg-cellar-amber/20 border-2 border-cellar-amber/30 overflow-hidden group"
          >
            {displayAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayAvatar} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-cellar-amber">
                {displayName ? displayName.trim()[0].toUpperCase() : '?'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity">
              <CameraIcon />
            </div>
          </button>
          {pendingFile && (
            <p className="text-cellar-amber text-xs">New photo selected — hit Save Changes to apply</p>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        {/* Edit fields */}
        <div className="space-y-3 mb-5">
          <div>
            <label className="text-cellar-muted text-xs uppercase tracking-wide block mb-1.5">Display Name</label>
            <input type="text" value={displayName} onChange={e => { setDisplayName(e.target.value); setNameError('') }}
              placeholder="Your name" className={`input ${nameError ? 'border-red-500/70' : ''}`} />
            {nameError && <p className="text-red-400 text-xs mt-1">{nameError}</p>}
          </div>

          <div>
            <label className="text-cellar-muted text-xs uppercase tracking-wide block mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cellar-muted text-sm select-none">@</span>
              <input type="text" value={username} disabled className="input pl-7 opacity-60 cursor-not-allowed" />
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
              <input
                type="text"
                value={location}
                onChange={e => { setLocation(e.target.value); setLocationError('') }}
                placeholder="Nashville, TN"
                className={`input pl-8 ${locationError ? 'border-red-500/70' : ''}`}
              />
            </div>
            {locationError
              ? <p className="text-red-400 text-xs mt-1">{locationError}</p>
              : <p className="text-cellar-muted text-xs mt-1">Format: City, State/Province</p>
            }
          </div>

          <div>
            <label className="text-cellar-muted text-xs uppercase tracking-wide block mb-1.5">Email</label>
            <input type="email" value={user.email ?? ''} disabled className="input opacity-50 cursor-not-allowed" />
          </div>
        </div>

        {saveError && (
          <p className="text-red-400 text-sm text-center mb-3">{saveError}</p>
        )}

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full mb-3">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        <button onClick={handleSignOut} className="btn-ghost w-full !text-cellar-red !border-cellar-red/30">
          Sign Out
        </button>
      </div>
    </>
  )
}
