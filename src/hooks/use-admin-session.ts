'use client'

import { useState, useEffect } from 'react'

interface AdminUser {
  id: string
  username: string
  isAdmin: boolean
}

interface AdminSession {
  user: AdminUser
}

export function useAdminSession() {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAdminSession() {
      try {
        const response = await fetch('/api/admin/session', {
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            setSession({ user: data.user })
          }
        }
      } catch (error) {
        console.error('Error checking admin session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAdminSession()
  }, [])

  return { data: session, status: loading ? 'loading' : 'authenticated' }
}
