'use client'

import { useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  userId?: string
  image?: string | null
  name?: string | null
  email?: string
  className?: string
  fallbackClassName?: string
}

/**
 * UserAvatar component that automatically uses the session's image for the current user.
 * This ensures that when a user uploads a new profile picture, it immediately reflects
 * across all instances of their avatar in the app.
 *
 * For other users, it uses the provided image from API data.
 */
export function UserAvatar({
  userId,
  image,
  name,
  email,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const { data: session } = useSession()

  // Determine which image to use
  // If this is the current user, always use the session image (most up-to-date)
  const isCurrentUser = userId && session?.user?.id === userId
  const displayImage = isCurrentUser ? (session?.user?.image || undefined) : (image || undefined)
  const displayName = isCurrentUser ? (session?.user?.name || name) : name

  // Generate initials for fallback
  const getInitials = () => {
    if (displayName) {
      return displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return 'U'
  }

  return (
    <Avatar className={className}>
      <AvatarImage src={displayImage} alt={displayName || email || 'User'} className="object-cover" />
      <AvatarFallback
        className={cn(
          'bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium',
          fallbackClassName
        )}
      >
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  )
}
