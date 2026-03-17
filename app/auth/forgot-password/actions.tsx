'use server'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function sendResetEmail(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://thecellarapp.co/auth/callback?next=/auth/update-password',
  })

  return redirect('/')
}