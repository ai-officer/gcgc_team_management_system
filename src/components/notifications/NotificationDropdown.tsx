'use client'

import { useState } from 'react'
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Edit3,
  UserPlus,
  MessageSquare,
  AtSign,
  AlertTriangle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface NotificationDropdownProps {
  isCollapsed?: boolean
}

interface NotificationIconConfig {
  icon: React.ReactNode
  bgClass: string
  iconClass: string
}

function getNotificationIconConfig(type: string): NotificationIconConfig {
  switch (type) {
    case 'TASK_ASSIGNED':
      return {
        icon: <UserPlus className="h-4 w-4 text-blue-600" />,
        bgClass: 'bg-blue-50',
        iconClass: 'text-blue-600',
      }
    case 'TASK_UPDATED':
      return {
        icon: <Edit3 className="h-4 w-4 text-amber-600" />,
        bgClass: 'bg-amber-50',
        iconClass: 'text-amber-600',
      }
    case 'TASK_COMPLETED':
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
        bgClass: 'bg-green-50',
        iconClass: 'text-green-600',
      }
    case 'COMMENT_ADDED':
      return {
        icon: <MessageSquare className="h-4 w-4 text-purple-600" />,
        bgClass: 'bg-purple-50',
        iconClass: 'text-purple-600',
      }
    case 'MENTION':
      return {
        icon: <AtSign className="h-4 w-4 text-pink-600" />,
        bgClass: 'bg-pink-50',
        iconClass: 'text-pink-600',
      }
    case 'DEADLINE_REMINDER':
      return {
        icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
        bgClass: 'bg-red-50',
        iconClass: 'text-red-600',
      }
    default:
      return {
        icon: <Bell className="h-4 w-4 text-gray-500" />,
        bgClass: 'bg-gray-50',
        iconClass: 'text-gray-500',
      }
  }
}

export function NotificationDropdown({ isCollapsed = false }: NotificationDropdownProps) {
  const router = useRouter()
  const { notifications, unreadCount, loading, markOneAsRead, markAllAsRead } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  const getNotificationHref = (notification: any) => {
    if (notification.entityType !== 'task' || !notification.entityId) return null
    return `/user/tasks?taskId=${notification.entityId}`
  }

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markOneAsRead(notification.id)
    }
    setIsOpen(false)
    const href = getNotificationHref(notification)
    if (href) {
      router.push(href)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'relative hover:bg-accent hover:text-accent-foreground transition-colors',
            isCollapsed ? 'w-8 h-8 p-0 justify-center' : 'w-full justify-start px-3 py-2.5'
          )}
        >
          <Bell className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="ml-3 truncate">Notifications</span>}
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-semibold leading-none',
                !isCollapsed && 'static ml-auto bg-red-500 text-white text-xs rounded-full h-5 min-w-5 px-1 flex items-center justify-center font-semibold'
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side={isCollapsed ? 'right' : 'top'}
        className="w-80 max-h-96 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden p-0"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
          <span className="font-semibold text-gray-900 text-sm">Notifications</span>
          {unreadCount > 0 && (
            <button
              className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
              onClick={(e) => {
                e.preventDefault()
                markAllAsRead()
              }}
            >
              <CheckCheck className="inline h-3 w-3 mr-1" />
              Mark all read
            </button>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div className="p-4 text-center text-sm text-gray-400">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2">
            <Bell className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">No notifications</p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {notifications.map((notification) => {
              const iconConfig = getNotificationIconConfig(notification.type)
              return (
                <button
                  key={notification.id}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left',
                    !notification.isRead && 'bg-blue-50/30'
                  )}
                  onClick={() => handleNotificationClick(notification)}
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
                      {notification.message || notification.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!notification.isRead && (
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-2 text-center">
            <span className="text-sm text-blue-600">View all notifications</span>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
