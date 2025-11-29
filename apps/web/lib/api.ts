import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Token management
let accessToken: string | null = null
let refreshToken: string | null = null

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle network errors gracefully
    if (!error.response) {
      console.warn('API not available, backend may not be running:', error.message)
      // Return mock data for development
      return Promise.reject(new Error('Backend not available. Please start the backend server.'))
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
            withCredentials: true,
          })

          const newAccessToken = response.data.accessToken
          setTokens(newAccessToken, refreshToken)
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return apiClient(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Token management functions
export const setTokens = (access: string, refresh: string) => {
  accessToken = access
  refreshToken = refresh
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', access)
    localStorage.setItem('refreshToken', refresh)
  }
}

export const clearTokens = () => {
  accessToken = null
  refreshToken = null
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  }
}

export const getTokens = () => {
  if (typeof window !== 'undefined') {
    const storedAccess = localStorage.getItem('accessToken')
    const storedRefresh = localStorage.getItem('refreshToken')
    if (storedAccess && storedRefresh) {
      accessToken = storedAccess
      refreshToken = storedRefresh
    }
  }
  return { accessToken, refreshToken }
}

// Initialize tokens from localStorage
if (typeof window !== 'undefined') {
  getTokens()
}

// API methods
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password })
    const { accessToken: newAccessToken, refreshToken: newRefreshToken, user } = response.data
    setTokens(newAccessToken, newRefreshToken)

    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user))
    }

    return { user, accessToken: newAccessToken, refreshToken: newRefreshToken }
  },

  loginWithGoogle: async (credential: string) => {
    const response = await apiClient.post('/auth/google', { credential })
    const { accessToken: newAccessToken, refreshToken: newRefreshToken, user } = response.data
    setTokens(newAccessToken, newRefreshToken)

    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user))
    }

    return { user, accessToken: newAccessToken, refreshToken: newRefreshToken }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    })
    return response.data
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearTokens()
    }
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me')
    return response.data.user
  },

  refreshToken: async () => {
    const response = await apiClient.post('/auth/refresh')
    return response.data.accessToken
  }
}

export const projectsAPI = {
  getAll: async (params?: {
    search?: string
    status?: string
    level?: string
    study_program_id?: string
    page?: number
    per_page?: number
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    if (params?.status) queryParams.append('status', params.status)
    if (params?.level) queryParams.append('level', params.level)
    if (params?.study_program_id) queryParams.append('study_program_id', params.study_program_id)
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString())

    const response = await apiClient.get(`/projects?${queryParams.toString()}`)
    return response.data
  },

  getById: async (id: number) => {
    const response = await apiClient.get(`/projects/${id}`)
    return response.data
  },

  create: async (projectData: any) => {
    const response = await apiClient.post('/projects', projectData)
    return response.data
  },

  update: async (id: number, projectData: any) => {
    const response = await apiClient.put(`/projects/${id}`, projectData)
    return response.data
  },

  delete: async (id: number) => {
    const response = await apiClient.delete(`/projects/${id}`)
    return response.data
  },

  approve: async (id: number) => {
    const response = await apiClient.post(`/projects/${id}/approve`)
    return response.data
  },

  reject: async (id: number, reason?: string) => {
    const response = await apiClient.post(`/projects/${id}/reject`, reason ? { reason } : {})
    return response.data
  }
}

export const evaluationsAPI = {
  create: async (evaluationData: any) => {
    const response = await apiClient.post(`/projects/${evaluationData.projectId}/evaluations`, evaluationData.data)
    return response.data
  },

  getTemplates: async () => {
    const response = await apiClient.get('/evaluation-templates')
    return response.data
  },

  getById: async (id: number) => {
    const response = await apiClient.get(`/evaluations/${id}`)
    return response.data
  },

  update: async (id: number, evaluationData: any) => {
    const response = await apiClient.patch(`/evaluations/${id}`, evaluationData)
    return response.data
  },

  getByProject: async (projectId: number) => {
    const response = await apiClient.get(`/projects/${projectId}/evaluations`)
    return response.data
  }
}

