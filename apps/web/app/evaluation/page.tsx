'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useProjects, useCreateEvaluation, useEvaluationTemplates } from '../../lib/hooks'
import { useThemeStore, useUIStore } from '../../lib/stores'
import { useSearchParams } from 'next/navigation'
import VerificationModal from '../../components/VerificationModal'

interface EvaluationFormData {
  projectId: number
  evaluationType: 'PROJECT' | 'PRESENTATION'
  comments: string
  marks: Array<{
    criterion_name: string
    max_score: number
    score: number
    comments?: string
  }>
}

interface CustomCriterion {
  id: string
  criterion_name: string
  max_score: number
  score: number
  comments: string
}

export default function EvaluationPage() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const { isDarkMode } = useThemeStore()
  const { addNotification } = useUIStore()

  const { data: projectsData, isLoading: projectsLoading } = useProjects()
  const projects = useMemo(() => projectsData?.projects || projectsData || [], [projectsData])
  const { data: templates, isLoading: templatesLoading } = useEvaluationTemplates()
  const createEvaluationMutation = useCreateEvaluation()

  const [modalOpen, setModalOpen] = useState(false)
  const [customEvaluationModalOpen, setCustomEvaluationModalOpen] = useState(false)
  const [levelSelectionModalOpen, setLevelSelectionModalOpen] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<200 | 400 | null>(null)
  const [modalTitle, setModalTitle] = useState('New Evaluation')
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [evaluationType, setEvaluationType] = useState<'PROJECT' | 'PRESENTATION' | null>(null)
  const [customCriteria, setCustomCriteria] = useState<CustomCriterion[]>([
    { id: '1', criterion_name: '', max_score: 0, score: 0, comments: '' }
  ])
  const [customEvaluationData, setCustomEvaluationData] = useState({
    projectId: '',
    comments: ''
  })
  const [customFormError, setCustomFormError] = useState('')
  const [formMarks, setFormMarks] = useState<Array<{
    criterion_name: string
    max_score: number
    score: number
    comments?: string
  }>>([])
  const [verificationConfig, setVerificationConfig] = useState<{
    title: string
    description: string
    highlight?: string
    confirmLabel?: string
    tone?: 'info' | 'danger'
  } | null>(null)
  const [pendingAction, setPendingAction] = useState<
    | { type: 'STANDARD'; payload: EvaluationFormData }
    | {
        type: 'CUSTOM'
        payload: {
          projectId: number
          data: {
            evaluation_type: 'PROJECT' | 'PRESENTATION'
            comments: string
            marks: Array<{ criterion_name: string; max_score: number; score: number; comments?: string }>
          }
        }
      }
    | null
  >(null)
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [projectSearchTerm, setProjectSearchTerm] = useState('')

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<EvaluationFormData>()

  const openEvaluationForm = useCallback((templateKey: string, evalType?: 'PROJECT' | 'PRESENTATION') => {
    setSelectedTemplate(templateKey)
    
    // Determine evaluation type
    const type = evalType || (templates?.[templateKey]?.evaluation_type as 'PROJECT' | 'PRESENTATION') || 'PROJECT'
    
    // Get template or use defaults
    const template = templates?.[templateKey]
    let initialMarks: Array<{criterion_name: string; max_score: number; score: number; comments: string}> = []
    
    if (template && template.criteria && Array.isArray(template.criteria)) {
      // Use template criteria
      initialMarks = template.criteria.map((criterion: any) => ({
        criterion_name: criterion.criterion_name || '',
        max_score: criterion.max_score || 0,
        score: 0,
        comments: ''
      }))
      setModalTitle(`${selectedLevel ? `Level ${selectedLevel} - ` : ''}${template.name}`)
    } else {
      // Use default criteria if template not found
      const defaultCriteria = type === 'PROJECT' 
        ? [
            { criterion_name: 'Code Quality', max_score: 20 },
            { criterion_name: 'Documentation', max_score: 20 },
            { criterion_name: 'Functionality', max_score: 30 }
          ]
        : [
            { criterion_name: 'Clarity & Communication', max_score: 10 },
            { criterion_name: 'Visual Presentation', max_score: 10 },
            { criterion_name: 'Technical Explanation', max_score: 10 }
          ]
      
      initialMarks = defaultCriteria.map((criterion: any) => ({
        criterion_name: criterion.criterion_name,
        max_score: criterion.max_score,
        score: 0,
        comments: ''
      }))
      
      setModalTitle(`${selectedLevel ? `Level ${selectedLevel} - ` : ''}${type === 'PROJECT' ? 'Project Evaluation' : 'Presentation Evaluation'}`)
    }
    
    // Set form values
    setEvaluationType(type)
    setValue('evaluationType', type, { shouldValidate: false })
    setValue('marks', initialMarks, { shouldValidate: false })
    
    // Set formMarks state directly
    setFormMarks(initialMarks)
    
    // Reset form to ensure clean state
    reset({
      evaluationType: type,
      marks: initialMarks,
      projectId: selectedProject?.id || undefined,
      comments: ''
    })
    
    // Open modal after setting values
    setModalOpen(true)
  }, [reset, selectedLevel, selectedProject, setValue, templates])

  // Pre-fill project if projectId is provided
  useEffect(() => {
    if (projectId && projects && projects.length > 0) {
      const project = projects.find((p: any) => p.id === parseInt(projectId))
      if (project) {
        setSelectedProject(project)
        setValue('projectId', project.id)
        const templateKey = project.level === 200 ? 'level_200' : 'level_400'
        openEvaluationForm(templateKey)
      }
    }
  }, [openEvaluationForm, projectId, projects, setValue])

  const openLevelSelection = (level: 200 | 400) => {
    setSelectedLevel(level)
    setLevelSelectionModalOpen(true)
  }

  const selectEvaluationType = (type: 'PROJECT' | 'PRESENTATION') => {
    if (!selectedLevel) return
    
    const templateKey = type === 'PROJECT' ? 'project' : 'presentation'
    setLevelSelectionModalOpen(false)
    
    // Wait a bit for modal to close before opening the next one
    setTimeout(() => {
      openEvaluationForm(templateKey, type)
    }, 300)
  }

  const closeEvaluationForm = () => {
    setModalOpen(false)
    setSelectedProject(null)
    setSelectedTemplate('')
    setEvaluationType(null)
    setSelectedLevel(null)
    setFormMarks([])
    setProjectSearchTerm('')
    reset()
  }

  const closeLevelSelectionModal = () => {
    setLevelSelectionModalOpen(false)
    setSelectedLevel(null)
  }

  const openCustomEvaluation = () => {
    setCustomEvaluationModalOpen(true)
    setCustomCriteria([{ id: '1', criterion_name: '', max_score: 0, score: 0, comments: '' }])
    setCustomEvaluationData({ projectId: '', comments: '' })
    setCustomFormError('')
  }

  const closeCustomEvaluation = () => {
    setCustomEvaluationModalOpen(false)
    setCustomCriteria([{ id: '1', criterion_name: '', max_score: 0, score: 0, comments: '' }])
    setCustomEvaluationData({ projectId: '', comments: '' })
    setCustomFormError('')
  }

  const addCustomCriterion = () => {
    setCustomCriteria([
      ...customCriteria,
      { id: Date.now().toString(), criterion_name: '', max_score: 0, score: 0, comments: '' }
    ])
  }

  const removeCustomCriterion = (id: string) => {
    if (customCriteria.length > 1) {
      setCustomCriteria(customCriteria.filter(c => c.id !== id))
    }
  }

  const updateCustomCriterion = (id: string, field: keyof CustomCriterion, value: string | number) => {
    setCustomCriteria(customCriteria.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ))
  }

  const prepareCustomEvaluationSubmission = () => {
    setCustomFormError('')

    const validCriteria = customCriteria.filter(
      (criterion) => criterion.criterion_name.trim() && criterion.max_score > 0
    )

    if (validCriteria.length === 0) {
      setCustomFormError('Please add at least one valid criterion with a name and maximum score.')
      return
    }

    if (!customEvaluationData.projectId) {
      setCustomFormError('Please select a project before submitting.')
      return
    }

    const marks = validCriteria.map((criterion) => ({
      criterion_name: criterion.criterion_name,
      max_score: criterion.max_score,
      score: criterion.score,
      comments: criterion.comments || undefined,
    }))

    const projectIdNumber = parseInt(customEvaluationData.projectId, 10)
    const targetProject = projects.find((project: any) => project.id === projectIdNumber)

    setPendingAction({
      type: 'CUSTOM',
      payload: {
        projectId: projectIdNumber,
        data: {
          evaluation_type: 'PROJECT',
          comments: customEvaluationData.comments,
          marks,
        },
      },
    })

    const maxTotal = marks.reduce((sum, mark) => sum + (mark.max_score || 0), 0)
    setVerificationConfig({
      title: 'Submit custom evaluation',
      description: `You are about to submit a custom evaluation for ${
        targetProject?.title || 'the selected project'
      }. This action notifies the student immediately.`,
      highlight: `${marks.length} custom criteria • ${maxTotal} maximum points.`,
      confirmLabel: 'Submit evaluation',
      tone: 'info',
    })
  }

  const handleEvaluationSubmit = (data: EvaluationFormData) => {
    const targetProject = projects.find((project: any) => project.id === data.projectId)
    const totalScore = data.marks.reduce((sum, mark) => sum + (mark.score || 0), 0)

    setPendingAction({
      type: 'STANDARD',
      payload: data,
    })

    setVerificationConfig({
      title: `Submit ${data.evaluationType === 'PROJECT' ? 'project' : 'presentation'} evaluation`,
      description: `You are about to finalize ${data.marks.length} criteria for ${
        targetProject?.title || 'the selected project'
      }. Students will be notified once this evaluation is saved.`,
      highlight: `Scores to publish: ${totalScore} points • ${data.marks.length} criteria.`,
      confirmLabel: 'Submit and notify student',
      tone: 'info',
    })
  }

  const closeVerificationModal = () => {
    if (verificationLoading) return
    setVerificationConfig(null)
    setPendingAction(null)
  }

  const executePendingAction = async () => {
    if (!pendingAction) return

    try {
      setVerificationLoading(true)

      if (pendingAction.type === 'STANDARD') {
        const payload = pendingAction.payload
        await createEvaluationMutation.mutateAsync({
          projectId: payload.projectId,
          data: {
            evaluation_type: payload.evaluationType,
            comments: payload.comments,
            marks: payload.marks,
          },
        })

        addNotification('Evaluation submitted successfully.', 'success', {
          title: 'Evaluation sent',
          audience: 'ADMIN',
          actionLabel: 'View project',
          actionUrl: `/projects/${payload.projectId}`,
        })
        closeEvaluationForm()
      } else {
        await createEvaluationMutation.mutateAsync({
          projectId: pendingAction.payload.projectId,
          data: pendingAction.payload.data,
        })

        addNotification('Custom evaluation submitted successfully.', 'success', {
          title: 'Evaluation sent',
          audience: 'ADMIN',
          actionLabel: 'Review submissions',
          actionUrl: '/projects',
        })
        closeCustomEvaluation()
      }

      setVerificationConfig(null)
      setPendingAction(null)
    } catch (error: any) {
      addNotification(error?.message || 'Failed to submit evaluation.', 'error', {
        title: 'Submission failed',
        audience: 'ADMIN',
      })
    } finally {
      setVerificationLoading(false)
    }
  }

  // Use formMarks state which is updated when modal opens
  // Fallback to watched marks if formMarks is empty
  const watchedMarks = watch('marks')
  const watchedMarksArray = Array.isArray(watchedMarks) ? watchedMarks : []
  const displayMarks = formMarks.length > 0 ? formMarks : watchedMarksArray

  return (
    <div className={`page active ${isDarkMode ? 'dark' : ''}`}>
      <div className="page-header">
        <div className="page-title">
          <h1>Project Evaluation</h1>
          <p className="page-subtitle">Each project requires two evaluations: Project and Presentation</p>
        </div>
      </div>

      {/* Level Selection Cards */}
      <div className="card mb-6">
        <h3 className="mb-5 text-gray-900 dark:text-gray-100">Select Project Level</h3>
        <p className="mb-5 text-gray-600 dark:text-gray-400">
          Choose the project level to begin the evaluation process.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            className="template-card cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => openLevelSelection(200)}
          >
            <div className="template-icon text-4xl">📝</div>
            <div className="template-name">Level 200 Evaluation</div>
            <div className="template-desc">Second-year project evaluation</div>
          </div>
          <div 
            className="template-card cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => openLevelSelection(400)}
          >
            <div className="template-icon text-4xl">🎓</div>
            <div className="template-name">Level 400 Evaluation</div>
            <div className="template-desc">Final year capstone project evaluation</div>
          </div>
        </div>
      </div>

      {/* Direct Evaluation Type Selection (Alternative)
      <div className="card mb-6">
        <h3 className="mb-5 text-gray-900 dark:text-gray-100">Direct Evaluation Type Selection</h3>
        <p className="mb-5 text-gray-600 dark:text-gray-400">
          Or select the evaluation type directly (without level filtering).
        </p>
        <div className="template-grid">
          {templatesLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          ) : templates ? (
            Object.entries(templates).map(([key, template]: [string, any]) => (
              <div key={key} className="template-card" onClick={() => openEvaluationForm(key)}>
                <div className="template-icon">
                  {key === 'project' ? '💻' : 
                   key === 'presentation' ? '📊' : '⚙'}
                </div>
                <div className="template-name">{template.name}</div>
                <div className="template-desc">{template.description}</div>
                <div className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                  {key === 'project' ? 'Max 70 points' : 'Max 30 points'}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No templates available</p>
            </div>
          )}
        </div>
      </div> */}

      {/* Custom Evaluation Card */}
      <div className="card">
        <h3 className="mb-5 text-gray-900 dark:text-gray-100">Custom Evaluation</h3>
        <p className="mb-5 text-gray-600 dark:text-gray-400">
          Create an evaluation with your own custom criteria and scoring system.
        </p>
        <div className="template-grid">
          <div 
            className="template-card cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-400"
            onClick={openCustomEvaluation}
          >
            <div className="template-icon text-4xl">⚙️</div>
            <div className="template-name">Custom Evaluation</div>
            <div className="template-desc">Define your own evaluation criteria and scoring</div>
            <div className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
              Flexible scoring
            </div>
          </div>
        </div>
      </div>

      {/* Level Selection Modal */}
      <div className={`modal ${levelSelectionModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{maxWidth: '500px'}}>
          <div className="modal-header">
            <h2 className="modal-title">Level {selectedLevel} - Select Evaluation Type</h2>
            <button className="modal-close" onClick={closeLevelSelectionModal}>×</button>
          </div>
          <div className="p-6">
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              Each project requires both evaluations. Select which one you want to create or update.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => selectEvaluationType('PROJECT')}
                className="p-6 border-2 border-blue-200 dark:border-blue-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
              >
                <div className="text-3xl mb-3">💻</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Project Evaluation
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Code Quality, Documentation, and Functionality
                </p>
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Max 70 points
                </div>
              </button>
              <button
                onClick={() => selectEvaluationType('PRESENTATION')}
                className="p-6 border-2 border-purple-200 dark:border-purple-800 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-left"
              >
                <div className="text-3xl mb-3">📊</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Presentation Evaluation
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Clarity & Communication, Visual Presentation, and Technical Explanation
                </p>
                <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Max 30 points
                </div>
              </button>
            </div>
            <button
              onClick={closeLevelSelectionModal}
              className="mt-6 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Custom Evaluation Modal */}
      <div className={`modal ${customEvaluationModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{maxWidth: '700px'}}>
          <div className="modal-header">
            <h2 className="modal-title">Custom Evaluation</h2>
            <button className="modal-close" onClick={closeCustomEvaluation}>×</button>
          </div>
          
          <div className="p-6">
            {/* Project Selection */}
            {customFormError && (
              <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-200">
                {customFormError}
              </div>
            )}
            <div className="form-group mb-6">
              <label className="form-label">Project</label>
              <select 
                className="form-select"
                value={customEvaluationData.projectId}
                onChange={(e) => setCustomEvaluationData({...customEvaluationData, projectId: e.target.value})}
              >
                <option value="">Select Project</option>
                {projectsLoading ? (
                  <option disabled>Loading projects...</option>
                ) : projects && projects.length > 0 ? (
                  projects.map((project: any) => (
                    <option key={project.id} value={project.id}>
                      {project.title} - {project.student_name} (Level {project.level})
                    </option>
                  ))
                ) : (
                  <option disabled>No projects available</option>
                )}
              </select>
            </div>

            {/* Custom Criteria */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Evaluation Criteria
                </h3>
                <button
                  type="button"
                  onClick={addCustomCriterion}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                >
                  + Add Criterion
                </button>
              </div>

              <div className="space-y-4">
                {customCriteria.map((criterion, index) => (
                  <div key={criterion.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Criterion #{index + 1}
                      </span>
                      {customCriteria.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCustomCriterion(criterion.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Criterion Name *
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g., Innovation, Code Quality"
                          value={criterion.criterion_name}
                          onChange={(e) => updateCustomCriterion(criterion.id, 'criterion_name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Max Score *
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="0"
                          min="0"
                          value={criterion.max_score || ''}
                          onChange={(e) => updateCustomCriterion(criterion.id, 'max_score', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Score (0 - {criterion.max_score || 0})
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="0"
                          min="0"
                          max={criterion.max_score || 0}
                          value={criterion.score || ''}
                          onChange={(e) => updateCustomCriterion(criterion.id, 'score', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Comments (Optional)
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Add comments..."
                          value={criterion.comments}
                          onChange={(e) => updateCustomCriterion(criterion.id, 'comments', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Overall Comments */}
            <div className="form-group mb-6">
              <label className="form-label">Overall Comments & Feedback</label>
              <textarea 
                className="form-textarea"
                placeholder="Provide detailed feedback..."
                rows={4}
                value={customEvaluationData.comments}
                onChange={(e) => setCustomEvaluationData({...customEvaluationData, comments: e.target.value})}
              />
            </div>

            {/* Action Buttons */}
            <div style={{display: 'flex', gap: '15px', marginTop: '25px'}}>
              <button 
                type="button"
                onClick={prepareCustomEvaluationSubmission}
                className="btn-primary"
                style={{flex: 1}}
                disabled={createEvaluationMutation.isPending || verificationLoading}
              >
                {createEvaluationMutation.isPending ? 'Submitting...' : 'Submit Custom Evaluation'}
              </button>
              <button 
                type="button"
                className="btn-primary"
                onClick={closeCustomEvaluation} 
                style={{background: '#64748b', flex: 1}}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Form Modal */}
      <div className={`modal ${modalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">{modalTitle}</h2>
            <button className="modal-close" onClick={closeEvaluationForm}>×</button>
          </div>
          
          <form onSubmit={handleSubmit(handleEvaluationSubmit)}>
            <input type="hidden" {...register('evaluationType', { required: true })} />
            
            <div className="form-group">
              <label className="form-label">Evaluation Type</label>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {evaluationType === 'PROJECT' ? '📝 Project Evaluation' : '📊 Presentation Evaluation'}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {evaluationType === 'PROJECT' 
                    ? 'Evaluating: Code Quality, Documentation, and Functionality'
                    : 'Evaluating: Clarity & Communication, Visual Presentation, and Technical Explanation'}
                </p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Project</label>
              {selectedLevel && (
                <div className="mb-2 text-sm text-blue-600 dark:text-blue-400">
                  Filtering projects for Level {selectedLevel}
                </div>
              )}
              
              {/* Project Search Input */}
              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Search projects by title or student name..."
                  className="form-input w-full"
                  value={projectSearchTerm}
                  onChange={(e) => setProjectSearchTerm(e.target.value)}
                  disabled={!!selectedProject}
                />
              </div>
              
              <select 
                className="form-select" 
                {...register('projectId', { required: 'Please select a project' })}
                disabled={!!selectedProject}
              >
                <option value="">Select Project</option>
                {projectsLoading ? (
                  <option disabled>Loading projects...</option>
                ) : projects && projects.length > 0 ? (
                  (selectedLevel 
                    ? projects.filter((project: any) => project.level === selectedLevel)
                    : projects
                  )
                  .filter((project: any) => {
                    if (!projectSearchTerm) return true
                    const searchLower = projectSearchTerm.toLowerCase()
                    return (
                      project.title?.toLowerCase().includes(searchLower) ||
                      project.student_name?.toLowerCase().includes(searchLower) ||
                      project.study_program_name?.toLowerCase().includes(searchLower)
                    )
                  })
                  .map((project: any) => (
                    <option key={project.id} value={project.id}>
                      {project.title} - {project.student_name} (Level {project.level})
                    </option>
                  ))
                ) : (
                  <option disabled>No projects available{selectedLevel ? ` for Level ${selectedLevel}` : ''}</option>
                )}
              </select>
              {errors.projectId && (
                <p className="text-red-500 text-sm mt-1">{errors.projectId.message}</p>
              )}
              {projectSearchTerm && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {projects && projects.length > 0 ? (
                    (selectedLevel 
                      ? projects.filter((project: any) => project.level === selectedLevel)
                      : projects
                    ).filter((project: any) => {
                      if (!projectSearchTerm) return true
                      const searchLower = projectSearchTerm.toLowerCase()
                      return (
                        project.title?.toLowerCase().includes(searchLower) ||
                        project.student_name?.toLowerCase().includes(searchLower) ||
                        project.study_program_name?.toLowerCase().includes(searchLower)
                      )
                    }).length
                  ) : 0} project(s) found
                </p>
              )}
            </div>

            {selectedProject && (
              <div className="form-group">
                <label className="form-label">Project Details</label>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p><strong>Title:</strong> {selectedProject.title}</p>
                  <p><strong>Student:</strong> {selectedProject.student_name}</p>
                  <p><strong>Study Program:</strong> {selectedProject.study_program_name} (Level {selectedProject.level})</p>
                  {selectedProject.description && (
                    <p><strong>Description:</strong> {selectedProject.description}</p>
                  )}
                </div>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Evaluation Criteria
                  {displayMarks.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({displayMarks.length} criteria)
                    </span>
                  )}
                </h3>
                {displayMarks.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5">
                    <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Total: {displayMarks.reduce((sum, m) => sum + (m.max_score || 0), 0)} points
                    </span>
                  </div>
                )}
              </div>
              
              {displayMarks.length === 0 ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    {templatesLoading ? 'Loading criteria...' : 'No criteria loaded. Please refresh the page and try again.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayMarks.map((mark, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                      <label className="form-label mb-3">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {mark.criterion_name || `Criterion ${index + 1}`}
                        </span>
                        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                          (Max: {mark.max_score} points)
                        </span>
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Score *
                          </label>
                          <input 
                            type="number" 
                            className="form-input" 
                            min="0" 
                            max={mark.max_score}
                            placeholder={`0 - ${mark.max_score}`}
                            {...register(`marks.${index}.score`, { 
                              required: 'Score is required',
                              min: { value: 0, message: 'Score cannot be negative' },
                              max: { value: mark.max_score, message: `Score cannot exceed ${mark.max_score}` }
                            })}
                          />
                          {errors.marks?.[index]?.score && (
                            <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.marks[index]?.score?.message}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Comments (Optional)
                          </label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Add comments for this criterion..."
                            {...register(`marks.${index}.comments`)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Overall Comments & Feedback</label>
              <textarea 
                className="form-textarea" 
                placeholder="Provide detailed feedback..."
                {...register('comments', { required: 'Comments are required' })}
              />
              {errors.comments && (
                <p className="text-red-500 text-sm mt-1">{errors.comments.message}</p>
              )}
            </div>

            <div style={{display: 'flex', gap: '15px', marginTop: '25px'}}>
              <button 
                type="submit" 
                className="btn-primary" 
                style={{flex: 1}}
                disabled={createEvaluationMutation.isPending || verificationLoading}
              >
                {createEvaluationMutation.isPending ? 'Submitting...' : 'Submit Evaluation'}
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={closeEvaluationForm} 
                style={{background: '#64748b', flex: 1}}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <VerificationModal
        open={!!verificationConfig}
        title={verificationConfig?.title || ''}
        description={verificationConfig?.description || ''}
        highlight={verificationConfig?.highlight}
        confirmLabel={verificationConfig?.confirmLabel || 'Confirm'}
        tone={verificationConfig?.tone || 'info'}
        loading={verificationLoading || createEvaluationMutation.isPending}
        onConfirm={executePendingAction}
        onCancel={closeVerificationModal}
      />
    </div>
  )
}
