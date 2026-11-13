import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getErrorMessage, getValidationMessage } from '../api/errors'
import { AuthField } from '../components/auth/AuthField'
import { AuthNotice } from '../components/auth/AuthNotice'
import { AuthSubmitButton } from '../components/auth/AuthSubmitButton'
import { useAuth } from '../hooks/useAuth'
import { AuthLayout } from '../layouts/AuthLayout'

const PASSWORD_REQUIREMENTS = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export function RegisterPage() {
  const { register, error: authError, clearError } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    clearError()

    const validationErrors: Record<string, string> = {}

    if (name.trim().length === 0) {
      validationErrors.name = 'Nama wajib diisi.'
    } else if (name.length > 255) {
      validationErrors.name = 'Nama maksimal 255 karakter.'
    }

    if (email.trim().length === 0) {
      validationErrors.email = 'Alamat email wajib diisi.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      validationErrors.email = 'Masukkan alamat email yang valid (maksimal 255 karakter).'
    }

    if (password !== passwordConfirmation) {
      validationErrors.password_confirmation = 'Konfirmasi password tidak sama.'
    }

    if (password.length > 255) {
      validationErrors.password = 'Password maksimal 255 karakter.'
    } else if (!PASSWORD_REQUIREMENTS.test(password)) {
      validationErrors.password = 'Gunakan minimal 8 karakter dengan huruf besar, huruf kecil, angka, dan simbol.'
    }

    if (passwordConfirmation.length > 255) {
      validationErrors.password_confirmation = 'Konfirmasi password maksimal 255 karakter.'
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)

      return
    }

    setIsSubmitting(true)

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
      })
      setPassword('')
      setPasswordConfirmation('')
      navigate('/login', {
        replace: true,
        state: { notice: 'Registrasi berhasil. Silakan masuk dengan akun baru Anda.' },
      })
    } catch (requestError: unknown) {
      const backendErrors = ['name', 'email', 'password', 'password_confirmation']
        .reduce<Record<string, string>>((validationErrors, field) => {
          const message = getValidationMessage(requestError, field)

          if (message) {
            validationErrors[field] = message
          }

          return validationErrors
        }, {})
      setFieldErrors(backendErrors)

      if (Object.keys(backendErrors).length === 0) {
        setError(getErrorMessage(requestError))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Mulai berkolaborasi"
      title="Buat akun baru"
      description="Daftar untuk mengatur pekerjaan dan berkolaborasi dengan tim Anda."
    >
      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        {(error ?? authError) && <AuthNotice message={error ?? authError ?? ''} />}
        <AuthField
          autoComplete="name"
          error={fieldErrors.name}
          id="register-name"
          label="Nama lengkap"
          maxLength={255}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nama Anda"
          required
          type="text"
          value={name}
        />
        <AuthField
          autoComplete="email"
          error={fieldErrors.email}
          id="register-email"
          label="Alamat email"
          maxLength={255}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nama@perusahaan.com"
          required
          type="email"
          value={email}
        />
        <AuthField
          autoComplete="new-password"
          error={fieldErrors.password}
          id="register-password"
          label="Password"
          maxLength={255}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Buat password yang kuat"
          required
          type="password"
          value={password}
        />
        <p className="-mt-2 text-xs leading-5 text-slate-500">
          Minimal 8 karakter, termasuk huruf besar, huruf kecil, angka, dan simbol.
        </p>
        <AuthField
          autoComplete="new-password"
          error={fieldErrors.password_confirmation}
          id="register-password-confirmation"
          label="Konfirmasi password"
          maxLength={255}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          placeholder="Ketik ulang password"
          required
          type="password"
          value={passwordConfirmation}
        />
        <AuthSubmitButton isLoading={isSubmitting} loadingLabel="Membuat akun...">
          Daftar
        </AuthSubmitButton>
      </form>
      <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
        Sudah memiliki akun?{' '}
        <Link className="font-semibold text-indigo-700 underline-offset-4 hover:underline" to="/login">
          Masuk
        </Link>
      </div>
    </AuthLayout>
  )
}
