'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore, useUIStore, useThemeStore } from '../lib/stores'

// Live Date and Time Component
const LiveDateTime = () => {
  // Avoid SSR/client mismatch by rendering only after mount
  const [mounted, setMounted] = useState(false)
  const [dateTime, setDateTime] = useState<Date | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    setDateTime(new Date())
    const timer = setInterval(() => {
      setDateTime(new Date())
    }, 1000) // Update every second

    return () => clearInterval(timer)
  }, [mounted])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    })
  }
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  // During SSR (before mount), render a stable placeholder to avoid mismatches
  if (!mounted || !dateTime) {
    return (
      <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
        <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-right">
          <div className="text-sm font-bold text-blue-900 dark:text-blue-100">--:--:--</div>
          <div className="text-xs text-blue-600 dark:text-blue-400">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
      <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="text-right">
        <div className="text-sm font-bold text-blue-900 dark:text-blue-100">{formatTime(dateTime)}</div>
        <div className="text-xs text-blue-600 dark:text-blue-400">{formatDate(dateTime)}</div>
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, logout, checkAuth } = useAuthStore()
  const {
    sidebarExpanded,
    projectsMenuOpen,
    settingsMenuOpen,
    toggleSidebar,
    toggleProjectsMenu,
    toggleSettingsMenu,
  } = useUIStore()
  const { isDarkMode, toggleDarkMode } = useThemeStore()

  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Wrapper functions to auto-expand sidebar when clicking Projects or Settings
  const handleProjectsToggle = () => {
    if (!sidebarExpanded) {
      toggleSidebar()
    }
    toggleProjectsMenu()
  }

  const handleSettingsToggle = () => {
    if (!sidebarExpanded) {
      toggleSidebar()
    }
    toggleSettingsMenu()
  }

  useEffect(() => {
    // Only run auth check on client side
    if (typeof window !== 'undefined') {
      checkAuth()
      
      // TEMPORARILY: Auto-login with default admin user if not authenticated
      if (!isAuthenticated) {
        const defaultUser = {
          id: 1,
          name: 'System Administrator',
          email: 'admin@hit.ac.zw',
          role: 'ADMIN' as const,
          created_at: new Date().toISOString()
        }
        localStorage.setItem('user', JSON.stringify(defaultUser))
        localStorage.setItem('accessToken', 'temp-token-bypass')
        checkAuth()
      }
    }
  }, [checkAuth, isAuthenticated])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen) {
        setUserMenuOpen(false)
      }
    }
    
    if (userMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [userMenuOpen])

  // TEMPORARILY DISABLED: Authentication bypass
  // useEffect(() => {
  //   if (!isAuthenticated && pathname !== '/login') {
  //     router.push('/login')
  //   }
  // }, [isAuthenticated, pathname, router])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  // TEMPORARILY DISABLED: Authentication check
  // if (!isAuthenticated && pathname !== '/login') {
  //   return null // Will redirect to login
  // }

  // Allow direct access to pages without login
  if (pathname === '/login') {
    // Auto-redirect to dashboard
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Modern Top Navigation */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Hamburger, Logo and Title */}
            <div className="flex items-center space-x-4">
              {/* Modern hamburger button */}
              <button 
                onClick={toggleSidebar}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
              >
                <span className="sr-only">Open sidebar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* HIT Logo */}
              <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">HIT</span>
              </div>
              
              {/* Modern Title with gradient */}
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hidden md:block">
                Project Evaluation System
              </h1>
            </div>
            
            {/* Center - Live Date and Time */}
            <div className="flex-1 flex items-center justify-center hidden lg:flex">
              <LiveDateTime />
            </div>
            
            {/* Right side - Dark Mode, Notifications and User */}
            <div className="flex items-center space-x-3">
              {/* Dark Mode Toggle */}
              <button 
                onClick={toggleDarkMode}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
              >
                {isDarkMode ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Notification Bell with modern design */}
              <button className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                </button>
                
                {/* User profile with dropdown menu */}
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setUserMenuOpen(!userMenuOpen)
                  }}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border border-blue-100 dark:border-gray-600 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="text-right hidden md:block">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user?.name}</div>
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400">{user?.role}</div>
                  </div>
                  <svg className={`h-4 w-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
                <button 
                  onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                      <svg className="mr-3 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                      Logout
                </button>
              </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Modern Sidebar */}
        <div className={`${sidebarExpanded ? 'w-64' : 'w-16'} bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-xl transition-all duration-300 ease-in-out border-r border-gray-100 dark:border-gray-700`}>
          <div className="h-screen flex flex-col pt-9">
            <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
              {/* 1. Dashboard */}
              <Link 
                href="/dashboard" 
                className={`group flex items-center ${sidebarExpanded ? 'px-3 py-2.5' : 'px-2 py-2 justify-center'} text-sm font-medium rounded-lg transition-all ${
                  pathname === '/dashboard' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <svg className={`${sidebarExpanded ? 'mr-3' : ''} h-6 w-6 ${pathname === '/dashboard' ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {sidebarExpanded && 'Dashboard'}
              </Link>

              {/* 2. Projects */}
              <div className="space-y-1 mt-2">
                <button
                  onClick={handleProjectsToggle}
                  className={`group flex items-center ${sidebarExpanded ? 'px-3 py-2.5' : 'px-2 py-2 justify-center'} text-sm font-medium rounded-lg w-full transition-all ${
                    pathname?.startsWith('/projects')
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <svg className={`${sidebarExpanded ? 'mr-3' : ''} h-6 w-6 ${
                    pathname?.startsWith('/projects')
                      ? 'text-white'
                      : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {sidebarExpanded && (
                    <>
                      <span>Projects</span>
                      <svg className={`ml-auto h-4 w-4 ${
                        pathname?.startsWith('/projects')
                          ? 'text-white'
                          : 'text-gray-400 dark:text-gray-500'
                      } transition-transform ${projectsMenuOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
                
                {projectsMenuOpen && sidebarExpanded && (
                  <div className="ml-3 space-y-1">
                    <Link 
                      href="/projects" 
                      className={`block px-3 py-1.5 text-sm rounded-md transition-all ${
                        pathname === '/projects'
                          ? 'bg-blue-600/20 text-blue-700 dark:text-blue-400 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      All Projects
                    </Link>
                    <Link 
                      href="/projects/pending" 
                      className={`block px-3 py-1.5 text-sm rounded-md transition-all ${
                        pathname === '/projects/pending'
                          ? 'bg-blue-600/20 text-blue-700 dark:text-blue-400 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      Pending
                    </Link>
                    <Link 
                      href="/projects/evaluated" 
                      className={`block px-3 py-1.5 text-sm rounded-md transition-all ${
                        pathname === '/projects/evaluated'
                          ? 'bg-blue-600/20 text-blue-700 dark:text-blue-400 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      Evaluated
                    </Link>
                  </div>
                )}
              </div>

              {/* 3. Evaluation */}
              <Link 
                href="/evaluation" 
                className={`group flex items-center ${sidebarExpanded ? 'px-3 py-2.5' : 'px-2 py-2 justify-center'} text-sm font-medium rounded-lg transition-all mt-2 ${
                  pathname === '/evaluation' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <svg className={`${sidebarExpanded ? 'mr-3' : ''} h-6 w-6 ${pathname === '/evaluation' ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {sidebarExpanded && 'New Evaluation'}
              </Link>

              {/* 4. Deadlines */}
              <Link 
                href="/deadlines" 
                className={`group flex items-center ${sidebarExpanded ? 'px-3 py-2.5' : 'px-2 py-2 justify-center'} text-sm font-medium rounded-lg transition-all mt-2 ${
                  pathname === '/deadlines' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <svg className={`${sidebarExpanded ? 'mr-3' : ''} h-6 w-6 ${pathname === '/deadlines' ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {sidebarExpanded && 'Deadlines'}
              </Link>

              {/* 5. Analytics */}
              <Link 
                href="/analytics" 
                className={`group flex items-center ${sidebarExpanded ? 'px-3 py-2.5' : 'px-2 py-2 justify-center'} text-sm font-medium rounded-lg transition-all mt-2 ${
                  pathname === '/analytics' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <svg className={`${sidebarExpanded ? 'mr-3' : ''} h-6 w-6 ${pathname === '/analytics' ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {sidebarExpanded && 'Analytics'}
              </Link>

              {/* 6. Settings */}
              <div className="space-y-1 mt-2">
                <button
                  onClick={handleSettingsToggle}
                  className={`group flex items-center ${sidebarExpanded ? 'px-3 py-2.5' : 'px-2 py-2 justify-center'} text-sm font-medium rounded-lg w-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all`}
                >
                  <svg className={`${sidebarExpanded ? 'mr-3' : ''} h-6 w-6 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {sidebarExpanded && (
                    <>
                      <span>Settings</span>
                      <svg className={`ml-auto h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${settingsMenuOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
                
                {settingsMenuOpen && sidebarExpanded && (
                  <div className="ml-3 space-y-1">
                    <Link 
                      href="/users" 
                      className={`block px-3 py-1.5 text-sm rounded-md transition-all ${
                        pathname === '/users'
                          ? 'bg-blue-600/20 text-blue-700 dark:text-blue-400 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      User Management
                    </Link>
                    <Link 
                      href="/study-programs" 
                      className={`block px-3 py-1.5 text-sm rounded-md transition-all ${
                        pathname === '/study-programs'
                          ? 'bg-blue-600/20 text-blue-700 dark:text-blue-400 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      Study Program Management
                    </Link>
                  </div>
                )}
              </div>
                </nav>
                
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
