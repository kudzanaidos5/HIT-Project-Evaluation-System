'use client'

import React from 'react'
import { NotificationItem, NotificationType } from '../lib/stores'

interface NotificationsDropdownProps {
  notifications: NotificationItem[]
  onSelect: (notification: NotificationItem) => void
  onMarkAllRead: () => void
}

const typeStyles: Record<NotificationType, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
}

const formatRelativeTime = (timestamp: Date) => {
  const diffMs = Date.now() - timestamp.getTime()
  const minutes = Math.round(diffMs / (1000 * 60))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.round(days / 7)
  return `${weeks}w ago`
}

export default function NotificationsDropdown({
  notifications,
  onSelect,
  onMarkAllRead,
}: NotificationsDropdownProps) {
  const unreadCount = notifications.filter((notification) => !notification.read).length

  return (
    <div
      className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl shadow-blue-900/10 ring-1 ring-black/5 z-50"
      role="menu"
      aria-label="Notifications"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {unreadCount > 0 ? `${unreadCount} new` : 'Up to date'}
          </p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-300"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-auto divide-y divide-gray-100 dark:divide-gray-800">
        {notifications.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            You&apos;re all caught up! 🎉
          </div>
        ) : (
          notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => onSelect(notification)}
              className={`w-full text-left px-4 py-3 flex gap-3 transition-colors ${
                notification.read
                  ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/70'
                  : 'bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-50 dark:hover:bg-blue-900/30'
              }`}
            >
              <div className="pt-1">
                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full ${typeStyles[notification.type]}`}>
                  {notification.type.toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{notification.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notification.message}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatRelativeTime(notification.timestamp)}
                  </span>
                  {notification.actionLabel && (
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-300">
                      {notification.actionLabel}
                    </span>
                  )}
                </div>
              </div>
              {!notification.read && (
                <span className="mt-1 h-2 w-2 rounded-full bg-blue-500"></span>
              )}
            </button>
          ))
        )}
      </div>

      <div className="px-4 py-3 text-[11px] text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
        You&apos;ll be notified about project submissions, evaluations, and system alerts.
      </div>
    </div>
  )
}

