interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button
          className="mt-3 font-semibold underline underline-offset-2"
          onClick={onRetry}
          type="button"
        >
          Coba lagi
        </button>
      )}
    </div>
  )
}
