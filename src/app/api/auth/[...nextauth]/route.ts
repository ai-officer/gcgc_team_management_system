import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// Create the NextAuth handler with CORS options
const handler = NextAuth({
  ...authOptions,
  // Add CORS to NextAuth configuration
  cookies: {
    ...authOptions.cookies,
  }
})

export { handler as GET, handler as POST }