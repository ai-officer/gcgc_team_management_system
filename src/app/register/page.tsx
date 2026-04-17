'use client'

import Link from 'next/link'
import { RegistrationForm } from '@/components/forms/registration-form'
import { ArrowLeft, Users, Shield } from 'lucide-react'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 light">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
              <span className="text-gray-200 select-none">|</span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                  <div className="w-3.5 h-3.5 bg-white rounded-sm"></div>
                </div>
                <span className="text-base font-bold text-gray-900">GCGC</span>
              </div>
            </div>
            <div className="flex items-center">
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Already registered? Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <Users className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              User Registration Portal
            </h1>
            <p className="text-sm text-gray-600 max-w-xl mx-auto">
              Join the GCGC Team Management System. Create your account to collaborate
              with your team and manage projects efficiently.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Team Collaboration</h3>
              <p className="text-xs text-gray-600">
                Work together with your team members and track project progress
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Role-Based Access</h3>
              <p className="text-xs text-gray-600">
                Register as a member or leader with appropriate permissions
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <div className="w-5 h-5 bg-purple-600 rounded-sm"></div>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Task Management</h3>
              <p className="text-xs text-gray-600">
                Create, assign, and track tasks within your organization
              </p>
            </div>
          </div>

          {/* Registration Form */}
          <RegistrationForm />

          {/* Footer */}
          <div className="text-center mt-6 pb-4">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
