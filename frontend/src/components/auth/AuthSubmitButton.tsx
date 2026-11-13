interface AuthSubmitButtonProps {
  isLoading: boolean
  children: string
  loadingLabel: string
}

export function AuthSubmitButton({ isLoading, children, loadingLabel }: AuthSubmitButtonProps) {
  return (
    <button
      className="mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-65"
      disabled={isLoading}
      type="submit"
    >
      {isLoading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      )}
      {isLoading ? loadingLabel : children}
    </button>
  )
}
