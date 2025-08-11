import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        if (!user.isActive) {
          throw new Error('Account is deactivated')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          hierarchyLevel: user.hierarchyLevel,
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.role = user.role
        token.hierarchyLevel = user.hierarchyLevel
        token.id = user.id
        token.image = user.image
      }

      // Always fetch fresh user data on token update/refresh
      if (token.id && (trigger === 'update' || !token.image)) {
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { 
              id: true, 
              name: true, 
              email: true, 
              image: true, 
              role: true, 
              hierarchyLevel: true 
            }
          })
          
          if (freshUser) {
            token.name = freshUser.name
            token.email = freshUser.email
            token.image = freshUser.image
            token.role = freshUser.role
            token.hierarchyLevel = freshUser.hierarchyLevel
          }
        } catch (error) {
          console.error('Error fetching fresh user data:', error)
        }
      }
      
      // Handle OAuth providers
      if (account?.provider === 'google') {
        const existingUser = await prisma.user.findUnique({
          where: { email: token.email! }
        })
        
        if (existingUser) {
          token.role = existingUser.role
          token.hierarchyLevel = existingUser.hierarchyLevel
          token.id = existingUser.id
          token.image = existingUser.image
        } else {
          // Create new user for OAuth
          const newUser = await prisma.user.create({
            data: {
              email: token.email!,
              name: token.name!,
              image: token.picture,
              role: UserRole.MEMBER,
              emailVerified: new Date(),
            }
          })
          token.role = newUser.role
          token.hierarchyLevel = newUser.hierarchyLevel
          token.id = newUser.id
          token.image = newUser.image
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.hierarchyLevel = token.hierarchyLevel as any
        session.user.image = token.image as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      // Log activity
      if (user.id) {
        await prisma.activity.create({
          data: {
            type: 'LOGIN',
            description: `User logged in via ${account?.provider || 'credentials'}`,
            userId: user.id,
          }
        }).catch(console.error)
      }
    }
  },
}