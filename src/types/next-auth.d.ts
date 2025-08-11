import { UserRole } from '@prisma/client'
import { DefaultSession, DefaultUser } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role?: UserRole
      hierarchyLevel?: number
      isAdmin?: boolean
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role?: UserRole
    hierarchyLevel?: number
    isAdmin?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role?: UserRole
    hierarchyLevel?: number
    isAdmin?: boolean
  }
}