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
        } as any
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events'
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days (session cookie expiry)
  },
  jwt: {
    maxAge: 60 * 60, // 1 hour (access token expiry)
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      // Initial login - set token data
      if (user) {
        token.role = user.role
        token.hierarchyLevel = user.hierarchyLevel
        token.id = user.id
        token.image = user.image
        token.accessTokenExpires = Date.now() + 60 * 60 * 1000 // 1 hour
        token.refreshTokenExpires = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days

        // Store Google Calendar tokens if available
        if (account?.provider === 'google' && account.access_token) {
          try {
            await prisma.calendarSyncSettings.upsert({
              where: { userId: user.id },
              update: {
                googleAccessToken: account.access_token,
                googleRefreshToken: account.refresh_token || undefined,
                googleTokenExpiry: account.expires_at ? new Date(account.expires_at * 1000) : undefined,
                isEnabled: true,
              },
              create: {
                userId: user.id,
                googleAccessToken: account.access_token,
                googleRefreshToken: account.refresh_token || undefined,
                googleTokenExpiry: account.expires_at ? new Date(account.expires_at * 1000) : undefined,
                isEnabled: true,
              }
            })
          } catch (error) {
            console.error('Error storing Google Calendar tokens:', error)
          }
        }
      }

      // Return previous token if access token has not expired
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token
      }

      // Access token has expired, check if refresh token is still valid
      if (Date.now() < (token.refreshTokenExpires as number)) {
        // Refresh the token - fetch fresh user data
        if (token.id) {
          try {
            const freshUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { 
                id: true, 
                name: true, 
                email: true, 
                image: true, 
                role: true, 
                hierarchyLevel: true,
                isActive: true
              }
            })
            
            if (freshUser && freshUser.isActive) {
              // User is still active, refresh the access token
              return {
                ...token,
                name: freshUser.name,
                email: freshUser.email,
                image: freshUser.image,
                role: freshUser.role,
                hierarchyLevel: freshUser.hierarchyLevel,
                accessTokenExpires: Date.now() + 60 * 60 * 1000, // New 1 hour expiry
                refreshTokenExpires: Date.now() + 30 * 24 * 60 * 60 * 1000, // Reset refresh token to 30 days
              }
            } else {
              // User is deactivated or doesn't exist
              throw new Error('User account is deactivated or not found')
            }
          } catch (error) {
            console.error('Error refreshing token:', error)
            // Return error to force sign out
            return {
              ...token,
              error: 'RefreshAccessTokenError',
            }
          }
        }
      }

      // Refresh token has expired, force sign out
      return {
        ...token,
        error: 'RefreshAccessTokenError',
      }
    },
    async session({ session, token }) {
      if (token) {
        // Check for token refresh errors
        if (token.error === 'RefreshAccessTokenError') {
          // Force sign out by returning null session
          throw new Error('Token refresh failed')
        }
        
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
    async signIn({ user, account }) {
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