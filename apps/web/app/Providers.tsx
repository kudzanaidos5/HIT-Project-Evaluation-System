'use client'

import React, { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useThemeStore } from '../lib/stores'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

function DarkModeInitializer() {
  const { isDarkMode } = useThemeStore()
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('darkMode')
      const isDark = stored === 'true' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', isDark)
    }
  }, [isDarkMode])
  
  return null
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  if (!clientId) {
    console.warn('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Google sign-in will be disabled.')
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DarkModeInitializer />
      {clientId ? (
        <GoogleOAuthProvider clientId={clientId}>
          {children}
        </GoogleOAuthProvider>
      ) : (
        children
      )}
    </QueryClientProvider>
  )
}
