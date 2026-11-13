interface AuthNoticeProps {
  message: string
  tone?: 'error' | 'success'
}

export function AuthNotice({ message, tone = 'error' }: AuthNoticeProps) {
  const styles = tone === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : 'border-emerald-200 bg-emerald-50 text-emerald-800'

  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3 text-sm leading-5 ${styles}`} role={tone === 'error' ? 'alert' : 'status'}>
      {tone === 'error' ? (
        <svg aria-hidden="true" className="mt-0.5 size-5 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      ) : (
        <svg aria-hidden="true" className="mt-0.5 size-5 shrink-0" fill="none" viewBox="0 0 24 24">
          <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      )}
      <p>{message}</p>
    </div>
  )
}
