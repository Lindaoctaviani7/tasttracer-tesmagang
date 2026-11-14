import { Link } from 'react-router-dom'
import type { Task } from '../../types/api'
import { TaskStatusBadge } from './TaskStatusBadge'

interface TaskListProps {
  tasks: Task[]
  isUpdatingTaskId: number | null
  onToggleStatus: (task: Task) => void
  onDelete: (task: Task) => void
}

function formatCreatedAt(value: string | null): string {
  if (!value) {
    return 'Tanggal tidak tersedia'
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function TaskActions({
  task,
  isUpdating,
  onToggleStatus,
  onDelete,
}: {
  task: Task
  isUpdating: boolean
  onToggleStatus: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        aria-label={task.is_completed ? `Tandai ${task.title} belum selesai` : `Tandai ${task.title} selesai`}
        className="rounded-lg p-2 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
        disabled={isUpdating}
        onClick={onToggleStatus}
        type="button"
      >
        {isUpdating ? (
          <span className="block size-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        ) : (
          <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
            {task.is_completed && (
              <path d="m8 12.2 2.5 2.5L16.5 9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
            )}
          </svg>
        )}
      </button>
      <Link
        aria-label={`Edit ${task.title}`}
        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        to={`/tasks/${task.id}/edit`}
      >
        <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
          <path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        </svg>
      </Link>
      <button
        aria-label={`Hapus ${task.title}`}
        className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
        onClick={onDelete}
        type="button"
      >
        <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
          <path d="M4.5 7h15m-10 0V4.5h5V7m-8 0 1 13h9l1-13m-7 4v5m3-5v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        </svg>
      </button>
    </div>
  )
}

export function TaskList({ tasks, isUpdatingTaskId, onToggleStatus, onDelete }: TaskListProps) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">Tugas</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Pembuat</th>
                <th className="px-4 py-4">Assignee</th>
                <th className="px-4 py-4">Dibuat</th>
                <th className="px-4 py-4"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <tr className="transition hover:bg-slate-50/70" key={task.id}>
                  <td className="max-w-sm px-5 py-4">
                    <Link className="font-semibold text-slate-900 hover:text-indigo-700" to={`/tasks/${task.id}`}>
                      {task.title}
                    </Link>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                      {task.description || 'Tidak ada deskripsi'}
                    </p>
                    {task.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {task.tags.slice(0, 3).map((tag) => (
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[0.68rem] font-medium text-indigo-700" key={tag.id}>
                            {tag.name}
                          </span>
                        ))}
                        {task.tags.length > 3 && (
                          <span className="text-xs text-slate-500">+{task.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4"><TaskStatusBadge isCompleted={task.is_completed} /></td>
                  <td className="px-4 py-4 text-sm text-slate-600">{task.creator.name}</td>
                  <td className="px-4 py-4">
                    <div className="flex -space-x-2" title={task.assignees.map((assignee) => assignee.name).join(', ')}>
                      {task.assignees.slice(0, 3).map((assignee) => (
                        <span
                          className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[0.6rem] font-semibold text-slate-700"
                          key={assignee.id}
                          title={assignee.name}
                        >
                          {assignee.name.trim().charAt(0).toUpperCase()}
                        </span>
                      ))}
                      {task.assignees.length === 0 && <span className="text-xs text-slate-400">Belum ada</span>}
                      {task.assignees.length > 3 && (
                        <span className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[0.6rem] text-slate-600">
                          +{task.assignees.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">{formatCreatedAt(task.created_at)}</td>
                  <td className="px-4 py-4">
                    <TaskActions
                      isUpdating={isUpdatingTaskId === task.id}
                      onDelete={() => onDelete(task)}
                      onToggleStatus={() => onToggleStatus(task)}
                      task={task}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {tasks.map((task) => (
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.02]" key={task.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link className="line-clamp-2 font-semibold leading-5 text-slate-900 hover:text-indigo-700" to={`/tasks/${task.id}`}>
                  {task.title}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                  {task.description || 'Tidak ada deskripsi'}
                </p>
              </div>
              <TaskActions
                isUpdating={isUpdatingTaskId === task.id}
                onDelete={() => onDelete(task)}
                onToggleStatus={() => onToggleStatus(task)}
                task={task}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <TaskStatusBadge isCompleted={task.is_completed} />
              {task.tags.slice(0, 2).map((tag) => (
                <span className="rounded-md bg-indigo-50 px-2 py-1 text-[0.68rem] font-medium text-indigo-700" key={tag.id}>
                  {tag.name}
                </span>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>Pembuat: {task.creator.name}</span>
              <span>{formatCreatedAt(task.created_at)}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
