'use client'

import Link from 'next/link'
import { RegistrationForm } from '@/components/forms/registration-form'
import { ArrowLeft, Users, Shield } from 'lucide-react'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-white light">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/auth/signin" 
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              User Registration Portal
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join the GCGC Team Management System. Create your account to collaborate 
              with your team and manage projects efficiently.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-lg p-6 shadow-sm text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Team Collaboration</h3>
              <p className="text-sm text-gray-600">
                Work together with your team members and track project progress
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Role-Based Access</h3>
              <p className="text-sm text-gray-600">
                Register as a member or leader with appropriate permissions
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 bg-purple-600 rounded-sm"></div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Task Management</h3>
              <p className="text-sm text-gray-600">
                Create, assign, and track tasks within your organization
              </p>
            </div>
          </div>

          {/* Registration Form */}
          <RegistrationForm />
          
          {/* Footer */}
          <div className="text-center mt-8">
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
