'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useStudyPrograms, useCreateStudyProgram, useUpdateStudyProgram, useDeleteStudyProgram } from '../../lib/hooks'
import { useThemeStore } from '../../lib/stores'

interface StudyProgramFormData {
  code: string
  name: string
  description: string
}

export default function StudyProgramManagementPage() {
  const { isDarkMode } = useThemeStore()
  const { data: studyPrograms, isLoading, error } = useStudyPrograms()
  const createStudyProgramMutation = useCreateStudyProgram()
  const updateStudyProgramMutation = useUpdateStudyProgram()
  const deleteStudyProgramMutation = useDeleteStudyProgram()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingStudyProgram, setEditingStudyProgram] = useState<any>(null)
  const [modalTitle, setModalTitle] = useState('Add New Study Program')

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
      if (editingStudyProgram) {
        await updateStudyProgramMutation.mutateAsync({
          id: editingStudyProgram.id,
          data
        })
      } else {
        await createStudyProgramMutation.mutateAsync(data)
      }
      
      alert(editingStudyProgram ? 'Study program updated successfully!' : 'Study program created successfully!')
      closeModal()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const handleDelete = async (studyProgramId: number) => {
    if (confirm('Are you sure you want to delete this study program?')) {
      try {
        await deleteStudyProgramMutation.mutateAsync(studyProgramId)
        alert('Study program deleted successfully!')
      } catch (error: any) {
        alert(`Error: ${error.message}`)
      }
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
                {studyPrograms.map((studyProgram: any) => (
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
                      <button
                        onClick={() => handleDelete(studyProgram.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                        disabled={studyProgram.project_count > 0}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                placeholder="e.g., CSC 201"
                {...register('code', { 
                  required: 'Study program code is required',
                  pattern: {
                    value: /^[A-Z]{3}\s\d{3}$/,
                    message: 'Study program code must be in format "ABC 123"'
                  }
                })}
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
    </div>
  )
}
