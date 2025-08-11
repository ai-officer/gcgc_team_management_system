import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Shield, Calendar, CheckSquare, UserPlus, LogIn, Building2 } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 to-indigo-100/50">
      {/* Navigation */}
      <nav className="bg-background/95 backdrop-blur-sm shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center space-x-3">
                <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-sm">
                  <div className="w-5 h-5 bg-white rounded-sm"></div>
                </div>
                <span className="text-xl font-bold text-foreground">GCGC</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/signin">
                <Button variant="ghost" className="flex items-center gap-2 hover:bg-accent transition-colors">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200">
                  <UserPlus className="w-4 h-4" />
                  Register
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-foreground mb-6 animate-fade-in">
            GCGC Team Management System
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Streamline your team collaboration, manage tasks efficiently, and track progress 
            with our comprehensive team management platform designed for GCGC organization.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-4">
                <UserPlus className="w-5 h-5 mr-2" />
                Join the Team - Register Now
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg px-8 py-4">
                <LogIn className="w-5 h-5 mr-2" />
                Sign In
              </Button>
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center card-modern animate-slide-up">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                  <Users className="w-7 h-7 text-blue-600" />
                </div>
                <CardTitle className="text-lg font-semibold">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  Register as a leader or member with role-based access and reporting structures.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center card-modern animate-slide-up">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                  <CheckSquare className="w-7 h-7 text-green-600" />
                </div>
                <CardTitle className="text-lg font-semibold">Task Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  Create, assign, and track tasks with priority levels and due dates.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center card-modern animate-slide-up">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                  <Calendar className="w-7 h-7 text-purple-600" />
                </div>
                <CardTitle className="text-lg font-semibold">Calendar Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  Schedule meetings, deadlines, and events with integrated calendar system.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center card-modern animate-slide-up">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                  <Shield className="w-7 h-7 text-orange-600" />
                </div>
                <CardTitle className="text-lg font-semibold">Hierarchy Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  Organize teams with proper hierarchy levels from RF1 to M2 management.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Registration Portal Highlight */}
      <div className="bg-white py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join the GCGC team today. Our registration portal makes it easy to create your account 
            and start collaborating with your team members.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-8 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Registration Features:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <CheckSquare className="w-4 h-4 text-green-500 mr-2" />
                  Complete profile setup
                </li>
                <li className="flex items-center">
                  <CheckSquare className="w-4 h-4 text-green-500 mr-2" />
                  Choose leader or member role
                </li>
                <li className="flex items-center">
                  <CheckSquare className="w-4 h-4 text-green-500 mr-2" />
                  Organizational structure assignment
                </li>
              </ul>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <CheckSquare className="w-4 h-4 text-green-500 mr-2" />
                  Reporting relationship setup
                </li>
                <li className="flex items-center">
                  <CheckSquare className="w-4 h-4 text-green-500 mr-2" />
                  Contact information management
                </li>
                <li className="flex items-center">
                  <CheckSquare className="w-4 h-4 text-green-500 mr-2" />
                  Secure account creation
                </li>
              </ul>
            </div>
          </div>
          
          <Link href="/register">
            <Button size="lg" className="text-lg px-8 py-4">
              <UserPlus className="w-5 h-5 mr-2" />
              Access Registration Portal
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-blue-400" />
            <span className="ml-2 text-xl font-bold">GCGC Team Management</span>
          </div>
          <p className="text-gray-400">
            © 2024 GCGC Team Management System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}