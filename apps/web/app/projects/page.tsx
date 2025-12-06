'use client'

import React, { useState, useMemo } from 'react'
import { useProjects, useApproveProject, useRejectProject, useStudyPrograms } from '../../lib/hooks'
import { useThemeStore, useAuthStore, useUIStore } from '../../lib/stores'
import Link from 'next/link'
import ConfirmDialog from '../../components/ConfirmDialog'

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
  const { data: studyProgramsData, isLoading: studyProgramsLoading } = useStudyPrograms()
  const studyPrograms = studyProgramsData || []
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [projectToReject, setProjectToReject] = useState<number | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionReasonError, setRejectionReasonError] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | '200' | '400'>('all')
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
  const projects = useMemo(() => {
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage and view all student projects
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search projects, students, or study programs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
                  {program.code}
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
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setLevelFilter('all')
                setStudyProgramFilter('all')
                setSortBy('created_at')
                setSortOrder('desc')
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Projects ({projects.length})
            </h3>
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
            ) : projects.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {projects.map((project: any) => (
              <div key={project.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center flex-wrap gap-2">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">{project.title}</h4>
                      {(() => {
                        const status = project.status || 'draft'
                        const statusConfig: Record<string, { label: string; className: string }> = {
                          'pending_approval': {
                            label: 'Pending Approval',
                            className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
                          },
                          'draft': {
                            label: 'Draft',
                            className: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400'
                          },
                          'submitted': {
                            label: 'Submitted',
                            className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                          },
                          'under_review': {
                            label: 'Under Review',
                            className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
                          },
                          'evaluated': {
                            label: 'Evaluated',
                            className: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          },
                          'rejected': {
                            label: 'Rejected',
                            className: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                          }
                        }
                        const config = statusConfig[status] || {
                          label: 'Unknown',
                          className: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400'
                        }
                        return (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
                            {config.label}
                          </span>
                        )
                      })()}
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <p><strong>Student:</strong> {project.student_name || 'Unknown'}</p>
                      <p><strong>Study Program:</strong> {project.study_program_name || 'Unknown'} (Level {project.level})</p>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                      Created: {new Date(project.created_at).toLocaleDateString()}
                      {project.evaluation_count > 0 && (
                        <span className="ml-4">
                          Evaluations: {project.evaluation_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
                    >
                      View Details
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
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {approveProjectMutation.isPending ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => {
                            setProjectToReject(project.id)
                            setRejectDialogOpen(true)
                          }}
                          disabled={rejectProjectMutation.isPending}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
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
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No projects found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' || levelFilter !== 'all'
                ? 'Try adjusting your search criteria.'
                : 'Get started by creating a new project evaluation.'
              }
            </p>
          </div>
        )}
      </div>

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
    </div>
  )
}
