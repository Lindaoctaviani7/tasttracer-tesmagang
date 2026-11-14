import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/errors'
import { AuthNotice } from '../components/auth/AuthNotice'
import { ConfirmDialog } from '../components/dashboard/ConfirmDialog'
import { DashboardShell } from '../components/dashboard/DashboardShell'
import { Modal } from '../components/dashboard/Modal'
import { TaskFormModal, type TaskFormValues } from '../components/dashboard/TaskFormModal'
import { TaskList } from '../components/dashboard/TaskList'
import { TaskPagination } from '../components/dashboard/TaskPagination'
import { EmptyState } from '../components/feedback/EmptyState'
import { ErrorState } from '../components/feedback/ErrorState'
import { LoadingState } from '../components/feedback/LoadingState'
import { taskService, type TaskFilters } from '../services/taskService'
import type { Pagination, Task } from '../types/api'

interface TaskManagementPageProps {
  page: 'dashboard' | 'tasks'
  admin?: boolean
}

interface TaskSummary {
  total: number
  pending: number
  completed: number
}

const EMPTY_PAGINATION: Pagination = {
  current_page: 1,
  per_page: 10,
  total: 0,
  last_page: 1,
}

function isSuccessful(results: PromiseSettledResult<unknown>[]): boolean {
  return results.every((result) => result.status === 'fulfilled')
}

function relationFailureMessage(results: PromiseSettledResult<unknown>[]): string {
  return results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => getErrorMessage(result.reason))
    .join(' ')
}

