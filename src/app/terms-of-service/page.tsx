'use client'

import { FileText, Users, Shield, AlertTriangle, Scale, RefreshCw, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function TermsOfServicePage() {
  const lastUpdated = 'January 23, 2026'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
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
            <CardTitle>Agreement to Terms</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p>
              Welcome to the GCGC Team Management System (&quot;TMS&quot;, &quot;Service&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;).
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of our team management application.
            </p>
            <p>
              By accessing or using our Service, you agree to be bound by these Terms. If you do not agree to
              these Terms, please do not use our Service.
            </p>
          </CardContent>
        </Card>

        {/* Eligibility */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <CardTitle>Eligibility & Access</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Who Can Use This Service</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>You must be an authorized user within your organization</li>
                <li>You must have valid login credentials provided by your administrator</li>
                <li>You must be at least 18 years old or have parental consent</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Account Responsibilities</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>You are responsible for maintaining the security of your account</li>
                <li>You must not share your login credentials with others</li>
                <li>You must notify us immediately of any unauthorized access</li>
                <li>You are responsible for all activities under your account</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Acceptable Use */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <CardTitle>Acceptable Use</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">You Agree To:</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Use the Service only for lawful purposes</li>
                <li>Use the Service for legitimate team management activities</li>
                <li>Respect the privacy and rights of other users</li>
                <li>Provide accurate information when creating tasks and content</li>
                <li>Comply with your organization&apos;s policies</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">You Agree NOT To:</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Attempt to gain unauthorized access to other accounts or systems</li>
                <li>Upload malicious content, viruses, or harmful code</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Copy, modify, or distribute the Service without permission</li>
                <li>Use automated tools to access the Service without authorization</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Third-Party Services */}
        <Card>
          <CardHeader>
            <CardTitle>Third-Party Integrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-600">
              Our Service integrates with third-party services such as Google Calendar. When you connect
              these services:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>You authorize us to access data from these services as described in our Privacy Policy</li>
              <li>You agree to comply with the third party&apos;s terms of service</li>
              <li>We are not responsible for the availability or accuracy of third-party services</li>
              <li>You can disconnect third-party services at any time</li>
            </ul>
          </CardContent>
        </Card>

        {/* Intellectual Property */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-purple-600" />
              <CardTitle>Intellectual Property</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Our Property</h4>
              <p className="text-gray-600">
                The Service, including its design, features, and content, is owned by GCGC and is protected
                by copyright, trademark, and other intellectual property laws. You may not copy, modify,
                or distribute any part of the Service without our written permission.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Your Content</h4>
              <p className="text-gray-600">
                You retain ownership of the content you create within the Service (tasks, comments, etc.).
                By using the Service, you grant us a license to store, display, and process your content
                solely for the purpose of providing the Service.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Service Availability */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              <CardTitle>Service Availability</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-600">
              We strive to provide reliable service, but we cannot guarantee uninterrupted access:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>The Service may be temporarily unavailable for maintenance or updates</li>
              <li>We may modify, suspend, or discontinue features with reasonable notice</li>
              <li>We are not liable for any downtime or service interruptions</li>
              <li>We recommend regularly backing up important data</li>
            </ul>
          </CardContent>
        </Card>

        {/* Limitation of Liability */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle>Limitation of Liability</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-600">
              To the maximum extent permitted by law:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>The Service is provided &quot;as is&quot; without warranties of any kind</li>
              <li>We do not guarantee that the Service will meet all your requirements</li>
              <li>We are not liable for any indirect, incidental, or consequential damages</li>
              <li>Our total liability is limited to the amount you paid for the Service (if any)</li>
            </ul>
            <div className="bg-amber-50 p-4 rounded-lg mt-4">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Some jurisdictions do not allow limitation of liability, so some
                of the above limitations may not apply to you.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Termination */}
        <Card>
          <CardHeader>
            <CardTitle>Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-600">
              Either party may terminate this agreement:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>You may stop using the Service at any time</li>
              <li>Your administrator may deactivate your account</li>
              <li>We may suspend or terminate accounts that violate these Terms</li>
              <li>Upon termination, your right to access the Service ends immediately</li>
            </ul>
            <p className="text-gray-600 mt-3">
              We may retain certain data after termination as required by law or for legitimate business purposes,
              as described in our Privacy Policy.
            </p>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Changes to These Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              We may update these Terms from time to time. We will notify you of significant changes by
              posting a notice in the Service or sending you an email. Your continued use of the Service
              after changes become effective constitutes acceptance of the revised Terms.
            </p>
          </CardContent>
        </Card>

        {/* Governing Law */}
        <Card>
          <CardHeader>
            <CardTitle>Governing Law</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              These Terms are governed by the laws of the Philippines. Any disputes arising from these
              Terms or your use of the Service will be resolved in the courts of the Philippines.
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
              If you have any questions about these Terms, please contact us:
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
            href="/privacy-policy"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Privacy Policy
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
