import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getErrorMessage } from '../api/errors'
import { AuthNotice } from '../components/auth/AuthNotice'
import { ConfirmDialog } from '../components/dashboard/ConfirmDialog'
import { DashboardShell } from '../components/dashboard/DashboardShell'
import { TaskStatusBadge } from '../components/dashboard/TaskStatusBadge'
import { ErrorState } from '../components/feedback/ErrorState'
import { LoadingState } from '../components/feedback/LoadingState'
import { useAuth } from '../hooks/useAuth'
import { taskService } from '../services/taskService'
import type { Task } from '../types/api'

function formatDate(value: string | null, includeTime = false): string {
  if (!value) {
    return 'Tidak tersedia'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Tidak tersedia'
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

export function TaskDetailPage() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canManageAssignees = user?.role === 'admin'
  const [task, setTask] = useState<Task | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadTask = useCallback(async () => {
    if (!taskId || !/^\d+$/.test(taskId)) {
      setError('ID tugas tidak valid.')
      setIsLoading(false)

      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setTask(await taskService.show(Number(taskId)))
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTask()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadTask])

  async function handleToggleStatus() {
    if (!task) {
      return
    }

    setIsUpdating(true)
    setError(null)
    setSuccess(null)

    try {
      const updatedTask = await taskService.updateStatus(task.id, !task.is_completed)
      setTask(updatedTask)
      setSuccess(updatedTask.is_completed
        ? 'Tugas berhasil ditandai selesai.'
        : 'Tugas berhasil ditandai belum selesai.')
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsUpdating(false)
    }
  }

  async function handleDelete() {
    if (!task) {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      await taskService.remove(task.id)
      navigate('/tasks', { replace: true })
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
      setIsDeleteDialogOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <DashboardShell active="tasks">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-700"
          to="/tasks"
        >
          <span aria-hidden="true">←</span> Kembali ke daftar tugas
        </Link>

        {error && <ErrorState message={error} onRetry={() => void loadTask()} />}
        {success && <AuthNotice message={success} tone="success" />}

        {isLoading ? (
          <LoadingState message="Memuat detail tugas..." />
        ) : task ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <TaskStatusBadge isCompleted={task.is_completed} />
                    <span className="text-xs text-slate-400">Tugas #{task.id}</span>
                  </div>
                  <h1 className="mt-4 break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                    {task.title}
                  </h1>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                    {task.description || 'Belum ada deskripsi untuk tugas ini.'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    className="min-h-10 rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    disabled={isUpdating}
                    onClick={() => void handleToggleStatus()}
                    type="button"
                  >
                    {isUpdating ? 'Memperbarui...' : task.is_completed ? 'Tandai berjalan' : 'Tandai selesai'}
                  </button>
                  <Link
                    className="inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    to={`/tasks/${task.id}/edit`}
                  >
                    Edit tugas
                  </Link>
                  <button
                    className="min-h-10 rounded-xl border border-rose-200 px-3.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    type="button"
                  >
                    Hapus
                  </button>
                </div>
              </div>

              <div className="mt-7 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Pembuat</p>
                  <div className="mt-2 flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                      {task.creator.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-slate-800">{task.creator.name}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Dibuat</p>
                  <p className="mt-2 text-sm font-medium text-slate-800">{formatDate(task.created_at, true)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Terakhir diperbarui</p>
                  <p className="mt-2 text-sm font-medium text-slate-800">{formatDate(task.updated_at, true)}</p>
                </div>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">Assignee</h2>
                    <p className="mt-1 text-sm text-slate-500">Anggota yang bertanggung jawab pada tugas ini.</p>
                  </div>
                  {canManageAssignees && (
                    <Link
                      className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
                      to={`/tasks/${task.id}/edit`}
                    >
                      Kelola
                    </Link>
                  )}
                </div>
                {task.assignees.length === 0 ? (
                  <p className="mt-5 rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                    Belum ada assignee.
                  </p>
                ) : (
                  <ul className="mt-4 flex flex-col divide-y divide-slate-100">
                    {task.assignees.map((assignee) => (
                      <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" key={assignee.id}>
                        <span className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                          {assignee.name.trim().charAt(0).toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-slate-800">{assignee.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">Tag</h2>
                    <p className="mt-1 text-sm text-slate-500">Label untuk membantu mengelompokkan tugas.</p>
                  </div>
                  <Link
                    className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
                    to={`/tasks/${task.id}/edit`}
                  >
                    Kelola
                  </Link>
                </div>
                {task.tags.length === 0 ? (
                  <p className="mt-5 rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                    Belum ada tag.
                  </p>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {task.tags.map((tag) => (
                      <span className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700" key={tag.id}>
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center">
            <h1 className="text-lg font-semibold text-slate-900">Tugas tidak ditemukan</h1>
            <p className="mt-2 text-sm text-slate-500">
              Tugas mungkin sudah dihapus atau Anda tidak memiliki izin untuk melihatnya.
            </p>
            <Link className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700" to="/tasks">
              Kembali ke tugas
            </Link>
          </section>
        )}
      </div>

      {isDeleteDialogOpen && task && (
        <ConfirmDialog
          description={`Tugas "${task.title}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
          isLoading={isDeleting}
          onCancel={() => setIsDeleteDialogOpen(false)}
          onConfirm={() => void handleDelete()}
          title="Hapus tugas?"
        />
      )}
    </DashboardShell>
  )
}
