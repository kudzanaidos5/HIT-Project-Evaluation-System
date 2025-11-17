'use client'

import React from 'react'
import { useProject, useProjectEvaluations } from '../../../lib/hooks'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = parseInt(params.id as string)
  
  const { data: projectData, isLoading: projectLoading, error: projectError } = useProject(projectId)
  const project = projectData
  const { data: evaluationsData, isLoading: evaluationsLoading, error: evaluationsError } = useProjectEvaluations(projectId)
  const projectEvaluation = evaluationsData?.project_evaluation || null
  const presentationEvaluation = evaluationsData?.presentation_evaluation || null
  const allEvaluations = evaluationsData?.all_evaluations || []

  if (projectError) {
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
              <h3 className="text-sm font-medium text-red-800">Error loading project</h3>
              <div className="mt-2 text-sm text-red-700">
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
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Project not found</h3>
          <p className="mt-1 text-sm text-gray-500">The project you're looking for doesn't exist.</p>
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-4">
                <li>
                  <Link href="/projects" className="text-gray-400 hover:text-gray-500">
                    Projects
                  </Link>
                </li>
                <li>
                  <div className="flex items-center">
                    <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-4 text-sm font-medium text-gray-500">{project.title}</span>
                  </div>
                </li>
              </ol>
            </nav>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">{project.title}</h1>
            <p className="mt-2 text-gray-600">
              Project details and evaluation history
            </p>
          </div>
          <div className="flex space-x-3">
            {project.status === 'pending' && (
              <Link
                href={`/evaluation?projectId=${project.id}`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Evaluate Project
              </Link>
            )}
            <Link
              href="/projects"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Information */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Project Information</h3>
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Title</dt>
                  <dd className="mt-1 text-sm text-gray-900">{project.title}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      project.status === 'evaluated' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {project.status === 'evaluated' ? 'Evaluated' : 'Pending'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Student</dt>
                  <dd className="mt-1 text-sm text-gray-900">{project.student_name || 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Study Program</dt>
                  <dd className="mt-1 text-sm text-gray-900">{project.study_program_name || 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Level</dt>
                  <dd className="mt-1 text-sm text-gray-900">Level {project.level}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(project.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
              {project.description && (
                <div className="mt-6">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900">{project.description}</dd>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Stats */}
        <div>
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Project Stats</h3>
            </div>
            <div className="px-6 py-4">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Project Evaluation</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900">
                    {evaluationsLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : projectEvaluation ? (
                      `${projectEvaluation.total_score.toFixed(1)}%`
                    ) : (
                      <span className="text-sm text-gray-400">Pending</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Presentation Evaluation</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900">
                    {evaluationsLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : presentationEvaluation ? (
                      `${presentationEvaluation.total_score.toFixed(1)}%`
                    ) : (
                      <span className="text-sm text-gray-400">Pending</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Overall Grade</dt>
                  <dd className="mt-1 text-xl font-semibold text-gray-900">
                    {evaluationsLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                    ) : projectEvaluation?.grade ? (
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        projectEvaluation.grade === 'A' ? 'bg-green-100 text-green-800' :
                        projectEvaluation.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                        projectEvaluation.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                        projectEvaluation.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {projectEvaluation.grade}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">N/A</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
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
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Evaluations</h3>
            <p className="mt-1 text-sm text-gray-500">Each project requires both Project and Presentation evaluations</p>
          </div>
          <div className="px-6 py-4">
            {evaluationsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-32 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : evaluationsError ? (
              <div className="text-center py-8">
                <div className="text-red-600">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-red-800">Error loading evaluations</h3>
                  <p className="mt-1 text-sm text-red-600">Unable to load evaluations.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project Evaluation */}
                <div className={`border-2 rounded-lg p-4 ${projectEvaluation ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                      <span className="mr-2">💻</span>
                      Project Evaluation
                    </h4>
                    {projectEvaluation ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Complete</span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending</span>
                    )}
                  </div>
                  {projectEvaluation ? (
                    <>
                      <div className="mb-3">
                        <div className="text-3xl font-bold text-gray-900 mb-1">
                          {projectEvaluation.total_score.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-500">Overall Score</div>
                      </div>
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Code Quality:</span>
                          <span className="font-medium">{projectEvaluation.code_quality || 0}/20</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Documentation:</span>
                          <span className="font-medium">{projectEvaluation.documentation_score || 0}/20</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Functionality:</span>
                          <span className="font-medium">{projectEvaluation.functionality_score || 0}/30</span>
                        </div>
                      </div>
                      {projectEvaluation.comments && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-700">{projectEvaluation.comments}</p>
                        </div>
                      )}
                      <div className="mt-3 text-xs text-gray-500">
                        Evaluated by {projectEvaluation.admin_name || 'Unknown'} on{' '}
                        {new Date(projectEvaluation.created_at).toLocaleDateString()}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500 mb-4">Project evaluation not yet completed</p>
                      <Link
                        href={`/evaluation?projectId=${project.id}`}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Create Project Evaluation
                      </Link>
                    </div>
                  )}
                </div>

                {/* Presentation Evaluation */}
                <div className={`border-2 rounded-lg p-4 ${presentationEvaluation ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                      <span className="mr-2">📊</span>
                      Presentation Evaluation
                    </h4>
                    {presentationEvaluation ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Complete</span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending</span>
                    )}
                  </div>
                  {presentationEvaluation ? (
                    <>
                      <div className="mb-3">
                        <div className="text-3xl font-bold text-gray-900 mb-1">
                          {presentationEvaluation.total_score.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-500">Overall Score</div>
                      </div>
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Clarity & Communication:</span>
                          <span className="font-medium">{presentationEvaluation.clarity_communication || 0}/10</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Visual Presentation:</span>
                          <span className="font-medium">{presentationEvaluation.visual_presentation || 0}/10</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Technical Explanation:</span>
                          <span className="font-medium">{presentationEvaluation.technical_explanation || 0}/10</span>
                        </div>
                      </div>
                      {presentationEvaluation.comments && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-700">{presentationEvaluation.comments}</p>
                        </div>
                      )}
                      <div className="mt-3 text-xs text-gray-500">
                        Evaluated by {presentationEvaluation.admin_name || 'Unknown'} on{' '}
                        {new Date(presentationEvaluation.created_at).toLocaleDateString()}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500 mb-4">Presentation evaluation not yet completed</p>
                      <Link
                        href={`/evaluation?projectId=${project.id}`}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Create Presentation Evaluation
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
