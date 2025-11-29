'use client'

import React, { useMemo, useState } from 'react'
import { useReportSummary } from '../../lib/hooks'
import { reportsAPI } from '../../lib/api'
import { useUIStore } from '../../lib/stores'

type LevelOption = 'all' | '200' | '400'

interface ReportFilters {
  level?: number
  start_date?: string
  end_date?: string
}

const statusColors: Record<string, string> = {
  evaluated: 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/40',
  pending: 'text-yellow-600 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/40',
  rejected: 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/40',
  review: 'text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40',
}

const formatDateTime = (value?: string) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function ReportsPage() {
  const { addNotification } = useUIStore()
  const [selectedLevel, setSelectedLevel] = useState<LevelOption>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'pdf' | null>(null)

  const filterParams = useMemo<ReportFilters>(() => {
    const filters: ReportFilters = {}
    if (selectedLevel !== 'all') {
      filters.level = parseInt(selectedLevel, 10)
    }
    if (dateRange.start) {
      filters.start_date = dateRange.start
    }
    if (dateRange.end) {
      filters.end_date = dateRange.end
    }
    return filters
  }, [dateRange.end, dateRange.start, selectedLevel])

  const reportQuery = useReportSummary(filterParams)

  const handleDownload = async (format: 'csv' | 'pdf') => {
    try {
      setExportingFormat(format)
      const downloader = format === 'csv' ? reportsAPI.downloadCsv : reportsAPI.downloadPdf
      const blob = await downloader(filterParams)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      link.href = url
      link.download = `evaluation-report-${timestamp}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download report', error)
      addNotification('Unable to download the report. Please try again.', 'error', { title: 'Download Error' })
    } finally {
      setExportingFormat(null)
    }
  }

  const projectOverview = reportQuery.data?.project_overview
  const performance = reportQuery.data?.performance
  const statusBreakdown = projectOverview?.status_breakdown || {}
  const gradeDistribution = performance?.grade_distribution || []

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-blue-500 dark:text-blue-300 mb-2">Admin Reports</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Evaluation Reports</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Generate export-ready performance summaries for stakeholders.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => reportQuery.refetch()}
            className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {reportQuery.isFetching ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3.536-3.536A8 8 0 0120 12h-4l3.536 3.536A8 8 0 0112 20v-4l-3.536 3.536A8 8 0 014 12z"
                  ></path>
                </svg>
                Refreshing
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0119 5" />
                </svg>
                Refresh Data
              </>
            )}
          </button>
          <button
            onClick={() => handleDownload('csv')}
            disabled={!!exportingFormat || reportQuery.isLoading}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {exportingFormat === 'csv' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3.536-3.536A8 8 0 0120 12h-4l3.536 3.536A8 8 0 0112 20v-4l-3.536 3.536A8 8 0 014 12z"
                  ></path>
                </svg>
                Preparing CSV...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Download CSV
              </>
            )}
          </button>
          <button
            onClick={() => handleDownload('pdf')}
            disabled={!!exportingFormat || reportQuery.isLoading}
            className="inline-flex items-center px-4 py-2 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-900/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {exportingFormat === 'pdf' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600 dark:text-blue-300" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3.536-3.536A8 8 0 0120 12h-4l3.536 3.536A8 8 0 0112 20v-4l-3.536 3.536A8 8 0 014 12z"
                  ></path>
                </svg>
                Preparing PDF...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Academic Level
          </label>
          <select
            value={selectedLevel}
            onChange={(event) => setSelectedLevel(event.target.value as LevelOption)}
            className="mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="200">Level 200</option>
            <option value="400">Level 400</option>
          </select>
        </div>
        <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Start Date
          </label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(event) => setDateRange((prev) => ({ ...prev, start: event.target.value }))}
            className="mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            End Date
          </label>
          <input
            type="date"
            value={dateRange.end}
            max={new Date().toISOString().split('T')[0]}
            onChange={(event) => setDateRange((prev) => ({ ...prev, end: event.target.value }))}
            className="mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {reportQuery.error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-900/30 dark:text-red-200">
          Unable to load reports data. Please adjust your filters or try again.
        </div>
      )}

      {reportQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-32 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : (
        reportQuery.data && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Total Projects</p>
                <p className="mt-3 text-4xl font-bold text-gray-900 dark:text-white">
                  {projectOverview?.total_projects ?? 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Across all selected filters</p>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Evaluated</p>
                <p className="mt-3 text-4xl font-bold text-green-600 dark:text-green-400">
                  {projectOverview?.evaluated_projects ?? 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Completed reviews</p>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Pending</p>
                <p className="mt-3 text-4xl font-bold text-yellow-500">
                  {projectOverview?.pending_projects ?? 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Awaiting evaluation</p>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Average Score</p>
                <p className="mt-3 text-4xl font-bold text-blue-600">
                  {performance?.average_score?.toFixed(1) ?? '0.0'}%
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {performance?.evaluation_count ?? 0} evaluations
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Status Breakdown</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Completion rate {projectOverview?.completion_rate ?? 0}%
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {Object.keys(statusBreakdown).length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No projects found for this filter set.</p>
                  )}
                  {Object.entries(statusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                          statusColors[status] || 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800'
                        }`}
                      >
                        {status}
                      </span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Grade Distribution</h3>
                <div className="mt-4 space-y-3">
                  {gradeDistribution.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No grade data available.</p>
                  )}
                  {gradeDistribution.map((grade) => (
                    <div key={grade.grade} className="flex items-center gap-4">
                      <div className="w-12 text-xl font-semibold text-gray-900 dark:text-gray-100">{grade.grade}</div>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, ((grade.count || 0) / (performance?.evaluation_count || 1)) * 100)}%`,
                          }}
                        ></div>
                      </div>
                      <div className="w-10 text-right text-sm font-medium text-gray-600 dark:text-gray-300">
                        {grade.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Study Program Performance</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Average scores by study program</p>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(reportQuery.data.study_programs || []).length === 0 && (
                    <div className="p-5 text-sm text-gray-500 dark:text-gray-400">No study program data.</div>
                  )}
                  {reportQuery.data.study_programs?.map((program, index) => (
                    <div key={`${program.study_program_name}-${program.level}-${index}`} className="flex items-center justify-between p-5">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {program.study_program_name}
                          </p>
                          {program.level && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                              Level {program.level}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {program.project_count} projects evaluated
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold text-blue-600">
                          {program.average_score ? program.average_score.toFixed(1) : '—'}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Projects</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Highest average scores</p>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(reportQuery.data.top_projects || []).length === 0 && (
                    <div className="p-5 text-sm text-gray-500 dark:text-gray-400">No projects available.</div>
                  )}
                  {reportQuery.data.top_projects?.map((project, index) => (
                    <div key={`${project.title}-${index}`} className="flex items-center justify-between p-5">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{project.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Level {project.level}</p>
                      </div>
                      <span className="text-sm font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                        {project.average_score?.toFixed(1) ?? '—'}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Evaluation Activity</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Latest scoring events</p>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {(reportQuery.data.recent_activity || []).length === 0 && (
                  <div className="p-5 text-sm text-gray-500 dark:text-gray-400">No recent activity found.</div>
                )}
                {reportQuery.data.recent_activity?.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-5">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{activity.project_title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {activity.evaluated_by} • {formatDateTime(activity.timestamp)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200">
                      {activity.score?.toFixed(1) ?? '—'}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      )}
    </div>
  )
}

