'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, Send } from 'lucide-react'

interface Field {
  id: string
  name: string
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT'
  options: string[]
  required: boolean
}
interface Config {
  title: string
  intro: string | null
  boardName: string
  fields: Field[]
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">{children}</div>
}
function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      {children}
    </div>
  )
}

export default function PublicFormPage({ params }: { params: { token: string } }) {
  const [config, setConfig] = useState<Config | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [hp, setHp] = useState('')

  useEffect(() => {
    fetch(`/api/forms/${params.token}`)
      .then(async (res) => {
        if (!res.ok) { setLoadError('This form is not available.'); return }
        setConfig(await res.json())
      })
      .catch(() => setLoadError('This form is not available.'))
      .finally(() => setLoading(false))
  }, [params.token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return
    for (const f of config.fields) {
      if (f.required && !(values[f.id] || '').trim()) { setError(`“${f.name}” is required.`); return }
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/forms/${params.token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          title,
          description,
          _hp: hp,
          fieldValues: config.fields.map((f) => ({ fieldId: f.id, value: values[f.id] ?? '' })),
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Submission failed. Please try again.')
      }
      setDone(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Centered><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></Centered>
  if (loadError) {
    return (
      <Centered>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900">Form not available</p>
          <p className="text-sm text-slate-500 mt-1">This form may have been disabled, or the link is invalid.</p>
        </div>
      </Centered>
    )
  }
  if (done) {
    return (
      <Centered>
        <div className="text-center max-w-sm">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <p className="text-lg font-semibold text-slate-900">Thanks — your request was submitted.</p>
          <p className="text-sm text-slate-500 mt-1">The team has been notified and will follow up.</p>
        </div>
      </Centered>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <form onSubmit={submit} className="mx-auto w-full max-w-xl bg-white rounded-2xl shadow-sm border p-6 sm:p-8 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{config!.title}</h1>
          {config!.intro && <p className="text-sm text-slate-500 mt-1 whitespace-pre-wrap">{config!.intro}</p>}
        </div>

        {/* Honeypot — hidden from people, bots tend to fill it */}
        <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormRow label="Your name" required><Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} /></FormRow>
          <FormRow label="Your email" required><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} /></FormRow>
        </div>

        <FormRow label="Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="Short summary of your request" />
        </FormRow>
        <FormRow label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Details…" />
        </FormRow>

        {config!.fields.map((f) => (
          <FormRow key={f.id} label={f.name} required={f.required}>
            {f.type === 'TEXT' && <Input value={values[f.id] || ''} onChange={(e) => setValues((p) => ({ ...p, [f.id]: e.target.value }))} maxLength={500} />}
            {f.type === 'NUMBER' && <Input type="number" value={values[f.id] || ''} onChange={(e) => setValues((p) => ({ ...p, [f.id]: e.target.value }))} />}
            {f.type === 'DATE' && <Input type="date" value={values[f.id] || ''} onChange={(e) => setValues((p) => ({ ...p, [f.id]: e.target.value }))} />}
            {f.type === 'SELECT' && (
              <select value={values[f.id] || ''} onChange={(e) => setValues((p) => ({ ...p, [f.id]: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">Select…</option>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
          </FormRow>
        ))}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}Submit
        </Button>
        <p className="text-[11px] text-center text-slate-400">Powered by GCGC TMS</p>
      </form>
    </div>
  )
}