export function TaskManagementPage({ page, admin = false }: TaskManagementPageProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<Task[]>([])
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION)
  const [summary, setSummary] = useState<TaskSummary>({ total: 0, pending: 0, completed: 0 })
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [status, setStatus] = useState<'' | 'pending' | 'completed'>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingTaskId, setIsUpdatingTaskId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>()
  const [isLoadingEditingTask, setIsLoadingEditingTask] = useState(false)

  const isCreateModalOpen = location.pathname === '/tasks/new'
  const editRouteMatch = location.pathname.match(/^\/tasks\/(\d+)\/edit$/)
  const editTaskId = editRouteMatch ? Number(editRouteMatch[1]) : null
  const filters = useMemo<TaskFilters>(() => ({
    search: appliedSearch || undefined,
    status: status || undefined,
    page: currentPage,
    per_page: 10,
  }), [appliedSearch, currentPage, status])

  const loadTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await taskService.list(filters)
      setTasks(result.tasks)
      setPagination(result.pagination)

      if (result.pagination.current_page !== currentPage) {
        setCurrentPage(result.pagination.current_page)
      }
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, filters])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTasks()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadTasks])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedSearch(search.trim())
      setCurrentPage(1)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (page !== 'dashboard') {
      return
    }

    let active = true

    void Promise.all([
      taskService.list({ per_page: 1 }),
      taskService.list({ status: 'pending', per_page: 1 }),
      taskService.list({ status: 'completed', per_page: 1 }),
    ])
      .then(([allTasks, pendingTasks, completedTasks]) => {
        if (active) {
          setSummary({
            total: allTasks.pagination.total,
            pending: pendingTasks.pagination.total,
            completed: completedTasks.pagination.total,
          })
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(getErrorMessage(requestError))
        }
      })

    return () => {
      active = false
    }
  }, [page])

  useEffect(() => {
    if (!editTaskId) {
      return
    }

    let active = true
    const timer = window.setTimeout(() => {
      setIsLoadingEditingTask(true)
      setError(null)
      setEditingTask(undefined)

      void taskService.show(editTaskId)
        .then((task) => {
          if (active) {
            setEditingTask(task)
          }
        })
        .catch((requestError: unknown) => {
          if (active) {
            setError(getErrorMessage(requestError))
            navigate('/tasks', { replace: true })
          }
        })
        .finally(() => {
          if (active) {
            setIsLoadingEditingTask(false)
          }
        })
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [editTaskId, navigate])

  useEffect(() => {
    if (!success) {
      return
    }

    const timer = window.setTimeout(() => setSuccess(null), 4500)

    return () => window.clearTimeout(timer)
  }, [success])

  async function handleSaveTask(values: TaskFormValues) {
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    let relationError: string | null = null

    try {
      if (editingTask) {
        await taskService.update(editingTask.id, {
          title: values.title,
          description: values.description || null,
          is_completed: values.is_completed,
        })

        const relationOperations: Promise<unknown>[] = [
          taskService.syncAssignees(editingTask.id, values.assigneeIds),
          ...values.tagIds
            .filter((tagId) => !editingTask.tags.some((tag) => tag.id === tagId))
            .map((tagId) => taskService.addTags(editingTask.id, [tagId])),
          ...editingTask.tags
            .filter((tag) => !values.tagIds.includes(tag.id))
            .map((tag) => taskService.removeTag(editingTask.id, tag.id)),
        ]
        const relationResults = await Promise.allSettled(relationOperations)
        if (isSuccessful(relationResults)) {
          setSuccess('Tugas berhasil diperbarui.')
        } else {
          relationError = `Detail tugas tersimpan, tetapi sebagian perubahan assignee atau tag gagal diterapkan. ${relationFailureMessage(relationResults)}`
        }
      } else {
        const createdTask = await taskService.create({
          title: values.title,
          description: values.description || null,
          is_completed: values.is_completed,
        })
        const relationOperations: Promise<unknown>[] = []

        if (values.assigneeIds.length > 0) {
          relationOperations.push(taskService.addAssignees(createdTask.id, values.assigneeIds))
        }

        if (values.tagIds.length > 0) {
          relationOperations.push(taskService.addTags(createdTask.id, values.tagIds))
        }

        const relationResults = await Promise.allSettled(relationOperations)
        if (isSuccessful(relationResults)) {
          setSuccess('Tugas berhasil dibuat.')
        } else {
          relationError = `Tugas berhasil dibuat, tetapi sebagian assignee atau tag gagal ditambahkan. ${relationFailureMessage(relationResults)}`
        }
      }

      navigate('/tasks', { replace: true })
      await loadTasks()
      if (relationError) {
        setError(relationError)
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleStatus(task: Task) {
    setIsUpdatingTaskId(task.id)
    setError(null)
    setSuccess(null)

    try {
      await taskService.update(task.id, {
        title: task.title,
        description: task.description,
        is_completed: !task.is_completed,
      })
      setSuccess(task.is_completed ? 'Tugas ditandai belum selesai.' : 'Tugas ditandai selesai.')
      await loadTasks()
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsUpdatingTaskId(null)
    }
  }

  async function handleDeleteTask() {
    if (!deletingTask) {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      await taskService.remove(deletingTask.id)
      setDeletingTask(null)
      setSuccess('Tugas berhasil dihapus.')
      await loadTasks()
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsDeleting(false)
    }
  }

  const title = page === 'dashboard' ? 'Ringkasan kerja' : 'Daftar tugas'
  const description = page === 'dashboard'
    ? 'Pantau progres dan lanjutkan pekerjaan tim Anda.'
    : 'Cari, filter, dan kelola tugas yang dapat Anda akses.'

  return (
    <DashboardShell active={admin ? 'adminTasks' : page}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-indigo-700">
              {page === 'dashboard' ? 'Selamat datang kembali' : 'Workspace'}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          </div>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => navigate('/tasks/new')}
            type="button"
          >
            <span aria-hidden="true" className="text-lg leading-none">+</span>
            Tambah tugas
          </button>
        </div>

        {page === 'dashboard' && (
          <section aria-label="Ringkasan tugas" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: 'Total tugas', count: summary.total, icon: '▦', color: 'bg-indigo-50 text-indigo-700' },
              { label: 'Sedang berjalan', count: summary.pending, icon: '◷', color: 'bg-amber-50 text-amber-700' },
              { label: 'Selesai', count: summary.completed, icon: '✓', color: 'bg-emerald-50 text-emerald-700' },
            ].map((item) => (
              <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.02] sm:p-5" key={item.label}>
                <span className={`flex size-11 items-center justify-center rounded-xl text-lg font-semibold ${item.color}`}>
                  {item.icon}
                </span>
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-0.5 text-2xl font-semibold tracking-tight">{item.count}</p>
                </div>
              </article>
            ))}
          </section>
        )}

        {error && <ErrorState message={error} onRetry={() => void loadTasks()} />}
        {success && <AuthNotice message={success} tone="success" />}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="font-semibold text-slate-900">
                {page === 'dashboard' ? 'Tugas terbaru' : 'Semua tugas'}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {pagination.total} tugas
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 sm:w-64">
                <span className="sr-only">Cari tugas berdasarkan judul</span>
                <svg aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7" />
                  <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
                </svg>
                <input
                  className="min-h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari tugas..."
                  type="search"
                  value={search}
                />
              </label>
              <label>
                <span className="sr-only">Filter status</span>
                <select
                  className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 sm:w-40"
                  onChange={(event) => {
                    setStatus(event.target.value as '' | 'pending' | 'completed')
                    setCurrentPage(1)
                  }}
                  value={status}
                >
                  <option value="">Semua status</option>
                  <option value="pending">Berjalan</option>
                  <option value="completed">Selesai</option>
                </select>
              </label>
            </div>
          </div>

          {isLoading ? (
            <LoadingState message="Memuat daftar tugas..." />
          ) : error ? null : tasks.length === 0 ? (
            <div className="p-4 sm:p-8">
              <EmptyState
                description={search || status
                  ? 'Coba ubah kata pencarian atau filter status.'
                  : 'Buat tugas pertama untuk mulai mengatur pekerjaan tim.'}
                title={search || status ? 'Tugas tidak ditemukan' : 'Belum ada tugas'}
              />
            </div>
          ) : (
            <>
              <TaskList
                isUpdatingTaskId={isUpdatingTaskId}
                onDelete={setDeletingTask}
                onToggleStatus={(task) => void handleToggleStatus(task)}
                tasks={tasks}
              />
              <TaskPagination
                onPageChange={setCurrentPage}
                pagination={pagination}
              />
            </>
          )}
        </section>
      </div>

      {isCreateModalOpen && (
        <TaskFormModal
          isSaving={isSaving}
          onClose={() => navigate('/tasks')}
          onSubmit={handleSaveTask}
        />
      )}

      {editTaskId !== null && (
        isLoadingEditingTask || !editingTask ? (
          <Modal onClose={() => navigate('/tasks')} title="Memuat tugas">
            <LoadingState message="Memuat detail tugas..." />
          </Modal>
        ) : (
          <TaskFormModal
            isSaving={isSaving}
            onClose={() => navigate('/tasks')}
            onSubmit={handleSaveTask}
            task={editingTask}
          />
        )
      )}

      {deletingTask && (
        <ConfirmDialog
          description={`Tugas "${deletingTask.title}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
          isLoading={isDeleting}
          onCancel={() => setDeletingTask(null)}
          onConfirm={() => void handleDeleteTask()}
          title="Hapus tugas?"
        />
      )}
    </DashboardShell>
  )
}
