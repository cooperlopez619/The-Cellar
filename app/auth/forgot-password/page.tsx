import { sendResetEmail } from "./actions"

export default function Page() {
  return (
    <form className="page space-y-5" action={sendResetEmail}>
      <h1 className="font-serif text-cellar-cream text-2xl font-bold">Forgot Password</h1>
      <p className="text-sm text-cellar-muted">Enter your email and we will send you a link to reset your password.</p>
      <input type="email" name="email" required placeholder="Email" className="input" />
      <button type="submit" className="btn-primary w-full">Send Reset Link</button>
    </form>
  )
}