import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorState } from '../components/feedback/ErrorState'
import { AuthLayout } from '../layouts/AuthLayout'
import { getErrorMessage } from '../api/errors'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { login, error: authError, clearError } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    clearError()
    setIsSubmitting(true)

    try {
      await login({ email, password })
      navigate('/account', { replace: true })
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Masuk ke akun" description="Gunakan email dan password akun Anda.">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {(error ?? authError) && <ErrorState message={error ?? authError ?? ''} />}
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Email
          <input
            autoComplete="email"
            className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Password
          <input
            autoComplete="current-password"
            className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <button
          className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Memproses...' : 'Masuk'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Belum memiliki akun?{' '}
        <Link className="font-semibold text-indigo-700 hover:underline" to="/register">
          Daftar
        </Link>
      </p>
    </AuthLayout>
  )
}
