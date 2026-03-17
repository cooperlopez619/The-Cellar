'use client'

import { useState } from "react";
import { PasswordInput } from "../page";
import { updatePassword } from "./actions";

export default function Page() {
  const [newPassword, setNewPassword] = useState('')

  return (
    <form className="page space-y-5" action={updatePassword}>
      <h1 className="font-serif text-cellar-cream text-2xl font-bold">Update Password</h1>
      <p className="text-sm text-cellar-muted">Enter your new password and we will update it for you.</p>
      <PasswordInput placeholder="New Password" value={newPassword} onChange={setNewPassword} minLength={6} />
      <button type="submit" className="btn-primary w-full">Update Password</button>
    </form>
  )
}