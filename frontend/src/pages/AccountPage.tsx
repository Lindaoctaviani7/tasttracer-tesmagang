import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/errors'
import { ErrorState } from '../components/feedback/ErrorState'
import { useAuth } from '../hooks/useAuth'

export function AccountPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleLogout() {
    setError(null)
    setIsSubmitting(true)

    try {
      await logout()
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
    } finally {
      navigate('/login', { replace: true })
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
          Sesi aktif
        </p>
        <h1 className="mt-4 text-2xl font-bold">Halo, {user.name}</h1>
        <p className="mt-2 text-slate-600">{user.email}</p>
        <p className="mt-1 text-sm capitalize text-slate-500">Role: {user.role}</p>
        <p className="mt-5 text-sm leading-6 text-slate-600">
          Integrasi API dan authentication state sudah aktif. Halaman dashboard belum dibuat.
        </p>
        {error && <div className="mt-5"><ErrorState message={error} /></div>}
        <button
          className="mt-7 rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          disabled={isSubmitting}
          onClick={handleLogout}
          type="button"
        >
          {isSubmitting ? 'Memproses...' : 'Keluar'}
        </button>
      </section>
    </main>
  )
}
