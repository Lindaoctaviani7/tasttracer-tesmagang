import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getErrorMessage } from '../api/errors'
import { RoleChangeDialog } from '../components/admin/RoleChangeDialog'
import { AuthNotice } from '../components/auth/AuthNotice'
import { DashboardShell } from '../components/dashboard/DashboardShell'
import { ErrorState } from '../components/feedback/ErrorState'
import { LoadingState } from '../components/feedback/LoadingState'
import { useAuth } from '../hooks/useAuth'
import { userService } from '../services/userService'
import type { User, UserRole } from '../types/api'

function formatRegistrationDate(value: string | null): string {
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
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function AdminUserDetailPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user: authenticatedUser } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [isSavingRole, setIsSavingRole] = useState(false)

  const loadUser = useCallback(async () => {
    if (!userId || !/^\d+$/.test(userId)) {
      setError('ID pengguna tidak valid.')
      setIsLoading(false)

      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setUser(await userService.show(Number(userId)))
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUser()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadUser])

  async function handleRoleChange(role: UserRole) {
    if (!user) {
      return
    }

    setIsSavingRole(true)

    try {
      const updatedUser = await userService.updateRole(user.id, role)
      setUser(updatedUser)
      setIsRoleDialogOpen(false)
      setSuccess(`Role pengguna berhasil diubah menjadi ${updatedUser.role}.`)
    } finally {
      setIsSavingRole(false)
    }
  }

  return (
    <DashboardShell active="adminUsers">
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-700"
          to="/admin/users"
        >
          <span aria-hidden="true">←</span> Kembali ke manajemen pengguna
        </Link>

        {error && <ErrorState message={error} onRetry={() => void loadUser()} />}
        {success && <AuthNotice message={success} tone="success" />}

        {isLoading ? (
          <LoadingState message="Memuat detail pengguna..." />
        ) : user ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
            <div className="flex flex-col gap-5 bg-gradient-to-br from-indigo-50 via-white to-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-center gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-semibold text-indigo-800">
                  {user.name.trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-indigo-700">Detail pengguna</p>
                  <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight text-slate-950">{user.name}</h1>
                  <p className="mt-1 break-all text-sm text-slate-500">{user.email}</p>
                </div>
              </div>
              <button
                className="min-h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={user.id === authenticatedUser?.id}
                onClick={() => setIsRoleDialogOpen(true)}
                type="button"
              >
                {user.id === authenticatedUser?.id ? 'Akun Anda' : 'Ubah role'}
              </button>
            </div>

            <dl className="grid gap-5 p-5 sm:grid-cols-2 sm:p-8">
              <div className="rounded-xl border border-slate-100 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Role</dt>
                <dd className="mt-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold capitalize ${
                    user.role === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {user.role}
                  </span>
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tanggal registrasi</dt>
                <dd className="mt-2 text-sm font-medium text-slate-800">{formatRegistrationDate(user.created_at)}</dd>
              </div>
              <div className="rounded-xl border border-slate-100 p-4 sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">ID pengguna</dt>
                <dd className="mt-2 font-mono text-sm text-slate-700">{user.id}</dd>
              </div>
            </dl>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center">
            <h1 className="text-lg font-semibold text-slate-900">Pengguna tidak ditemukan</h1>
            <p className="mt-2 text-sm text-slate-500">Data pengguna tidak tersedia atau sudah dihapus.</p>
            <button
              className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              onClick={() => navigate('/admin/users')}
              type="button"
            >
              Kembali ke pengguna
            </button>
          </section>
        )}
      </div>

      {isRoleDialogOpen && user && (
        <RoleChangeDialog
          isSaving={isSavingRole}
          onCancel={() => setIsRoleDialogOpen(false)}
          onConfirm={handleRoleChange}
          user={user}
        />
      )}
    </DashboardShell>
  )
}
