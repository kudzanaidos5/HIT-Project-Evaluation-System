'use client'

import React, { useState, useMemo } from 'react'
import { useProjects } from '../../../lib/hooks'
import { useThemeStore } from '../../../lib/stores'
import Link from 'next/link'

export default function PendingProjectsPage() {
  const { isDarkMode } = useThemeStore()
  const { data: projectsData, isLoading, error } = useProjects()
  const projects = useMemo(() => projectsData?.projects || projectsData || [], [projectsData])
  const [searchTerm, setSearchTerm] = useState('')

  // Filter only pending projects
  const pendingProjects = useMemo(() => {
    if (!projects || !Array.isArray(projects)) return []
    
    return projects.filter(project => 
      project.status === 'pending' &&
      (project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       project.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       project.study_program_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [projects, searchTerm])

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
                <p>Unable to load pending projects. Please try refreshing the page.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <Link href="/projects" className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400">
                Projects
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="flex-shrink-0 h-5 w-5 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="ml-4 text-sm font-medium text-gray-500 dark:text-gray-400">Pending Projects</span>
              </div>
            </li>
          </ol>
        </nav>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">Pending Projects</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Projects awaiting evaluation
        </p>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <div className="max-w-md">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search Pending Projects
          </label>
          <input
            type="text"
            id="search"
            placeholder="Search by project title, student, or course..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Pending Projects ({pendingProjects.length})
            </h3>
            <Link
              href="/evaluation"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Evaluation
            </Link>
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
        ) : pendingProjects.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {pendingProjects.map((project) => (
              <div key={project.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">{project.title}</h4>
                      <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                        Pending
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <p><strong>Student:</strong> {project.student_name || 'Unknown'}</p>
                      <p><strong>Study Program:</strong> {project.study_program_name || 'Unknown'} (Level {project.level})</p>
                      {project.description && (
                        <p className="mt-1"><strong>Description:</strong> {project.description}</p>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                      Created: {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/evaluation?projectId=${project.id}`}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Evaluate Now
                    </Link>
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
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No pending projects</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm 
                ? 'No pending projects match your search criteria.'
                : 'All projects have been evaluated!'
              }
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link
                  href="/projects"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View All Projects
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
