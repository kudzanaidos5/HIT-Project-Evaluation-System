'use client'

import React, { useState, useEffect } from 'react'
import { useEvaluationTemplates, useUpdateEvaluationTemplate, useResetEvaluationTemplates } from '../../lib/hooks'
import { useUIStore } from '../../lib/stores'
import { Monitor, BarChart3, Save, RotateCcw, Plus, Trash2, Info } from 'lucide-react'
import ConfirmDialog from '../../components/ConfirmDialog'

export default function EvaluationTemplatesPage() {
  const [activeLevel, setActiveLevel] = useState<200 | 400 | undefined>(undefined)
  const { data: templates, isLoading, isError } = useEvaluationTemplates(activeLevel)
  const updateTemplateMutation = useUpdateEvaluationTemplate()
  const resetTemplatesMutation = useResetEvaluationTemplates()
  const { addNotification } = useUIStore()

  const [activeTab, setActiveTab] = useState<'PROJECT' | 'PRESENTATION'>('PROJECT')
  const [editingData, setEditingData] = useState<any>(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  // Initialize editing data when template, level or tab changes
  useEffect(() => {
    if (templates) {
      const currentTemplate = activeTab === 'PROJECT' ? templates.project : templates.presentation
      if (currentTemplate) {
        setEditingData({
          name: currentTemplate.name,
          description: currentTemplate.description,
          criteria: [...currentTemplate.criteria],
          level: currentTemplate.level
        })
      }
    }
  }, [templates, activeTab])

  const handleAddCriterion = () => {
    setEditingData({
      ...editingData,
      criteria: [
        ...editingData.criteria,
        { criterion_name: '', max_score: 10, description: '' }
      ]
    })
  }

  const handleRemoveCriterion = (index: number) => {
    const newCriteria = [...editingData.criteria]
    newCriteria.splice(index, 1)
    setEditingData({ ...editingData, criteria: newCriteria })
  }

  const handleCriterionChange = (index: number, field: string, value: any) => {
    const newCriteria = [...editingData.criteria]
    newCriteria[index] = { ...newCriteria[index], [field]: value }
    setEditingData({ ...editingData, criteria: newCriteria })
  }

  const handleSave = async () => {
    // Basic validation
    if (!editingData.name.trim()) {
      addNotification('Template name is required', 'error')
      return
    }

    if (editingData.criteria.length === 0) {
      addNotification('At least one criterion is required', 'error')
      return
    }

    for (const c of editingData.criteria) {
      if (!c.criterion_name.trim()) {
        addNotification('All criteria must have a name', 'error')
        return
      }
      if (c.max_score <= 0) {
        addNotification('Max score must be greater than 0', 'error')
        return
      }
    }

    try {
      await updateTemplateMutation.mutateAsync({
        type: activeTab,
        data: {
          ...editingData,
          level: activeLevel
        }
      })
      addNotification(`${editingData.name} updated successfully`, 'success')
    } catch (error: any) {
      addNotification(error.message || 'Failed to update template', 'error')
    }
  }

  const handleReset = async () => {
    try {
      await resetTemplatesMutation.mutateAsync()
      addNotification('Templates reset to system defaults', 'success')
      setResetDialogOpen(false)
    } catch (error: any) {
      addNotification(error.message || 'Failed to reset templates', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isError || !editingData) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Failed to load evaluation templates.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Retry
        </button>
      </div>
    )
  }

  const totalScore = editingData.criteria.reduce((sum: number, c: any) => sum + Number(c.max_score || 0), 0)

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Evaluation Criteria</h1>
          <p className="text-gray-500 dark:text-gray-400">Define the scoring format for project and presentation assessments.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setResetDialogOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={updateTemplateMutation.isPending}
            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {updateTemplateMutation.isPending ? (
              <span className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="flex flex-col sm:flex-row gap-6 mb-6">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Assessment Type</label>
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              onClick={() => setActiveTab('PROJECT')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'PROJECT'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Monitor className="h-4 w-4" />
              Project
            </button>
            <button
              onClick={() => setActiveTab('PRESENTATION')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'PRESENTATION'
                  ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Presentation
            </button>
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Project Level</label>
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              onClick={() => setActiveLevel(undefined)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeLevel === undefined
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Universal
            </button>
            <button
              onClick={() => setActiveLevel(200)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeLevel === 200
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Level 200
            </button>
            <button
              onClick={() => setActiveLevel(400)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeLevel === 400
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Level 400
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                <Info className="mr-2 h-4 w-4 text-blue-500" />
                General Information
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={editingData.name}
                  onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={editingData.description}
                  onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 dark:text-white">Scoring Criteria</h3>
              <button
                onClick={handleAddCriterion}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Criterion
              </button>
            </div>
            <div className="p-6 space-y-6">
              {editingData.criteria.map((criterion: any, index: number) => (
                <div key={index} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 space-y-4 relative group">
                  <button
                    onClick={() => handleRemoveCriterion(index)}
                    className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove criterion"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Criterion Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Code Quality"
                        value={criterion.criterion_name}
                        onChange={(e) => handleCriterionChange(index, 'criterion_name', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Max Score</label>
                      <input
                        type="number"
                        min="1"
                        value={criterion.max_score}
                        onChange={(e) => handleCriterionChange(index, 'max_score', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Guideline / Description</label>
                    <input
                      type="text"
                      placeholder="Briefly describe what to look for..."
                      value={criterion.description}
                      onChange={(e) => handleCriterionChange(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              ))}

              {editingData.criteria.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                  <p className="text-gray-500 dark:text-gray-400">No criteria defined. Add one to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm sticky top-24">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Summary</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total Criteria</span>
                <span className="font-semibold text-gray-900 dark:text-white">{editingData.criteria.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-4 border-t border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Total Possible Points</span>
                <div className="text-right">
                  <span className={`text-xl font-bold ${totalScore === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                    {totalScore}
                  </span>
                  <span className="text-gray-400 ml-1">pts</span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                  The system will automatically calculate the final percentage based on these maximum scores. It is recommended to have a total of <strong>100 points</strong> for easier reporting, but the system supports any total.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation */}
      <ConfirmDialog
        isOpen={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirm={handleReset}
        title="Reset Templates?"
        message="Are you sure you want to reset all evaluation templates to system defaults? All your custom criteria will be permanently deleted."
        confirmText="Reset All"
        cancelText="Cancel"
        confirmButtonStyle="danger"
        isLoading={resetTemplatesMutation.isPending}
      />
    </div>
  )
}
