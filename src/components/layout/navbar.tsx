'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const adminNavItems = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Teams',
    href: '/admin/teams',
    icon: Users,
  },
  {
    title: 'Members',
    href: '/admin/members',
    icon: User,
  },
  {
    title: 'Tasks',
    href: '/admin/tasks',
    icon: CheckSquare,
  },
  {
    title: 'Calendar',
    href: '/admin/calendar',
    icon: Calendar,
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
]

const userNavItems = [
  {
    title: 'Dashboard',
    href: '/user/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Tasks',
    href: '/user/tasks',
    icon: CheckSquare,
  },
  {
    title: 'Calendar',
    href: '/user/calendar',
    icon: Calendar,
  },
  {
    title: 'Profile',
    href: '/user/profile',
    icon: User,
  },
]

const leaderNavItems = [
  {
    title: 'Dashboard',
    href: '/user/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Tasks',
    href: '/user/tasks',
    icon: CheckSquare,
  },
  {
    title: 'Calendar',
    href: '/user/calendar',
    icon: Calendar,
  },
  {
    title: 'Team Overview',
    href: '/user/team-overview',
    icon: Users,
  },
  {
    title: 'Member Management',
    href: '/user/member-management',
    icon: UserCheck,
  },
  {
    title: 'Profile',
    href: '/user/profile',
    icon: User,
  },
]

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  if (!session?.user) return null

  const isAdmin = session.user.role === 'ADMIN'
  const isLeader = session.user.role === 'LEADER'
  const navItems = isAdmin ? adminNavItems : (isLeader ? leaderNavItems : userNavItems)
  const portalName = isAdmin ? 'Admin Portal' : 'User Portal'

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur-sm shadow-sm supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex items-center space-x-4">
          <Link href={isAdmin ? '/admin/dashboard' : '/user/dashboard'} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-sm">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">GCGC</h1>
              <span className="hidden text-xs text-muted-foreground sm:block font-medium">
                {portalName}
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:space-x-4 ml-8">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-sm',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            )
          })}
        </div>

        {/* User Menu */}
        <div className="ml-auto flex items-center space-x-6">
          <div className="hidden md:flex md:items-center md:space-x-3">
            <div className="text-right text-sm">
              <p className="font-medium text-foreground">{session.user.name}</p>
              <p className="text-muted-foreground text-xs">{session.user.email}</p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="hidden md:flex hover:bg-destructive hover:text-destructive-foreground transition-all duration-200"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-background/95 backdrop-blur-sm shadow-lg">
          <div className="space-y-2 px-4 pb-6 pt-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </Link>
              )
            })}
            
            {/* Mobile User Info */}
            <div className="border-t border-border pt-4 mt-4">
              <div className="px-4 py-3 bg-muted/20 rounded-lg mb-3">
                <p className="font-semibold text-sm text-foreground">{session.user.name}</p>
                <p className="text-muted-foreground text-xs">{session.user.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start px-4 hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}