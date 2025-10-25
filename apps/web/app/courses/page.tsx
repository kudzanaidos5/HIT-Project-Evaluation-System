'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useCourses, useCreateCourse, useUpdateCourse, useDeleteCourse } from '../../lib/hooks'

interface CourseFormData {
  code: string
  name: string
  description: string
}

export default function CourseManagementPage() {
  const { data: courses, isLoading, error } = useCourses()
  const createCourseMutation = useCreateCourse()
  const updateCourseMutation = useUpdateCourse()
  const deleteCourseMutation = useDeleteCourse()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<any>(null)
  const [modalTitle, setModalTitle] = useState('Add New Course')

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<CourseFormData>()

  const openCreateModal = () => {
    setEditingCourse(null)
    setModalTitle('Add New Course')
    setModalOpen(true)
    reset()
  }

  const openEditModal = (course: any) => {
    setEditingCourse(course)
    setModalTitle('Edit Course')
    setModalOpen(true)
    setValue('code', course.code)
    setValue('name', course.name)
    setValue('description', course.description || '')
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingCourse(null)
    reset()
  }

  const onSubmit = async (data: CourseFormData) => {
    try {
      if (editingCourse) {
        await updateCourseMutation.mutateAsync({
          id: editingCourse.id,
          data
        })
      } else {
        await createCourseMutation.mutateAsync(data)
      }
      
      alert(editingCourse ? 'Course updated successfully!' : 'Course created successfully!')
      closeModal()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const handleDelete = async (courseId: number) => {
    if (confirm('Are you sure you want to delete this course?')) {
      try {
        await deleteCourseMutation.mutateAsync(courseId)
        alert('Course deleted successfully!')
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
              <h3 className="text-sm font-medium text-red-800">Error loading courses</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Unable to load courses data. Please try refreshing the page.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="page-header">
        <div className="page-title">
          <h1>Course Management</h1>
          <p className="page-subtitle">Manage courses and their details</p>
        </div>
        <div className="header-actions">
          <button
            onClick={openCreateModal}
            className="btn-primary"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Course
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Courses List</h3>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-100 rounded-md"></div>
              </div>
            ))}
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course Code
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projects
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {courses.map((course: any) => (
                  <tr key={course.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {course.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {course.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {course.description || 'No description'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {course.project_count || 0} projects
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(course.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(course)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={course.project_count > 0}
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
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No courses found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new course.</p>
          </div>
        )}
      </div>

      {/* Course Form Modal */}
      <div className={`modal ${modalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">{modalTitle}</h2>
            <button className="modal-close" onClick={closeModal}>×</button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label">Course Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., CSC 201"
                {...register('code', { 
                  required: 'Course code is required',
                  pattern: {
                    value: /^[A-Z]{3}\s\d{3}$/,
                    message: 'Course code must be in format "ABC 123"'
                  }
                })}
              />
              {errors.code && (
                <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Course Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Introduction to Programming"
                {...register('name', { required: 'Course name is required' })}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                placeholder="Course description (optional)"
                rows={3}
                {...register('description')}
              />
            </div>

            <div style={{display: 'flex', gap: '15px', marginTop: '25px'}}>
              <button
                type="submit"
                className="btn-primary"
                style={{flex: 1}}
                disabled={createCourseMutation.isPending || updateCourseMutation.isPending}
              >
                {createCourseMutation.isPending || updateCourseMutation.isPending ? 'Saving...' : 'Save Course'}
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
