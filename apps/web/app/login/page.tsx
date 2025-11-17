'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useAuthStore } from '../../lib/stores'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@hit.ac.zw')
  const [password, setPassword] = useState('Admin123!')
  const [error, setError] = useState('')
  const router = useRouter()
  const { login, loginWithGoogle, isAuthenticated, isLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Enforce institutional email domain on the client for fast feedback
    const allowedDomain = '@hit.ac.zw'
    if (!email.toLowerCase().endsWith(allowedDomain)) {
      setError(`Only ${allowedDomain} emails are allowed`)
      return
    }

    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.')
    }
  }

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setError('Google sign-in failed. Please try again.')
      return
    }

    try {
      await loginWithGoogle(response.credential)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.')
    }
  }

  const handleGoogleError = () => {
    setError('Google sign-in failed. Please try again.')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 lg:p-10 text-white border border-white/10 shadow-2xl">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-400/30">
              <span className="text-2xl font-bold text-indigo-300">HIT</span>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Project Evaluation System</h1>
              <p className="text-sm text-slate-300">Modern evaluations with institutional security</p>
            </div>
          </div>

          <div className="mt-10 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white">Welcome back</h2>
              <p className="text-sm text-slate-300">Sign in with your institutional account</p>
            </div>

            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center text-sm font-medium text-indigo-300 hover:text-indigo-200 transition"
            >
              ← Return to homepage
            </button>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-indigo-500/30 text-indigo-200 font-medium">
                    1
                  </span>
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-semibold text-white">Google Sign-In</h3>
                  <p className="mt-1 text-sm text-slate-300">Use your @hit.ac.zw Google account for instant access.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-indigo-500/30 text-indigo-200 font-medium">
                    2
                  </span>
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-semibold text-white">Manual Access</h3>
                  <p className="mt-1 text-sm text-slate-300">Prefer passwords? Sign in with your institutional credentials.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-10 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
            <p className="text-sm text-slate-500 mt-1">Choose Google SSO or manual credentials.</p>
          </div>

          <div className="space-y-4">
            {googleClientId ? (
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
            ) : (
              <button
                type="button"
                disabled
                className="w-full inline-flex items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 py-3 text-slate-500 bg-slate-100 cursor-not-allowed"
              >
                Google sign-in unavailable
              </button>
            )}
            <div className="flex items-center">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-4 text-xs uppercase tracking-wide text-slate-400">or continue with email</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Institutional Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:bg-slate-100"
                placeholder="you@hit.ac.zw"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:bg-slate-100"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-sm text-slate-500 hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 shadow-lg shadow-indigo-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign in with email'
              )}
            </button>
          </form>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 tracking-wide uppercase">Demo Accounts</h3>
              <p className="mt-1 text-xs text-slate-500">
                Use these credentials on the manual sign-in form for quick access.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
                <h4 className="text-sm font-semibold text-indigo-700">Admin</h4>
                <p className="mt-2 text-sm text-indigo-900 font-medium">admin@hit.ac.zw</p>
                <p className="text-xs text-indigo-600">Password: Admin123!</p>
              </div>

              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                <h4 className="text-sm font-semibold text-emerald-700">Student</h4>
                <p className="mt-2 text-sm text-emerald-900 font-medium">john.doe@hit.ac.zw</p>
                <p className="text-xs text-emerald-600">Password: Student123!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}