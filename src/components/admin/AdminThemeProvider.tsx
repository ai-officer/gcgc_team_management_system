'use client'

import { useTheme } from 'next-themes'
import { useEffect } from 'react'

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const { setTheme, theme } = useTheme()

  useEffect(() => {
    // Force light theme for admin pages
    if (theme !== 'light') {
      setTheme('light')
    }
  }, [theme, setTheme])

  return <>{children}</>
}