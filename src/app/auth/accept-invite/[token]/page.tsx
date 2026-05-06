'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, User, Phone, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

interface Invitation {
  email: string
  role: string
  hierarchyLevel: string | null
  isLeader: boolean
  division: string | null
  department: string | null
  section: string | null
  team: string | null
  positionTitle: string | null
  jobLevel: string | null
  expiresAt: string
}

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()

  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    username: '',
    contactNumber: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!params?.token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/auth/accept-invite/${params.token}`)
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setLoadError(data.error ?? 'Could not load invitation')
        } else {
          setInvitation(data.invitation)
        }
      } catch {
        if (!cancelled) setLoadError('Network error loading invitation')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [params?.token])

  const handleChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (form.password !== form.confirmPassword) {
      setSubmitError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/auth/accept-invite/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          middleName: form.middleName.trim() || undefined,
          username: form.username.trim(),
          contactNumber: form.contactNumber.trim(),
          password: form.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error ?? 'Failed to create account')
      } else {
        setSubmitted(true)
        setTimeout(() => router.push('/auth/signin'), 2500)
      }
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading invitation…
        </div>
      </div>
    )
  }

  if (loadError || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Invitation Unavailable
            </CardTitle>
            <CardDescription>{loadError ?? 'This invitation is no longer valid.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/signin">
              <Button variant="outline" className="w-full">Go to sign in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              Account created
            </CardTitle>
            <CardDescription>
              You can now sign in. Redirecting…
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 py-10">
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Accept your invitation</CardTitle>
            <CardDescription>
              You&apos;ve been invited to join the team. Complete your profile to activate the account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-900">{invitation.email}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{invitation.role}</Badge>
                {invitation.isLeader && <Badge variant="outline">Leader</Badge>}
                {invitation.hierarchyLevel && <Badge variant="outline">{invitation.hierarchyLevel}</Badge>}
                {invitation.positionTitle && <Badge variant="outline">{invitation.positionTitle}</Badge>}
              </div>
              {(invitation.division || invitation.department || invitation.section || invitation.team) && (
                <div className="text-xs text-slate-500">
                  {[invitation.division, invitation.department, invitation.section, invitation.team]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              )}
              <div className="text-xs text-slate-500">
                Expires {new Date(invitation.expiresAt).toLocaleString()}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" value={form.firstName} onChange={handleChange('firstName')} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" value={form.lastName} onChange={handleChange('lastName')} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="middleName">Middle name <span className="text-slate-400 text-xs">(optional)</span></Label>
                <Input id="middleName" value={form.middleName} onChange={handleChange('middleName')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="username"
                    className="pl-9"
                    value={form.username}
                    onChange={handleChange('username')}
                    autoComplete="username"
                    required
                    minLength={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="contactNumber"
                    className="pl-9"
                    placeholder="09XXXXXXXXX"
                    value={form.contactNumber}
                    onChange={handleChange('contactNumber')}
                    pattern="^09\d{9}$"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="pl-9 pr-9"
                      value={form.password}
                      onChange={handleChange('password')}
                      autoComplete="new-password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      className="pl-9"
                      value={form.confirmPassword}
                      onChange={handleChange('confirmPassword')}
                      autoComplete="new-password"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </div>

              {submitError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  'Accept invitation'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
