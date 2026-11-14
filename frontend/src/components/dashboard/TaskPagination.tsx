import type { Pagination } from '../../types/api'

interface TaskPaginationProps {
  pagination: Pagination
  onPageChange: (page: number) => void
  itemLabel?: string
  ariaLabel?: string
}

export function TaskPagination({
  pagination,
  onPageChange,
  itemLabel = 'tugas',
  ariaLabel = 'Pagination tugas',
}: TaskPaginationProps) {
  if (pagination.last_page <= 1) {
    return null
  }

  const firstItem = (pagination.current_page - 1) * pagination.per_page + 1
  const lastItem = Math.min(pagination.current_page * pagination.per_page, pagination.total)

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-xs text-slate-500 sm:text-sm">
        Menampilkan <span className="font-medium text-slate-700">{firstItem}–{lastItem}</span> dari{' '}
        <span className="font-medium text-slate-700">{pagination.total}</span> {itemLabel}
      </p>
      <div aria-label={ariaLabel} className="flex items-center gap-2">
        <button
          aria-label="Halaman sebelumnya"
          className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={pagination.current_page === 1}
          onClick={() => onPageChange(pagination.current_page - 1)}
          type="button"
        >
          ‹
        </button>
        <span className="px-2 text-sm text-slate-600">
          {pagination.current_page} / {pagination.last_page}
        </span>
        <button
          aria-label="Halaman berikutnya"
          className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={pagination.current_page === pagination.last_page}
          onClick={() => onPageChange(pagination.current_page + 1)}
          type="button"
        >
          ›
        </button>
      </div>
    </div>
  )
}
