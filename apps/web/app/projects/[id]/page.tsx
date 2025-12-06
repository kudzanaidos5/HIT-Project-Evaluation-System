'use client'

import React, { useState, useEffect } from 'react'
import { useProject, useProjectEvaluations, useCreateEvaluation, useUpdateEvaluation, useEvaluationTemplates, useDeleteProject } from '../../../lib/hooks'
import { useAuthStore, useUIStore } from '../../../lib/stores'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import VerificationModal from '../../../components/VerificationModal'
import { useQueryClient } from '@tanstack/react-query'

interface EvaluationFormData {
  evaluationType: 'PROJECT' | 'PRESENTATION'
  comments: string
  marks: Array<{
    criterion_name: string
    max_score: number
    score: number
    comments?: string
  }>
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const projectId = parseInt(params.id as string)
  const { user } = useAuthStore()
  const { addNotification } = useUIStore()
  const isAdmin = user?.role === 'ADMIN'
  
  const { data: projectData, isLoading: projectLoading, error: projectError } = useProject(projectId)
  const project = projectData
  const { data: evaluationsData, isLoading: evaluationsLoading, error: evaluationsError } = useProjectEvaluations(projectId)
  const projectEvaluation = evaluationsData?.project_evaluation || null
  const presentationEvaluation = evaluationsData?.presentation_evaluation || null
  const allEvaluations = evaluationsData?.all_evaluations || []
  
  // Helper function to calculate total score and max score from marks
  const calculateScoreFromMarks = (evaluation: any) => {
    if (!evaluation || !evaluation.marks || evaluation.marks.length === 0) {
      return { totalScore: 0, maxScore: 0 }
    }
    const totalScore = evaluation.marks.reduce((sum: number, mark: any) => sum + (mark.score || 0), 0)
    const maxScore = evaluation.marks.reduce((sum: number, mark: any) => sum + (mark.max_score || 0), 0)
    return { totalScore, maxScore }
  }
  
  // Helper function to get a specific mark by criterion name
  const getMarkByCriterion = (evaluation: any, criterionName: string) => {
    if (!evaluation || !evaluation.marks || evaluation.marks.length === 0) {
      return null
    }
    // Try exact match first
    let mark = evaluation.marks.find((m: any) => 
      m.criterion_name?.toLowerCase() === criterionName.toLowerCase()
    )
    // If not found, try partial match (e.g., "code quality" matches "Code Quality")
    if (!mark) {
      mark = evaluation.marks.find((m: any) => 
        m.criterion_name?.toLowerCase().includes(criterionName.toLowerCase()) ||
        criterionName.toLowerCase().includes(m.criterion_name?.toLowerCase() || '')
      )
    }
    return mark
  }
  
