'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useThemeStore, useUIStore } from '../../lib/stores'

interface GradeClassificationFormData {
  grade: string
  min_percentage: number
  max_percentage: number
  description: string
}

const DEFAULT_GRADES = [
  { grade: 'A', min_percentage: 90, max_percentage: 100, description: 'Excellent' },
  { grade: 'B', min_percentage: 80, max_percentage: 89, description: 'Good' },
  { grade: 'C', min_percentage: 70, max_percentage: 79, description: 'Satisfactory' },
  { grade: 'D', min_percentage: 60, max_percentage: 69, description: 'Pass' },
  { grade: 'F', min_percentage: 0, max_percentage: 59, description: 'Fail' },
]

export default function GradeClassificationPage() {
  const { isDarkMode } = useThemeStore()
  const { addNotification } = useUIStore()
  
  const [gradeClassifications, setGradeClassifications] = useState(DEFAULT_GRADES)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGrade, setEditingGrade] = useState<any>(null)
  const [modalTitle, setModalTitle] = useState('Add New Grade Classification')

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<GradeClassificationFormData>()

  const openCreateModal = () => {
    setEditingGrade(null)
    setModalTitle('Add New Grade Classification')
    setModalOpen(true)
    reset()
  }

  const openEditModal = (grade: any) => {
    setEditingGrade(grade)
    setModalTitle('Edit Grade Classification')
    setModalOpen(true)
    setValue('grade', grade.grade)
    setValue('min_percentage', grade.min_percentage)
    setValue('max_percentage', grade.max_percentage)
    setValue('description', grade.description || '')
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingGrade(null)
    reset()
  }

  const onSubmit = async (data: GradeClassificationFormData) => {
    try {
      // Validate percentage ranges
      if (data.min_percentage < 0 || data.min_percentage > 100) {
        addNotification('Minimum percentage must be between 0 and 100', 'error', { title: 'Validation Error' })
        return
      }
      if (data.max_percentage < 0 || data.max_percentage > 100) {
        addNotification('Maximum percentage must be between 0 and 100', 'error', { title: 'Validation Error' })
        return
      }
      if (data.min_percentage > data.max_percentage) {
        addNotification('Minimum percentage cannot be greater than maximum percentage', 'error', { title: 'Validation Error' })
        return
      }

      // TODO: Replace with actual API call
      // For now, just update local state
      if (editingGrade) {
        setGradeClassifications(prev => 
          prev.map(g => g.grade === editingGrade.grade ? data : g)
        )
        addNotification('Grade classification updated successfully!', 'success', { title: 'Success' })
      } else {
        // Check if grade already exists
        if (gradeClassifications.some(g => g.grade === data.grade)) {
          addNotification('Grade already exists', 'error', { title: 'Error' })
          return
        }
        setGradeClassifications(prev => [...prev, data])
        addNotification('Grade classification created successfully!', 'success', { title: 'Success' })
      }
      
      closeModal()
    } catch (error: any) {
      addNotification(error?.message || 'Failed to save grade classification', 'error', { title: 'Error' })
    }
  }

  const handleDelete = (grade: string) => {
    if (window.confirm(`Are you sure you want to delete grade classification "${grade}"?`)) {
      setGradeClassifications(prev => prev.filter(g => g.grade !== grade))
      addNotification('Grade classification deleted successfully!', 'success', { title: 'Success' })
    }
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-br from-blue-500 to-indigo-600 bg-clip-text text-transparent">
            Grade Classification Management
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 ml-14">Manage grade thresholds and classifications for project evaluations</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Grade Classifications</h3>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Grade Classification
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Grade
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Min Percentage
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Max Percentage
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {gradeClassifications
                .sort((a, b) => b.min_percentage - a.min_percentage)
                .map((grade) => (
                  <tr key={grade.grade} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 text-sm font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                        {grade.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {grade.min_percentage}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {grade.max_percentage}%
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {grade.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(grade)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(grade.grade)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{modalTitle}</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Grade <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="grade"
                  {...register('grade', { 
                    required: 'Grade is required',
                    pattern: {
                      value: /^[A-F]$/,
                      message: 'Grade must be a single letter (A-F)'
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="A, B, C, D, or F"
                  maxLength={1}
                  disabled={!!editingGrade}
                />
                {errors.grade && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.grade.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="min_percentage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min Percentage <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="min_percentage"
                    {...register('min_percentage', { 
                      required: 'Minimum percentage is required',
                      min: { value: 0, message: 'Must be between 0 and 100' },
                      max: { value: 100, message: 'Must be between 0 and 100' }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                  {errors.min_percentage && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.min_percentage.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="max_percentage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Percentage <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="max_percentage"
                    {...register('max_percentage', { 
                      required: 'Maximum percentage is required',
                      min: { value: 0, message: 'Must be between 0 and 100' },
                      max: { value: 100, message: 'Must be between 0 and 100' }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="100"
                    min="0"
                    max="100"
                  />
                  {errors.max_percentage && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.max_percentage.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  id="description"
                  {...register('description')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Excellent, Good, Satisfactory"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
                >
                  {editingGrade ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

