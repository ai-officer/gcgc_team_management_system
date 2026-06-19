'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { AdminHeader } from '@/components/layout/admin-header'
import { AdminThemeProvider } from '@/components/admin/AdminThemeProvider'
import { useAdminSession } from '@/hooks/use-admin-session'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useAdminSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!session || !session.user.isAdmin) {
      router.push('/administrator/login')
      return
    }
  }, [session, status, router])

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Lock body scroll + allow Escape to close while the drawer is open
  useEffect(() => {
    if (!isMobileOpen) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMobileOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [isMobileOpen])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session || !session.user.isAdmin) {
    return null
  }

  return (
    <AdminThemeProvider>
      <div className="min-h-screen bg-gray-50 admin-portal">
        <div className="flex h-screen">
          <AdminSidebar isMobileOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <AdminHeader onMenuClick={() => setIsMobileOpen(true)} />
            <main className="flex-1 overflow-y-auto bg-gray-50">
              <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </AdminThemeProvider>
  )
}