export const studyProgramsAPI = {
  getAll: async () => {
    const response = await apiClient.get('/study-programs')
    return response.data
  },

  create: async (courseData: any) => {
    const response = await apiClient.post('/study-programs', courseData)
    return response.data
  },

  update: async (id: number, courseData: any) => {
    const response = await apiClient.put(`/study-programs/${id}`, courseData)
    return response.data
  },

  delete: async (id: number) => {
    const response = await apiClient.delete(`/study-programs/${id}`)
    return response.data
  }
}

export const usersAPI = {
  getAll: async () => {
    const response = await apiClient.get('/users')
    return response.data
  },

  create: async (userData: any) => {
    const response = await apiClient.post('/users', userData)
    return response.data
  },

  update: async (id: number, userData: any) => {
    const response = await apiClient.put(`/users/${id}`, userData)
    return response.data
  },

  delete: async (id: number) => {
    const response = await apiClient.delete(`/users/${id}`)
    return response.data
  }
}

export const analyticsAPI = {
  getAverages: async (level?: number) => {
    const response = await apiClient.get('/analytics/averages', {
      params: level ? { level } : {}
    })
    return response.data
  },

  getCompletionRate: async (level?: number) => {
    const response = await apiClient.get('/analytics/completion-rate', {
      params: level ? { level } : {}
    })
    return response.data
  },

  getPerformanceByStudyProgram: async (level?: number) => {
    const response = await apiClient.get('/analytics/performance-by-study-program', {
      params: level ? { level } : {}
    })
    return response.data
  },

  getPipeline: async (level?: number) => {
    const response = await apiClient.get('/analytics/pipeline', {
      params: level ? { level } : {}
    })
    return response.data
  },

  getTopProjects: async (level?: number) => {
    const response = await apiClient.get('/analytics/top-projects', {
      params: level ? { level } : {}
    })
    return response.data
  },

  // Deadline Management
  getDeadlines: async () => {
    const response = await apiClient.get('/deadlines')
    return response.data
  },

  getDeadlineByLevel: async (level: number) => {
    const response = await apiClient.get(`/deadlines/level/${level}`)
    return response.data
  },

  createDeadline: async (data: { level: number; deadline: string }) => {
    const response = await apiClient.post('/deadlines', data)
    return response.data
  },

  updateDeadline: async (id: number, data: { deadline: string }) => {
    const response = await apiClient.put(`/deadlines/${id}`, data)
    return response.data
  },

  getMissedDeadlines: async () => {
    const response = await apiClient.get('/deadlines/missed')
    return response.data
  },

  // Project Submission
  submitProject: async (projectId: number, data: { github_link: string }) => {
    const response = await apiClient.post(`/projects/${projectId}/submit`, data)
    return response.data
  }
}

export const studentsAPI = {
  getMyProjects: async (params?: { status?: string; level?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.level) queryParams.append('level', params.level)

    const response = await apiClient.get(`/students/me/projects?${queryParams.toString()}`)
    return response.data
  },

  getMyDashboard: async () => {
    const response = await apiClient.get('/students/me/dashboard')
    return response.data
  },

  getMyProject: async (projectId: number) => {
    const response = await apiClient.get(`/students/me/projects/${projectId}`)
    return response.data
  },

  updateProjectSubmission: async (projectId: number, data: {
    github_link?: string
    documentation_link?: string
    pdf_path?: string
  }) => {
    const response = await apiClient.put(`/students/me/projects/${projectId}/submission`, data)
    return response.data
  },

  getProjectTimeline: async (projectId: number) => {
    const response = await apiClient.get(`/students/me/projects/${projectId}/timeline`)
    return response.data
  },

  createMyProject: async (data: {
    title: string
    description?: string
    study_program_id: number
    level: 200 | 400
  }) => {
    const response = await apiClient.post('/students/me/project', data)
    return response.data
  }
}

export const reportsAPI = {
  getSummary: async (params?: { level?: number; start_date?: string; end_date?: string }) => {
    const response = await apiClient.get('/reports/summary', { params })
    return response.data
  },
  downloadCsv: async (params?: { level?: number; start_date?: string; end_date?: string }) => {
    const response = await apiClient.get('/reports/export', {
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    })
    return response.data
  },
  downloadPdf: async (params?: { level?: number; start_date?: string; end_date?: string }) => {
    const response = await apiClient.get('/reports/export', {
      params: { ...params, format: 'pdf' },
      responseType: 'blob',
    })
    return response.data
  },
}

export default apiClient