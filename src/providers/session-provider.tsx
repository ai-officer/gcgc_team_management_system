'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

interface Props {
  children: ReactNode
}

export function AuthProvider({ children }: Props) {
  return <SessionProvider>{children}</SessionProvider>
}

export function ConditionalAuthProvider({ children }: Props) {
  const pathname = usePathname()
  
  // Don't wrap administrator login routes with NextAuth provider
  if (pathname?.startsWith('/administrator')) {
    return <>{children}</>
  }
  
  return <SessionProvider>{children}</SessionProvider>
}