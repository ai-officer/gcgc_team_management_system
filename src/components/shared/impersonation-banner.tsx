'use client'

import { useEffect, useState } from 'react'
import { Eye, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IMPERSONATION_MARKER_COOKIE } from '@/lib/auth/impersonation'

interface MarkerPayload {
  userId: string
  userEmail: string
  userName: string | null
  adminUsername: string | null
  expiresAt: number
}

function readMarker(): MarkerPayload | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';').map(s => s.trim())
  const target = cookies.find(c => c.startsWith(`${IMPERSONATION_MARKER_COOKIE}=`))
  if (!target) return null
  const value = decodeURIComponent(target.slice(IMPERSONATION_MARKER_COOKIE.length + 1))
  try {
    return JSON.parse(value) as MarkerPayload
  } catch {
    return null
  }
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'expired'
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes <= 0) return `${seconds}s`
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

export function ImpersonationBanner() {
  const [marker, setMarker] = useState<MarkerPayload | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [ending, setEnding] = useState(false)

  useEffect(() => {
    setMarker(readMarker())
  }, [])

  useEffect(() => {
    if (!marker) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [marker])

  const handleEnd = async () => {
    setEnding(true)
    try {
      const res = await fetch('/api/admin/impersonate/end', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      window.location.href = data.redirectTo ?? '/admin/users'
    } catch {
      // Fallback — clear cookies client-side won't work for httpOnly, so just bounce.
      window.location.href = '/administrator/login'
    }
  }

  if (!marker) return null

  const remainingMs = marker.expiresAt - now
  const expired = remainingMs <= 0
  const display = marker.userName || marker.userEmail

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-500 text-white shadow-md">
      <div className="px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Eye className="h-4 w-4 flex-shrink-0" />
          <span>
            Viewing as <strong>{display}</strong>
            {marker.adminUsername && (
              <span className="opacity-80"> · admin {marker.adminUsername}</span>
            )}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded ${expired ? 'bg-red-600' : 'bg-amber-700'}`}>
            {expired ? 'Session expired' : `expires in ${formatRemaining(remainingMs)}`}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="bg-white text-amber-700 hover:bg-amber-50 border-white"
          onClick={handleEnd}
          disabled={ending}
        >
          <LogOut className="h-4 w-4 mr-1" />
          Return to admin
        </Button>
      </div>
    </div>
  )
}
