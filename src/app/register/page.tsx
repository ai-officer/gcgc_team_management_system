'use client'

import Link from 'next/link'
import { RegistrationForm } from '@/components/forms/registration-form'
import { ArrowLeft, LayoutGrid, Users, CheckCircle2 } from 'lucide-react'

const VALUE_POINTS = [
  { icon: LayoutGrid, title: 'Plan work on boards', body: 'Organize tasks into Kanban columns you can shape to fit how your team works.' },
  { icon: Users, title: 'See who’s doing what', body: 'Every task shows its assignees, so nothing slips through the cracks.' },
  { icon: CheckCircle2, title: 'Submit and review work', body: 'Move tasks from in progress to review to done — with sign-off built in.' },
]

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 light lg:grid lg:grid-cols-[5fr_7fr]">
      {/* Brand rail */}
      <aside className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 text-white lg:sticky lg:top-0 lg:h-screen">
        {/* Signature: a faint Kanban-column motif — the product, rendered as texture */}
        <div aria-hidden className="pointer-events-none absolute -right-8 bottom-0 hidden gap-4 opacity-[0.10] lg:flex">
          {[0, 1, 2].map((col) => (
            <div key={col} className="flex w-28 flex-col gap-3 pt-28">
              {Array.from({ length: 4 - col }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-white" />
              ))}
            </div>
          ))}
        </div>

        <div className="relative flex h-full flex-col p-8 lg:p-12">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-md text-sm text-blue-100/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="my-auto hidden max-w-md py-10 lg:block">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold tracking-tight">GCGC</span>
            </div>

            <h1 className="text-[2rem] font-bold leading-[1.15] tracking-tight">
              Set up your<br />workspace account
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-blue-100/80">
              Join your team on the GCGC Team Management System — where work gets planned, assigned, and finished.
            </p>

            <ul className="mt-10 space-y-5">
              {VALUE_POINTS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3.5">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-sm leading-relaxed text-blue-100/70">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative mt-auto hidden pt-10 text-xs text-blue-100/50 lg:block">
            GCGC Team Management System
          </p>
        </div>
      </aside>

      {/* Form column */}
      <main className="flex min-h-screen flex-col">
        <header className="flex items-center gap-4 px-6 py-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <span className="font-semibold text-slate-900">GCGC</span>
          </div>
          <p className="ml-auto text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </p>
        </header>

        <div className="flex-1 px-6 pb-16 sm:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-2xl">
            <RegistrationForm />
          </div>
        </div>
      </main>
    </div>
  )
}
