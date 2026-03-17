'use client'

import React, { useState, useMemo } from 'react'
import { useProjects, useApproveProject, useRejectProject, useStudyPrograms, useBulkReleaseScores } from '../../lib/hooks'
import { useThemeStore, useAuthStore, useUIStore } from '../../lib/stores'
import Link from 'next/link'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Monitor, BarChart3, CheckCircle2, XCircle, Clock, Search, Filter, ArrowUpDown, ChevronRight, Send } from 'lucide-react'

// Valid project statuses from the system
const PROJECT_STATUSES = [
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'evaluated', label: 'Evaluated' },
  { value: 'rejected', label: 'Rejected' },
] as const

export default function ProjectsPage() {
  const { isDarkMode } = useThemeStore()
  const { user } = useAuthStore()
  const { addNotification } = useUIStore()
  const isAdmin = user?.role === 'ADMIN'
  const approveProjectMutation = useApproveProject()
  const rejectProjectMutation = useRejectProject()
  const bulkReleaseScoresMutation = useBulkReleaseScores()
  const { data: studyProgramsData, isLoading: studyProgramsLoading } = useStudyPrograms()
  const studyPrograms = studyProgramsData || []
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<'all' | '200' | '400'>('all')
  const [showStatusGuide, setShowStatusGuide] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [bulkReleaseOpen, setBulkReleaseOpen] = useState(false)
  const [bulkReleaseParams, setBulkReleaseParams] = useState({ level: 'all', study_program_id: 'all' })

  const statusInfo: Record<string, { label: string; description: string; className: string }> = {
    'pending_approval': {
      label: 'Pending Approval',
      description: 'Project created by student, awaiting administrator approval to proceed.',
      className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
    },
    'draft': {
      label: 'Draft',
      description: 'Project approved by administrator. Student can now add submission details (GitHub/Documentation links).',
      className: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400'
    },
    'submitted': {
      label: 'Submitted',
      description: 'Student has provided submission links. Ready for administrator review.',
      className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
    },
    'under_review': {
      label: 'Under Review',
      description: 'Administrator has started the evaluation process.',
      className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
    },
    'evaluated': {
      label: 'Evaluated',
      description: 'Project has been fully evaluated and scores have been released.',
      className: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
    },
    'rejected': {
      label: 'Rejected',
      description: 'Project was rejected by administrator. Student must create a new one.',
      className: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
    }
  }
  const [projectToReject, setProjectToReject] = useState<number | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionReasonError, setRejectionReasonError] = useState('')
  const [studyProgramFilter, setStudyProgramFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'title' | 'student_name' | 'status' | 'created_at'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data: projectsData, isLoading, error } = useProjects({
    search: searchTerm || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    level: levelFilter !== 'all' ? levelFilter : undefined,
    study_program_id: studyProgramFilter !== 'all' ? studyProgramFilter : undefined,
  })
  
  // Sort projects
  const sortedProjects = useMemo(() => {
    const projectsDataRaw = projectsData?.projects || projectsData || []
    const sorted = [...projectsDataRaw]
    sorted.sort((a: any, b: any) => {
      let aValue: any
      let bValue: any
      
      switch (sortBy) {
        case 'title':
          aValue = a.title?.toLowerCase() || ''
          bValue = b.title?.toLowerCase() || ''
          break
        case 'student_name':
          aValue = a.student_name?.toLowerCase() || ''
          bValue = b.student_name?.toLowerCase() || ''
          break
        case 'status':
          aValue = a.status || ''
          bValue = b.status || ''
          break
        case 'created_at':
          aValue = new Date(a.created_at || 0).getTime()
          bValue = new Date(b.created_at || 0).getTime()
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [projectsData, sortBy, sortOrder])

  const handleBulkRelease = async () => {
    try {
      const res = await bulkReleaseScoresMutation.mutateAsync({
        level: bulkReleaseParams.level !== 'all' ? parseInt(bulkReleaseParams.level) : undefined,
        study_program_id: bulkReleaseParams.study_program_id !== 'all' ? bulkReleaseParams.study_program_id : undefined
      })
      
      addNotification(res.message, 'success', { title: 'Scores Released', audience: 'ADMIN', persistent: true })
      setBulkReleaseOpen(false)
    } catch (error: any) {
      addNotification(error.response?.data?.error || 'Failed to bulk release scores', 'error')
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading projects</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Unable to load projects. Please try refreshing the page.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage and view all student projects
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setBulkReleaseOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all"
          >
            <Send className="mr-2 h-4 w-4" />
            Bulk Release Scores
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              {PROJECT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Level
            </label>
            <select
              id="level"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as 'all' | '200' | '400')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="200">Level 200</option>
              <option value="400">Level 400</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="study_program" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Study Program
            </label>
            <select
              id="study_program"
              value={studyProgramFilter}
              onChange={(e) => setStudyProgramFilter(e.target.value)}
              disabled={studyProgramsLoading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">All Study Programs</option>
              {studyPrograms.map((program: any) => (
                <option key={program.id} value={program.id.toString()}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="sort_by" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort By
            </label>
            <div className="flex gap-2">
              <select
                id="sort_by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'title' | 'student_name' | 'status' | 'created_at')}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="created_at">Date Created</option>
                <option value="title">Title</option>
                <option value="student_name">Student Name</option>
                <option value="status">Status</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Projects ({sortedProjects.length})
            </h3>
            <button
              onClick={() => setShowStatusGuide(true)}
              className="inline-flex items-center px-3 py-1.5 border border-blue-300 dark:border-blue-700 text-xs font-medium rounded-full text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              <Clock className="mr-1.5 h-4 w-4" />
              Status Guide
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
            ) : sortedProjects.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedProjects.map((project: any) => (
              <div key={project.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors overflow-hidden group">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center flex-wrap gap-2">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{project.title}</h4>
                      {(() => {
                        const status = project.status || 'draft'
                        const config = statusInfo[status] || {
                          label: 'Unknown',
                          description: 'Unknown status',
                          className: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400'
                        }
                        return (
                          <span 
                            title={config.description}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-help ${config.className}`}
                          >
                            {config.label}
                          </span>
                        )
                      })()}
                      {project.scores_released && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Scores Released
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p className="flex items-center">
                        <span className="font-medium text-gray-700 dark:text-gray-300 w-24">Student:</span> 
                        {project.student_name || 'Unknown'}
                      </p>
                      <p className="flex items-center">
                        <span className="font-medium text-gray-700 dark:text-gray-300 w-24">Program:</span> 
                        {project.study_program_name || 'Unknown'} (Level {project.level})
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                      <span className="flex items-center">
                        <Clock className="mr-1 h-3.5 w-3.5" />
                        Created {new Date(project.created_at).toLocaleDateString()}
                      </span>
                      {project.evaluation_count > 0 && (
                        <span className="flex items-center px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                          Evaluations: {project.evaluation_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-sm"
                    >
                      View Details
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                    {isAdmin && project.status === 'pending_approval' && (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              await approveProjectMutation.mutateAsync(project.id)
                              addNotification('Project approved successfully!', 'success', { title: 'Success', audience: 'ADMIN', persistent: true })
                            } catch (error: any) {
                              addNotification(`Error: ${error.response?.data?.error || error.message || 'Failed to approve project'}`, 'error', { title: 'Error', audience: 'ADMIN', persistent: true })
                            }
                          }}
                          disabled={approveProjectMutation.isPending}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {approveProjectMutation.isPending ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => {
                            setProjectToReject(project.id)
                            setRejectDialogOpen(true)
                          }}
                          disabled={rejectProjectMutation.isPending}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50/50 dark:bg-gray-800/50">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No projects found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' || levelFilter !== 'all' || studyProgramFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Get started by creating a new project evaluation.'
              }
            </p>
            {(searchTerm || statusFilter !== 'all' || levelFilter !== 'all' || studyProgramFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setLevelFilter('all')
                  setStudyProgramFilter('all')
                }}
                className="mt-4 text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk Release Dialog */}
      <ConfirmDialog
        isOpen={bulkReleaseOpen}
        onClose={() => setBulkReleaseOpen(false)}
        onConfirm={handleBulkRelease}
        title="Bulk Release Evaluation Scores"
        message={
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select a group of projects to release scores for. Only projects with both <strong>Project</strong> and <strong>Presentation</strong> evaluations complete will be affected.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Project Level</label>
                <select
                  value={bulkReleaseParams.level}
                  onChange={(e) => setBulkReleaseParams({ ...bulkReleaseParams, level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Levels</option>
                  <option value="200">Level 200</option>
                  <option value="400">Level 400</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Study Program</label>
                <select
                  value={bulkReleaseParams.study_program_id}
                  onChange={(e) => setBulkReleaseParams({ ...bulkReleaseParams, study_program_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Programs</option>
                  {studyPrograms.map((p: any) => (
                    <option key={p.id} value={p.id.toString()}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
              <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                <strong>Important:</strong> Releasing scores will notify all selected students and make their feedback visible on their dashboards. This action cannot be bulk-undone.
              </p>
            </div>
          </div>
        }
        confirmText="Release Scores"
        cancelText="Cancel"
        confirmButtonStyle="primary"
        isLoading={bulkReleaseScoresMutation.isPending}
      />

      {/* Reject Project Dialog */}
      <ConfirmDialog
        isOpen={rejectDialogOpen}
        onClose={() => {
          setRejectDialogOpen(false)
          setProjectToReject(null)
          setRejectionReason('')
          setRejectionReasonError('')
        }}
        onConfirm={async () => {
          if (!projectToReject) return
          
          // Validate rejection reason
          const trimmedReason = rejectionReason.trim()
          if (!trimmedReason) {
            setRejectionReasonError('Rejection reason is required')
            addNotification('Please provide a reason for rejecting the project', 'error', { title: 'Validation Error', audience: 'ADMIN', persistent: true })
            return
          }
          
          setRejectionReasonError('')
          try {
            await rejectProjectMutation.mutateAsync({ id: projectToReject, reason: trimmedReason })
            addNotification('Project rejected successfully!', 'success', { title: 'Success', audience: 'ADMIN', persistent: true })
            setRejectDialogOpen(false)
            setProjectToReject(null)
            setRejectionReason('')
            setRejectionReasonError('')
          } catch (error: any) {
            addNotification(`Error: ${error.response?.data?.error || error.message || 'Failed to reject project'}`, 'error', { title: 'Error', audience: 'ADMIN', persistent: true })
          }
        }}
        title="Reject Project"
        message={
          <div>
            <p className="mb-4">Are you sure you want to reject this project?</p>
            <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value)
                if (rejectionReasonError) {
                  setRejectionReasonError('')
                }
              }}
              placeholder="Enter reason for rejection..."
              required
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
                rejectionReasonError
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-red-500 focus:border-red-500'
              }`}
              rows={3}
            />
            {rejectionReasonError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{rejectionReasonError}</p>
            )}
          </div>
        }
        confirmText="Reject"
        cancelText="Cancel"
        confirmButtonStyle="danger"
        isLoading={rejectProjectMutation.isPending}
        confirmDisabled={!rejectionReason.trim()}
      />

      {/* Status Guide Modal */}
      <ConfirmDialog
        isOpen={showStatusGuide}
        onClose={() => setShowStatusGuide(false)}
        onConfirm={() => setShowStatusGuide(false)}
        title="Project Status Guide"
        message={
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Here is an explanation of what each project status code means:
            </p>
            <div className="space-y-3">
              {Object.entries(statusInfo).map(([key, info]) => (
                <div key={key} className="flex gap-3 items-start p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap mt-0.5 ${info.className}`}>
                    {info.label}
                  </span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {info.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        }
        confirmText="Got it"
        cancelText=""
        confirmButtonStyle="primary"
      />
    </div>
  )
}
