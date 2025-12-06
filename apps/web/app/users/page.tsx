'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../../lib/hooks'
import { useAuthStore, useThemeStore, useUIStore } from '../../lib/stores'
import ConfirmDialog from '../../components/ConfirmDialog'

interface UserFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  registrationNumber?: string
  role: 'ADMIN' | 'STUDENT'
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuthStore()
  const { isDarkMode } = useThemeStore()
  const { addNotification } = useUIStore()
  const { data: users, isLoading, error } = useUsers()
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const deleteUserMutation = useDeleteUser()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [modalTitle, setModalTitle] = useState('Add New User')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<number | null>(null)
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'ADMIN' | 'STUDENT'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'role' | 'created_at'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<UserFormData>()
  const selectedRole = watch('role')
  const emailValue = watch('email')
  const registrationNumberValue = watch('registrationNumber')
  
  // Clear registration number when role changes to ADMIN
  useEffect(() => {
    if (selectedRole === 'ADMIN') {
      setValue('registrationNumber', '')
    }
  }, [selectedRole, setValue])
  
  // Auto-populate registration number from email for students
  useEffect(() => {
    if (selectedRole === 'STUDENT' && emailValue && emailValue.includes('@')) {
      const emailParts = emailValue.split('@')
      if (emailParts.length > 0 && emailParts[0]) {
        const emailPrefix = emailParts[0].trim().toUpperCase()
        
        // Always auto-fill registration number from email prefix for students
        // This ensures the registration number stays in sync with the email
        setValue('registrationNumber', emailPrefix, { shouldValidate: false })
      }
    }
  }, [emailValue, selectedRole, setValue])

  const openCreateModal = () => {
    setEditingUser(null)
    setModalTitle('Add New User')
    setModalOpen(true)
    reset({
      role: 'STUDENT' // Default to STUDENT so registration field shows immediately
    })
  }

  const openEditModal = (user: any) => {
    setEditingUser(user)
    setModalTitle('Edit User')
    setModalOpen(true)
    setValue('name', user.name)
    setValue('email', user.email)
    setValue('role', user.role)
    setValue('registrationNumber', user.student_profile?.student_id || '')
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingUser(null)
    reset()
  }

  const onSubmit = async (data: UserFormData) => {
    try {
      // Validate password confirmation for new users
      if (!editingUser && data.password !== data.confirmPassword) {
        addNotification('Passwords do not match', 'error', { title: 'Validation Error', audience: 'ADMIN', persistent: true })
        return
      }

      if (editingUser) {
        const updateData: any = {
          name: data.name,
          email: data.email,
          role: data.role,
        }
        if (data.password) {
          updateData.password = data.password
        }
        // Registration number is required for students
        if (data.role === 'STUDENT') {
          if (!data.registrationNumber || !data.registrationNumber.trim()) {
            addNotification('Registration number is required for students', 'error', { title: 'Validation Error', audience: 'ADMIN', persistent: true })
            return
          }
          updateData.registration_number = data.registrationNumber.trim()
        } else {
          // For non-students, don't include registration_number
          updateData.registration_number = null
        }
        
        await updateUserMutation.mutateAsync({
          id: editingUser.id,
          data: updateData
        })
        addNotification('User updated successfully!', 'success', { title: 'Success', audience: 'ADMIN', persistent: true })
      } else {
        const { confirmPassword, registrationNumber, ...userData } = data
        const createData: any = {
          ...userData,
        }
        // Registration number is required for students
        if (data.role === 'STUDENT') {
          if (!registrationNumber || !registrationNumber.trim()) {
            addNotification('Registration number is required for students', 'error', { title: 'Validation Error', audience: 'ADMIN', persistent: true })
            return
          }
          createData.registration_number = registrationNumber.trim()
        }
        await createUserMutation.mutateAsync(createData)
        addNotification('User created successfully!', 'success', { title: 'Success', audience: 'ADMIN', persistent: true })
      }
      
      closeModal()
    } catch (error: any) {
      const errorData = error?.response?.data || {}
      const errorMessage = errorData.error || errorData.details || error?.message || 'Failed to save user'
      addNotification(errorMessage, 'error', { title: 'Error', audience: 'ADMIN', persistent: true })
    }
  }

  const handleDeleteClick = (userId: number) => {
    if (userId === currentUser?.id) {
      addNotification('You cannot delete your own account', 'error', { title: 'Error', audience: 'ADMIN', persistent: true })
      return
    }
    setUserToDelete(userId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return
    
    try {
      await deleteUserMutation.mutateAsync(userToDelete)
      addNotification('User deleted successfully!', 'success', { title: 'Success', audience: 'ADMIN', persistent: true })
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    } catch (error: any) {
      const errorData = error?.response?.data || {}
      const errorMessage = errorData.error || error?.message || 'Failed to delete user'
      const errorDetails = errorData.details || errorMessage
      
      // Use the detailed message from backend if available, otherwise use the error message
      const displayMessage = errorDetails || errorMessage
      
      addNotification(displayMessage, 'error', { title: 'Cannot Delete User', audience: 'ADMIN', persistent: true })
      setDeleteDialogOpen(false)
      setUserToDelete(null)
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
              <h3 className="text-sm font-medium text-red-800">Error loading users</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Unable to load users data. Please try refreshing the page.</p>
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
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              User Management
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 ml-14">Manage system users and their roles</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-semibold"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add User
        </button>
      </div>

      {/* Info Message */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-semibold mb-1">User Management Guidelines</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
              <li>You can <strong>edit</strong> any user&apos;s information (name, email, role, password)</li>
              <li>Users with associated <strong>projects</strong> or <strong>evaluations</strong> cannot be deleted to maintain data integrity</li>
              <li>Hover over disabled Delete buttons to see the reason</li>
            </ul>
          </div>
        </div>
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
              placeholder="Search users, emails, or student IDs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <select
              id="role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | 'ADMIN' | 'STUDENT')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="STUDENT">Student</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setRoleFilter('all')
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
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Users List</h3>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : users && users.length > 0 ? (
          (() => {
            // Filter users based on search and role
            const filteredUsers = users.filter((user: any) => {
              const matchesSearch = !searchTerm || 
                user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.student_profile?.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
              
              const matchesRole = roleFilter === 'all' || user.role === roleFilter
              
              return matchesSearch && matchesRole
            }).sort((a: any, b: any) => {
              let aValue: any
              let bValue: any
              
              switch (sortBy) {
                case 'name':
                  aValue = a.name?.toLowerCase() || ''
                  bValue = b.name?.toLowerCase() || ''
                  break
                case 'email':
                  aValue = a.email?.toLowerCase() || ''
                  bValue = b.email?.toLowerCase() || ''
                  break
                case 'role':
                  aValue = a.role || ''
                  bValue = b.role || ''
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
            
            return filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Role
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
                    {filteredUsers.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.name}
                      {user.id === currentUser?.id && (
                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-semibold">(You)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                        user.role === 'ADMIN' 
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' 
                          : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-4 font-semibold transition-colors"
                      >
                        Edit
                      </button>
                      {(() => {
                        const hasProjects = (user.project_count || 0) > 0
                        const hasEvaluations = (user.evaluation_count || 0) > 0
                        const cannotDelete = user.id === currentUser?.id || hasProjects || hasEvaluations
                        const deleteReason = user.id === currentUser?.id 
                          ? 'You cannot delete your own account'
                          : hasProjects 
                          ? `Cannot delete: User has ${user.project_count} associated project(s)`
                          : hasEvaluations
                          ? `Cannot delete: User has created ${user.evaluation_count} evaluation(s)`
                          : ''
                        
                        return (
                          <button
                            onClick={() => handleDeleteClick(user.id)}
                            className={`transition-colors ${
                              cannotDelete
                                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                : 'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300'
                            }`}
                            disabled={cannotDelete}
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
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No users found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters.</p>
            </div>
          )
        })()
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No users found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new user.</p>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      <div className={`modal ${modalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">{modalTitle}</h2>
            <button className="modal-close" onClick={closeModal}>×</button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@hit\.ac\.zw$/i,
                    message: 'Email must be a valid HIT email address (@hit.ac.zw)'
                  },
                  validate: (value) => {
                    if (!value.toLowerCase().endsWith('@hit.ac.zw')) {
                      return 'Email must end with @hit.ac.zw'
                    }
                    return true
                  }
                })}
                placeholder="username@hit.ac.zw"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                {...register('password', { 
                  required: editingUser ? false : 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                })}
                placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter password'}
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            {!editingUser && (
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  className="form-input"
                  {...register('confirmPassword', { 
                    required: 'Please confirm your password',
                    validate: (value) => {
                      const password = (document.querySelector('input[name="password"]') as HTMLInputElement)?.value
                      return value === password || 'Passwords do not match'
                    }
                  })}
                  placeholder="Confirm password"
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-select"
                {...register('role', { required: 'Role is required' })}
              >
                <option value="STUDENT">Student</option>
                <option value="ADMIN">Admin</option>
              </select>
              {errors.role && (
                <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>
              )}
            </div>

            {selectedRole === 'STUDENT' && (
              <div className="form-group">
                <label className="form-label">Student Registration Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  {...register('registrationNumber', {
                    required: 'Registration number is required for students',
                    pattern: {
                      value: /^[A-Za-z]\d{6}[A-Za-z]$/,
                      message: 'Registration number must match format: 1 letter + 6 digits + 1 letter (e.g., H230376W)'
                    },
                    validate: (value) => {
                      if (selectedRole === 'STUDENT' && (!value || !value.trim())) {
                        return 'Registration number is required for students'
                      }
                      return true
                    }
                  })}
                  placeholder="e.g., H230376W"
                />
                {errors.registrationNumber && (
                  <p className="text-red-500 text-sm mt-1">{errors.registrationNumber.message}</p>
                )}
              </div>
            )}

            <div style={{display: 'flex', gap: '15px', marginTop: '25px'}}>
              <button
                type="submit"
                className="btn-primary"
                style={{flex: 1}}
                disabled={createUserMutation.isPending || updateUserMutation.isPending}
              >
                {createUserMutation.isPending || updateUserMutation.isPending ? 'Saving...' : 'Save User'}
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
          setUserToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonStyle="danger"
        isLoading={deleteUserMutation.isPending}
      />
    </div>
  )
}
