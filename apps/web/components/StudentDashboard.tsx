'use client'

import React from 'react'
import { useAuthStore, useThemeStore } from '../lib/stores'

export default function StudentDashboard() {
  const { user } = useAuthStore()
  const { isDarkMode } = useThemeStore()
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 dark:from-gray-900 dark:to-gray-800">
      {/* Dashboard Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Welcome back, {user?.name}! Here's an overview of your submitted projects.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-24">
          
          {/* Dashboard Section */}
          <section id="dashboard" className="pt-10 scroll-mt-16">
            <h2 className="text-2xl font-bold mb-6 text-foreground/80 dark:text-white flex items-center">
              <span className="bg-primary/10 p-2 rounded-lg mr-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </span>
              Dashboard
            </h2>
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-8">
                <div className="flex items-center justify-between relative">
                  {/* Progress line */}
                  <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 -z-10">
                    <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: "66%" }} />
                  </div>

                  {[
                    { label: "Submitted", status: "completed", icon: "✓", date: "Jan 15, 2025" },
                    { label: "Under Review", status: "completed", icon: "⏱", date: "Jan 16, 2025" },
                    { label: "Evaluated", status: "current", icon: "✓", date: "Jan 18, 2025" }
                  ].map((stage, index) => (
                    <div key={index} className="flex flex-col items-center gap-4 flex-1">
                      <div className={`h-16 w-16 rounded-full flex items-center justify-center border-4 font-bold text-lg ${
                        stage.status === "completed" ? "bg-blue-600 border-blue-600 text-white" :
                        stage.status === "current" ? "bg-white dark:bg-gray-800 border-blue-600 text-blue-600 dark:text-blue-400" :
                        "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500"
                      }`}>
                        {stage.icon}
                      </div>
                      <div className="text-center">
                        <p className={`text-sm font-medium ${stage.status === "current" ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}>
                          {stage.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stage.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Submissions Section */}
          <section id="submissions" className="pt-10 scroll-mt-16">
            <h2 className="text-2xl font-bold mb-6 text-foreground/80 dark:text-white flex items-center">
              <span className="bg-primary/10 p-2 rounded-lg mr-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </span>
              Submissions
            </h2>
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold dark:text-white">Project Submission</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Submit your project repository and documentation</p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Submitted
                  </span>
                </div>
              </div>
              <div className="px-6 py-6 space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 dark:text-white"
                      defaultValue="E-Commerce Platform"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Submission Date & Time</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-gray-200"
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
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 dark:text-white"
                      defaultValue="https://github.com/student/ecommerce-project"
                    />
                    <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
                      ↗
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Google Drive Project Documentation Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 dark:text-white"
                      defaultValue="https://docs.google.com/document/d/14mdXfcRHjgVoNkOFrC_w0NyJtclxGJBlyeoHUPE61Mg/edit?tab=t.0"
                    />
                    <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
                      ↗
                    </button>
                  </div>
                </div>

                {/* <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 cursor-pointer">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm text-gray-700 dark:text-gray-200 mb-1">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">PDF, ZIP, or other documentation (Max 50MB)</p>
                </div> */}

                <div className="flex gap-3 pt-4">
                  <button className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors">
                    ✓ Update Submission
                  </button>
                  <button className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors">
                    View Submission
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Evaluation Section */}
          <section id="evaluation" className="pt-10 scroll-mt-16">
            <h2 className="text-2xl font-bold mb-6 text-foreground/80 dark:text-white flex items-center">
              <span className="bg-primary/10 p-2 rounded-lg mr-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </span>
              Evaluation
            </h2>
            
            {/* Overall Performance Card */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-200 dark:border-blue-800 shadow-lg rounded-lg p-6 mb-6">
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

            {/* Marks Breakdown */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <div className="px-6 py-4 bg-blue-100 dark:bg-blue-900/40 border-b border-blue-300 dark:border-blue-700">
                  <h3 className="font-semibold dark:text-white text-blue-900 dark:text-blue-200">Project Marks</h3>
                </div>
                <div className="px-6 py-4 space-y-4 bg-blue-50/50 dark:bg-blue-900/10">
                  {[
                    { component: "Code Quality", marks: 18, total: 20 },
                    { component: "Documentation", marks: 15, total: 20 },
                    { component: "Functionality", marks: 28, total: 30 }
                  ].map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium dark:text-gray-200">{item.component}</span>
                        <span className="font-semibold text-blue-700 dark:text-blue-300">{item.marks}/{item.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(item.marks / item.total) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border-2 border-purple-200 dark:border-purple-800">
                <div className="px-6 py-4 bg-purple-100 dark:bg-purple-900/40 border-b border-purple-300 dark:border-purple-700">
                  <h3 className="font-semibold dark:text-white text-purple-900 dark:text-purple-200">Presentation Marks</h3>
                </div>
                <div className="px-6 py-4 space-y-4 bg-purple-50/50 dark:bg-purple-900/10">
                  {[
                    { component: "Clarity & Communication", marks: 9, total: 10 },
                    { component: "Visual Presentation", marks: 8, total: 10 },
                    { component: "Technical Explanation", marks: 9, total: 10 }
                  ].map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium dark:text-gray-200">{item.component}</span>
                        <span className="font-semibold text-purple-700 dark:text-purple-300">{item.marks}/{item.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${(item.marks / item.total) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

