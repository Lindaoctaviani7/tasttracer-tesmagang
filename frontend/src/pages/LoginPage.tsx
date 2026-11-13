import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getErrorMessage, getValidationMessage } from '../api/errors'
import { AuthField } from '../components/auth/AuthField'
import { AuthNotice } from '../components/auth/AuthNotice'
import { AuthSubmitButton } from '../components/auth/AuthSubmitButton'
import { useAuth } from '../hooks/useAuth'
import { AuthLayout } from '../layouts/AuthLayout'

export function LoginPage() {
  const { login, error: authError, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | undefined>()
  const [passwordError, setPasswordError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const generalError = error ?? authError
  const notice = location.state !== null
    && typeof location.state === 'object'
    && 'notice' in location.state
    && typeof location.state.notice === 'string'
    ? location.state.notice
    : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setEmailError(undefined)
    setPasswordError(undefined)
    clearError()

    const validationErrors: { email?: string; password?: string } = {}

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      validationErrors.email = 'Masukkan alamat email yang valid.'
    }

    if (password.length === 0) {
      validationErrors.password = 'Password wajib diisi.'
    }

    if (Object.keys(validationErrors).length > 0) {
      setEmailError(validationErrors.email)
      setPasswordError(validationErrors.password)

      return
    }

    setIsSubmitting(true)

    try {
      await login({ email, password })
      setPassword('')
      navigate('/dashboard', { replace: true })
    } catch (requestError: unknown) {
      const requestEmailError = getValidationMessage(requestError, 'email')
      const requestPasswordError = getValidationMessage(requestError, 'password')
      setEmailError(requestEmailError)
      setPasswordError(requestPasswordError)

      if (!requestEmailError && !requestPasswordError) {
        setError(getErrorMessage(requestError))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Selamat datang kembali"
      title="Masuk ke ruang kerja Anda"
      description="Masukkan detail akun untuk melanjutkan pekerjaan bersama tim."
    >
      <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
        {notice && <AuthNotice message={notice} tone="success" />}
        {generalError && <AuthNotice message={generalError} />}
        <AuthField
          autoComplete="email"
          error={emailError}
          id="login-email"
          label="Alamat email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nama@perusahaan.com"
          required
          type="email"
          value={email}
        />
        <AuthField
          autoComplete="current-password"
          error={passwordError}
          id="login-password"
          label="Password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Masukkan password"
          required
          type="password"
          value={password}
        />
        <AuthSubmitButton isLoading={isSubmitting} loadingLabel="Memeriksa akun...">
          Masuk
        </AuthSubmitButton>
      </form>
      <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-600">
        Belum memiliki akun?{' '}
        <Link className="font-semibold text-indigo-700 underline-offset-4 hover:underline" to="/register">
          Buat akun
        </Link>
      </div>
    </AuthLayout>
  )
}
