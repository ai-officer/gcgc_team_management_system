import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Shield, Calendar, CheckSquare, UserPlus, LogIn, Building2, ArrowRight } from 'lucide-react'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  // If user is already logged in, redirect to their dashboard
  if (session) {
    if (session.user.role === 'ADMIN') {
      redirect('/admin/dashboard')
    } else {
      redirect('/user/dashboard')
    }
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <div className="w-5 h-5 bg-white rounded-sm"></div>
              </div>
              <span className="text-xl font-bold text-gray-900">GCGC</span>
              <span className="hidden sm:inline text-sm text-gray-500 font-medium">Team Management</span>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/auth/signin">
                <Button variant="ghost" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 rounded-lg">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 shadow-sm">
                  <UserPlus className="w-4 h-4" />
                  Register
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-blue-100">
            <Building2 className="w-4 h-4" />
            GCGC Organization Platform
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 animate-fade-in leading-tight">
            Team Management,<br className="hidden sm:block" /> Simplified
          </h1>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Streamline collaboration, manage tasks efficiently, and track progress across
            your entire organization — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto rounded-lg bg-blue-600 hover:bg-blue-700 px-8 shadow-sm">
                <UserPlus className="w-5 h-5 mr-2" />
                Get Started — Register
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-lg border-gray-200 px-8 text-gray-700 hover:bg-gray-50">
                <LogIn className="w-5 h-5 mr-2" />
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Everything your team needs</h2>
          <p className="text-sm text-gray-600">Built for GCGC's organizational structure</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="text-center bg-white rounded-xl shadow-sm border border-gray-100 p-5 card-modern animate-slide-up hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-base font-semibold text-gray-900">User Management</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm text-gray-600 leading-relaxed">
                Register as a leader or member with role-based access and reporting structures.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center bg-white rounded-xl shadow-sm border border-gray-100 p-5 card-modern animate-slide-up hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CheckSquare className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-base font-semibold text-gray-900">Task Management</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm text-gray-600 leading-relaxed">
                Create, assign, and track tasks with priority levels and due dates.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center bg-white rounded-xl shadow-sm border border-gray-100 p-5 card-modern animate-slide-up hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-base font-semibold text-gray-900">Calendar Integration</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm text-gray-600 leading-relaxed">
                Schedule meetings, deadlines, and events with integrated calendar system.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center bg-white rounded-xl shadow-sm border border-gray-100 p-5 card-modern animate-slide-up hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-amber-600" />
              </div>
              <CardTitle className="text-base font-semibold text-gray-900">Hierarchy Management</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm text-gray-600 leading-relaxed">
                Organize teams with proper hierarchy levels from RF1 to M2 management.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white border-t border-gray-100 py-16">
        <div className="max-w-2xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Ready to get started?
          </h2>
          <p className="text-sm text-gray-600 mb-8">
            Join the GCGC team today. Complete your profile, choose your role, and start
            collaborating with your team members in minutes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm mx-auto mb-8 text-left">
            {[
              'Complete profile setup',
              'Choose leader or member role',
              'Organizational structure assignment',
              'Reporting relationship setup',
              'Contact information management',
              'Secure account creation',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckSquare className="w-4 h-4 text-green-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <Link href="/register">
            <Button size="lg" className="rounded-lg bg-blue-600 hover:bg-blue-700 px-8 shadow-sm">
              <UserPlus className="w-5 h-5 mr-2" />
              Access Registration Portal
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold">GCGC Team Management</span>
          </div>
          <div className="flex items-center justify-center gap-6 mb-4">
            <Link href="/privacy-policy" className="text-gray-400 hover:text-white transition-colors text-sm">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="text-gray-400 hover:text-white transition-colors text-sm">
              Terms of Service
            </Link>
          </div>
          <p className="text-gray-500 text-sm">
            &copy; 2024 GCGC Team Management System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}