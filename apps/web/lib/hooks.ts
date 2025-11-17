import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  projectsAPI, 
  analyticsAPI, 
  evaluationsAPI, 
  usersAPI,
  studyProgramsAPI,
  authAPI,
  reportsAPI
} from './api'

// Query Keys
export const QUERY_KEYS = {
  PROJECTS: 'projects',
  ANALYTICS: 'analytics',
  EVALUATIONS: 'evaluations',
  USER: 'user',
  STUDY_PROGRAMS: 'study-programs',
  USERS: 'users',
  REPORTS: 'reports',
} as const

// Projects Hooks
export const useProjects = (params?: {
  search?: string
  status?: string
  level?: string
  study_program_id?: string
  page?: number
  per_page?: number
}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.PROJECTS, params],
    queryFn: () => projectsAPI.getAll(params),
    select: (data) => data.projects || data, // Handle both paginated and non-paginated responses
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useProject = (id: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.PROJECTS, id],
    queryFn: () => projectsAPI.getById(id),
    enabled: !!id,
  })
}

export const useCreateProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: projectsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECTS] })
    },
  })
}

export const useUpdateProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      projectsAPI.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECTS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECTS, id] })
    },
  })
}

export const useDeleteProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: projectsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECTS] })
    },
  })
}

export const useEvaluationTemplates = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.EVALUATIONS, 'templates'],
    queryFn: evaluationsAPI.getTemplates,
    staleTime: 10 * 60 * 1000, // 10 minutes - templates don't change often
  })
}

// Study Program Management Hooks
export const useStudyPrograms = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.STUDY_PROGRAMS],
    queryFn: studyProgramsAPI.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useCreateStudyProgram = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: studyProgramsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDY_PROGRAMS] })
    },
  })
}

export const useUpdateStudyProgram = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      studyProgramsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDY_PROGRAMS] })
    },
  })
}

export const useDeleteStudyProgram = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: studyProgramsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDY_PROGRAMS] })
    },
  })
}

// User Management Hooks
export const useUsers = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.USERS],
    queryFn: usersAPI.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: usersAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] })
    },
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      usersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] })
    },
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: usersAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] })
    },
  })
}

// Analytics Hooks
export const useAnalyticsAverages = (level?: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, 'averages', level],
    queryFn: () => analyticsAPI.getAverages(level),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useAnalyticsCompletionRate = (level?: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, 'completion-rate', level],
    queryFn: () => analyticsAPI.getCompletionRate(level),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useAnalyticsPerformanceByStudyProgram = (level?: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, 'performance-by-study-program', level],
    queryFn: () => analyticsAPI.getPerformanceByStudyProgram(level),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useAnalyticsPipeline = (level?: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, 'pipeline', level],
    queryFn: () => analyticsAPI.getPipeline(level),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useAnalyticsTopProjects = (level?: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, 'top-projects', level],
    queryFn: () => analyticsAPI.getTopProjects(level),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Reports Hooks
export const useReportSummary = (params?: { level?: number; start_date?: string; end_date?: string }) => {
  return useQuery({
    queryKey: [QUERY_KEYS.REPORTS, params],
    queryFn: () => reportsAPI.getSummary(params),
    keepPreviousData: true,
  })
}

// Evaluations Hooks
export const useProjectEvaluations = (projectId: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.EVALUATIONS, 'project', projectId],
    queryFn: () => evaluationsAPI.getByProject(projectId),
    enabled: !!projectId,
  })
}

export const useEvaluation = (evaluationId: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.EVALUATIONS, evaluationId],
    queryFn: () => evaluationsAPI.getById(evaluationId),
    enabled: !!evaluationId,
  })
}

export const useCreateEvaluation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (evaluationData: any) =>
      evaluationsAPI.create(evaluationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EVALUATIONS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECTS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ANALYTICS] })
    },
  })
}

export const useUpdateEvaluation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ evaluationId, data }: { evaluationId: number; data: any }) =>
      evaluationsAPI.update(evaluationId, data),
    onSuccess: (_, { evaluationId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EVALUATIONS, evaluationId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ANALYTICS] })
    },
  })
}

// Auth Hooks
export const useCurrentUser = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.USER],
    queryFn: authAPI.getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Custom hook for dashboard data
export const useDashboardData = () => {
  const projectsQuery = useProjects()
  const averagesQuery = useAnalyticsAverages()
  const completionRateQuery = useAnalyticsCompletionRate()
  
  return {
    projects: projectsQuery.data || [],
    averages: averagesQuery.data,
    completionRate: completionRateQuery.data,
    isLoading: projectsQuery.isLoading || averagesQuery.isLoading || completionRateQuery.isLoading,
    error: projectsQuery.error || averagesQuery.error || completionRateQuery.error,
  }
}

// Custom hook for analytics data
export const useAnalyticsData = () => {
  const averagesQuery = useAnalyticsAverages()
  const completionRateQuery = useAnalyticsCompletionRate()
  const performanceQuery = useAnalyticsPerformanceByStudyProgram()
  const pipelineQuery = useAnalyticsPipeline()
  const topProjectsQuery = useAnalyticsTopProjects()
  
  return {
    averages: averagesQuery.data,
    completionRate: completionRateQuery.data,
    performanceByStudyProgram: performanceQuery.data || [],
    pipeline: pipelineQuery.data || [],
    topProjects: topProjectsQuery.data || [],
    isLoading: averagesQuery.isLoading || completionRateQuery.isLoading || 
               performanceQuery.isLoading || pipelineQuery.isLoading || topProjectsQuery.isLoading,
    error: averagesQuery.error || completionRateQuery.error || 
           performanceQuery.error || pipelineQuery.error || topProjectsQuery.error,
  }
}