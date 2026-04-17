'use client'

import Link from 'next/link'
import { RegistrationForm } from '@/components/forms/registration-form'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <div className="w-6 h-6 bg-white rounded-sm"></div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">GCGC</h1>
          <p className="text-sm text-gray-500 mt-1">Team Management System</p>
          <h2 className="mt-4 text-xl font-semibold text-gray-800">
            Create your account
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Fill in your details to join the GCGC team
          </p>
        </div>

        {/* Registration Form */}
        <RegistrationForm />

        <div className="text-center pb-4">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}