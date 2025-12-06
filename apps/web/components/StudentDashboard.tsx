'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore, useUIStore } from '../lib/stores'
import { useStudentDashboard, useStudentProject, useUpdateProjectSubmission, useCreateMyProject, useStudyPrograms } from '../lib/hooks'
import VerificationModal from './VerificationModal'

interface StudentSection {
  id: 'dashboard' | 'submissions' | 'evaluation'
  label: string
  description: string
  icon: React.ReactNode
}

const STUDENT_SECTIONS: StudentSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Track where your project sits in the review pipeline.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'submissions',
    label: 'Project Submission',
    description: 'Update repository links and confirm your delivery details.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4m-9 4v6" />
      </svg>
    ),
  },
  {
    id: 'evaluation',
    label: 'Evaluation',
    description: 'See marks, feedback, and strengths after review.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export default function StudentDashboard() {
  const { user } = useAuthStore()
  const { addNotification } = useUIStore()
  const queryClient = useQueryClient()
  const [activeSection, setActiveSection] = useState<StudentSection['id']>('dashboard')
  const [verificationOpen, setVerificationOpen] = useState(false)
  const [studentAction, setStudentAction] = useState<'UPDATE_SUBMISSION' | 'CREATE_PROJECT' | null>(null)
  const [actionProcessing, setActionProcessing] = useState(false)
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch dashboard data first (before useEffect hooks that depend on it)
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useStudentDashboard()
  const project = dashboardData?.project || null
  // Only fetch project details if project exists
  const { data: projectData } = useStudentProject(project?.id || null)

  // Handle hash fragment to switch to specific sections
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      if (hash === '#evaluation') {
        setActiveSection('evaluation')
        // Remove hash from URL after setting section
        window.history.replaceState(null, '', window.location.pathname)
      } else if (hash === '#submissions') {
        setActiveSection('submissions')
        // Remove hash from URL after setting section
        window.history.replaceState(null, '', window.location.pathname)
      }
    }
  }, [])

  // Listen for dashboard refresh events (triggered when evaluation notifications are clicked)
  useEffect(() => {
    const projectId = project?.id
    const handleRefresh = () => {
      queryClient.invalidateQueries({ queryKey: ['students', 'me', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['students', 'me', 'projects'] })
      // Also refetch immediately
      queryClient.refetchQueries({ queryKey: ['students', 'me', 'dashboard'] })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['students', 'me', 'projects', projectId] })
        queryClient.refetchQueries({ queryKey: ['students', 'me', 'projects', projectId] })
      }
    }
    
    window.addEventListener('dashboard-refresh', handleRefresh)
    return () => window.removeEventListener('dashboard-refresh', handleRefresh)
  }, [queryClient, project?.id])

  // Refetch evaluation data when evaluation section becomes active and set up polling
  useEffect(() => {
    if (activeSection === 'evaluation' && project?.id) {
      const projectId = project.id
      // When user navigates to evaluation section, ensure we have fresh data
      queryClient.invalidateQueries({ queryKey: ['students', 'me', 'projects', projectId] })
      queryClient.invalidateQueries({ queryKey: ['students', 'me', 'dashboard'] })
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ['students', 'me', 'projects', projectId] })
      queryClient.refetchQueries({ queryKey: ['students', 'me', 'dashboard'] })
      
      // Set up more aggressive polling when evaluation section is active (every 10 seconds)
      const pollInterval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['students', 'me', 'projects', projectId] })
        queryClient.refetchQueries({ queryKey: ['students', 'me', 'projects', projectId] })
      }, 10000) // Poll every 10 seconds when evaluation section is active
      
      return () => clearInterval(pollInterval)
    }
  }, [activeSection, project?.id, queryClient])

  // Manual refresh function for evaluation data
  const handleRefreshEvaluation = async () => {
    if (project?.id) {
      const projectId = project.id
      // Invalidate queries to mark them as stale (without exact to match all related queries)
      queryClient.invalidateQueries({ queryKey: ['students', 'me', 'projects', projectId] })
      queryClient.invalidateQueries({ queryKey: ['students', 'me', 'dashboard'] })
      
      // Force immediate refetch
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['students', 'me', 'projects', projectId] }),
        queryClient.refetchQueries({ queryKey: ['students', 'me', 'dashboard'] })
      ])
      
      addNotification('Evaluation data refreshed', 'success', {
        title: 'Refreshed',
        audience: 'STUDENT',
        userId: user?.id,
        persistent: false,
        autoRemoveDelay: 2000,
      })
    }
  }

  // Also listen for visibility change to refetch when user returns to the tab
  useEffect(() => {
    const projectId = project?.id
    const handleVisibilityChange = () => {
      if (!document.hidden && projectId) {
        // User returned to the tab, refetch evaluation data
        queryClient.invalidateQueries({ queryKey: ['students', 'me', 'dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['students', 'me', 'projects', projectId] })
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [queryClient, project?.id])
  const updateSubmissionMutation = useUpdateProjectSubmission()
  const createProjectMutation = useCreateMyProject()
  const { data: studyProgramsData } = useStudyPrograms()
  const studyPrograms = studyProgramsData || []

  // Form state for submission
  const [githubLink, setGithubLink] = useState('')
  const [documentationLink, setDocumentationLink] = useState('')
  
  // Project creation form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [projectTitle, setProjectTitle] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [selectedStudyProgram, setSelectedStudyProgram] = useState<number | ''>('')
  const [selectedLevel, setSelectedLevel] = useState<200 | 400 | ''>('')
  const [descriptionError, setDescriptionError] = useState<string>('')

  // Track previous project status to detect changes
  const prevStatusRef = useRef<string | null>(null)

  // Update form state when project data loads
  useEffect(() => {
    if (projectData?.project?.submission) {
      setGithubLink(projectData.project.submission.github_link || '')
      setDocumentationLink(projectData.project.submission.documentation_link || '')
    } else if (project) {
      // Fallback to dashboard project data (though it doesn't have submission details)
      setGithubLink('')
      setDocumentationLink('')
    } else {
      // No project - clear form
      setGithubLink('')
      setDocumentationLink('')
    }
  }, [projectData, project])

  // Detect project approval and show notification
  useEffect(() => {
    const currentStatus = project?.status || projectData?.project?.status
    const previousStatus = prevStatusRef.current

    // Only show notification if there's a previous status (not initial load) and status changed
    if (previousStatus !== null && previousStatus !== currentStatus) {
      // Check if status changed from pending_approval to draft (approved)
      if (previousStatus === 'pending_approval' && currentStatus === 'draft') {
        addNotification('Your project has been approved! You can now submit your repository links and documentation.', 'success', {
          title: 'Project Approved',
          audience: 'STUDENT',
          userId: user?.id,  // Only show this notification to the current user
          actionLabel: 'View project',
          actionUrl: '/dashboard',
        })
      }
    }

    // Update previous status (only if current status exists)
    if (currentStatus) {
      prevStatusRef.current = currentStatus
    }
  }, [project?.status, projectData?.project?.status, addNotification, user?.id])

  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) {
        clearTimeout(actionTimeoutRef.current)
      }
    }
  }, [])

  const requestSubmissionVerification = () => {
    setStudentAction('UPDATE_SUBMISSION')
    setVerificationOpen(true)
  }
  
  const validateDescription = (description: string): string => {
    const trimmed = description.trim()
    if (!trimmed) {
      return 'Description is required'
    }
    if (trimmed.length < 50) {
      return `Description must be at least 50 characters (currently ${trimmed.length})`
    }
    return ''
  }

  const handleCreateProject = () => {
    // Validate description
    const descError = validateDescription(projectDescription)
    if (descError) {
      setDescriptionError(descError)
      addNotification(descError, 'error', {
        title: 'Validation Error',
        userId: user?.id,
      })
      return
    }
    setDescriptionError('')

    if (!projectTitle.trim() || !selectedStudyProgram || !selectedLevel) {
      addNotification('Please fill in all required fields (Title, Description, Study Program, and Level)', 'error', {
        title: 'Validation Error',
        userId: user?.id,
      })
      return
    }
    
    setStudentAction('CREATE_PROJECT')
    setVerificationOpen(true)
  }
  
  const handleCreateProjectConfirm = async () => {
    if (!studentAction || studentAction !== 'CREATE_PROJECT') {
      return
    }
    
    // Validate description
    const descError = validateDescription(projectDescription)
    if (descError) {
      setDescriptionError(descError)
      addNotification(descError, 'error', {
        title: 'Validation Error',
        userId: user?.id,
      })
      setActionProcessing(false)
      setVerificationOpen(false)
      setStudentAction(null)
      return
    }
    setDescriptionError('')
    
    // Validate required fields
    if (!projectTitle.trim() || !selectedStudyProgram || !selectedLevel) {
      addNotification('Please fill in all required fields', 'error', {
        title: 'Validation Error',
        userId: user?.id,
      })
      setActionProcessing(false)
      setVerificationOpen(false)
      setStudentAction(null)
      return
    }
    
    setActionProcessing(true)
    
    try {
      await createProjectMutation.mutateAsync({
        title: projectTitle.trim(),
        description: projectDescription.trim(),
        study_program_id: Number(selectedStudyProgram),
        level: selectedLevel as 200 | 400
      })
      
      addNotification('Project created successfully! It is now pending admin approval.', 'success', {
        title: 'Project Created',
        audience: 'STUDENT',
        userId: user?.id,
        actionLabel: 'View dashboard',
        actionUrl: '/dashboard',
      })
      
      setVerificationOpen(false)
      setStudentAction(null)
      setShowCreateForm(false)
      setProjectTitle('')
      setProjectDescription('')
      setSelectedStudyProgram('')
      setSelectedLevel('')
    } catch (error: any) {
      // Extract error message from various possible error formats
      let errorMessage = 'Failed to create project'
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      addNotification(`Error: ${errorMessage}`, 'error', {
        title: 'Creation Failed',
        userId: user?.id,
      })
      // Keep modal open on error so user can see the error and try again
    } finally {
      setActionProcessing(false)
    }
  }

  const handleVerificationCancel = () => {
    if (actionProcessing) return
    setVerificationOpen(false)
    setStudentAction(null)
  }

  const handleVerificationConfirm = async () => {
    // Prevent multiple clicks
    if (actionProcessing) {
      return
    }
    
    if (!studentAction) {
      addNotification('No action specified', 'error', { title: 'Error', userId: user?.id })
      return
    }
    
    if (studentAction === 'CREATE_PROJECT') {
      // Call handleCreateProjectConfirm which handles all the logic
      await handleCreateProjectConfirm()
      return
    }
    
    if (studentAction === 'UPDATE_SUBMISSION' && !project?.id) {
      addNotification('Project not found. Please refresh the page.', 'error', {
        title: 'Error',
        userId: user?.id,
      })
      return
    }
    setActionProcessing(true)

    try {
      await updateSubmissionMutation.mutateAsync({
        projectId: project!.id,
        data: {
          github_link: githubLink,
          documentation_link: documentationLink
        }
      })
      
      addNotification('Your submission package was updated successfully.', 'success', {
        title: 'Submission saved',
        audience: 'STUDENT',
        userId: user?.id,
        actionLabel: 'View dashboard',
        actionUrl: '/dashboard',
      })
      setVerificationOpen(false)
      setStudentAction(null)
    } catch (error: any) {
      addNotification(`Error: ${error.message || 'Failed to update submission'}`, 'error', {
        title: 'Update Failed',
        userId: user?.id,
      })
    } finally {
      setActionProcessing(false)
    }
  }

  const baseSectionHeader = (title: string, description: string, icon: React.ReactNode) => (
    <div className="flex items-center gap-3">
      <span className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-xl text-blue-600 dark:text-blue-300">{icon}</span>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  )

  // Get timeline data from project
  const timeline = project?.status_timeline
  const progressPercentage = timeline 
    ? (timeline.evaluated?.status === 'completed' ? 100 : 
       timeline.under_review?.status === 'current' || timeline.under_review?.status === 'completed' ? 75 : 
       timeline.submitted?.status === 'completed' ? 50 : 25)
    : 0

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return null
    }
  }

  const sectionContent: Record<StudentSection['id'], React.ReactNode> = {
      dashboard: (
        <div className="space-y-6">
          {baseSectionHeader(
            'Dashboard Overview',
            'Quick glance at how far your project has progressed.',
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )}

          {project && (
            <div className={`rounded-xl p-4 flex flex-col gap-3 border ${
              project.status === 'rejected'
                ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800'
                : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    project.status === 'rejected'
                      ? 'bg-red-100 dark:bg-red-900/40'
                      : 'bg-green-100 dark:bg-green-900/40'
                  }`}>
                    {project.status === 'rejected' ? (
                      <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${
                    project.status === 'rejected'
                      ? 'text-red-900 dark:text-red-200'
                      : 'text-green-900 dark:text-green-200'
                  }`}>
                    {project.status === 'rejected' ? 'Project Rejected' : 'Project Created'}
                  </p>
                  <p className={`text-sm truncate ${
                    project.status === 'rejected'
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-green-700 dark:text-green-300'
                  }`}>
                    {project.title}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.status === 'rejected'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                      : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                  }`}>
                    {project.status === 'rejected' ? '✗ Rejected' : '✓ Active'}
                  </span>
                </div>
              </div>
              {project.status === 'rejected' && (
                <div className="pt-2 border-t border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-700 dark:text-red-300 mb-3">
                    Your project has been rejected. You can create a new project to start over.
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create New Project
                  </button>
                </div>
              )}
            </div>
          )}

          {dashboardLoading ? (
            <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-2xl border border-gray-100 dark:border-gray-800 p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ) : dashboardError ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
              <p className="text-red-700 dark:text-red-300">Failed to load dashboard data. Please try again.</p>
            </div>
          ) : !project || project.status === 'rejected' ? (
            <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-2xl border border-gray-100 dark:border-gray-800 p-8">
              {!showCreateForm ? (
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {project?.status === 'rejected' 
                      ? 'Your project has been rejected. Create a new project to start over.' 
                      : 'You don\'t have a project yet. Create your project to get started.'}
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Project
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold dark:text-white">Create New Project</h3>
                    <button
                      onClick={() => {
                        setShowCreateForm(false)
                        setProjectTitle('')
                        setProjectDescription('')
                        setSelectedStudyProgram('')
                        setSelectedLevel('')
                        setDescriptionError('')
                      }}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Project Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-blue-500 dark:text-white"
                        placeholder="Enter your project title"
                        maxLength={200}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Description <span className="text-red-500">*</span>
                        {projectDescription.trim().length > 0 && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            ({projectDescription.trim().length}/50 characters minimum)
                          </span>
                        )}
                      </label>
                      <textarea
                        value={projectDescription}
                        onChange={(e) => {
                          setProjectDescription(e.target.value)
                          if (descriptionError) {
                            setDescriptionError(validateDescription(e.target.value))
                          }
                        }}
                        onBlur={() => {
                          setDescriptionError(validateDescription(projectDescription))
                        }}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 dark:text-white dark:bg-gray-800 ${
                          descriptionError
                            ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 dark:border-gray-700'
                        }`}
                        placeholder="Describe your project in detail (minimum 50 characters)..."
                        rows={4}
                      />
                      {descriptionError && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{descriptionError}</p>
                      )}
                      {!descriptionError && projectDescription.trim().length > 0 && projectDescription.trim().length < 50 && (
                        <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                          {50 - projectDescription.trim().length} more characters required
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Study Program <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedStudyProgram}
                          onChange={(e) => setSelectedStudyProgram(e.target.value ? Number(e.target.value) : '')}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-blue-500 dark:text-white"
                        >
                          <option value="">Select study program</option>
                          {studyPrograms.map((sp: any) => (
                            <option key={sp.id} value={sp.id}>
                              {sp.code} - {sp.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Level <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedLevel}
                          onChange={(e) => setSelectedLevel(e.target.value ? Number(e.target.value) as 200 | 400 : '')}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-blue-500 dark:text-white"
                        >
                          <option value="">Select level</option>
                          <option value={200}>Level 200</option>
                          <option value={400}>Level 400</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleCreateProject}
                        disabled={
                          createProjectMutation.isPending || 
                          !projectTitle.trim() || 
                          !projectDescription.trim() || 
                          projectDescription.trim().length < 50 ||
                          !selectedStudyProgram || 
                          !selectedLevel
                        }
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateForm(false)
                          setProjectTitle('')
                          setProjectDescription('')
                          setSelectedStudyProgram('')
                          setSelectedLevel('')
                        }}
                        className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-full font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="p-8">
                <div className="flex items-center justify-between relative">
                  <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 -z-10">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700" 
                      style={{ width: `${progressPercentage}%` }} 
                    />
                  </div>

                  {[
                    { 
                      label: 'Project Created', 
                      stage: { status: 'completed', date: project?.created_at },
                      icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )
                    },
                    { 
                      label: 'Submitted', 
                      stage: timeline?.submitted,
                      icon: '✓'
                    },
                    { 
                      label: 'Under Review', 
                      stage: timeline?.under_review,
                      icon: '⏱'
                    },
                    { 
                      label: 'Evaluated', 
                      stage: timeline?.evaluated,
                      icon: '✓'
                    },
                  ].map((stageItem) => {
                    const status = stageItem.stage?.status || 'pending'
                    const date = formatDate(stageItem.stage?.date || null)
                    return (
                      <div key={stageItem.label} className="flex flex-col items-center gap-4 flex-1">
                        <div
                          className={`h-16 w-16 rounded-full flex items-center justify-center border-4 ${
                            status === 'completed'
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : status === 'current'
                                ? 'bg-white dark:bg-gray-900 border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                          } ${typeof stageItem.icon === 'string' ? 'font-bold text-lg' : ''}`}
                        >
                          {stageItem.icon}
                        </div>
                        <div className="text-center">
                          <p className={`text-sm font-medium ${status === 'current' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                            {stageItem.label}
                          </p>
                          {date && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{date}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      ),
      submissions: (
        <div className="space-y-6">
          {baseSectionHeader(
            'Project Submission',
            'Update your repository links and documentation anytime.',
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4m-9 4v6" />
            </svg>
          )}

          {dashboardLoading ? (
            <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-2xl border border-gray-100 dark:border-gray-800 p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ) : !project ? (
            <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-6">You don&apos;t have a project yet. Create your project to submit your work.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Project
              </button>
            </div>
          ) : !projectData ? (
            <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-2xl border border-gray-100 dark:border-gray-800 p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold dark:text-white">Submission Package</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Submit your project repository and documentation</p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    project.status === 'pending_approval'
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                      : project.status === 'rejected'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      : project.submitted_at 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                  }`}>
                    {project.status === 'pending_approval' ? '⏳ Pending Approval'
                      : project.status === 'rejected' ? '✗ Rejected'
                      : project.submitted_at ? '✓ Submitted' : 'Pending'}
                  </span>
                </div>
              </div>
              <div className="px-6 py-6 space-y-6">
                {/* Approval Status Message */}
                {project.status === 'pending_approval' && (
                  <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Project Pending Approval</p>
                        <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                          Your project is awaiting admin approval. You will be able to submit your repository links once it is approved.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {project.status === 'rejected' && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">Project Rejected</p>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                          Your project has been rejected. You can create a new project to start over.
                        </p>
                        <button
                          onClick={() => setShowCreateForm(true)}
                          className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Create New Project
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Deadline */}
                {dashboardData?.deadlines && dashboardData.deadlines.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium dark:text-gray-200">Deadline:</span>
                      <span className="dark:text-gray-300">
                        {new Date(dashboardData.deadlines[0].deadline).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {dashboardData.deadlines[0].days_remaining >= 0 && (
                          <span className="ml-2 text-sm">({dashboardData.deadlines[0].days_remaining} days remaining)</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Project Title</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-blue-500 dark:text-white"
                      value={project.title || ''}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Submission Date & Time</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-gray-200"
                      value={project.submitted_at 
                        ? new Date(project.submitted_at).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Not submitted yet'}
                      disabled
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">GitHub Repository Link</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-blue-500 dark:text-white"
                      value={githubLink}
                      onChange={(e) => setGithubLink(e.target.value)}
                      placeholder="https://github.com/username/repository"
                    />
                    {githubLink && (
                      <a
                        href={githubLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 transition-colors"
                      >
                        ↗
                      </a>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Google Drive Documentation Link</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-blue-500 dark:text-white"
                      value={documentationLink}
                      onChange={(e) => setDocumentationLink(e.target.value)}
                      placeholder="https://docs.google.com/document/d/..."
                    />
                    {documentationLink && (
                      <a
                        href={documentationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 transition-colors"
                      >
                        ↗
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={requestSubmissionVerification}
                    disabled={
                      updateSubmissionMutation.isPending || 
                      actionProcessing || 
                      project.status === 'pending_approval' || 
                      project.status === 'rejected'
                    }
                    title={
                      project.status === 'pending_approval' 
                        ? 'Project must be approved before submission'
                        : project.status === 'rejected'
                        ? 'Project has been rejected'
                        : undefined
                    }
                  >
                    {updateSubmissionMutation.isPending || actionProcessing ? 'Updating...' : '✓ Update Submission'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ),
      evaluation: (
        <div className="space-y-6">
          {baseSectionHeader(
            'Evaluation',
            'Understand how you scored and where to improve.',
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          )}

          {dashboardLoading ? (
            <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-2xl border border-gray-100 dark:border-gray-800 p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ) : !project ? (
            <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-6">You don&apos;t have a project yet. Create your project to submit your work.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Project
              </button>
            </div>
          ) : !projectData ? (
            <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-2xl border border-gray-100 dark:border-gray-800 p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ) : !projectData?.evaluation ? (
            <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                {project?.status === 'evaluated' 
                  ? 'Evaluation is being processed. Please check back later.'
                  : 'Your project has not been evaluated yet. Evaluation results will appear here once your project is reviewed.'}
              </p>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-200 dark:border-blue-800 shadow-xl rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold dark:text-white">Overall Performance</h3>
                  <button
                    onClick={handleRefreshEvaluation}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    title="Refresh evaluation data"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Overall Score</p>
                  <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(projectData.evaluation.total_score || 0)}/{projectData.evaluation.max_score || 100}
                  </p>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div 
                    className="bg-blue-600 h-4 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(projectData.evaluation.percentage || 0, 100)}%` }}
                  ></div>
                </div>
                {projectData.evaluation.overall_feedback && (
                  <div className="mt-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{projectData.evaluation.overall_feedback}</p>
                  </div>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Project Marks */}
                {projectData.evaluation.marks?.project_marks && Object.keys(projectData.evaluation.marks.project_marks).length > 0 && (
                  <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-2xl border-2 border-blue-200 dark:border-blue-800">
                    <div className="px-6 py-4 bg-blue-100 dark:bg-blue-900/40 border-b border-blue-200 dark:border-blue-700">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-200">Project Marks</h3>
                    </div>
                    <div className="px-6 py-4 space-y-4 bg-blue-50/50 dark:bg-blue-900/10">
                      {Object.entries(projectData.evaluation.marks.project_marks).map(([key, mark]: [string, any]) => (
                        <div key={key} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium dark:text-gray-200">
                              {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </span>
                            <span className="font-semibold text-blue-700 dark:text-blue-300">
                              {mark.score}/{mark.max_score}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${Math.min((mark.score / mark.max_score) * 100, 100)}%` }}
                            ></div>
                          </div>
                          {mark.feedback && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 italic">{mark.feedback}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Presentation Marks */}
                {projectData.evaluation.marks?.presentation_marks && Object.keys(projectData.evaluation.marks.presentation_marks).length > 0 && (
                  <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-2xl border-2 border-purple-200 dark:border-purple-800">
                    <div className="px-6 py-4 bg-purple-100 dark:bg-purple-900/40 border-b border-purple-200 dark:border-purple-700">
                      <h3 className="font-semibold text-purple-900 dark:text-purple-200">Presentation Marks</h3>
                    </div>
                    <div className="px-6 py-4 space-y-4 bg-purple-50/50 dark:bg-purple-900/10">
                      {Object.entries(projectData.evaluation.marks.presentation_marks).map(([key, mark]: [string, any]) => (
                        <div key={key} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium dark:text-gray-200">
                              {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </span>
                            <span className="font-semibold text-purple-700 dark:text-purple-300">
                              {mark.score}/{mark.max_score}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full" 
                              style={{ width: `${Math.min((mark.score / mark.max_score) * 100, 100)}%` }}
                            ></div>
                          </div>
                          {mark.feedback && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 italic">{mark.feedback}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ),
    }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12">
        <div className="space-y-8">
          <header className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-blue-500 dark:text-blue-300 mb-2">Student Workspace</p>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Dashboard</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Welcome back, {user?.name}! Track your submission, upload any missing details, and review evaluation feedback from one place.
                    </p>
                </div>
            </div>
          </header>

          {/* Horizontal navigation */}
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {STUDENT_SECTIONS.map((section) => {
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all ${
                      isActive
                        ? 'border-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-500/20'
                        : 'border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900 hover:border-blue-200 dark:hover:border-blue-600/60 hover:-translate-y-1'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-50 text-blue-600 dark:bg-gray-800 dark:text-blue-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40'
                        }`}
                      >
                        {section.icon}
                      </span>
                      <svg
                        className={`h-4 w-4 transition-all ${isActive ? 'translate-x-1 opacity-100 text-white' : 'opacity-50 text-gray-400 group-hover:text-blue-500'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <div className="mt-4 space-y-1">
                      <p className={`text-lg font-semibold ${isActive ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{section.label}</p>
                      <p className={`text-sm leading-relaxed ${isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>{section.description}</p>
                    </div>
                    {!isActive && (
                      <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-900/20" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pt-4">{sectionContent[activeSection]}</div>
        </div>
      </div>

      <VerificationModal
        open={verificationOpen}
        title={studentAction === 'CREATE_PROJECT' ? "Confirm project creation" : "Confirm submission update"}
        description={studentAction === 'CREATE_PROJECT' 
          ? "Please review your project details before creating. You can only have one project."
          : "Make sure your repository and documentation links are correct before updating your package."}
        highlight={studentAction === 'CREATE_PROJECT'
          ? `Title: ${projectTitle || 'N/A'}\nStudy Program: ${studyPrograms.find((sp: any) => sp.id === selectedStudyProgram)?.name || 'N/A'}\nLevel: ${selectedLevel || 'N/A'}`
          : "Updating a submission notifies evaluators and replaces previously attached details."}
        confirmLabel={studentAction === 'CREATE_PROJECT' ? "Yes, create project" : "Yes, update submission"}
        cancelLabel="Cancel"
        tone="info"
        loading={actionProcessing || createProjectMutation.isPending}
        onConfirm={() => {
          // Ensure handler is called
          handleVerificationConfirm().catch((err) => {
            console.error('Error in verification confirm:', err)
            addNotification('An unexpected error occurred', 'error', { title: 'Error', userId: user?.id })
          })
        }}
        onCancel={handleVerificationCancel}
      />
    </div>
  )
}

