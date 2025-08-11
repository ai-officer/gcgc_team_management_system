import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ConditionalAuthProvider } from '@/providers/session-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GCGC Team Management System',
  description: 'Comprehensive team management system with dual portals for leaders and members',
  keywords: ['team management', 'task tracking', 'calendar', 'productivity'],
  authors: [{ name: 'GCGC Development Team' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ConditionalAuthProvider>
            {children}
            <Toaster />
          </ConditionalAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}