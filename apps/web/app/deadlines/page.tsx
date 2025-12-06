'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { analyticsAPI } from '../../lib/api'
import { useThemeStore, useUIStore, useAuthStore } from '../../lib/stores'
import { Calendar, Clock, AlertCircle, CheckCircle, Save, User, Mail, BookOpen } from 'lucide-react'
import Link from 'next/link'

interface Deadline {
  id: number
  level: number
  deadline: string
  created_at: string
  updated_at: string
}

interface MissedDeadlineStudent {
  project_id: number
  project_title: string
  student_id: number
  student_name: string
  student_email: string
  student_registration: string | null
  study_program: string | null
  submitted_at: string | null
  deadline: string
  days_overdue: number
}

export default function DeadlinesPage() {
  const { isDarkMode } = useThemeStore()
  const { addNotification } = useUIStore()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'
  const [localDeadlines, setLocalDeadlines] = useState<Record<number, string>>({
    200: '',
    400: ''
  })

  const queryClient = useQueryClient()

  // Fetch existing deadlines
  const { data: deadlines, isLoading } = useQuery({
    queryKey: ['deadlines'],
    queryFn: analyticsAPI.getDeadlines
  }) as { data: Deadline[] | undefined; isLoading: boolean }

  // Fetch students who missed deadlines (admin only)
  const { data: missedDeadlines, isLoading: missedLoading } = useQuery({
    queryKey: ['missed-deadlines'],
    queryFn: analyticsAPI.getMissedDeadlines,
    enabled: isAdmin, // Only fetch for admins
    refetchInterval: 60000, // Refetch every minute
  }) as { data: { level_200: MissedDeadlineStudent[]; level_400: MissedDeadlineStudent[] } | undefined; isLoading: boolean }

  useEffect(() => {
    if (deadlines && Array.isArray(deadlines) && deadlines.length > 0) {
      const formatted: Record<number, string> = {}
      deadlines.forEach((dl: Deadline) => {
        // Convert ISO string to local datetime-local format
        const date = new Date(dl.deadline)
        const localDateTime = date.toISOString().slice(0, 16)
        formatted[dl.level] = localDateTime
      })
      setLocalDeadlines(formatted)
    }
  }, [deadlines])

  // Create/update deadline mutation
  const saveDeadlineMutation = useMutation({
    mutationFn: async ({ level, deadline }: { level: number; deadline: string }) => {
      // Convert local datetime to ISO string
      const isoString = new Date(deadline).toISOString()
      return analyticsAPI.createDeadline({ level, deadline: isoString })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deadlines'] })
      addNotification('Deadline saved successfully!', 'success', { title: 'Success' })
    },
    onError: (error: any) => {
      addNotification(`Failed to save deadline: ${error.message}`, 'error', { title: 'Error' })
    }
  })

  const handleDeadlineChange = (level: number, value: string) => {
    setLocalDeadlines(prev => ({
      ...prev,
      [level]: value
    }))
  }

  const handleSave = (level: number) => {
    const deadline = localDeadlines[level]
    if (!deadline) {
      addNotification('Please select a date and time', 'warning', { title: 'Validation Error' })
      return
    }
    saveDeadlineMutation.mutate({ level, deadline })
  }

  const formatDeadlineDate = (deadlineStr: string) => {
    if (!deadlineStr) return 'Not set'
    const date = new Date(deadlineStr)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isOverdue = (deadlineStr: string) => {
    if (!deadlineStr) return false
    return new Date(deadlineStr) < new Date()
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
          <Clock className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Project Deadlines</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage submission deadlines for Level 200 and 400 projects</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Level 200 Deadline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-2xl transition-all duration-300">
            <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 px-6 py-5">
              <h2 className="text-2xl font-bold text-white">Level 200 Projects</h2>
              <p className="text-blue-100 text-sm mt-1">Undergraduate Level Projects</p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Current Deadline Display */}
              {(() => {
                const deadline = deadlines?.find((dl: Deadline) => dl.level === 200)
                if (!deadline) return null
                return (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      {isOverdue(deadline.deadline) ? (
                        <AlertCircle className="h-6 w-6 text-red-500 mt-0.5" />
                      ) : (
                        <CheckCircle className="h-6 w-6 text-green-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Deadline</p>
                        <p className={`text-xl font-bold mt-1 ${
                          isOverdue(deadline.deadline) 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {formatDeadlineDate(deadline.deadline)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Deadline Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Set New Deadline
                </label>
                <div className="flex gap-3">
                  <input
                    type="datetime-local"
                    value={localDeadlines[200]}
                    onChange={(e) => handleDeadlineChange(200, e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    onClick={() => handleSave(200)}
                    disabled={saveDeadlineMutation.isPending}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <Save className="h-5 w-5" />
                    {saveDeadlineMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Level 400 Deadline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-2xl transition-all duration-300">
            <div className="bg-gradient-to-r from-purple-500 via-purple-600 to-pink-600 px-6 py-5">
              <h2 className="text-2xl font-bold text-white">Level 400 Projects</h2>
              <p className="text-purple-100 text-sm mt-1">Advanced Undergraduate Projects</p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Current Deadline Display */}
              {(() => {
                const deadline = deadlines?.find((dl: Deadline) => dl.level === 400)
                if (!deadline) return null
                return (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-5 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-start gap-3">
                      {isOverdue(deadline.deadline) ? (
                        <AlertCircle className="h-6 w-6 text-red-500 mt-0.5" />
                      ) : (
                        <CheckCircle className="h-6 w-6 text-green-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Deadline</p>
                        <p className={`text-xl font-bold mt-1 ${
                          isOverdue(deadline.deadline) 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {formatDeadlineDate(deadline.deadline)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Deadline Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Set New Deadline
                </label>
                <div className="flex gap-3">
                  <input
                    type="datetime-local"
                    value={localDeadlines[400]}
                    onChange={(e) => handleDeadlineChange(400, e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                  <button
                    onClick={() => handleSave(400)}
                    disabled={saveDeadlineMutation.isPending}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <Save className="h-5 w-5" />
                    {saveDeadlineMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Missed Deadlines Section - Only show for admins */}
      {isAdmin && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl shadow-lg">
              <AlertCircle className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                Missed Deadlines
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Students who have missed their submission deadlines</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Level 200 Missed Deadlines */}
            {missedDeadlines?.level_200 && missedDeadlines.level_200.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-red-200 dark:border-red-800 overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 via-red-600 to-orange-600 px-6 py-5">
                  <h3 className="text-2xl font-bold text-white">Level 200 - Missed Deadlines</h3>
                  <p className="text-red-100 text-sm mt-1">
                    {missedDeadlines.level_200.length} student{missedDeadlines.level_200.length !== 1 ? 's' : ''} missed the deadline
                  </p>
                </div>
                <div className="p-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {missedDeadlines.level_200.map((student) => (
                      <div
                        key={student.project_id}
                        className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <Link
                              href={`/projects/${student.project_id}`}
                              className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              {student.project_title}
                            </Link>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 rounded-full">
                            {student.days_overdue} day{student.days_overdue !== 1 ? 's' : ''} overdue
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{student.student_name}</span>
                            {student.student_registration && (
                              <span className="text-gray-500 dark:text-gray-500">
                                ({student.student_registration})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>{student.student_email}</span>
                          </div>
                          {student.study_program && (
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              <span>{student.study_program}</span>
                            </div>
                          )}
                          {student.submitted_at && (
                            <div className="text-xs text-orange-600 dark:text-orange-400 mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                              Submitted late: {new Date(student.submitted_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Level 400 Missed Deadlines */}
            {missedDeadlines?.level_400 && missedDeadlines.level_400.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-red-200 dark:border-red-800 overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 via-red-600 to-orange-600 px-6 py-5">
                  <h3 className="text-2xl font-bold text-white">Level 400 - Missed Deadlines</h3>
                  <p className="text-red-100 text-sm mt-1">
                    {missedDeadlines.level_400.length} student{missedDeadlines.level_400.length !== 1 ? 's' : ''} missed the deadline
                  </p>
                </div>
                <div className="p-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {missedDeadlines.level_400.map((student) => (
                      <div
                        key={student.project_id}
                        className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <Link
                              href={`/projects/${student.project_id}`}
                              className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              {student.project_title}
                            </Link>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 rounded-full">
                            {student.days_overdue} day{student.days_overdue !== 1 ? 's' : ''} overdue
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{student.student_name}</span>
                            {student.student_registration && (
                              <span className="text-gray-500 dark:text-gray-500">
                                ({student.student_registration})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>{student.student_email}</span>
                          </div>
                          {student.study_program && (
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              <span>{student.study_program}</span>
                            </div>
                          )}
                          {student.submitted_at && (
                            <div className="text-xs text-orange-600 dark:text-orange-400 mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                              Submitted late: {new Date(student.submitted_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Empty State */}
          {missedLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : (
            (!missedDeadlines?.level_200 || missedDeadlines.level_200.length === 0) && 
            (!missedDeadlines?.level_400 || missedDeadlines.level_400.length === 0) && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                  All Students Met Their Deadlines!
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  No students have missed their submission deadlines.
                </p>
              </div>
            )
          )}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-3 text-lg">Deadline Management</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 font-bold">•</span>
                <span>Set separate deadlines for Level 200 and Level 400 projects</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 font-bold">•</span>
                <span>Students will see their relevant deadline based on their project level</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 font-bold">•</span>
                <span>Deadlines can be updated at any time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 font-bold">•</span>
                <span>Students cannot submit projects after the deadline has passed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 font-bold">•</span>
                <span>The system automatically tracks students who miss deadlines</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

