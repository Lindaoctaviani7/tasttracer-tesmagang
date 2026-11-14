import { useState, type FocusEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Task } from '../../types/api'
import { TaskStatusBadge } from './TaskStatusBadge'

interface TaskListProps {
  tasks: Task[]
  currentUserId: number
  isAdmin: boolean
  isUpdatingTaskId: number | null
  onUpdateStatus: (task: Task, isCompleted: boolean) => void
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
  onDelete,
}: {
  task: Task
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-1">
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

function TaskStatusControl({
  task,
  currentUserId,
  isAdmin,
  isUpdating,
  onUpdateStatus,
}: {
  task: Task
  currentUserId: number
  isAdmin: boolean
  isUpdating: boolean
  onUpdateStatus: (isCompleted: boolean) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const canManageStatus = isAdmin || task.created_by === currentUserId
  const canChangeStatus = canManageStatus || !task.is_completed
  const availableStatuses = canManageStatus ? [false, true] : [true]

  function closeOnBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsOpen(false)
    }
  }

  return (
    <div
      className="relative inline-flex"
      onBlur={closeOnBlur}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setIsOpen(false)
        }
      }}
    >
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Ubah status tugas ${task.title}, saat ini ${task.is_completed ? 'Selesai' : 'Berjalan'}`}
        className="inline-flex items-center gap-1 rounded-full text-left outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isUpdating || !canChangeStatus}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <TaskStatusBadge isCompleted={task.is_completed} />
        {canChangeStatus && (
          <svg aria-hidden="true" className="size-3 text-slate-400" fill="none" viewBox="0 0 16 16">
            <path d="m4 6 4 4 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          </svg>
        )}
      </button>
      {isOpen && (
        <div
          aria-label={`Pilih status tugas ${task.title}`}
          className="absolute left-0 top-full z-30 mt-2 min-w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10"
          role="menu"
        >
          {availableStatuses.map((isCompleted) => {
            const label = isCompleted ? 'Selesai' : 'Berjalan'

            return (
              <button
                aria-checked={task.is_completed === isCompleted}
                className="flex min-h-9 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-default disabled:text-slate-400"
                disabled={isUpdating || task.is_completed === isCompleted}
                key={label}
                onClick={() => {
                  setIsOpen(false)
                  onUpdateStatus(isCompleted)
                }}
                role="menuitemradio"
                type="button"
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function TaskList({
  tasks,
  currentUserId,
  isAdmin,
  isUpdatingTaskId,
  onUpdateStatus,
  onDelete,
}: TaskListProps) {
  const canEditTask = (task: Task) => isAdmin || task.created_by === currentUserId

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
                  <td className="px-4 py-4">
                    <TaskStatusControl
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                      isUpdating={isUpdatingTaskId === task.id}
                      onUpdateStatus={(isCompleted) => onUpdateStatus(task, isCompleted)}
                      task={task}
                    />
                  </td>
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
                    {canEditTask(task) && (
                      <TaskActions
                        onDelete={() => onDelete(task)}
                        task={task}
                      />
                    )}
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
              {canEditTask(task) && (
                <TaskActions
                  onDelete={() => onDelete(task)}
                  task={task}
                />
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <TaskStatusControl
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                isUpdating={isUpdatingTaskId === task.id}
                onUpdateStatus={(isCompleted) => onUpdateStatus(task, isCompleted)}
                task={task}
              />
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
