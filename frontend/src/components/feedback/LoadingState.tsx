interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = 'Memuat...' }: LoadingStateProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-700">
      <div className="flex items-center gap-3" role="status">
        <span className="size-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <span>{message}</span>
      </div>
    </main>
  )
}
