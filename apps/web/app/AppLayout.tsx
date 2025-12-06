'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import NotificationsDropdown from '../components/NotificationsDropdown'
import { useAuthStore, useUIStore, useThemeStore, NotificationItem } from '../lib/stores'
import { notificationsAPI } from '../lib/api'
import { useChangePassword } from '../lib/hooks'

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
      hour12: false 
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

const buildDefaultNotifications = (role: 'ADMIN' | 'STUDENT'): NotificationItem[] => {
  const now = Date.now()
  if (role === 'ADMIN') {
    return [
      {
        id: 'admin-1',
        title: 'New project submitted',
        message: 'E-Commerce Platform (Level 4) is ready for evaluation.',
        type: 'info',
        timestamp: new Date(now - 15 * 60 * 1000),
        read: false,
        actionLabel: 'Open queue',
        actionUrl: '/projects',
        audience: 'ADMIN',
        persistent: true,  // Default notifications should persist
      },
      {
        id: 'admin-2',
        title: 'Evaluation deadline approaching',
        message: '3 projects will reach their SLA in the next 24 hours.',
        type: 'warning',
        timestamp: new Date(now - 2 * 60 * 60 * 1000),
        read: false,
        actionLabel: 'Review timeline',
        actionUrl: '/deadlines',
        audience: 'ADMIN',
        persistent: true,
      },
      {
        id: 'admin-3',
        title: 'Analytics update ready',
        message: 'New performance insights are available for January.',
        type: 'success',
        timestamp: new Date(now - 26 * 60 * 60 * 1000),
        read: true,
        actionLabel: 'View analytics',
        actionUrl: '/analytics',
        audience: 'ADMIN',
        persistent: true,
      },
    ]
  }

  return [
    {
      id: 'student-1',
      title: 'Evaluation released',
      message: 'Your Capstone E-Commerce Platform scored 87%.',
      type: 'success',
      timestamp: new Date(now - 30 * 60 * 1000),
      read: false,
      actionLabel: 'View feedback',
      actionUrl: '/dashboard',
      audience: 'STUDENT',
      persistent: true,
    },
    {
      id: 'student-2',
      title: 'Submission reminder',
      message: 'UI/UX documentation is due in 2 days. Upload now to stay on track.',
      type: 'warning',
      timestamp: new Date(now - 3 * 60 * 60 * 1000),
      read: false,
      actionLabel: 'Update submission',
      actionUrl: '/projects',
      audience: 'STUDENT',
      persistent: true,
    },
    {
      id: 'student-3',
      title: 'Message from evaluator',
      message: 'Please confirm the final demo link before Friday.',
      type: 'info',
      timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000),
      read: true,
      actionLabel: 'Go to dashboard',
      actionUrl: '/dashboard',
      audience: 'STUDENT',
      persistent: true,
    },
  ]
}

// Account Management Menu Item Component
function AccountManagementMenuItem({ 
  onClose, 
  onOpenModal 
}: { 
  onClose: () => void
  onOpenModal: () => void 
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleOpenModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    // Close dropdown first
    onClose()
    // Then open modal after a brief delay to ensure dropdown closes
    setTimeout(() => {
      onOpenModal()
    }, 50)
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onMouseDown={(e) => {
        // Prevent dropdown from closing when clicking this button
        e.stopPropagation()
      }}
      onClick={handleOpenModal}
      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
    >
      <svg className="mr-3 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      Account Settings
    </button>
  )
}

