'use client'

import React, { useState } from 'react'
import { useAnalyticsData } from '../../lib/hooks'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

export default function AnalyticsPage() {
  const { 
    averages, 
    completionRate, 
    performanceByCourse, 
    pipeline, 
    topProjects, 
    isLoading, 
    error 
  } = useAnalyticsData()

  const [timeRange, setTimeRange] = useState('current')

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
              <h3 className="text-sm font-medium text-red-800">Error loading analytics</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Unable to load analytics data. Please try refreshing the page.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Prepare chart data
  const performanceChartData = {
    labels: performanceByCourse?.map((course: any) => course.course_name) || [],
    datasets: [
      {
        label: 'Average Score (%)',
        data: performanceByCourse?.map((course: any) => course.average_score) || [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(139, 92, 246, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  const pipelineChartData = {
    labels: pipeline?.map((item: any) => item.status) || [],
    datasets: [
      {
        label: 'Number of Projects',
        data: pipeline?.map((item: any) => item.count) || [],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  const completionRateData = {
    labels: ['Completed', 'Pending'],
    datasets: [
      {
        data: [
          completionRate?.completion_rate || 0,
          100 - (completionRate?.completion_rate || 0)
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Analytics Overview',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">
          <h1>Evaluation Analytics</h1>
          <p className="page-subtitle">Comprehensive insights and performance metrics</p>
        </div>
        <div className="header-actions">
          <select 
            className="form-select" 
            style={{width: '200px'}}
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="current">Current Semester</option>
            <option value="last">Last Semester</option>
            <option value="year">Academic Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Average Score</h3>
          </div>
          <div className="text-center py-6">
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded w-24 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
              </div>
            ) : (
              <>
                <div className="text-4xl font-bold text-blue-600">
                  {averages?.average_score?.toFixed(1) || '0.0'}%
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Based on {averages?.total_evaluations || 0} evaluations
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Completion Rate</h3>
          </div>
          <div className="text-center py-6">
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded w-24 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
              </div>
            ) : (
              <>
                <div className="text-4xl font-bold text-green-600">
                  {completionRate?.completion_rate?.toFixed(1) || '0.0'}%
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  {completionRate?.evaluated_projects || 0} of {completionRate?.total_projects || 0} projects
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Performance by Course</h3>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
            ) : performanceByCourse && performanceByCourse.length > 0 ? (
              <Bar data={performanceChartData} options={chartOptions} />
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
                <p className="mt-1 text-sm text-gray-500">No course performance data found.</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Project Pipeline</h3>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
            ) : pipeline && pipeline.length > 0 ? (
              <Doughnut data={pipelineChartData} options={chartOptions} />
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
                <p className="mt-1 text-sm text-gray-500">No pipeline data found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Performing Projects */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Top Performing Projects</h3>
        </div>
        <div style={{overflowX: 'auto'}}>
          {isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : topProjects && topProjects.length > 0 ? (
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{borderBottom: '2px solid #e5e7eb', textAlign: 'left'}}>
                  <th style={{padding: '15px', color: '#64748b', fontWeight: '600'}}>Rank</th>
                  <th style={{padding: '15px', color: '#64748b', fontWeight: '600'}}>Project Name</th>
                  <th style={{padding: '15px', color: '#64748b', fontWeight: '600'}}>Level</th>
                  <th style={{padding: '15px', color: '#64748b', fontWeight: '600'}}>Score</th>
                </tr>
              </thead>
              <tbody>
                {topProjects.map((project: any, index: number) => (
                  <tr key={index} style={{borderBottom: '1px solid #e5e7eb'}}>
                    <td style={{padding: '15px', color: '#1e2139', fontWeight: 'bold'}}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''} {index + 1}
                    </td>
                    <td style={{padding: '15px', color: '#1e2139'}}>{project.title}</td>
                    <td style={{padding: '15px', color: '#64748b'}}>Level {project.level}</td>
                    <td style={{padding: '15px'}}>
                      <span style={{
                        background: project.average_score >= 90 ? '#10b98120' : 
                                   project.average_score >= 80 ? '#3b82f620' : '#f59e0b20',
                        color: project.average_score >= 90 ? '#10b981' : 
                               project.average_score >= 80 ? '#3b82f6' : '#f59e0b',
                        padding: '5px 12px', 
                        borderRadius: '6px', 
                        fontWeight: '600'
                      }}>
                        {project.average_score.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No projects found</h3>
              <p className="mt-1 text-sm text-gray-500">No top performing projects data available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
