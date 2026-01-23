'use client'

import { useSession } from 'next-auth/react'

/**
 * Custom hook to get the correct avatar URL for a user.
 *
 * For the current user, it returns the session's image (which updates immediately after upload).
 * For other users, it returns the provided image from API data.
 *
 * @param userId - The user ID to get the avatar for
 * @param fetchedImage - The image URL from API response (optional)
 * @returns The correct image URL to display
 */
export function useUserAvatar(userId: string | undefined, fetchedImage?: string | null): string | undefined {
  const { data: session } = useSession()

  // If this is the current user, always use the session image (most up-to-date)
  if (userId && session?.user?.id === userId) {
    return session.user.image || undefined
  }

  // For other users, use the fetched image
  return fetchedImage || undefined
}

/**
 * Hook to check if a user ID matches the current session user
 * and get their latest avatar from the session
 */
export function useCurrentUserAvatar(): {
  userId: string | undefined
  image: string | undefined
  name: string | undefined
} {
  const { data: session } = useSession()

  return {
    userId: session?.user?.id,
    image: session?.user?.image || undefined,
    name: session?.user?.name || undefined,
  }
}
