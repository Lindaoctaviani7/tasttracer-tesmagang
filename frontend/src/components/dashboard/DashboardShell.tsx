import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../../api/errors'
import { AuthNotice } from '../auth/AuthNotice'
import { useAuth } from '../../hooks/useAuth'

interface DashboardShellProps {
  active: 'dashboard' | 'tasks' | 'admin' | 'adminTasks' | 'adminUsers'
  children: ReactNode
}

const navigation = [
  {
    label: 'Ringkasan',
    to: '/dashboard',
    key: 'dashboard',
    icon: 'grid',
  },
  {
    label: 'Semua tugas',
    to: '/tasks',
    key: 'tasks',
    icon: 'check',
  },
] as const

function NavigationLinks({
  isAdmin,
  onNavigate,
}: {
  isAdmin: boolean
  onNavigate?: () => void
}) {
  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
      {navigation.map((item) => (
        <NavLink
          className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
            isActive
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
          }`}
          end={item.key === 'dashboard'}
          key={item.key}
          onClick={onNavigate}
          to={item.to}
        >
          {item.icon === 'grid' ? (
            <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
              <rect height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" width="7" x="3.5" y="3.5" />
              <rect height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" width="7" x="13.5" y="3.5" />
              <rect height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" width="7" x="3.5" y="13.5" />
              <rect height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" width="7" x="13.5" y="13.5" />
            </svg>
          ) : (
            <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
              <path d="m8 12.2 2.5 2.5L16.5 9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
            </svg>
          )}
          {item.label}
        </NavLink>
      ))}
      {isAdmin && (
        <>
          <p className="px-3 pb-1 pt-5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Administrasi
          </p>
          {[
            { label: 'Dashboard admin', to: '/admin', key: 'admin' },
            { label: 'Semua tugas', to: '/admin/tasks', key: 'adminTasks' },
            { label: 'Pengguna', to: '/admin/users', key: 'adminUsers' },
          ].map((item) => (
            <NavLink
              className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
              end={item.key !== 'adminUsers'}
              key={item.key}
              onClick={onNavigate}
              to={item.to}
            >
              <span aria-hidden="true" className="flex size-5 items-center justify-center text-base">
                {item.key === 'adminUsers' ? '♙' : item.key === 'adminTasks' ? '✓' : '▦'}
              </span>
              {item.label}
            </NavLink>
          ))}
        </>
      )}
    </nav>
  )
}

export function DashboardShell({ active, children }: DashboardShellProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const isAdmin = user?.role === 'admin'

  async function handleLogout() {
    setLogoutError(null)
    setIsLoggingOut(true)

    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error: unknown) {
      setLogoutError(getErrorMessage(error))
    } finally {
      setIsLoggingOut(false)
    }
  }

  const initials = user?.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
        <Link className="flex items-center gap-3 px-2" to="/dashboard">
          <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
            <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
              <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
              <path d="M12 2.8a9.2 9.2 0 1 0 9.2 9.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
            </svg>
          </span>
          <span>
            <span className="block text-sm font-bold tracking-tight">Taskflow</span>
            <span className="block text-xs text-slate-500">Ruang kerja tim</span>
          </span>
        </Link>

        <div className="mt-10 flex flex-col gap-3">
          <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>
          <NavigationLinks isAdmin={isAdmin} />
        </div>

        <div className="mt-auto rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold">Satu langkah setiap hari.</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Atur prioritas dan kerjakan bersama tim.
          </p>
        </div>
      </aside>

      {isMobileNavigationOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Tutup navigasi"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setIsMobileNavigationOpen(false)}
            type="button"
          />
          <aside className="relative flex h-full w-[min(18rem,85vw)] flex-col border-r border-slate-200 bg-white px-5 py-6 shadow-xl">
            <div className="flex items-center justify-between">
              <Link className="flex items-center gap-3" onClick={() => setIsMobileNavigationOpen(false)} to="/dashboard">
                <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <span className="font-bold">T</span>
                </span>
                <span className="text-sm font-bold">Taskflow</span>
              </Link>
              <button
                aria-label="Tutup navigasi"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                onClick={() => setIsMobileNavigationOpen(false)}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="mt-9">
              <NavigationLinks isAdmin={isAdmin} onNavigate={() => setIsMobileNavigationOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-20 flex h-[4.25rem] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              aria-expanded={isMobileNavigationOpen}
              aria-label="Buka navigasi"
              className="flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
              onClick={() => setIsMobileNavigationOpen(true)}
              type="button"
            >
              <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
              </svg>
            </button>
            <p className="hidden text-sm text-slate-500 sm:block">
              Workspace <span className="px-1 text-slate-300">/</span>
              <span className="font-medium text-slate-900">
                {{
                  dashboard: 'Ringkasan',
                  tasks: 'Semua tugas',
                  admin: 'Dashboard admin',
                  adminTasks: 'Manajemen tugas',
                  adminUsers: 'Manajemen pengguna',
                }[active]}
              </span>
            </p>
            <p className="text-sm font-semibold sm:hidden">Taskflow</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-40 truncate text-sm font-semibold">{user?.name}</p>
              <p className="text-xs capitalize text-slate-500">{user?.role}</p>
            </div>
            <div
              aria-label={`Profil ${user?.name ?? ''}`}
              className="flex size-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-800 ring-2 ring-white"
              title={user?.email}
            >
              {initials}
            </div>
            <button
              className="rounded-lg px-2 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60"
              disabled={isLoggingOut}
              onClick={handleLogout}
              type="button"
            >
              <span className="hidden sm:inline">{isLoggingOut ? 'Keluar...' : 'Keluar'}</span>
              <span aria-label="Keluar" className="sm:hidden">↗</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
          {logoutError && <div className="mb-5"><AuthNotice message={logoutError} /></div>}
          {children}
        </main>
      </div>
    </div>
  )
}
