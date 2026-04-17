import { useState, type FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LoginPage() {
  const { signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsPending(true)
    try {
      await signInWithMagicLink(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsPending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-4 text-center">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-4xl">📬</div>
          <h1 className="text-xl font-semibold text-slate-100">Check your email</h1>
          <p className="text-sm text-slate-400">
            We sent a magic link to <strong className="text-slate-200">{email}</strong>.
            Click it to sign in.
          </p>
          <button
            onClick={() => setSent(false)}
            className="text-sm text-indigo-400 hover:underline"
          >
            Try a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-100">Social Post Organizer</h1>
          <p className="text-sm text-slate-400">Save and organize posts from anywhere</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            error={error}
          />
          <Button type="submit" size="lg" className="w-full" isLoading={isPending}>
            Send magic link
          </Button>
        </form>
      </div>
    </div>
  )
}
