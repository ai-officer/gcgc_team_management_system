'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft } from 'lucide-react'

const errorMessages = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The sign in link is no longer valid. It may have been used already or it may have expired.',
  Default: 'An error occurred during authentication. Please try again.',
}

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') as keyof typeof errorMessages
  
  const errorMessage = errorMessages[error] || errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Authentication Error</h1>
          <p className="text-sm text-gray-500 mt-1">Something went wrong during sign in</p>
        </div>

        <Card className="bg-white rounded-2xl shadow-md border border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-center text-gray-900">
              Sign In Failed
            </CardTitle>
            <CardDescription className="text-center text-sm text-gray-600">
              We encountered an issue while trying to sign you in
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4">
            <Alert variant="destructive" className="rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage}
              </AlertDescription>
            </Alert>

            <div className="space-y-2.5">
              <Button asChild className="w-full rounded-lg bg-blue-600 hover:bg-blue-700">
                <Link href="/auth/signin">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Sign In
                </Link>
              </Button>

              <Button variant="outline" asChild className="w-full rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50">
                <Link href="/">
                  Go to Homepage
                </Link>
              </Button>
            </div>

            {error && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-600">Error Code:</span> {error}
                </p>
              </div>
            )}

            <p className="text-center text-sm text-gray-600 pt-1">
              Need help?{' '}
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                Contact support
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  )
}