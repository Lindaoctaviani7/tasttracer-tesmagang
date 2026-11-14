interface TaskStatusBadgeProps {
  isCompleted: boolean
}

export function TaskStatusBadge({ isCompleted }: TaskStatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
      isCompleted
        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15'
        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/15'
    }`}>
      <span className={`size-1.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {isCompleted ? 'Selesai' : 'Berjalan'}
    </span>
  )
}
