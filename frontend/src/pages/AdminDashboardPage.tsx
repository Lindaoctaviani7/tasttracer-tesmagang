import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '../api/errors'
import { DashboardShell } from '../components/dashboard/DashboardShell'
import { ErrorState } from '../components/feedback/ErrorState'
import { LoadingState } from '../components/feedback/LoadingState'
import { userService } from '../services/userService'
import type { AdminDashboardStats } from '../types/api'

const EMPTY_STATS: AdminDashboardStats = {
  total_users: 0,
  total_tasks: 0,
  completed_tasks: 0,
  pending_tasks: 0,
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats>(EMPTY_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      setStats(await userService.getAdminDashboardStats())
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStats()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadStats])

  const cards = [
    { label: 'Total pengguna', value: stats.total_users, icon: '♙', color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Total tugas', value: stats.total_tasks, icon: '▦', color: 'bg-sky-50 text-sky-700' },
    { label: 'Tugas selesai', value: stats.completed_tasks, icon: '✓', color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Belum selesai', value: stats.pending_tasks, icon: '◷', color: 'bg-amber-50 text-amber-700' },
  ]

  return (
    <DashboardShell active="admin">
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-indigo-700">Area administrasi</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard Admin</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Ringkasan aplikasi dan akses cepat untuk mengelola pengguna serta seluruh tugas.
          </p>
        </div>

        {error && <ErrorState message={error} onRetry={() => void loadStats()} />}

        {isLoading ? (
          <LoadingState message="Memuat statistik admin..." />
        ) : !error ? (
          <section aria-label="Statistik aplikasi" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <article
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02]"
                key={card.label}
              >
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-xl font-semibold ${card.color}`}>
                  {card.icon}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-500">{card.label}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{card.value}</p>
                </div>
              </article>
            ))}
          </section>
        ) : null}

        <section>
          <div className="mb-3">
            <h2 className="font-semibold text-slate-900">Kelola aplikasi</h2>
            <p className="mt-1 text-sm text-slate-500">Pilih area administrasi yang ingin Anda buka.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Link
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition hover:border-indigo-200 hover:shadow-md"
              to="/admin/tasks"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-lg font-semibold text-sky-700">✓</span>
              <span>
                <span className="block font-semibold text-slate-900 group-hover:text-indigo-700">Manajemen seluruh tugas</span>
                <span className="mt-1 block text-sm leading-5 text-slate-500">Cari, ubah status, kelola assignee dan tag, edit, atau hapus tugas.</span>
              </span>
              <span aria-hidden="true" className="ml-auto text-slate-400 group-hover:text-indigo-600">→</span>
            </Link>
            <Link
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition hover:border-indigo-200 hover:shadow-md"
              to="/admin/users"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg font-semibold text-indigo-700">♙</span>
              <span>
                <span className="block font-semibold text-slate-900 group-hover:text-indigo-700">Manajemen pengguna</span>
                <span className="mt-1 block text-sm leading-5 text-slate-500">Cari profil, tinjau role, dan kelola akses pengguna.</span>
              </span>
              <span aria-hidden="true" className="ml-auto text-slate-400 group-hover:text-indigo-600">→</span>
            </Link>
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}
