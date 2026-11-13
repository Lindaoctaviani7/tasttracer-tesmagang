import { useState, type InputHTMLAttributes } from 'react'

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  error?: string
}

export function AuthField({ id, label, error, type, className = '', ...inputProps }: AuthFieldProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && isPasswordVisible ? 'text' : type
  const describedBy = error ? `${id}-error` : undefined

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-800" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          {...inputProps}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={`min-h-12 w-full rounded-xl border bg-white px-4 text-[0.95rem] text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:ring-rose-500/10 ${isPassword ? 'pr-12' : ''} ${className}`}
          id={id}
          type={inputType}
        />
        {isPassword && (
          <button
            aria-label={isPasswordVisible ? 'Sembunyikan password' : 'Tampilkan password'}
            aria-pressed={isPasswordVisible}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-500 transition hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-indigo-600"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            type="button"
          >
            {isPasswordVisible ? (
              <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
                <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5.2 0 8.5 5.2 8.5 5.2a3.4 3.4 0 0 1 0 3.6 13 13 0 0 1-2.1 2.5M6.2 6.3a14.4 14.4 0 0 0-2.7 3.9 3.4 3.4 0 0 0 0 3.6S6.8 19 12 19c.9 0 1.7-.2 2.4-.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
            ) : (
              <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
                <path d="M3.5 12s3.3-6 8.5-6 8.5 6 8.5 6-3.3 6-8.5 6-8.5-6-8.5-6Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-rose-700" id={describedBy} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
