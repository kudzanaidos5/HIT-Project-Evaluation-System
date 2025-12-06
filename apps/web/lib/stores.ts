import { create } from 'zustand'
import { authAPI, getTokens, clearTokens, notificationsAPI } from './api'

export type NotificationType = 'success' | 'error' | 'info' | 'warning'
export type NotificationAudience = 'ADMIN' | 'STUDENT' | 'ALL'

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: NotificationType
  timestamp: Date
  read: boolean
  actionLabel?: string
  actionUrl?: string
  audience?: NotificationAudience
  userId?: number  // Optional: if set, only this user will see the notification
  persistent?: boolean  // If true, notification won't auto-remove. Defaults to false.
}

export interface User {
  id: number
  name: string
  email: string
  role: 'ADMIN' | 'STUDENT'
  is_oauth_user: boolean
  created_at: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  checkAuth: () => Promise<void>
}

export interface UIState {
  sidebarExpanded: boolean
  projectsMenuOpen: boolean
  settingsMenuOpen: boolean
  evaluationModalOpen: boolean
  selectedProject: any | null
  notifications: NotificationItem[]
  notificationTimeouts: Map<string, NodeJS.Timeout>  // Store timeout IDs for cleanup
  toggleSidebar: () => void
  toggleProjectsMenu: () => void
  toggleSettingsMenu: () => void
  openEvaluationModal: (project: any) => void
  closeEvaluationModal: () => void
  setNotifications: (notifications: NotificationItem[]) => void
  addNotification: (
    message: string,
    type: NotificationType,
    options?: {
      title?: string
      actionLabel?: string
      actionUrl?: string
      audience?: NotificationAudience
      userId?: number
      persistent?: boolean  // If true, notification won't auto-remove
      autoRemoveDelay?: number  // Custom auto-remove delay in ms (default: 5000)
    }
  ) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  removeNotification: (id: string) => void
  clearAllNotificationTimeouts: () => void
  fetchNotifications: () => Promise<void>
  syncNotifications: () => Promise<void>
}

export interface ThemeState {
  isDarkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (isDark: boolean) => void
}

// Auth Store
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const { user } = await authAPI.login(email, password)
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: any) {
      set({ isLoading: false })
      throw new Error(error.response?.data?.error?.message || 'Login failed')
    }
  },

  loginWithGoogle: async (credential: string) => {
    set({ isLoading: true })
    try {
      const { user } = await authAPI.loginWithGoogle(credential)
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: any) {
      set({ isLoading: false })
      throw new Error(error.response?.data?.error?.message || 'Google sign-in failed')
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },

  setUser: (user: User | null) => {
    set({
      user,
      isAuthenticated: !!user,
    })
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  checkAuth: async () => {
    if (typeof window === 'undefined') return

    set({ isLoading: true })
    try {
      const { accessToken } = getTokens()

      if (!accessToken) {
        clearTokens()
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }

      const user = await authAPI.getCurrentUser()
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user))
      }
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error) {
      console.error('Auth check failed:', error)
      clearTokens()
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))

