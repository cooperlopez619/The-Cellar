import type { ReactNode } from 'react'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Inter, Cormorant_Garamond, Geist } from 'next/font/google'
import Providers from './providers'
import BottomNav from '../components/ui/BottomNav'
import TutorialOverlay from '../components/ui/TutorialOverlay'
import './globals.css'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter     = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair  = Cormorant_Garamond({ subsets: ['latin'], variable: '--font-playfair', weight: ['300','400','600','700'] })

export const metadata: Metadata = {
  title: 'The Cellar',
  description: 'Your personal whiskey journal & discovery app',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn(inter.variable, playfair.variable, "font-sans", geist.variable)}>
      <body className="font-sans h-dvh overflow-hidden flex flex-col max-w-lg mx-auto">
        <Providers>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
          <Suspense>
            <BottomNav />
            <TutorialOverlay />
          </Suspense>
        </Providers>
      </body>
    </html>
  )
}
