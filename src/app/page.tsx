import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { LayoutGrid, Users, CheckCircle2, RefreshCw, CalendarDays, Inbox, ArrowRight } from 'lucide-react'

const FEATURES = [
  { icon: LayoutGrid, title: 'Kanban boards, your way', body: 'Custom columns and fields per board, so the workflow matches your team — not the other way around.' },
  { icon: Users, title: 'Clear ownership', body: 'Assign a task to one or more people. Everyone can see who’s doing what at a glance.' },
  { icon: CheckCircle2, title: 'Built-in review', body: 'Work moves from in progress to review to done, with sign-off from the right people.' },
  { icon: RefreshCw, title: 'Recurring & cascading', body: 'Automate routines that repeat, or break work into ordered steps that unlock as you go.' },
  { icon: CalendarDays, title: 'Calendar in sync', body: 'Due dates and events stay in step with Google Calendar.' },
  { icon: Inbox, title: 'Intake forms', body: 'Collect requests from anyone via a shareable link — each one lands as a task on the right board.' },
]

const BOARD = [
  { title: 'To Do', cards: 3 },
  { title: 'In Progress', cards: 2 },
  { title: 'Done', cards: 2 },
]

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  // Logged-in users go straight to their dashboard.
  if (session) {
    redirect(session.user.role === 'ADMIN' ? '/admin/dashboard' : '/user/dashboard')
  }

  return (
    <div className="min-h-screen bg-white light">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 text-white">
        <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">GCGC</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/auth/signin" className="rounded-lg px-3 py-2 text-sm font-medium text-blue-100 transition-colors hover:text-white sm:px-4">
              Sign in
            </Link>
            <Link href="/register" className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-blue-50 sm:px-4">
              Register
            </Link>
          </div>
        </nav>

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-10 lg:grid-cols-2 lg:px-8 lg:pb-28 lg:pt-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">
              GCGC Team Management System
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              Where your team’s<br />work gets done.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-blue-100/80">
              Plan work on boards, assign it to the right people, and move every task from idea to done — with reviews built in.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Create your account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/auth/signin"
                className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Signature: the product itself — a mini Kanban board */}
          <div aria-hidden className="relative hidden lg:block">
            <div className="grid grid-cols-3 gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur-sm">
              {BOARD.map((col) => (
                <div key={col.title} className="space-y-3">
                  <div className="px-1 text-[11px] font-semibold uppercase tracking-wide text-blue-100/70">{col.title}</div>
                  {Array.from({ length: col.cards }).map((_, i) => (
                    <div key={i} className="rounded-lg bg-white/90 p-3 shadow-sm">
                      <div className="h-2 w-3/4 rounded bg-slate-300" />
                      <div className="mt-2 h-2 w-1/2 rounded bg-slate-200" />
                      <div className="mt-3 flex -space-x-1">
                        <div className="h-4 w-4 rounded-full bg-blue-300 ring-2 ring-white" />
                        <div className="h-4 w-4 rounded-full bg-indigo-300 ring-2 ring-white" />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Everything your team needs to run work
          </h2>
          <p className="mt-3 text-slate-500">
            One place to plan, assign, track, and review — shaped to how your team actually works.
          </p>
        </div>
        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pb-20 lg:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 px-8 py-14 text-center text-white sm:px-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to get to work?</h2>
          <p className="mx-auto mt-3 max-w-md text-blue-100/80">
            Create your account and join your team in a couple of minutes.
          </p>
          <Link
            href="/register"
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            Create your account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <span className="font-semibold text-slate-700">GCGC Team Management</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy-policy" className="transition-colors hover:text-slate-900">Privacy Policy</Link>
            <Link href="/terms-of-service" className="transition-colors hover:text-slate-900">Terms of Service</Link>
          </div>
          <p>© {new Date().getFullYear()} GCGC Team Management System</p>
        </div>
      </footer>
    </div>
  )
}
