'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useAuthStore, useThemeStore } from '../../lib/stores'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const { login, loginWithGoogle, isAuthenticated, isLoading } = useAuthStore()
  const { isDarkMode } = useThemeStore()
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
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
    }`}>
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className={`backdrop-blur-xl rounded-3xl p-8 lg:p-10 border shadow-2xl ${
          isDarkMode
            ? 'bg-white/5 text-white border-white/10'
            : 'bg-white/80 text-gray-900 border-gray-200'
        }`}>
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
              <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Welcome back</h2>
              <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Sign in with your institutional account</p>
            </div>

            <button
              onClick={() => router.push('/')}
              className={`inline-flex items-center text-sm font-medium transition ${
                isDarkMode 
                  ? 'text-indigo-300 hover:text-indigo-200' 
                  : 'text-indigo-600 hover:text-indigo-700'
              }`}
            >
              ← Return to homepage
            </button>

            <div className={`rounded-2xl border p-6 space-y-4 ${
              isDarkMode
                ? 'bg-white/5 border-white/10'
                : 'bg-gray-50/50 border-gray-200'
            }`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center justify-center h-10 w-10 rounded-full font-medium ${
                    isDarkMode
                      ? 'bg-indigo-500/30 text-indigo-200'
                      : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    1
                  </span>
                </div>
                <div className="ml-4">
                  <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Google Sign-In</h3>
                  <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Use your @hit.ac.zw Google account for instant access.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center justify-center h-10 w-10 rounded-full font-medium ${
                    isDarkMode
                      ? 'bg-indigo-500/30 text-indigo-200'
                      : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    2
                  </span>
                </div>
                <div className="ml-4">
                  <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Manual Access</h3>
                  <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Prefer passwords? Sign in with your institutional credentials.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`rounded-3xl shadow-2xl p-8 lg:p-10 space-y-6 ${
          isDarkMode
            ? 'bg-gray-800 border border-gray-700'
            : 'bg-white'
        }`}>
          <div>
            <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-slate-900'}`}>Sign in</h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Choose Google SSO or manual credentials.</p>
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
              <div className={`flex-1 border-t ${isDarkMode ? 'border-gray-700' : 'border-slate-200'}`} />
              <span className={`px-4 text-xs uppercase tracking-wide ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>or continue with email</span>
              <div className={`flex-1 border-t ${isDarkMode ? 'border-gray-700' : 'border-slate-200'}`} />
            </div>
          </div>

          {error && (
            <div className={`rounded-xl border p-4 ${
              isDarkMode
                ? 'bg-red-900/20 border-red-800'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>{error}</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
            <div className="space-y-1">
              <label htmlFor="email" className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                Institutional Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`w-full rounded-xl border px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${
                  isDarkMode
                    ? 'border-gray-700 bg-gray-700 text-gray-100 placeholder-gray-400 focus:bg-gray-700 disabled:bg-gray-800'
                    : 'border-slate-200 bg-white text-slate-900 placeholder-gray-400 disabled:bg-slate-100'
                }`}
                placeholder="Enter your HIT-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={`w-full rounded-xl border px-4 py-3 pr-12 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${
                    isDarkMode
                      ? 'border-gray-700 bg-gray-700 text-gray-100 placeholder-gray-400 focus:bg-gray-700 disabled:bg-gray-800'
                      : 'border-slate-200 bg-white text-slate-900 placeholder-gray-400 disabled:bg-slate-100'
                  }`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className={`absolute inset-y-0 right-3 flex items-center text-sm transition ${
                    isDarkMode
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
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

          <div className={`rounded-2xl border p-6 space-y-4 ${
            isDarkMode
              ? 'bg-gray-700/50 border-gray-600'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <h3 className={`text-sm font-semibold tracking-wide uppercase ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Demo Accounts</h3>
              <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                Use these credentials on the manual sign-in form for quick access.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`rounded-xl border p-4 ${
                isDarkMode
                  ? 'bg-indigo-900/30 border-indigo-800'
                  : 'bg-indigo-50 border-indigo-100'
              }`}>
                <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>Admin</h4>
                <p className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-indigo-200' : 'text-indigo-900'}`}>admin@hit.ac.zw</p>
                <p className={`text-xs ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Password: Admin123!</p>
              </div>

              <div className={`rounded-xl border p-4 ${
                isDarkMode
                  ? 'bg-emerald-900/30 border-emerald-800'
                  : 'bg-emerald-50 border-emerald-100'
              }`}>
                <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Student</h4>
                <p className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-emerald-200' : 'text-emerald-900'}`}>john.doe@hit.ac.zw</p>
                <p className={`text-xs ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Password: Student123!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}