  // Evaluation form state
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false)
  const [evaluationType, setEvaluationType] = useState<'PROJECT' | 'PRESENTATION' | null>(null)
  const [editingEvaluation, setEditingEvaluation] = useState<any>(null)
  const { data: templates } = useEvaluationTemplates()
  const createEvaluationMutation = useCreateEvaluation()
  const updateEvaluationMutation = useUpdateEvaluation()
  const deleteProjectMutation = useDeleteProject()
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<EvaluationFormData>()
  
  const [verificationConfig, setVerificationConfig] = useState<{
    title: string
    description: string
    highlight?: string
    confirmLabel?: string
    tone?: 'info' | 'danger'
  } | null>(null)
  const [pendingAction, setPendingAction] = useState<EvaluationFormData | null>(null)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [verificationLoading, setVerificationLoading] = useState(false)
  
  // Get marks from form or evaluation
  const watchedMarks = watch('marks')
  const watchedMarksArray = Array.isArray(watchedMarks) ? watchedMarks : []
  
  const openEvaluationModal = (type: 'PROJECT' | 'PRESENTATION', existingEvaluation?: any) => {
    // Prevent evaluation of rejected projects
    if (project?.status === 'rejected') {
      addNotification('Cannot evaluate a rejected project. The student must create a new project.', 'error', { title: 'Evaluation Not Allowed' })
      return
    }
    
    setEvaluationType(type)
    setEditingEvaluation(existingEvaluation || null)
    
    // Get template or use defaults
    const templateKey = type === 'PROJECT' ? 'project' : 'presentation'
    const template = templates?.[templateKey]
    let initialMarks: Array<{criterion_name: string; max_score: number; score: number; comments: string}> = []
    
    if (existingEvaluation && existingEvaluation.marks) {
      // Load existing evaluation marks
      initialMarks = existingEvaluation.marks.map((mark: any) => ({
        criterion_name: mark.criterion_name || '',
        max_score: mark.max_score || 0,
        score: mark.score || 0,
        comments: mark.comments || ''
      }))
    } else if (template && template.criteria && Array.isArray(template.criteria)) {
      initialMarks = template.criteria.map((criterion: any) => ({
        criterion_name: criterion.criterion_name || '',
        max_score: criterion.max_score || 0,
        score: 0,
        comments: ''
      }))
    } else {
      // Use default criteria
      const defaultCriteria = type === 'PROJECT' 
        ? [
            { criterion_name: 'Code Quality', max_score: 20 },
            { criterion_name: 'Documentation', max_score: 20 },
            { criterion_name: 'Functionality', max_score: 30 }
          ]
        : [
            { criterion_name: 'Clarity & Communication', max_score: 10 },
            { criterion_name: 'Visual Presentation', max_score: 10 },
            { criterion_name: 'Technical Explanation', max_score: 10 }
          ]
      
      initialMarks = defaultCriteria.map((criterion: any) => ({
        criterion_name: criterion.criterion_name,
        max_score: criterion.max_score,
        score: 0,
        comments: ''
      }))
    }
    
    setValue('evaluationType', type)
    setValue('marks', initialMarks)
    setValue('comments', existingEvaluation?.comments || '')
    reset({
      evaluationType: type,
      marks: initialMarks,
      comments: existingEvaluation?.comments || ''
    })
    
    setEvaluationModalOpen(true)
  }
  
  const closeEvaluationModal = () => {
    setEvaluationModalOpen(false)
    setEvaluationType(null)
    setEditingEvaluation(null)
    reset()
  }
  
  const handleEvaluationSubmit = (data: EvaluationFormData) => {
    // Calculate total score and max score, ensuring numbers are used
    const totalScore = data.marks.reduce((sum, mark) => {
      const score = typeof mark.score === 'number' ? mark.score : parseFloat(mark.score) || 0
      return sum + score
    }, 0)
    
    const totalMaxScore = data.marks.reduce((sum, mark) => {
      const maxScore = typeof mark.max_score === 'number' ? mark.max_score : parseFloat(mark.max_score) || 0
      return sum + maxScore
    }, 0)
    
    setPendingAction(data)
    setVerificationConfig({
      title: editingEvaluation ? `Update ${data.evaluationType === 'PROJECT' ? 'project' : 'presentation'} evaluation` : `Submit ${data.evaluationType === 'PROJECT' ? 'project' : 'presentation'} evaluation`,
      description: editingEvaluation 
        ? `You are about to update the evaluation for ${project?.title || 'this project'}.`
        : `You are about to finalize ${data.marks.length} criteria for ${project?.title || 'this project'}. Students will be notified once this evaluation is saved.`,
      highlight: `Scores to ${editingEvaluation ? 'update' : 'publish'}: ${totalScore} / ${totalMaxScore} points • ${data.marks.length} criteria.`,
      confirmLabel: editingEvaluation ? 'Update evaluation' : 'Submit and notify student',
      tone: 'info',
    })
  }
  
  const executePendingAction = async () => {
    if (!pendingAction) return
    
    try {
      setVerificationLoading(true)
      
      // Ensure marks are properly formatted with numeric values
      const formattedMarks = pendingAction.marks.map((mark: any) => ({
        criterion_name: mark.criterion_name,
        max_score: typeof mark.max_score === 'number' ? mark.max_score : parseFloat(mark.max_score) || 0,
        score: typeof mark.score === 'number' ? mark.score : parseFloat(mark.score) || 0,
        comments: mark.comments || ''
      }))
      
      if (editingEvaluation) {
        // Update existing evaluation - pass projectId so the hook can invalidate the right queries
        await updateEvaluationMutation.mutateAsync({
          evaluationId: editingEvaluation.id,
          projectId: projectId, // Pass projectId explicitly
          data: {
            comments: pendingAction.comments || '',
            marks: formattedMarks,
          }
        })
        
        addNotification('Evaluation updated successfully.', 'success', {
          title: 'Evaluation updated',
          audience: 'ADMIN',
          persistent: true,
        })
      } else {
        // Create new evaluation
        await createEvaluationMutation.mutateAsync({
          projectId: projectId,
          data: {
            evaluation_type: pendingAction.evaluationType,
            comments: pendingAction.comments || '',
            marks: formattedMarks,
          },
        })
        
        addNotification('Evaluation submitted successfully.', 'success', {
          title: 'Evaluation sent',
          audience: 'ADMIN',
          persistent: true,
        })
      }
      
      closeEvaluationModal()
      setVerificationConfig(null)
      setPendingAction(null)
      
      // Mutation hooks handle invalidation and refetching automatically
      // No need to manually refetch here
    } catch (error: any) {
      console.error('Evaluation submission error:', error)
      addNotification(error?.response?.data?.error || error?.message || 'Failed to submit evaluation.', 'error', {
        title: editingEvaluation ? 'Update failed' : 'Submission failed',
        audience: 'ADMIN',
        persistent: true,
      })
    } finally {
      setVerificationLoading(false)
    }
  }
  
  const closeVerificationModal = () => {
    if (verificationLoading) return
    setVerificationConfig(null)
    setPendingAction(null)
    setPendingDelete(false)
  }

  const handleDeleteProject = () => {
    setPendingDelete(true)
    setVerificationConfig({
      title: 'Delete Project',
      description: `You are about to permanently delete "${project?.title || 'this project'}". This action cannot be undone.`,
      highlight: projectEvaluation || presentationEvaluation 
        ? 'Warning: This project has evaluations. You must delete the evaluations first before deleting the project.'
        : 'All project data, including student submissions, will be permanently removed.',
      confirmLabel: 'Delete Project',
      tone: 'danger',
    })
  }

  const executeDeleteProject = async () => {
    if (!pendingDelete) return
    
    try {
      setVerificationLoading(true)
      
      await deleteProjectMutation.mutateAsync(projectId)
      
      addNotification('Project deleted successfully.', 'success', {
        title: 'Project deleted',
        audience: 'ADMIN',
        persistent: true,
      })
      
      // Navigate to projects list
      router.push('/projects')
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to delete project.'
      addNotification(errorMessage, 'error', {
        title: 'Deletion failed',
        audience: 'ADMIN',
        persistent: true,
      })
      setVerificationLoading(false)
      setPendingDelete(false)
      setVerificationConfig(null)
    }
  }

  if (projectError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 dark:bg-red-950/30 dark:border-red-800/60">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading project</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-200">
                <p>Unable to load project details. Please try again.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (projectLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Project not found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">The project you&apos;re looking for doesn&apos;t exist.</p>
          <div className="mt-6">
            <Link
              href="/projects"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-4">
                <li>
                  <Link href="/projects" className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300">
                    Projects
                  </Link>
                </li>
                <li>
                  <div className="flex items-center">
                    <svg className="flex-shrink-0 h-5 w-5 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-4 text-sm font-medium text-gray-500 dark:text-gray-400">{project.title}</span>
                  </div>
                </li>
              </ol>
            </nav>
            <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{project.title}</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Project details and evaluation history
            </p>
          </div>
          <div className="flex space-x-3">
            {isAdmin && (
              <>
                {!projectEvaluation && (
                  <button
                    onClick={() => openEvaluationModal('PROJECT')}
                    disabled={project?.status === 'rejected'}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={project?.status === 'rejected' ? 'Cannot evaluate a rejected project' : undefined}
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Evaluate Project
                  </button>
                )}
                {!presentationEvaluation && (
                  <button
                    onClick={() => openEvaluationModal('PRESENTATION')}
                    disabled={project?.status === 'rejected'}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={project?.status === 'rejected' ? 'Cannot evaluate a rejected project' : undefined}
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    Evaluate Presentation
                  </button>
                )}
                <button
                  onClick={handleDeleteProject}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Project
                </button>
              </>
            )}
            <Link
              href="/projects"
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Information */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Project Information</h3>
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Title</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{project.title}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                  <dd className="mt-1">
                    {(() => {
                      const status = project.status || 'draft'
                      const statusConfig: Record<string, { label: string; className: string }> = {
                        'pending_approval': {
                          label: 'Pending Approval',
                          className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200'
                        },
                        'draft': {
                          label: 'Draft',
                          className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-200'
                        },
                        'submitted': {
                          label: 'Submitted',
                          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                        },
                        'under_review': {
                          label: 'Under Review',
                          className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200'
                        },
                        'evaluated': {
                          label: 'Evaluated',
                          className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                        },
                        'rejected': {
                          label: 'Rejected',
                          className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                        }
                      }
                      const config = statusConfig[status] || {
                        label: 'Unknown',
                        className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-200'
                      }
                      return (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
                          {config.label}
                        </span>
                      )
                    })()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Student</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{project.student_name || 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Study Program</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{project.study_program_name || 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Level</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">Level {project.level}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {new Date(project.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
              {project.description && (
                <div className="mt-6 min-w-0 col-span-full">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 break-words whitespace-pre-wrap leading-relaxed p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
                    {project.description}
                  </dd>
                </div>
              )}
              
              {/* Student Submitted Links */}
              {(project.github_link || project.documentation_link) && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Student Submitted Links</dt>
                  <dd className="mt-1 space-y-3">
                    {project.github_link && (
                      <div className="flex items-center">
                        <a
                          href={project.github_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                          </svg>
                          View GitHub Repository
                          <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    )}
                    {project.documentation_link && (
                      <div className="flex items-center">
                        <a
                          href={project.documentation_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View Documentation
                          <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </dd>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Stats */}
        <div>
          <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Project Stats</h3>
            </div>
            <div className="px-6 py-4">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall Score</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {evaluationsLoading ? (
                      <div className="animate-pulse bg-gray-200 dark:bg-gray-800 h-8 w-16 rounded"></div>
                    ) : (() => {
                      const projectScores = projectEvaluation ? calculateScoreFromMarks(projectEvaluation) : { totalScore: 0, maxScore: 0 }
                      const presentationScores = presentationEvaluation ? calculateScoreFromMarks(presentationEvaluation) : { totalScore: 0, maxScore: 0 }
                      
                      const totalScore = projectScores.totalScore + presentationScores.totalScore
                      const totalMaxScore = projectScores.maxScore + presentationScores.maxScore
                      
                      if (totalMaxScore === 0) {
                        return <span className="text-sm text-gray-400 dark:text-gray-500">Pending</span>
                      }
                      
                      const percentage = (totalScore / totalMaxScore) * 100
                      return `${percentage.toFixed(1)}%`
                    })()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall Grade</dt>
                  <dd className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {evaluationsLoading ? (
                      <div className="animate-pulse bg-gray-200 dark:bg-gray-800 h-8 w-12 rounded"></div>
                    ) : (() => {
                      const projectScores = projectEvaluation ? calculateScoreFromMarks(projectEvaluation) : { totalScore: 0, maxScore: 0 }
                      const presentationScores = presentationEvaluation ? calculateScoreFromMarks(presentationEvaluation) : { totalScore: 0, maxScore: 0 }
                      
                      const totalScore = projectScores.totalScore + presentationScores.totalScore
                      const totalMaxScore = projectScores.maxScore + presentationScores.maxScore
                      
                      if (totalMaxScore === 0) {
                        return <span className="text-sm text-gray-400 dark:text-gray-500">N/A</span>
                      }
                      
                      const percentage = (totalScore / totalMaxScore) * 100
                      
                      // Calculate grade based on combined percentage
                      let grade = 'F'
                      if (percentage >= 90) {
                        grade = 'A'
                      } else if (percentage >= 80) {
                        grade = 'B'
                      } else if (percentage >= 70) {
                        grade = 'C'
                      } else if (percentage >= 60) {
                        grade = 'D'
                      }
                      
                      return (
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          grade === 'A'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                            : grade === 'B'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                              : grade === 'C'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
                                : grade === 'D'
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                        }`}>
                          {grade}
                        </span>
                      )
                    })()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {new Date(project.updated_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluations */}
      <div className="mt-6">
        <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Evaluations</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Each project requires both Project and Presentation evaluations</p>
              </div>
              {/* Evaluation Progress Indicator */}
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {[projectEvaluation, presentationEvaluation].filter(Boolean).length} / 2 Complete
                  </div>
                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        [projectEvaluation, presentationEvaluation].filter(Boolean).length === 2
                          ? 'bg-green-500'
                          : [projectEvaluation, presentationEvaluation].filter(Boolean).length === 1
                          ? 'bg-yellow-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      style={{ width: `${([projectEvaluation, presentationEvaluation].filter(Boolean).length / 2) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            {evaluationsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
                  </div>
                ))}
              </div>
            ) : evaluationsError ? (
              <div className="text-center py-8">
                <div className="text-red-600 dark:text-red-300">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-red-800 dark:text-red-200">Error loading evaluations</h3>
                  <p className="mt-1 text-sm text-red-600 dark:text-red-300">Unable to load evaluations.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project Evaluation */}
                <div
                  className={`border-2 rounded-lg p-4 ${
                    projectEvaluation
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      <span className="mr-2">💻</span>
                      Project Evaluation
                    </h4>
                    {projectEvaluation ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 rounded-full">Complete</span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200 rounded-full">Pending</span>
                    )}
                  </div>
                  {projectEvaluation ? (
                    <>
                      <div className="mb-3">
                        <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                          {(() => {
                            const { totalScore, maxScore } = calculateScoreFromMarks(projectEvaluation)
                            return `${totalScore}/${maxScore}`
                          })()}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Overall Score</div>
                      </div>
                      <div className="space-y-2 mb-3">
                        {projectEvaluation.marks && projectEvaluation.marks.length > 0 ? (
                          projectEvaluation.marks.map((mark: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">{mark.criterion_name}:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{mark.score || 0}/{mark.max_score || 0}</span>
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Code Quality:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{projectEvaluation.code_quality || 0}/20</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Documentation:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{projectEvaluation.documentation_score || 0}/20</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Functionality:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{projectEvaluation.functionality_score || 0}/30</span>
                            </div>
                          </>
                        )}
                      </div>
                      {projectEvaluation.comments && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{projectEvaluation.comments}</p>
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Evaluated by {projectEvaluation.admin_name || 'Unknown'} on{' '}
                          {new Date(projectEvaluation.created_at).toLocaleDateString()}
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => openEvaluationModal('PROJECT', projectEvaluation)}
                            disabled={project?.status === 'rejected'}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            title={project?.status === 'rejected' ? 'Cannot evaluate a rejected project' : undefined}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Project evaluation not yet completed</p>
                      {isAdmin && (
                        <button
                          onClick={() => openEvaluationModal('PROJECT')}
                          disabled={project?.status === 'rejected'}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={project?.status === 'rejected' ? 'Cannot evaluate a rejected project' : undefined}
                        >
                          Create Project Evaluation
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Presentation Evaluation */}
                <div
                  className={`border-2 rounded-lg p-4 ${
                    presentationEvaluation
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      <span className="mr-2">📊</span>
                      Presentation Evaluation
                    </h4>
                    {presentationEvaluation ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 rounded-full">Complete</span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200 rounded-full">Pending</span>
                    )}
                  </div>
                  {presentationEvaluation ? (
                    <>
                      <div className="mb-3">
                        <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                          {(() => {
                            const { totalScore, maxScore } = calculateScoreFromMarks(presentationEvaluation)
                            return `${totalScore}/${maxScore}`
                          })()}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Overall Score</div>
                      </div>
                      <div className="space-y-2 mb-3">
                        {presentationEvaluation.marks && presentationEvaluation.marks.length > 0 ? (
                          presentationEvaluation.marks.map((mark: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">{mark.criterion_name}:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{mark.score || 0}/{mark.max_score || 0}</span>
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Clarity & Communication:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{presentationEvaluation.clarity_communication || 0}/10</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Visual Presentation:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{presentationEvaluation.visual_presentation || 0}/10</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Technical Explanation:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{presentationEvaluation.technical_explanation || 0}/10</span>
                            </div>
                          </>
                        )}
                      </div>
                      {presentationEvaluation.comments && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{presentationEvaluation.comments}</p>
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Evaluated by {presentationEvaluation.admin_name || 'Unknown'} on{' '}
                          {new Date(presentationEvaluation.created_at).toLocaleDateString()}
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => openEvaluationModal('PRESENTATION', presentationEvaluation)}
                            disabled={project?.status === 'rejected'}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            title={project?.status === 'rejected' ? 'Cannot evaluate a rejected project' : undefined}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Presentation evaluation not yet completed</p>
                      {isAdmin && (
                        <button
                          onClick={() => openEvaluationModal('PRESENTATION')}
                          disabled={project?.status === 'rejected'}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={project?.status === 'rejected' ? 'Cannot evaluate a rejected project' : undefined}
                        >
                          Create Presentation Evaluation
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Evaluation Modal */}
      {evaluationModalOpen && evaluationType && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeEvaluationModal}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white dark:bg-gray-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {editingEvaluation ? 'Edit' : 'Create'} {evaluationType === 'PROJECT' ? 'Project' : 'Presentation'} Evaluation
                  </h3>
                  <button
                    onClick={closeEvaluationModal}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit(handleEvaluationSubmit)}>
                  <input type="hidden" {...register('evaluationType', { required: true })} />
                  
                  <div className="mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800 mb-4">
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        {evaluationType === 'PROJECT' ? '💻 Project Evaluation' : '📊 Presentation Evaluation'}
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        {evaluationType === 'PROJECT' 
                          ? 'Evaluating: Code Quality, Documentation, and Functionality'
                          : 'Evaluating: Clarity & Communication, Visual Presentation, and Technical Explanation'}
                      </p>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Project
                      </label>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{project?.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {project?.student_name} • Level {project?.level} • {project?.study_program_name}
                        </p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          Evaluation Criteria
                          {watchedMarksArray.length > 0 && (
                            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                              ({watchedMarksArray.length} criteria)
                            </span>
                          )}
                        </h4>
                        {watchedMarksArray.length > 0 && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5">
                            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                              Total: {watchedMarksArray.reduce((sum, m) => sum + (m.max_score || 0), 0)} points
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {watchedMarksArray.length === 0 ? (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                          <p className="text-sm text-yellow-800 dark:text-yellow-300">
                            No criteria loaded. Please refresh the page and try again.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {watchedMarksArray.map((mark, index) => (
                            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                                {mark.criterion_name || `Criterion ${index + 1}`}
                                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                                  (Max: {mark.max_score} points)
                                </span>
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Score *
                                  </label>
                                  <input 
                                    type="number" 
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500" 
                                    min="0" 
                                    max={mark.max_score}
                                    placeholder={`0 - ${mark.max_score}`}
                                    {...register(`marks.${index}.score`, { 
                                      required: 'Score is required',
                                      min: { value: 0, message: 'Score cannot be negative' },
                                      max: { value: mark.max_score, message: `Score cannot exceed ${mark.max_score}` }
                                    })}
                                  />
                                  {errors.marks?.[index]?.score && (
                                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.marks[index]?.score?.message}</p>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Comments (Optional)
                                  </label>
                                  <input 
                                    type="text" 
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500" 
                                    placeholder="Add comments for this criterion..."
                                    {...register(`marks.${index}.comments`)}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Overall Comments & Feedback *
                      </label>
                      <textarea 
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500" 
                        rows={4}
                        placeholder="Provide detailed feedback..."
                        {...register('comments', { required: 'Comments are required' })}
                      />
                      {errors.comments && (
                        <p className="text-red-500 text-sm mt-1">{errors.comments.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="submit" 
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      disabled={createEvaluationMutation.isPending || updateEvaluationMutation.isPending || verificationLoading}
                    >
                      {createEvaluationMutation.isPending || updateEvaluationMutation.isPending ? 'Submitting...' : editingEvaluation ? 'Update Evaluation' : 'Submit Evaluation'}
                    </button>
                    <button 
                      type="button"
                      onClick={closeEvaluationModal}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <VerificationModal
        open={!!verificationConfig}
        title={verificationConfig?.title || ''}
        description={verificationConfig?.description || ''}
        highlight={verificationConfig?.highlight}
        confirmLabel={verificationConfig?.confirmLabel || 'Confirm'}
        tone={verificationConfig?.tone || 'info'}
        loading={verificationLoading || createEvaluationMutation.isPending || updateEvaluationMutation.isPending || deleteProjectMutation.isPending}
        onConfirm={pendingDelete ? executeDeleteProject : executePendingAction}
        onCancel={closeVerificationModal}
      />
    </div>
  )
}
