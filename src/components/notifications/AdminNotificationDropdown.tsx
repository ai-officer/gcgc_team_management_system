'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAdminNotifications } from '@/hooks/useAdminNotifications'
import { formatDistanceToNow } from 'date-fns'

function getActivityDot(type: string) {
  const colorMap: Record<string, string> = {
    TASK_CREATED: 'bg-blue-500',
    TASK_UPDATED: 'bg-indigo-500',
    TASK_COMPLETED: 'bg-emerald-500',
    TASK_ASSIGNED: 'bg-purple-500',
    COMMENT_ADDED: 'bg-amber-500',
    TEAM_JOINED: 'bg-teal-500',
    TEAM_LEFT: 'bg-red-500',
    EVENT_CREATED: 'bg-orange-500',
    EVENT_UPDATED: 'bg-yellow-500',
    LOGIN: 'bg-slate-500',
  }
  const color = colorMap[type] ?? 'bg-gray-400'
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${color}`} />
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
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs font-semibold px-1"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-96" side="bottom" align="end">
        <DropdownMenuLabel className="flex items-center justify-between py-3">
          <span className="font-semibold text-gray-900">Notifications</span>
          <button
            onClick={() => { setIsOpen(false); router.push('/admin/audit') }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            View all
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px]">
            {notifications.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className="flex items-start gap-3 px-3 py-2.5 cursor-pointer focus:bg-accent"
                onClick={handleItemClick}
              >
                {getActivityDot(item.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug text-gray-800 line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {item.user && (
                      <span className="text-xs text-muted-foreground font-medium">
                        {item.user.name ?? item.user.email}
                      </span>
                    )}
                    {item.user && (
                      <span className="text-xs text-muted-foreground">·</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}

        <DropdownMenuSeparator />
        <div className="px-3 py-2">
          <button
            onClick={() => { setIsOpen(false); router.push('/admin/audit') }}
            className="w-full text-left text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            View all activity in Audit Trail →
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
