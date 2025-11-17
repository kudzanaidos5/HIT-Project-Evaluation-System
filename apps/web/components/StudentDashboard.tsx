'use client'

import React, { useMemo, useState } from 'react'
import { useAuthStore } from '../lib/stores'

interface StudentSection {
  id: 'dashboard' | 'submissions' | 'evaluation'
  label: string
  description: string
  icon: React.ReactNode
}

const STUDENT_SECTIONS: StudentSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Track where your project sits in the review pipeline.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'submissions',
    label: 'Project Submission',
    description: 'Update repository links and confirm your delivery details.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4m-9 4v6" />
      </svg>
    ),
  },
  {
    id: 'evaluation',
    label: 'Evaluation',
    description: 'See marks, feedback, and strengths after review.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export default function StudentDashboard() {
  const { user } = useAuthStore()
  const [activeSection, setActiveSection] = useState<StudentSection['id']>('dashboard')

  const renderSectionContent = useMemo(() => {
    const baseSectionHeader = (title: string, description: string, icon: React.ReactNode) => (
      <div className="flex items-center gap-3">
        <span className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-xl text-blue-600 dark:text-blue-300">{icon}</span>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
    )

    const sections: Record<StudentSection['id'], React.ReactNode> = {
      dashboard: (
        <div className="space-y-6">
          {baseSectionHeader(
            'Dashboard Overview',
            'Quick glance at how far your project has progressed.',
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )}

          <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="p-8">
              <div className="flex items-center justify-between relative">
                <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 -z-10">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700" style={{ width: '66%' }} />
                </div>

                {[
                  { label: 'Submitted', status: 'completed', icon: '✓', date: 'Jan 15, 2025' },
                  { label: 'Under Review', status: 'completed', icon: '⏱', date: 'Jan 16, 2025' },
                  { label: 'Evaluated', status: 'current', icon: '✓', date: 'Jan 18, 2025' },
                ].map((stage) => (
                  <div key={stage.label} className="flex flex-col items-center gap-4 flex-1">
                    <div
                      className={`h-16 w-16 rounded-full flex items-center justify-center border-4 font-bold text-lg ${
                        stage.status === 'completed'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : stage.status === 'current'
                            ? 'bg-white dark:bg-gray-900 border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {stage.icon}
                    </div>
                    <div className="text-center">
                      <p className={`text-sm font-medium ${stage.status === 'current' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {stage.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stage.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
      submissions: (
        <div className="space-y-6">
          {baseSectionHeader(
            'Project Submission',
            'Update your repository links and documentation anytime.',
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4m-9 4v6" />
            </svg>
          )}

          <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold dark:text-white">Submission Package</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Submit your project repository and documentation</p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ Submitted
                </span>
              </div>
            </div>
            <div className="px-6 py-6 space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium dark:text-gray-200">Deadline:</span>
                  <span className="dark:text-gray-300">2025-01-20 23:59:59</span>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Project Title</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-blue-500 dark:text-white"
                    defaultValue="E-Commerce Platform"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Submission Date & Time</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-gray-200"
                    defaultValue="2025-01-15 14:30:00"
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">GitHub Repository Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-blue-500 dark:text-white"
                    defaultValue="https://github.com/student/ecommerce-project"
                  />
                  <button className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300">
                    ↗
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Google Drive Documentation Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-blue-500 dark:text-white"
                    defaultValue="https://docs.google.com/document/d/14mdXfcRHjgVoNkOFrC_w0NyJtclxGJBlyeoHUPE61Mg/edit?tab=t.0"
                  />
                  <button className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300">
                    ↗
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors">
                  ✓ Update Submission
                </button>
                <button className="px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 transition-colors">
                  View Submission
                </button>
              </div>
            </div>
          </div>
        </div>
      ),
      evaluation: (
        <div className="space-y-6">
          {baseSectionHeader(
            'Evaluation',
            'Understand how you scored and where to improve.',
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          )}

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-200 dark:border-blue-800 shadow-xl rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4 dark:text-white">Overall Performance</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Marks</p>
                <p className="text-4xl font-bold text-blue-600">87/100</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Percentage</p>
                <p className="text-4xl font-bold text-blue-600">87%</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div className="bg-blue-600 h-4 rounded-full" style={{ width: '87%' }}></div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-2xl border-2 border-blue-200 dark:border-blue-800">
              <div className="px-6 py-4 bg-blue-100 dark:bg-blue-900/40 border-b border-blue-200 dark:border-blue-700">
                <h3 className="font-semibold dark:text-white text-blue-900 dark:text-blue-200">Project Marks</h3>
              </div>
              <div className="px-6 py-4 space-y-4 bg-blue-50/50 dark:bg-blue-900/10">
                {[
                  { component: 'Code Quality', marks: 18, total: 20 },
                  { component: 'Documentation', marks: 15, total: 20 },
                  { component: 'Functionality', marks: 28, total: 30 },
                ].map((item) => (
                  <div key={item.component} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium dark:text-gray-200">{item.component}</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-300">
                        {item.marks}/{item.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(item.marks / item.total) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-2xl border-2 border-purple-200 dark:border-purple-800">
              <div className="px-6 py-4 bg-purple-100 dark:bg-purple-900/40 border-b border-purple-200 dark:border-purple-700">
                <h3 className="font-semibold dark:text-white text-purple-900 dark:text-purple-200">Presentation Marks</h3>
              </div>
              <div className="px-6 py-4 space-y-4 bg-purple-50/50 dark:bg-purple-900/10">
                {[
                  { component: 'Clarity & Communication', marks: 9, total: 10 },
                  { component: 'Visual Presentation', marks: 8, total: 10 },
                  { component: 'Technical Explanation', marks: 9, total: 10 },
                ].map((item) => (
                  <div key={item.component} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium dark:text-gray-200">{item.component}</span>
                      <span className="font-semibold text-purple-700 dark:text-purple-300">
                        {item.marks}/{item.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${(item.marks / item.total) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    }

    return sections
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12">
        <div className="space-y-8">
          <header className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-blue-500 dark:text-blue-300 mb-2">Student Workspace</p>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Dashboard</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Welcome back, {user?.name}! Track your submission, upload any missing details, and review evaluation feedback from one place.
                    </p>
                </div>
                {/* <div className="w-full lg:w-auto">
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 shadow-inner">
                    <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Signed in as</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-sm text-blue-600 dark:text-blue-300">{user?.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Notifications are enabled — you'll be alerted once evaluators publish feedback.
                    </p>
                    </div>
                </div> */}
            </div>
          </header>

          {/* Horizontal navigation */}
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {STUDENT_SECTIONS.map((section) => {
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all ${
                      isActive
                        ? 'border-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-500/20'
                        : 'border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900 hover:border-blue-200 dark:hover:border-blue-600/60 hover:-translate-y-1'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-50 text-blue-600 dark:bg-gray-800 dark:text-blue-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40'
                        }`}
                      >
                        {section.icon}
                      </span>
                      <svg
                        className={`h-4 w-4 transition-all ${isActive ? 'translate-x-1 opacity-100 text-white' : 'opacity-50 text-gray-400 group-hover:text-blue-500'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <div className="mt-4 space-y-1">
                      <p className={`text-lg font-semibold ${isActive ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{section.label}</p>
                      <p className={`text-sm leading-relaxed ${isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>{section.description}</p>
                    </div>
                    {!isActive && (
                      <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-900/20" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pt-4">{renderSectionContent[activeSection]}</div>
        </div>
      </div>
    </div>
  )
}

