'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '../lib/stores'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    // Redirect based on authentication status
    if (isAuthenticated) {
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [router, isAuthenticated, mounted])

  if (!mounted) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h1>HIT Project Evaluation System</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <h1>HIT Project Evaluation System</h1>
      <p>Redirecting...</p>
    </div>
  )
}

