import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { io, Socket } from 'socket.io-client'

interface CalendarSyncStatus {
  isConnected: boolean
  isSyncing: boolean
  lastUpdate: Date | null
  error: string | null
}

export function useCalendarSync(onUpdate?: () => void) {
  const { data: session } = useSession()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [status, setStatus] = useState<CalendarSyncStatus>({
    isConnected: false,
    isSyncing: false,
    lastUpdate: null,
    error: null
  })

  useEffect(() => {
    if (!session?.user?.id) return

    // Initialize socket connection
    const socketInstance = io({
      path: '/socket.io',
    })

    socketInstance.on('connect', () => {
      console.log('WebSocket connected')
      setStatus(prev => ({ ...prev, isConnected: true, error: null }))

      // Join calendar sync room
      socketInstance.emit('join-calendar-sync', session.user.id)
    })

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected')
      setStatus(prev => ({ ...prev, isConnected: false }))
    })

    socketInstance.on('calendar-updated', (data) => {
      console.log('Calendar updated:', data)
      setStatus(prev => ({
        ...prev,
        lastUpdate: new Date(data.timestamp)
      }))

      // Trigger callback to refresh calendar
      if (onUpdate) {
        onUpdate()
      }
    })

    socketInstance.on('sync-started', () => {
      setStatus(prev => ({ ...prev, isSyncing: true, error: null }))
    })

    socketInstance.on('sync-completed', (result) => {
      console.log('Sync completed:', result)
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastUpdate: new Date(),
        error: null
      }))

      if (onUpdate) {
        onUpdate()
      }
    })

    socketInstance.on('sync-error', (data) => {
      console.error('Sync error:', data)
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: data.error
      }))
    })

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        error: 'Connection failed'
      }))
    })

    setSocket(socketInstance)

    return () => {
      if (session?.user?.id) {
        socketInstance.emit('leave-calendar-sync', session.user.id)
      }
      socketInstance.disconnect()
    }
  }, [session?.user?.id, onUpdate])

  const triggerManualSync = useCallback(() => {
    if (socket && session?.user?.id) {
      socket.emit('manual-sync', { userId: session.user.id })
    }
  }, [socket, session?.user?.id])

  return {
    status,
    triggerManualSync,
    isConnected: status.isConnected
  }
}
