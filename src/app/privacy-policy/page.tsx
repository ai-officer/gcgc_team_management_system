'use client'

import { Shield, Calendar, Database, Lock, Trash2, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function PrivacyPolicyPage() {
  const lastUpdated = 'January 23, 2026'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          </div>
          <p className="text-gray-600">
            GCGC Team Management System
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Last updated: {lastUpdated}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle>Introduction</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p>
              Welcome to the GCGC Team Management System (&quot;TMS&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;).
              We are committed to protecting your privacy and ensuring the security of your personal information.
            </p>
            <p>
              This Privacy Policy explains how we collect, use, store, and protect your information when you use
              our team management application, including our Google Calendar integration feature.
            </p>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              <CardTitle>Information We Collect</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Account Information</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Full name</li>
                <li>Email address</li>
                <li>Profile picture (optional)</li>
                <li>Contact number (optional)</li>
                <li>Department and organizational information</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Task and Activity Data</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Tasks you create, edit, or are assigned to</li>
                <li>Comments and collaboration data</li>
                <li>Calendar events and deadlines</li>
                <li>Activity logs within the application</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Google Calendar Data (When Connected)</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Calendar event titles and dates</li>
                <li>Event descriptions</li>
                <li>Event times and durations</li>
              </ul>
              <p className="text-sm text-gray-500 mt-2">
                This data is only accessed when you explicitly connect your Google Calendar to our application.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Your Information */}
        <Card>
          <CardHeader>
            <CardTitle>How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-600">We use your information to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Provide and maintain our team management services</li>
              <li>Allow you to create, manage, and track tasks</li>
              <li>Enable collaboration with your team members</li>
              <li>Sync your tasks and deadlines with Google Calendar (when enabled)</li>
              <li>Send notifications about task updates and deadlines</li>
              <li>Improve our services and user experience</li>
            </ul>
          </CardContent>
        </Card>

        {/* Google Calendar Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <CardTitle>Google Calendar Integration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Our application offers optional Google Calendar integration to help you sync your tasks and deadlines.
            </p>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What We Access</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Read access to view your calendar events</li>
                <li>Write access to create task deadlines in your calendar</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What We Do NOT Do</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>We do NOT store your Google password</li>
                <li>We do NOT access calendars you haven&apos;t authorized</li>
                <li>We do NOT share your calendar data with third parties</li>
                <li>We do NOT sell any of your data</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Your Control:</strong> You can disconnect Google Calendar at any time from your
                settings. When disconnected, we immediately stop accessing your Google Calendar data.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-purple-600" />
              <CardTitle>Data Security</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-600">
              We implement appropriate security measures to protect your personal information:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>All data is transmitted over secure HTTPS connections</li>
              <li>Passwords are encrypted and never stored in plain text</li>
              <li>Access to user data is restricted to authorized personnel only</li>
              <li>Regular security audits and updates are performed</li>
              <li>Google OAuth tokens are stored securely and encrypted</li>
            </ul>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              <CardTitle>Data Retention & Deletion</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-600">
              We retain your data only as long as necessary to provide our services:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Account data is retained while your account is active</li>
              <li>You can request deletion of your account and associated data at any time</li>
              <li>When you disconnect Google Calendar, we delete stored calendar sync data</li>
              <li>Deleted data is permanently removed from our systems within 30 days</li>
            </ul>
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <p className="text-sm text-gray-700">
                <strong>To delete your data:</strong> Contact your system administrator or email us at the
                contact address below.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card>
          <CardHeader>
            <CardTitle>Your Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-600">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li><strong>Access</strong> - Request a copy of your personal data</li>
              <li><strong>Correction</strong> - Request correction of inaccurate data</li>
              <li><strong>Deletion</strong> - Request deletion of your data</li>
              <li><strong>Withdraw Consent</strong> - Disconnect third-party services like Google Calendar</li>
              <li><strong>Data Portability</strong> - Request your data in a portable format</li>
            </ul>
          </CardContent>
        </Card>

        {/* Third-Party Services */}
        <Card>
          <CardHeader>
            <CardTitle>Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-600">
              Our application integrates with the following third-party services:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>
                <strong>Google Calendar</strong> - For calendar synchronization
                (<a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>)
              </li>
            </ul>
            <p className="text-gray-600 mt-3">
              These services have their own privacy policies, and we encourage you to review them.
            </p>
          </CardContent>
        </Card>

        {/* Changes to This Policy */}
        <Card>
          <CardHeader>
            <CardTitle>Changes to This Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              We may update this Privacy Policy from time to time. We will notify you of any significant
              changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
              We encourage you to review this Privacy Policy periodically.
            </p>
          </CardContent>
        </Card>

        {/* Contact Us */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <CardTitle>Contact Us</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-600">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>Email:</strong> aiofficer.gcgc@gmail.com
              </p>
              <p className="text-gray-700 mt-1">
                <strong>Organization:</strong> GCGC Team Management System
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Links */}
        <div className="flex justify-center gap-6 pt-4">
          <Link
            href="/terms-of-service"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Terms of Service
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Back to Application
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} GCGC Team Management System. All rights reserved.
        </div>
      </div>
    </div>
  )
}
