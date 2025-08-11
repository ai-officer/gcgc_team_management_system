'use client'

import { Search, Bell, User, LogOut, Settings, Shield } from 'lucide-react'
import { useAdminSession } from '@/hooks/use-admin-session'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AdminHeader() {
  const { data: session } = useAdminSession()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/administrator/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200/40 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Page Title & Breadcrumb */}
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 hidden sm:block">Welcome back, Administrator</p>
          </div>
        </div>

        {/* Search */}
        <div className="hidden lg:flex flex-1 max-w-xl mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="search"
              placeholder="Search teams, users, tasks..."
              className="pl-10 w-full bg-gray-50/50 border-gray-200 rounded-lg transition-all duration-200 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {/* Mobile Search */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden h-9 w-9 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Search className="w-4 h-4 text-gray-600" />
          </Button>

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-9 w-9 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-4 h-4 text-gray-600" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          </Button>

          {/* Admin Badge */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Admin</span>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-9 w-9 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-medium">
                    {session?.user?.username?.substring(0, 2).toUpperCase() || 'AD'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {session?.user?.username || 'Administrator'}
                  </p>
                  <div className="flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-blue-600" />
                    <p className="text-xs leading-none text-muted-foreground">
                      System Administrator
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Admin Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}