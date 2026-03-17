'use server'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const newPassword = formData.get('newPassword') as string

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    throw new Error(error.message)
  }

  return redirect('/')
}
