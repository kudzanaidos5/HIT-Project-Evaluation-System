'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClearAuthPage() {
  const router = useRouter()

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
      }
    } finally {
      router.replace('/login')
    }
  }, [router])

  return (
    <div className="p-6">
      <div className="text-sm text-gray-500">Clearing auth tokens…</div>
    </div>
  )
}