// Helper function to generate unique notification IDs
const generateNotificationId = (): string => {
  // Use crypto.randomUUID if available, otherwise fall back to timestamp + random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback: timestamp + random number to prevent collisions
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

// UI Store
export const useUIStore = create<UIState>((set, get) => ({
  sidebarExpanded: false,
  projectsMenuOpen: false,
  settingsMenuOpen: false,
  evaluationModalOpen: false,
  selectedProject: null,
  notifications: [],
  notificationTimeouts: new Map<string, NodeJS.Timeout>(),

  toggleSidebar: () => {
    set((state) => ({ sidebarExpanded: !state.sidebarExpanded }))
  },

  toggleProjectsMenu: () => {
    set((state) => ({ projectsMenuOpen: !state.projectsMenuOpen }))
  },

  toggleSettingsMenu: () => {
    set((state) => ({ settingsMenuOpen: !state.settingsMenuOpen }))
  },

  openEvaluationModal: (project: any) => {
    set({
      evaluationModalOpen: true,
      selectedProject: project,
    })
  },

  closeEvaluationModal: () => {
    set({
      evaluationModalOpen: false,
      selectedProject: null,
    })
  },

  setNotifications: (notifications: NotificationItem[]) => {
    // Clear timeouts for notifications that are being removed
    const currentNotifications = get().notifications
    const currentTimeouts = get().notificationTimeouts
    const newNotificationIds = new Set(notifications.map(n => n.id))
    const removedIds = currentNotifications
      .filter(n => !newNotificationIds.has(n.id))
      .map(n => n.id)

    // Clear timeouts and update the Map
    const newTimeouts = new Map(currentTimeouts)
    removedIds.forEach(id => {
      const timeout = newTimeouts.get(id)
      if (timeout) {
        clearTimeout(timeout)
        newTimeouts.delete(id)
      }
    })

    set({ notifications, notificationTimeouts: newTimeouts })
  },

  addNotification: (
    message: string,
    type: NotificationType,
    options?: {
      title?: string
      actionLabel?: string
      actionUrl?: string
      audience?: NotificationAudience
      userId?: number
      persistent?: boolean
      autoRemoveDelay?: number
    }
  ) => {
    const notification: NotificationItem = {
      id: generateNotificationId(),
      title: options?.title || 'System Update',
      message,
      type,
      timestamp: new Date(),
      read: false,
      actionLabel: options?.actionLabel,
      actionUrl: options?.actionUrl,
      audience: options?.audience || 'ALL',
      userId: options?.userId,
      persistent: options?.persistent ?? false,
    }

    set((state) => ({
      notifications: [...state.notifications, notification],
    }))

    // Only auto-remove if notification is not persistent
    if (!notification.persistent) {
      const delay = options?.autoRemoveDelay ?? 5000
      const timeoutId = setTimeout(() => {
        get().removeNotification(notification.id)
      }, delay)

      // Store timeout ID for cleanup
      set((state) => {
        const newTimeouts = new Map(state.notificationTimeouts)
        newTimeouts.set(notification.id, timeoutId)
        return { notificationTimeouts: newTimeouts }
      })
    }
  },

  removeNotification: (id: string) => {
    // Clear timeout if it exists
    const timeout = get().notificationTimeouts.get(id)
    if (timeout) {
      clearTimeout(timeout)
      set((state) => {
        const newTimeouts = new Map(state.notificationTimeouts)
        newTimeouts.delete(id)
        return {
          notifications: state.notifications.filter((n) => n.id !== id),
          notificationTimeouts: newTimeouts
        }
      })
    } else {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }))
    }
  },

  markNotificationRead: (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      ),
    }))
  },

  markAllNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    }))
  },

  clearAllNotificationTimeouts: () => {
    const timeouts = get().notificationTimeouts
    timeouts.forEach((timeout) => clearTimeout(timeout))
    set({ notificationTimeouts: new Map() })
  },

  fetchNotifications: async () => {
    try {
      const response = await notificationsAPI.getAll()
      const apiNotifications = response.notifications || []

      // Convert API notifications to NotificationItem format
      const notifications: NotificationItem[] = apiNotifications.map((n: any) => {
        // Transform old student notification URLs from /projects/{id} to /dashboard#evaluation
        let actionUrl = n.actionUrl
        if (actionUrl && (n.userId || n.audience === 'STUDENT')) {
          // Check if it's an old project URL pattern
          const projectUrlMatch = actionUrl.match(/^\/projects\/(\d+)$/)
          if (projectUrlMatch) {
            // Transform to dashboard based on notification type
            if (n.title?.includes('Evaluation') || n.message?.includes('evaluated')) {
              actionUrl = '/dashboard#evaluation'
            } else if (n.title?.includes('Approved')) {
              actionUrl = '/dashboard#submissions'
            } else {
              actionUrl = '/dashboard'
            }
          }
        }

        return {
          id: String(n.id),
          title: n.title,
          message: n.message,
          type: n.type,
          timestamp: new Date(n.timestamp),
          read: n.read,
          actionLabel: n.actionLabel,
          actionUrl: actionUrl,
          audience: n.audience,
          userId: n.userId,
          persistent: true,  // API notifications are persistent
        }
      })

      set({ notifications })
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      // Don't throw - allow fallback to mock notifications
    }
  },

  syncNotifications: async () => {
    try {
      const response = await notificationsAPI.getAll()
      const apiNotifications = response.notifications || []

      // Convert API notifications to NotificationItem format
      const newNotifications: NotificationItem[] = apiNotifications.map((n: any) => {
        // Transform old student notification URLs from /projects/{id} to /dashboard#evaluation
        let actionUrl = n.actionUrl
        if (actionUrl && (n.userId || n.audience === 'STUDENT')) {
          // Check if it's an old project URL pattern
          const projectUrlMatch = actionUrl.match(/^\/projects\/(\d+)$/)
          if (projectUrlMatch) {
            // Transform to dashboard based on notification type
            if (n.title?.includes('Evaluation') || n.message?.includes('evaluated')) {
              actionUrl = '/dashboard#evaluation'
            } else if (n.title?.includes('Approved')) {
              actionUrl = '/dashboard#submissions'
            } else {
              actionUrl = '/dashboard'
            }
          }
        }

        return {
          id: String(n.id),
          title: n.title,
          message: n.message,
          type: n.type,
          timestamp: new Date(n.timestamp),
          read: n.read,
          actionLabel: n.actionLabel,
          actionUrl: actionUrl,
          audience: n.audience,
          userId: n.userId,
          persistent: true,  // API notifications are persistent
        }
      })

      // Merge with existing notifications
      // Strategy: 
      // 1. Use API notifications as source of truth for persistent notifications
      // 2. Keep temporary (non-persistent) notifications that aren't in API
      // 3. Keep persistent notifications that were recently added (within last 60 seconds) even if not in API yet
      //    This handles race conditions where notification was just created but not yet in API response
      const currentNotifications = get().notifications
      const apiNotificationIds = new Set(newNotifications.map(n => n.id))
      const now = Date.now()
      const RECENT_THRESHOLD = 60000 // 60 seconds

      // Keep temporary (non-persistent) notifications that aren't from API
      const temporaryNotifications = currentNotifications.filter(
        n => !n.persistent && !apiNotificationIds.has(n.id)
      )

      // Keep persistent notifications that were recently added (might not be in API yet due to timing)
      const recentPersistentNotifications = currentNotifications.filter(
        n => {
          if (!n.persistent) return false
          if (apiNotificationIds.has(n.id)) return false // Already in API, use API version
          // Check if notification was added recently (within last 60 seconds)
          const notificationAge = now - n.timestamp.getTime()
          return notificationAge < RECENT_THRESHOLD
        }
      )

      // Combine: API notifications (persistent) + temporary notifications + recent persistent notifications
      set({ notifications: [...newNotifications, ...temporaryNotifications, ...recentPersistentNotifications] })
    } catch (error) {
      console.error('Failed to sync notifications:', error)
      // Silently fail - don't interrupt user experience
    }
  },
}))