// Account Management Modal Component
function AccountManagementModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean
  onClose: () => void 
}) {
  const { user } = useAuthStore()
  const { addNotification } = useUIStore()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const changePasswordMutation = useChangePassword()

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      addNotification('Please fill in all password fields', 'error', { title: 'Validation Error', userId: user?.id })
      return
    }

    if (newPassword.length < 6) {
      addNotification('New password must be at least 6 characters long', 'error', { title: 'Validation Error', userId: user?.id })
      return
    }

    if (newPassword !== confirmPassword) {
      addNotification('New passwords do not match', 'error', { title: 'Validation Error', userId: user?.id })
      return
    }

    try {
      await changePasswordMutation.mutateAsync({ currentPassword, newPassword })
      addNotification('Password changed successfully!', 'success', { title: 'Success', userId: user?.id })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to change password'
      addNotification(errorMessage, 'error', { title: 'Error', userId: user?.id })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Management</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Account Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Account Information</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                <div className="mt-1 text-base text-gray-900 dark:text-white">{user?.name}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                <div className="mt-1 text-base text-gray-900 dark:text-white">{user?.email}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</label>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Password Change */}
          {!user?.is_oauth_user && (
            <div className="space-y-4 border-t border-gray-200 dark:border-gray-800 pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h3>
                <button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {showPasswordForm ? 'Cancel' : 'Change Password'}
                </button>
              </div>

              {showPasswordForm && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter new password (min. 6 characters)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <button
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              )}
            </div>
          )}

          {user?.is_oauth_user && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  You signed in with Google. Password changes are managed through your Google account.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isAuthenticated, logout, checkAuth } = useAuthStore()
  const {
    sidebarExpanded,
    settingsMenuOpen,
    toggleSidebar,
    toggleSettingsMenu,
    notifications,
    setNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    fetchNotifications,
    syncNotifications,
  } = useUIStore()
  const { isDarkMode, toggleDarkMode } = useThemeStore()
  const isAdmin = user?.role === 'ADMIN'

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement | null>(null)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const lastRoleRef = useRef<'ADMIN' | 'STUDENT' | null>(null)
  const lastUserIdRef = useRef<number | null>(null)

  // Wrapper function to auto-expand sidebar when clicking Settings
  const handleSettingsToggle = () => {
    if (!sidebarExpanded) {
      toggleSidebar()
    }
    toggleSettingsMenu()
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      checkAuth()
    }
  }, [checkAuth])

  useEffect(() => {
    if (!isAuthenticated && pathname !== '/login') {
      router.push('/login')
    }
  }, [isAuthenticated, pathname, router])

  // Close user menu when clicking outside
  useEffect(() => {
    if (!userMenuOpen) return
    
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current) {
        const target = event.target as HTMLElement
        // Check if click is on Account Settings button - if so, don't close
        const isAccountSettingsButton = target.closest('button')?.textContent?.trim().includes('Account Settings')
        // Check if click is outside the dropdown menu
        if (!userMenuRef.current.contains(target) && !isAccountSettingsButton) {
          setUserMenuOpen(false)
        }
      }
    }
    
    // Use a longer delay to ensure button clicks process first
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 100)
    
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [userMenuOpen])

  useEffect(() => {
    if (!user) {
      // Clear notifications and reset refs when user logs out
      setNotifications([])
      lastRoleRef.current = null
      lastUserIdRef.current = null
      return
    }

    const roleChanged = lastRoleRef.current !== user.role
    const userChanged = lastUserIdRef.current !== user.id
    const isInitialLoad = lastRoleRef.current === null || lastUserIdRef.current === null
    
    // Fetch real notifications from API on initial load, user change, or role change
    if (roleChanged || userChanged || isInitialLoad) {
      fetchNotifications().catch(() => {
        // Fallback to mock notifications if API fails
        const defaultNotifications = buildDefaultNotifications(user.role)
        setNotifications(defaultNotifications)
      })
      
      lastRoleRef.current = user.role
      lastUserIdRef.current = user.id
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setNotifications, user, fetchNotifications])  // Only depend on user changes, not notifications changes

  // Poll for notification updates every 30 seconds
  useEffect(() => {
    if (!user || !isAuthenticated) return

    // Initial sync
    syncNotifications()

    // Poll for updates every 30 seconds
    const intervalId = setInterval(() => {
      syncNotifications()
    }, 30000)

    return () => clearInterval(intervalId)
  }, [user, isAuthenticated, syncNotifications])

  useEffect(() => {
    if (!notificationsOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [notificationsOpen])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const handleNotificationSelect = async (notification: NotificationItem) => {
    // Mark as read in API if it's a persistent notification
    if (notification.persistent) {
      try {
        await notificationsAPI.markAsRead(notification.id)
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }
    
    markNotificationRead(notification.id)
    setNotificationsOpen(false)
    
    // If this is an evaluation-related notification, invalidate student dashboard queries
    // to ensure the student sees the updated evaluation data immediately
    if (notification.title?.includes('Evaluation') || notification.message?.includes('evaluated')) {
      // Invalidate student dashboard and project queries to force refetch
      queryClient.invalidateQueries({ queryKey: ['students', 'me', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['students', 'me', 'projects'] })
      
      // Also dispatch event for StudentDashboard component to listen to
      if (notification.actionUrl?.includes('/dashboard')) {
        setTimeout(() => {
          window.dispatchEvent(new Event('dashboard-refresh'))
        }, 100)
      }
    }
    
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const handleMarkVisibleNotificationsRead = async () => {
    // Mark all persistent notifications as read in API
    const persistentUnread = scopedNotifications.filter(
      n => !n.read && n.persistent
    )
    
    if (persistentUnread.length > 0) {
      try {
        await notificationsAPI.markAllAsRead()
      } catch (error) {
        console.error('Failed to mark all notifications as read:', error)
      }
    }
    
    scopedNotifications.forEach((notification) => {
      if (!notification.read) {
        markNotificationRead(notification.id)
      }
    })
    setNotificationsOpen(false)
  }

  const scopedNotifications = useMemo(() => {
    if (!user?.role) return []
    return notifications.filter((notification) => {
      // If notification has a specific userId, only show it to that user
      if (notification.userId !== undefined) {
        return notification.userId === user.id
      }
      
      // Otherwise, filter by audience/role
      const audience = notification.audience || 'ALL'
      if (audience === 'ALL') return true
      return audience === user.role
    })
  }, [notifications, user?.role, user?.id])

  const unreadNotificationCount = scopedNotifications.filter((notification) => !notification.read).length

  // Allow direct access to pages without login
  if (pathname === '/login') {
    // Auto-redirect to dashboard
    return <>{children}</>
  }

  if (!isAuthenticated) {
    return null
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
              {isAdmin && (
                <button 
                  onClick={toggleSidebar}
                  className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
                >
                  <span className="sr-only">Open sidebar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              
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
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setNotificationsOpen((prev) => !prev)
                  }}
                  className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-h-[1.25rem] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
                      {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <NotificationsDropdown
                    notifications={scopedNotifications}
                    onSelect={handleNotificationSelect}
                    onMarkAllRead={handleMarkVisibleNotificationsRead}
                  />
                )}
              </div>
                
                {/* User profile with dropdown menu */}
              <div className="relative" ref={userMenuRef}>
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
                    onMouseDown={(e) => {
                      // Only stop propagation if not clicking a button
                      if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                        e.stopPropagation()
                      }
                    }}
                  >
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
                <AccountManagementMenuItem 
                  onClose={() => setUserMenuOpen(false)} 
                  onOpenModal={() => setAccountModalOpen(true)}
                />
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
        {isAdmin && (
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
              <Link 
                href="/projects" 
                className={`group flex items-center ${sidebarExpanded ? 'px-3 py-2.5' : 'px-2 py-2 justify-center'} text-sm font-medium rounded-lg transition-all mt-2 ${
                  pathname?.startsWith('/projects') 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <svg className={`${sidebarExpanded ? 'mr-3' : ''} h-6 w-6 ${pathname?.startsWith('/projects') ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {sidebarExpanded && 'Projects'}
              </Link>

              {/* 3. Deadlines */}
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

              {/* 6. Reports */}
              <Link 
                href="/reports" 
                className={`group flex items-center ${sidebarExpanded ? 'px-3 py-2.5' : 'px-2 py-2 justify-center'} text-sm font-medium rounded-lg transition-all mt-2 ${
                  pathname === '/reports' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <svg className={`${sidebarExpanded ? 'mr-3' : ''} h-6 w-6 ${pathname === '/reports' ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 5h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z" />
                </svg>
                {sidebarExpanded && 'Reports'}
              </Link>

              {/* 7. Settings */}
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
                    <Link 
                      href="/grade-classification" 
                      className={`block px-3 py-1.5 text-sm rounded-md transition-all ${
                        pathname === '/grade-classification'
                          ? 'bg-blue-600/20 text-blue-700 dark:text-blue-400 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      Grade Classification
                    </Link>
                  </div>
                )}
                </div>
              </nav>
                  
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>

      {/* Account Management Modal */}
      <AccountManagementModal 
        isOpen={accountModalOpen} 
        onClose={() => setAccountModalOpen(false)} 
      />
    </div>
  )
}
