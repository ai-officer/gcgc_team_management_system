'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react'

// Field error type
interface FieldErrors {
  email?: string
  password?: string
}

function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard'
  const error_ = searchParams.get('error')

  useEffect(() => {
    if (error_) {
      setError('Invalid email or password. Please try again.')
    }
  }, [error_])

  // Validate a single field
  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'email':
        if (!value.trim()) return 'Email is required'
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) return 'Please enter a valid email address'
        const allowedDomains = ['gmail.com', 'globalofficium.com']
        const emailDomain = value.split('@')[1]?.toLowerCase()
        if (!allowedDomains.includes(emailDomain)) {
          return 'Email must be @gmail.com or @globalofficium.com'
        }
        return undefined
      case 'password':
        if (!value) return 'Password is required'
        return undefined
      default:
        return undefined
    }
  }

  // Handle field blur
  const handleBlur = (field: string, value: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const error = validateField(field, value)
    setFieldErrors(prev => ({ ...prev, [field]: error }))
  }

  // Validate all fields
  const validateAllFields = (): boolean => {
    const errors: FieldErrors = {
      email: validateField('email', email),
      password: validateField('password', password)
    }
    setFieldErrors(errors)
    setTouched({ email: true, password: true })
    return !Object.values(errors).some(error => error !== undefined)
  }

  // Error message component
  const FieldError = ({ error }: { error?: string }) => {
    if (!error) return null
    return <p className="text-sm text-red-500 mt-1">{error}</p>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate all fields first
    if (!validateAllFields()) {
      return
    }

    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password. Please try again.')
        setIsLoading(false)
        return
      }

      // Check user role after successful signin
      const session = await getSession()
      if (session?.user) {
        // Redirect based on role
        if (session.user.role === 'ADMIN') {
          router.push('/admin/dashboard')
        } else if (session.user.role === 'LEADER') {
          router.push('/user/dashboard')
        } else {
          router.push('/user/dashboard')
        }
      } else {
        router.push(callbackUrl)
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 light">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <div className="w-6 h-6 bg-white rounded-sm"></div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">GCGC</h1>
          <p className="text-sm text-gray-500 mt-1">Team Management System</p>
        </div>

        <Card className="bg-white rounded-2xl shadow-md border border-gray-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-center text-gray-900">Sign In</CardTitle>
            <CardDescription className="text-center text-sm text-gray-600">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email address <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (fieldErrors.email) {
                          setFieldErrors(prev => ({ ...prev, email: undefined }))
                        }
                      }}
                      onBlur={() => handleBlur('email', email)}
                      className={`pl-9 bg-white text-gray-900 placeholder-gray-400 rounded-lg border ${
                        touched.email && fieldErrors.email ? 'border-red-400 focus:ring-red-400' : 'border-gray-200'
                      }`}
                      placeholder="you@example.com"
                    />
                  </div>
                  {touched.email && <FieldError error={fieldErrors.email} />}
                </div>

                <div>
                  <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (fieldErrors.password) {
                          setFieldErrors(prev => ({ ...prev, password: undefined }))
                        }
                      }}
                      onBlur={() => handleBlur('password', password)}
                      className={`pl-9 pr-10 bg-white text-gray-900 placeholder-gray-400 rounded-lg border ${
                        touched.password && fieldErrors.password ? 'border-red-400 focus:ring-red-400' : 'border-gray-200'
                      }`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                  {touched.password && <FieldError error={fieldErrors.password} />}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-5 pt-5 border-t border-gray-100 text-center space-y-2">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                  Register here
                </Link>
              </p>
              <p className="text-sm text-gray-600">
                Need help?{' '}
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Contact support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  )
}