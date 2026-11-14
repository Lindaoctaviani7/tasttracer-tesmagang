import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '../api/errors'
import { RoleChangeDialog } from '../components/admin/RoleChangeDialog'
import { AuthNotice } from '../components/auth/AuthNotice'
import { DashboardShell } from '../components/dashboard/DashboardShell'
import { TaskPagination } from '../components/dashboard/TaskPagination'
import { EmptyState } from '../components/feedback/EmptyState'
import { ErrorState } from '../components/feedback/ErrorState'
import { LoadingState } from '../components/feedback/LoadingState'
import { useAuth } from '../hooks/useAuth'
import { userService } from '../services/userService'
import type { Pagination, User, UserRole } from '../types/api'

const EMPTY_PAGINATION: Pagination = {
  current_page: 1,
  per_page: 10,
  total: 0,
  last_page: 1,
}

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
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function AdminUserManagementPage() {
  const { user: authenticatedUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [role, setRole] = useState<'' | UserRole>('')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isSavingRole, setIsSavingRole] = useState(false)

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await userService.list({
        search: appliedSearch || undefined,
        role: role || undefined,
        page,
        per_page: 10,
      })
      setUsers(result.users)
      setPagination(result.pagination)

      if (result.pagination.current_page !== page) {
        setPage(result.pagination.current_page)
      }
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsLoading(false)
    }
  }, [appliedSearch, page, role])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedSearch(search.trim())
      setPage(1)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadUsers])

  async function handleRoleChange(nextRole: UserRole) {
    if (!selectedUser) {
      return
    }

    setIsSavingRole(true)

    try {
      const updatedUser = await userService.updateRole(selectedUser.id, nextRole)
      setUsers((currentUsers) => currentUsers
        .map((user) => user.id === updatedUser.id ? updatedUser : user)
        .filter((user) => !role || user.role === role))
      setSelectedUser(null)
      setSuccess(`Role ${updatedUser.name} berhasil diubah menjadi ${updatedUser.role}.`)
      await loadUsers()
    } finally {
      setIsSavingRole(false)
    }
  }

  return (
    <DashboardShell active="adminUsers">
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-indigo-700">Administrasi</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Manajemen pengguna</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Cari pengguna dan tinjau akses mereka di workspace.</p>
        </div>

        {error && <ErrorState message={error} onRetry={() => void loadUsers()} />}
        {success && <AuthNotice message={success} tone="success" />}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="font-semibold text-slate-900">Semua pengguna</h2>
              <p className="mt-1 text-xs text-slate-500">{pagination.total} pengguna terdaftar</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 sm:w-64">
                <span className="sr-only">Cari nama atau email</span>
                <input
                  className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama atau email..."
                  type="search"
                  value={search}
                />
              </label>
              <label>
                <span className="sr-only">Filter role pengguna</span>
                <select
                  className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 sm:w-40"
                  onChange={(event) => {
                    setRole(event.target.value as '' | UserRole)
                    setPage(1)
                  }}
                  value={role}
                >
                  <option value="">Semua role</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              </label>
            </div>
          </div>

          {isLoading ? (
            <LoadingState message="Memuat pengguna..." />
          ) : error ? null : users.length === 0 ? (
            <div className="p-4 sm:p-8">
              <EmptyState
                description={search || role ? 'Ubah kata pencarian atau filter role untuk mencoba lagi.' : 'Belum ada pengguna yang terdaftar.'}
                title={search || role ? 'Pengguna tidak ditemukan' : 'Belum ada pengguna'}
              />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[42rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-4">Pengguna</th>
                      <th className="px-4 py-4">Role</th>
                      <th className="px-4 py-4">Terdaftar</th>
                      <th className="px-4 py-4"><span className="sr-only">Aksi</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((listedUser) => (
                      <tr className="transition hover:bg-slate-50/70" key={listedUser.id}>
                        <td className="px-5 py-4">
                          <Link className="font-semibold text-slate-900 hover:text-indigo-700" to={`/admin/users/${listedUser.id}`}>
                            {listedUser.name}
                          </Link>
                          <p className="mt-1 text-sm text-slate-500">{listedUser.email}</p>
                        </td>
                        <td className="px-4 py-4">
                          <RoleBadge role={listedUser.role} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                          {formatRegistrationDate(listedUser.created_at)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <RoleActionButton
                            isSelf={listedUser.id === authenticatedUser?.id}
                            onClick={() => setSelectedUser(listedUser)}
                            role={listedUser.role}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 p-3 md:hidden">
                {users.map((listedUser) => (
                  <article className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4" key={listedUser.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link className="break-words font-semibold text-slate-900 hover:text-indigo-700" to={`/admin/users/${listedUser.id}`}>
                          {listedUser.name}
                        </Link>
                        <p className="mt-1 break-all text-sm text-slate-500">{listedUser.email}</p>
                      </div>
                      <RoleBadge role={listedUser.role} />
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-xs text-slate-500">Terdaftar {formatRegistrationDate(listedUser.created_at)}</span>
                      <RoleActionButton
                        isSelf={listedUser.id === authenticatedUser?.id}
                        onClick={() => setSelectedUser(listedUser)}
                        role={listedUser.role}
                      />
                    </div>
                  </article>
                ))}
              </div>
              <TaskPagination
                ariaLabel="Pagination pengguna"
                itemLabel="pengguna"
                onPageChange={setPage}
                pagination={pagination}
              />
            </>
          )}
        </section>
      </div>

      {selectedUser && (
        <RoleChangeDialog
          isSaving={isSavingRole}
          onCancel={() => setSelectedUser(null)}
          onConfirm={handleRoleChange}
          user={selectedUser}
        />
      )}
    </DashboardShell>
  )
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
      role === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
    }`}>
      {role}
    </span>
  )
}

function RoleActionButton({
  role,
  isSelf,
  onClick,
}: {
  role: UserRole
  isSelf: boolean
  onClick: () => void
}) {
  return (
    <button
      className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={isSelf}
      onClick={onClick}
      title={isSelf ? 'Role akun yang sedang digunakan tidak dapat diubah.' : undefined}
      type="button"
    >
      {isSelf ? 'Akun Anda' : role === 'admin' ? 'Ubah ke member' : 'Ubah role'}
    </button>
  )
}