// Data Store for caching API responses
export interface DataState {
  projects: any[]
  studyPrograms: any[]
  evaluations: any[]
  analytics: {
    averages: any
    completionRate: any
    performanceByStudyProgram: any[]
    pipeline: any[]
    topProjects: any[]
  }
  isLoading: {
    projects: boolean
    studyPrograms: boolean
    evaluations: boolean
    analytics: boolean
  }
  lastUpdated: {
    projects: Date | null
    studyPrograms: Date | null
    evaluations: Date | null
    analytics: Date | null
  }
  setProjects: (projects: any[]) => void
  setStudyPrograms: (studyPrograms: any[]) => void
  setEvaluations: (evaluations: any[]) => void
  setAnalytics: (analytics: any) => void
  setLoading: (key: string, loading: boolean) => void
  clearData: () => void
}

export const useDataStore = create<DataState>((set) => ({
  projects: [],
  studyPrograms: [],
  evaluations: [],
  analytics: {
    averages: null,
    completionRate: null,
    performanceByStudyProgram: [],
    pipeline: [],
    topProjects: [],
  },
  isLoading: {
    projects: false,
    studyPrograms: false,
    evaluations: false,
    analytics: false,
  },
  lastUpdated: {
    projects: null,
    studyPrograms: null,
    evaluations: null,
    analytics: null,
  },

  setProjects: (projects: any[]) => {
    set({
      projects,
      lastUpdated: { ...useDataStore.getState().lastUpdated, projects: new Date() },
    })
  },

  setStudyPrograms: (studyPrograms: any[]) => {
    set({
      studyPrograms,
      lastUpdated: { ...useDataStore.getState().lastUpdated, studyPrograms: new Date() },
    })
  },

  setEvaluations: (evaluations: any[]) => {
    set({
      evaluations,
      lastUpdated: { ...useDataStore.getState().lastUpdated, evaluations: new Date() },
    })
  },

  setAnalytics: (analytics: any) => {
    set({
      analytics,
      lastUpdated: { ...useDataStore.getState().lastUpdated, analytics: new Date() },
    })
  },

  setLoading: (key: string, loading: boolean) => {
    set((state) => ({
      isLoading: { ...state.isLoading, [key]: loading },
    }))
  },

  clearData: () => {
    set({
      projects: [],
      studyPrograms: [],
      evaluations: [],
      analytics: {
        averages: null,
        completionRate: null,
        performanceByStudyProgram: [],
        pipeline: [],
        topProjects: [],
      },
      lastUpdated: {
        projects: null,
        studyPrograms: null,
        evaluations: null,
        analytics: null,
      },
    })
  },
}))

// Theme Store
export const useThemeStore = create<ThemeState>((set, get) => {
  // Initialize dark mode from localStorage
  const initializeDarkMode = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('darkMode')
      const isDark = stored === 'true' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)
      return isDark
    }
    return false
  }

  return {
    isDarkMode: initializeDarkMode(),

    toggleDarkMode: () => {
      const currentMode = get().isDarkMode
      const newMode = !currentMode
      set({ isDarkMode: newMode })

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('darkMode', String(newMode))
        document.documentElement.classList.toggle('dark', newMode)
      }
    },

    setDarkMode: (isDark: boolean) => {
      set({ isDarkMode: isDark })

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('darkMode', String(isDark))
        document.documentElement.classList.toggle('dark', isDark)
      }
    },
  }
})
