import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../../api/errors'
import { tagService } from '../../services/tagService'
import { userService } from '../../services/userService'
import type { AssigneeOption, Tag, Task } from '../../types/api'
import { AuthNotice } from '../auth/AuthNotice'
import { AuthField } from '../auth/AuthField'
import { AuthSubmitButton } from '../auth/AuthSubmitButton'
import { EmptyState } from '../feedback/EmptyState'
import { Modal } from './Modal'

export interface TaskFormValues {
  title: string
  description: string
  is_completed: boolean
  assigneeIds: number[]
  tagIds: number[]
}

interface TaskFormModalProps {
  task?: Task
  isSaving: boolean
  onClose: () => void
  onSubmit: (values: TaskFormValues) => Promise<void>
}

function ToggleOption({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean
  label: string
  description?: string
  onChange: () => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50">
      <input
        checked={checked}
        className="mt-0.5 size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        onChange={onChange}
        type="checkbox"
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="mt-0.5 block truncate text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  )
}

export function TaskFormModal({ task, isSaving, onClose, onSubmit }: TaskFormModalProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [isCompleted, setIsCompleted] = useState(task?.is_completed ?? false)
  const [assigneeIds, setAssigneeIds] = useState<number[]>(
    task?.assignees.map((assignee) => assignee.id) ?? [],
  )
  const [tagIds, setTagIds] = useState<number[]>(task?.tags.map((tag) => tag.id) ?? [])
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [assigneeOptions, setAssigneeOptions] = useState<AssigneeOption[]>(
    task?.assignees.map((assignee) => ({
      id: assignee.id,
      name: assignee.name,
      email: '',
    })) ?? [],
  )
  const [tags, setTags] = useState<Tag[]>(task?.tags ?? [])
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [optionError, setOptionError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [titleError, setTitleError] = useState<string | undefined>()

  const loadOptions = useCallback(async (search: string) => {
    setIsLoadingOptions(true)
    setOptionError(null)

    try {
      const [users, availableTags] = await Promise.all([
        userService.listAssigneeOptions({ search: search || undefined, per_page: 50 }),
        tagService.listAll(),
      ])
      setAssigneeOptions((current) => {
        const merged = new Map(current.map((option) => [option.id, option]))
        for (const option of users.users) {
          merged.set(option.id, option)
        }

        return Array.from(merged.values())
      })
      setTags(availableTags)
    } catch (error: unknown) {
      setOptionError(getErrorMessage(error))
    } finally {
      setIsLoadingOptions(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOptions(assigneeSearch.trim())
    }, 250)

    return () => window.clearTimeout(timer)
  }, [assigneeSearch, loadOptions])

  const selectedAssignees = assigneeOptions.filter((option) => assigneeIds.includes(option.id))
  const displayedAssignees = assigneeOptions.filter((option) =>
    option.name.toLowerCase().includes(assigneeSearch.toLowerCase())
    || option.email.toLowerCase().includes(assigneeSearch.toLowerCase()),
  )

  function toggleAssignee(userId: number) {
    setAssigneeIds((current) => current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId])
  }

  function toggleTag(tagId: number) {
    setTagIds((current) => current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId])
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setTitleError(undefined)

    if (!title.trim()) {
      setTitleError('Judul tugas wajib diisi.')

      return
    }

    if (title.trim().length > 100) {
      setTitleError('Judul tugas maksimal 100 karakter.')

      return
    }

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        is_completed: isCompleted,
        assigneeIds,
        tagIds,
      })
    } catch (error: unknown) {
      setFormError(getErrorMessage(error))
    }
  }

  return (
    <Modal
      description="Lengkapi detail dan kolaborator tugas."
      onClose={onClose}
      size="lg"
      title={task ? 'Edit tugas' : 'Tambah tugas baru'}
    >
      <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
        {formError && <AuthNotice message={formError} />}
        {optionError && <AuthNotice message={optionError} />}
        <AuthField
          autoFocus
          error={titleError}
          id="task-title"
          label="Judul tugas"
          maxLength={100}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Contoh: Siapkan materi presentasi"
          required
          value={title}
        />
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="task-description">
            Deskripsi <span className="font-normal text-slate-400">(opsional)</span>
          </label>
          <textarea
            className="min-h-24 resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            id="task-description"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Tambahkan konteks atau langkah yang perlu dilakukan..."
            value={description}
          />
        </div>

        {task && (
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <span>
              <span className="block text-sm font-medium text-slate-800">Status tugas</span>
              <span className="mt-0.5 block text-xs text-slate-500">Tandai tugas selesai atau masih berjalan.</span>
            </span>
            <input
              checked={isCompleted}
              className="size-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              onChange={(event) => setIsCompleted(event.target.checked)}
              type="checkbox"
            />
          </label>
        )}

        <section>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Assignee</h3>
              <p className="mt-0.5 text-xs text-slate-500">Pilih anggota yang mengerjakan tugas ini.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {assigneeIds.length} dipilih
            </span>
          </div>
          {selectedAssignees.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedAssignees.map((assignee) => (
                <button
                  aria-label={`Hapus assignee ${assignee.name}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                  key={assignee.id}
                  onClick={() => toggleAssignee(assignee.id)}
                  type="button"
                >
                  {assignee.name}<span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}
          <input
            className="mt-3 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            onChange={(event) => setAssigneeSearch(event.target.value)}
            placeholder="Cari nama atau email anggota..."
            type="search"
            value={assigneeSearch}
          />
          <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-100 p-1">
            {isLoadingOptions ? (
              <p className="px-3 py-4 text-center text-xs text-slate-500">Memuat anggota dan tag...</p>
            ) : displayedAssignees.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-500">Tidak ada anggota yang cocok.</p>
            ) : displayedAssignees.map((assignee) => (
              <ToggleOption
                checked={assigneeIds.includes(assignee.id)}
                description={assignee.email || undefined}
                key={assignee.id}
                label={assignee.name}
                onChange={() => toggleAssignee(assignee.id)}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Tag</h3>
              <p className="mt-0.5 text-xs text-slate-500">Gunakan label untuk mengelompokkan tugas.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {tagIds.length} dipilih
            </span>
          </div>
          {isLoadingOptions ? (
            <p className="py-3 text-xs text-slate-500">Memuat tag...</p>
          ) : tags.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="Belum ada tag" description="Tag dapat ditambahkan nanti pada detail tugas." />
            </div>
          ) : (
            <div className="mt-2 grid max-h-36 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-slate-100 p-1 sm:grid-cols-2">
              {tags.map((tag) => (
                <ToggleOption
                  checked={tagIds.includes(tag.id)}
                  key={tag.id}
                  label={tag.name}
                  onChange={() => toggleTag(tag.id)}
                />
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button
            className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            Batal
          </button>
          <AuthSubmitButton isLoading={isSaving} loadingLabel="Menyimpan...">
            {task ? 'Simpan perubahan' : 'Buat tugas'}
          </AuthSubmitButton>
        </div>
      </form>
    </Modal>
  )
}
