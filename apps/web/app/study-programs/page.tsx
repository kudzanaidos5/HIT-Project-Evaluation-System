'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useStudyPrograms, useCreateStudyProgram, useUpdateStudyProgram, useDeleteStudyProgram } from '../../lib/hooks'
import { useThemeStore, useUIStore } from '../../lib/stores'
import ConfirmDialog from '../../components/ConfirmDialog'

interface StudyProgramFormData {
  code: string
  name: string
  description: string
}

export default function StudyProgramManagementPage() {
  const { isDarkMode } = useThemeStore()
  const { addNotification } = useUIStore()
  const { data: studyPrograms, isLoading, error } = useStudyPrograms()
  const createStudyProgramMutation = useCreateStudyProgram()
  const updateStudyProgramMutation = useUpdateStudyProgram()
  const deleteStudyProgramMutation = useDeleteStudyProgram()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingStudyProgram, setEditingStudyProgram] = useState<any>(null)
  const [modalTitle, setModalTitle] = useState('Add New Study Program')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [studyProgramToDelete, setStudyProgramToDelete] = useState<number | null>(null)
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | '200' | '400'>('all')
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'created_at' | 'project_count'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<StudyProgramFormData>()

  const openCreateModal = () => {
    setEditingStudyProgram(null)
    setModalTitle('Add New Study Program')
    setModalOpen(true)
    reset()
  }

  const openEditModal = (studyProgram: any) => {
    setEditingStudyProgram(studyProgram)
    setModalTitle('Edit Study Program')
    setModalOpen(true)
    setValue('code', studyProgram.code)
    setValue('name', studyProgram.name)
    setValue('description', studyProgram.description || '')
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingStudyProgram(null)
    reset()
  }

  const onSubmit = async (data: StudyProgramFormData) => {
    try {
      // Convert code to uppercase
      const formattedData = {
        ...data,
        code: data.code.toUpperCase()
      }
      
      if (editingStudyProgram) {
        await updateStudyProgramMutation.mutateAsync({
          id: editingStudyProgram.id,
          data: formattedData
        })
        addNotification('Study program updated successfully!', 'success', { title: 'Success' })
      } else {
        await createStudyProgramMutation.mutateAsync(formattedData)
        addNotification('Study program created successfully!', 'success', { title: 'Success' })
      }
      
      closeModal()
    } catch (error: any) {
      addNotification(`Error: ${error.message}`, 'error', { title: 'Error' })
    }
  }

  const handleDeleteClick = (studyProgramId: number) => {
    setStudyProgramToDelete(studyProgramId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!studyProgramToDelete) return
    
    try {
      await deleteStudyProgramMutation.mutateAsync(studyProgramToDelete)
      addNotification('Study program deleted successfully!', 'success', { title: 'Success' })
      setDeleteDialogOpen(false)
      setStudyProgramToDelete(null)
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to delete study program'
      let displayMessage = errorMessage
      if (errorMessage.includes('projects')) {
        displayMessage = 'This study program has associated projects. Please delete or reassign the projects first.'
      }
      addNotification(displayMessage, 'error', { title: 'Cannot Delete Study Program' })
      setDeleteDialogOpen(false)
      setStudyProgramToDelete(null)
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
              <h3 className="text-sm font-medium text-red-800">Error loading study programs</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Unable to load study programs data. Please try refreshing the page.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Study Program Management
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 ml-14">Manage study programs and their details</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-semibold"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Study Program
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search study programs, codes, or descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setLevelFilter('all')
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Study Programs List</h3>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : studyPrograms && studyPrograms.length > 0 ? (
          (() => {
            // Filter study programs based on search and level
            const filteredPrograms = studyPrograms.filter((program: any) => {
              const matchesSearch = !searchTerm || 
                program.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                program.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                program.description?.toLowerCase().includes(searchTerm.toLowerCase())
              
              const matchesLevel = levelFilter === 'all' || 
                program.code?.endsWith(levelFilter)
              
              return matchesSearch && matchesLevel
            }).sort((a: any, b: any) => {
              let aValue: any
              let bValue: any
              
              switch (sortBy) {
                case 'code':
                  aValue = a.code?.toLowerCase() || ''
                  bValue = b.code?.toLowerCase() || ''
                  break
                case 'name':
                  aValue = a.name?.toLowerCase() || ''
                  bValue = b.name?.toLowerCase() || ''
                  break
                case 'project_count':
                  aValue = a.project_count || 0
                  bValue = b.project_count || 0
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
            
            return filteredPrograms.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Study Program Code
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Study Program Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Projects
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Created
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredPrograms.map((studyProgram: any) => (
                  <tr key={studyProgram.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {studyProgram.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {studyProgram.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {studyProgram.description || 'No description'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className="px-3 py-1 text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                        {studyProgram.project_count || 0} projects
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(studyProgram.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(studyProgram)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-4 font-semibold transition-colors"
                      >
                        Edit
                      </button>
                      {(() => {
                        const hasProjects = (studyProgram.project_count || 0) > 0
                        const deleteReason = hasProjects 
                          ? `Cannot delete: Study program has ${studyProgram.project_count} associated project(s). Please delete or reassign the projects first.`
                          : ''
                        
                        return (
                          <button
                            onClick={() => handleDeleteClick(studyProgram.id)}
                            className={`transition-colors ${
                              hasProjects
                                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                : 'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300'
                            }`}
                            disabled={hasProjects}
                            title={deleteReason}
                          >
                            Delete
                          </button>
                        )
                      })()}
                    </td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No study programs found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters.</p>
            </div>
          )
        })()
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No study programs found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new study program.</p>
          </div>
        )}
      </div>

      {/* Study Program Form Modal */}
      <div className={`modal ${modalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">{modalTitle}</h2>
            <button className="modal-close" onClick={closeModal}>×</button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label">Study Program Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., ISA200 or CS400"
                {...register('code', { 
                  required: 'Study program code is required',
                  pattern: {
                    value: /^[A-Za-z]{2,3}(200|400)$/,
                    message: 'Study program code must be 2-3 letters followed by 200 or 400 (e.g., ISA200, CS400)'
                  }
                })}
                onChange={(e) => {
                  const upperValue = e.target.value.toUpperCase()
                  e.target.value = upperValue
                  setValue('code', upperValue)
                }}
              />
              {errors.code && (
                <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Study Program Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Computer Science"
                {...register('name', { required: 'Study program name is required' })}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                placeholder="Study program description (optional)"
                rows={3}
                {...register('description')}
              />
            </div>

            <div style={{display: 'flex', gap: '15px', marginTop: '25px'}}>
              <button
                type="submit"
                className="btn-primary"
                style={{flex: 1}}
                disabled={createStudyProgramMutation.isPending || updateStudyProgramMutation.isPending}
              >
                {createStudyProgramMutation.isPending || updateStudyProgramMutation.isPending ? 'Saving...' : 'Save Study Program'}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={closeModal}
                style={{background: '#64748b', flex: 1}}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setStudyProgramToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Study Program"
        message="Are you sure you want to delete this study program? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonStyle="danger"
        isLoading={deleteStudyProgramMutation.isPending}
      />
    </div>
  )
}

