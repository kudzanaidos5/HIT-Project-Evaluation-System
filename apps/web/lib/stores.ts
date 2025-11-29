import { create } from 'zustand'
import { authAPI, getTokens, clearTokens } from './api'

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
    }
  ) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  removeNotification: (id: string) => void
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

// UI Store
export const useUIStore = create<UIState>((set, get) => ({
  sidebarExpanded: false,
  projectsMenuOpen: false,
  settingsMenuOpen: false,
  evaluationModalOpen: false,
  selectedProject: null,
  notifications: [],

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
    set({ notifications })
  },

  addNotification: (
    message: string,
    type: NotificationType,
    options?: { title?: string; actionLabel?: string; actionUrl?: string; audience?: NotificationAudience; userId?: number }
  ) => {
    const notification: NotificationItem = {
      id: Date.now().toString(),
      title: options?.title || 'System Update',
      message,
      type,
      timestamp: new Date(),
      read: false,
      actionLabel: options?.actionLabel,
      actionUrl: options?.actionUrl,
      audience: options?.audience || 'ALL',
      userId: options?.userId,
    }
    set((state) => ({
      notifications: [...state.notifications, notification],
    }))

    // Auto-remove after 5 seconds
    setTimeout(() => {
      get().removeNotification(notification.id)
    }, 5000)
  },

  removeNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }))
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
