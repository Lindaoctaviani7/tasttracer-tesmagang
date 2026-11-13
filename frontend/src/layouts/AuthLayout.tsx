import type { ReactNode } from 'react'

interface AuthLayoutProps {
  title: string
  description: string
  eyebrow: string
  children: ReactNode
}

export function AuthLayout({ title, description, eyebrow, children }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)]">
        <aside className="relative hidden overflow-hidden bg-slate-950 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
          <div className="absolute -left-40 top-1/4 size-[34rem] rounded-full bg-indigo-600/25 blur-3xl" />
          <div className="absolute -bottom-48 -right-36 size-[32rem] rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <svg aria-hidden="true" className="size-6" fill="none" viewBox="0 0 24 24">
                <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
                <path d="M12 2.8a9.2 9.2 0 1 0 9.2 9.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
              </svg>
            </div>
            <span className="text-base font-semibold tracking-tight">Taskflow</span>
          </div>

          <div className="relative max-w-xl py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-300">
              Ruang kerja tim Anda
            </p>
            <h2 className="mt-6 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
              Fokus pada hal yang penting. Selesaikan bersama.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
              Kelola tugas, kolaborasi, dan progres tim dalam satu ruang kerja yang rapi.
            </p>
            <div className="mt-10 flex items-center gap-3 text-sm text-slate-300">
              <span className="flex -space-x-2">
                <span className="flex size-8 items-center justify-center rounded-full border-2 border-slate-950 bg-indigo-400 text-xs font-semibold text-slate-950">A</span>
                <span className="flex size-8 items-center justify-center rounded-full border-2 border-slate-950 bg-cyan-300 text-xs font-semibold text-slate-950">R</span>
                <span className="flex size-8 items-center justify-center rounded-full border-2 border-slate-950 bg-amber-300 text-xs font-semibold text-slate-950">M</span>
              </span>
              <span>Kolaborasi yang terasa lebih sederhana</span>
            </div>
          </div>

          <p className="relative text-xs text-slate-400">
            Taskflow · Ruang kerja internal
          </p>
        </aside>

        <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-24">
          <header className="flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
                <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
                <path d="M12 2.8a9.2 9.2 0 1 0 9.2 9.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
              </svg>
            </div>
            <span className="font-semibold tracking-tight">Taskflow</span>
          </header>

          <div className="flex flex-1 items-center justify-center py-10 sm:py-14">
            <div className="w-full max-w-md">
              <p className="text-sm font-semibold text-indigo-700">{eyebrow}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-[2.1rem]">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
              <div className="mt-8">{children}</div>
            </div>
          </div>

          <footer className="py-2 text-center text-xs text-slate-500">
            Akses aman untuk ruang kerja internal Anda
          </footer>
        </section>
      </div>
    </main>
  )
}
