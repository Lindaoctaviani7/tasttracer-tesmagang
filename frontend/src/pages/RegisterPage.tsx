import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/errors'
import { ErrorState } from '../components/feedback/ErrorState'
import { useAuth } from '../hooks/useAuth'
import { AuthLayout } from '../layouts/AuthLayout'

export function RegisterPage() {
  const { register, error: authError, clearError } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    clearError()

    if (password !== passwordConfirmation) {
      setError('Konfirmasi password tidak sama.')

      return
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
      setError('Password minimal 8 karakter dan harus memuat huruf besar, huruf kecil, angka, dan simbol.')

      return
    }

    setIsSubmitting(true)

    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      })
      navigate('/account', { replace: true })
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Buat akun" description="Daftar untuk mulai menggunakan Task Management.">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {(error ?? authError) && <ErrorState message={error ?? authError ?? ''} />}
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Nama
          <input
            autoComplete="name"
            className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            onChange={(event) => setName(event.target.value)}
            required
            type="text"
            value={name}
          />
        </label>
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
            autoComplete="new-password"
            className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Konfirmasi password
          <input
            autoComplete="new-password"
            className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            minLength={8}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            required
            type="password"
            value={passwordConfirmation}
          />
        </label>
        <button
          className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Memproses...' : 'Daftar'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Sudah memiliki akun?{' '}
        <Link className="font-semibold text-indigo-700 hover:underline" to="/login">
          Masuk
        </Link>
      </p>
    </AuthLayout>
  )
}
