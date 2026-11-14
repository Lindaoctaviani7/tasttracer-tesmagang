import { Modal } from './Modal'

interface ConfirmDialogProps {
  title: string
  description: string
  isLoading: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  title,
  description,
  isLoading,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal onClose={onCancel} title={title}>
      <p className="text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          disabled={isLoading}
          onClick={onCancel}
          type="button"
        >
          Batal
        </button>
        <button
          className="min-h-10 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          disabled={isLoading}
          onClick={onConfirm}
          type="button"
        >
          {isLoading ? 'Menghapus...' : 'Ya, hapus tugas'}
        </button>
      </div>
    </Modal>
  )
}
