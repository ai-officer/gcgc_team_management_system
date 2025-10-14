import { UserRole, HierarchyLevel } from '@prisma/client'
import { DefaultSession, DefaultUser } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole
      hierarchyLevel: HierarchyLevel | null
      isAdmin?: boolean
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role: UserRole
    hierarchyLevel: HierarchyLevel | null
    isAdmin?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    hierarchyLevel: HierarchyLevel | null
    isAdmin?: boolean
    accessTokenExpires: number
    refreshTokenExpires: number
    error?: string
  }
}