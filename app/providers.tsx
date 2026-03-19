'use client'
import type { ReactNode } from 'react'
import { AuthProvider } from '../hooks/useAuth'
import ServiceWorkerRegistration from '../components/pwa/ServiceWorkerRegistration'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ServiceWorkerRegistration />
      {children}
    </AuthProvider>
  )
}
