import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '../../api/errors'
import type { AssignmentStatus } from '../../types/api'

interface TaskSubmissionFormProps {
  initialStatus: AssignmentStatus
  initialSubmission: string | null
  isSaving: boolean
  onSubmit: (status: AssignmentStatus, submission: string) => Promise<void>
}

export function TaskSubmissionForm({
  initialStatus,
  initialSubmission,
  isSaving,
  onSubmit,
}: TaskSubmissionFormProps) {
  const [status, setStatus] = useState<AssignmentStatus>(initialStatus)
  const [submission, setSubmission] = useState(initialSubmission ?? '')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (status === 'completed' && !submission.trim()) {
      setError('Hasil pekerjaan wajib diisi sebelum menandai tugas selesai.')

      return
    }

    try {
      await onSubmit(status, submission.trim())
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
      {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}
      <label className="flex flex-col gap-2 text-sm font-medium text-slate-800">
        Status pengerjaan
        <select
          className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
          onChange={(event) => setStatus(event.target.value as AssignmentStatus)}
          value={status}
        >
          <option value="in_progress">Sedang berjalan</option>
          <option value="completed">Selesai</option>
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-slate-800">
        Hasil pekerjaan
        <textarea
          className="min-h-28 resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
          maxLength={10000}
          onChange={(event) => setSubmission(event.target.value)}
          placeholder="Tuliskan hasil atau tautan pekerjaan yang sudah dikerjakan..."
          value={submission}
        />
      </label>
      <p className="-mt-2 text-xs text-slate-500">
        Hasil wajib diisi jika status diubah menjadi selesai.
      </p>
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? 'Mengirim...' : 'Kirim progres dan hasil'}
      </button>
    </form>
  )
}
