'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { UserRole } from '@prisma/client'

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role === UserRole.ADMIN) {
      router.push('/admin/dashboard')
      return
    }
  }, [session, status, router])

  // Listen for sidebar state changes
  useEffect(() => {
    const handleStorageChange = () => {
      const collapsed = localStorage.getItem('sidebar-collapsed')
      setSidebarCollapsed(collapsed ? JSON.parse(collapsed) : false)
    }

    // Initial load
    handleStorageChange()

    // Listen for changes
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session || session.user.role === UserRole.ADMIN) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-indigo-50/30">
      <Sidebar />
      {/* Main content with dynamic margin based on sidebar state */}
      <main className={`transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      } ml-0`}>
        <div className="container mx-auto px-4 py-8 lg:px-8 lg:py-8 max-w-none lg:max-w-7xl lg:pt-8">
          <div className="lg:hidden mb-16">{/* Spacer for mobile toggle button */}</div>
          {children}
        </div>
      </main>
    </div>
  )
}
