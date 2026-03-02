'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAdminSession } from '@/hooks/use-admin-session'

const LAST_SEEN_KEY = 'admin_notif_last_seen'

interface ActivityUser {
  id: string
  name: string | null
  email: string
  role: string
}

export interface AdminNotification {
  id: string
  type: string
  description: string
  createdAt: string
  userId: string
  user: ActivityUser | null
}

export function useAdminNotifications() {
  const { data: session } = useAdminSession()
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const getLastSeen = useCallback((): string => {
    if (typeof window === 'undefined') return new Date(0).toISOString()
    return localStorage.getItem(LAST_SEEN_KEY) ?? new Date(0).toISOString()
  }, [])

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.isAdmin) return

    try {
      const since = getLastSeen()
      const res = await fetch(`/api/admin/notifications?limit=20&since=${encodeURIComponent(since)}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching admin notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.isAdmin, getLastSeen])

  const markAllSeen = useCallback(() => {
    const now = new Date().toISOString()
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_SEEN_KEY, now)
    }
    setUnreadCount(0)
  }, [])

  useEffect(() => {
    if (!session?.user?.isAdmin) return

    fetchNotifications()

    const pollInterval = setInterval(fetchNotifications, 30000)

    const handleFocus = () => fetchNotifications()
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [session?.user?.isAdmin, fetchNotifications])

  return { notifications, unreadCount, loading, markAllSeen }
}
