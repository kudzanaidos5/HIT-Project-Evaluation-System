'use client'

import React, { useEffect } from 'react'

interface VerificationModalProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'info' | 'danger'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
  highlight?: string
}

const toneStyles = {
  info: {
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    confirm: 'bg-blue-600 hover:bg-blue-500 focus-visible:ring-blue-500',
    icon: (
      <svg className="h-6 w-6 text-blue-500 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  danger: {
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
    confirm: 'bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-500',
    icon: (
      <svg className="h-6 w-6 text-rose-500 dark:text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.502-1.27.732-2.02L13.732 4.992c-.58-.58-1.52-.58-2.1 0L4.35 16.98c-.77.75-.322 2.02.732 2.02z" />
      </svg>
    ),
  },
}

export default function VerificationModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'info',
  loading = false,
  onConfirm,
  onCancel,
  highlight,
}: VerificationModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  const toneSetting = toneStyles[tone]

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-6 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl transition-colors">
        <div className="flex items-start gap-3 px-6 pt-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
            {toneSetting.icon}
          </div>
          <div>
            <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${toneSetting.badge}`}>
              Verification Required
            </p>
            <h2 id="verification-title" className="mt-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
            {highlight && (
              <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                {highlight}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 dark:border-gray-800 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-600 px-5 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-70 ${toneSetting.confirm}`}
          >
            {loading ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.29A7.96 7.96 0 014 12H0c0 3.04 1.14 5.82 3 7.94l3-2.65z"></path>
                </svg>
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

