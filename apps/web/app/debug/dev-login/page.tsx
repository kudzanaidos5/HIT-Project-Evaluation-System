'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '../../../lib/api'

export default function DevLoginPage() {
  const router = useRouter()
  const [message, setMessage] = useState('Initializing…')

  useEffect(() => {
    const enabled = process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true'
    if (!enabled) {
      setMessage('Dev login is disabled. Set NEXT_PUBLIC_ENABLE_DEV_LOGIN=true to enable.')
      return
    }

    const run = async () => {
      try {
        setMessage('Logging in as admin@hit.ac.zw …')
        await authAPI.login('admin@hit.ac.zw', 'Admin123!')
        setMessage('Success. Redirecting…')
        router.replace('/dashboard')
      } catch (e) {
        console.error(e)
        setMessage('Login failed. Ensure backend is running and seeded.')
      }
    }
    run()
  }, [router])

  return (
    <div className="p-6">
      <div className="text-sm text-gray-700">{message}</div>
    </div>
  )
}


