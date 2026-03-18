import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const {searchParams, origin } = request.nextUrl

  const code  = searchParams.get('code')
  const next  = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if this OAuth user already has a username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!profile?.username) {
        // New OAuth user — must claim a username before entering the app
        // Preserve the original destination so we can redirect there after setup
        const usernameUrl = next !== '/'
          ? `${origin}/auth/username?next=${encodeURIComponent(next)}`
          : `${origin}/auth/username`
        return NextResponse.redirect(usernameUrl)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — send back to auth with error flag
  return NextResponse.redirect(`${origin}/auth?error=oauth`)
}
