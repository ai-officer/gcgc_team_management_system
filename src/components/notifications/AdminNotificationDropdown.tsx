'use client'

import { useState } from 'react'
import {
  Bell,
  CheckSquare,
  Edit3,
  CheckCircle2,
  UserPlus,
  MessageSquare,
  Users,
  UserMinus,
  Calendar,
  CalendarCheck,
  LogIn,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useAdminNotifications } from '@/hooks/useAdminNotifications'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface ActivityIconConfig {
  icon: React.ReactNode
  bgClass: string
}

function getActivityIconConfig(type: string): ActivityIconConfig {
  switch (type) {
    case 'TASK_CREATED':
      return { icon: <CheckSquare className="h-4 w-4 text-blue-600" />, bgClass: 'bg-blue-50' }
    case 'TASK_UPDATED':
      return { icon: <Edit3 className="h-4 w-4 text-indigo-600" />, bgClass: 'bg-indigo-50' }
    case 'TASK_COMPLETED':
      return { icon: <CheckCircle2 className="h-4 w-4 text-green-600" />, bgClass: 'bg-green-50' }
    case 'TASK_ASSIGNED':
      return { icon: <UserPlus className="h-4 w-4 text-purple-600" />, bgClass: 'bg-purple-50' }
    case 'COMMENT_ADDED':
      return { icon: <MessageSquare className="h-4 w-4 text-amber-600" />, bgClass: 'bg-amber-50' }
    case 'TEAM_JOINED':
      return { icon: <Users className="h-4 w-4 text-teal-600" />, bgClass: 'bg-teal-50' }
    case 'TEAM_LEFT':
      return { icon: <UserMinus className="h-4 w-4 text-red-600" />, bgClass: 'bg-red-50' }
    case 'EVENT_CREATED':
      return { icon: <Calendar className="h-4 w-4 text-orange-600" />, bgClass: 'bg-orange-50' }
    case 'EVENT_UPDATED':
      return { icon: <CalendarCheck className="h-4 w-4 text-yellow-600" />, bgClass: 'bg-yellow-50' }
    case 'LOGIN':
      return { icon: <LogIn className="h-4 w-4 text-slate-600" />, bgClass: 'bg-slate-50' }
    default:
      return { icon: <Bell className="h-4 w-4 text-gray-500" />, bgClass: 'bg-gray-50' }
  }
}

export function AdminNotificationDropdown() {
  const router = useRouter()
  const { notifications, unreadCount, loading, markAllSeen } = useAdminNotifications()
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      markAllSeen()
    }
  }

  const handleItemClick = () => {
    setIsOpen(false)
    router.push('/admin/audit')
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 text-gray-600" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-xs font-semibold px-0 rounded-full"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-80 max-h-96 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden p-0"
        side="bottom"
        align="end"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
          <span className="font-semibold text-gray-900 text-sm">Notifications</span>
          <button
            onClick={() => { setIsOpen(false); router.push('/admin/audit') }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer"
          >
            View all
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="p-4 text-center text-sm text-gray-400">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2">
            <Bell className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">No recent activity</p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {notifications.map((item) => {
              const iconConfig = getActivityIconConfig(item.type)
              return (
                <button
                  key={item.id}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  onClick={handleItemClick}
                >
                  {/* Icon circle */}
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                      iconConfig.bgClass
                    )}
                  >
                    {iconConfig.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-snug line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.user && (
                        <>
                          <span className="text-xs text-gray-500 font-medium">
                            {item.user.name ?? item.user.email}
                          </span>
                          <span className="text-xs text-gray-400">·</span>
                        </>
                      )}
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-2 text-center">
          <button
            onClick={() => { setIsOpen(false); router.push('/admin/audit') }}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            View all activity in Audit Trail
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
