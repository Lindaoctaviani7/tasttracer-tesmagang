import { useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { AuthNotice } from '../auth/AuthNotice'
import { Modal } from '../dashboard/Modal'
import type { User, UserRole } from '../../types/api'

interface RoleChangeDialogProps {
  user: User
  isSaving: boolean
  onCancel: () => void
  onConfirm: (role: UserRole) => Promise<void>
}

export function RoleChangeDialog({
  user,
  isSaving,
  onCancel,
  onConfirm,
}: RoleChangeDialogProps) {
  const [role, setRole] = useState<UserRole>(user.role)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setError(null)

    try {
      await onConfirm(role)
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
    }
  }

  return (
    <Modal
      description={`Konfirmasi perubahan hak akses untuk ${user.name}.`}
      onClose={onCancel}
      title="Ubah role pengguna"
    >
      <div className="flex flex-col gap-5">
        {error && <AuthNotice message={error} />}
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">{user.name}</p>
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
          <p className="mt-2 text-xs text-slate-500">
            Role saat ini: <span className="font-semibold capitalize text-slate-700">{user.role}</span>
          </p>
        </div>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-800" htmlFor="user-role">
          Role baru
          <select
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            id="user-role"
            onChange={(event) => setRole(event.target.value as UserRole)}
            value={role}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <p className="text-sm leading-6 text-slate-500">
          Mengubah role akan langsung mengubah fitur dan akses yang tersedia bagi pengguna ini.
        </p>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button
            className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={isSaving}
            onClick={onCancel}
            type="button"
          >
            Batal
          </button>
          <button
            className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving || role === user.role}
            onClick={() => void handleConfirm()}
            type="button"
          >
            {isSaving ? 'Menyimpan...' : 'Konfirmasi perubahan'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
