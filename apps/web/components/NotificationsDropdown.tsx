"use client";

import React, { useState } from "react";
import { NotificationItem, NotificationType } from "../lib/stores";
import {
  Bell,
  CheckCheck,
  Trash2,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Inbox,
} from "lucide-react";

interface NotificationsDropdownProps {
  notifications: NotificationItem[];
  onSelect: (notification: NotificationItem) => void;
  onMarkAllRead: () => void;
  onRemove: (id: string) => void;
  onClearRead: () => void;
}

const typeStyles: Record<
  NotificationType,
  { bg: string; text: string; icon: React.ReactNode }
> = {
  success: {
    bg: "bg-green-100 dark:bg-green-900/40",
    text: "text-green-800 dark:text-green-200",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  error: {
    bg: "bg-red-100 dark:bg-red-900/40",
    text: "text-red-800 dark:text-red-200",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  info: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    text: "text-blue-800 dark:text-blue-200",
    icon: <Info className="h-4 w-4" />,
  },
  warning: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-800 dark:text-amber-200",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
};

const formatRelativeTime = (timestamp: Date) => {
  const diffMs = Date.now() - timestamp.getTime();
  const minutes = Math.round(diffMs / (1000 * 60));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return timestamp.toLocaleDateString();
};

export default function NotificationsDropdown({
  notifications,
  onSelect,
  onMarkAllRead,
  onRemove,
  onClearRead,
}: NotificationsDropdownProps) {
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);
  const displayNotifications =
    activeTab === "all" ? notifications : unreadNotifications;

  return (
    <div
      className="absolute right-0 mt-2 w-80 sm:w-[400px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl shadow-blue-900/10 ring-1 ring-black/5 z-50 overflow-hidden flex flex-col"
      role="menu"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-4 w-4 text-blue-500" />
            Notifications
            {unreadNotifications.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-[10px] bg-blue-600 text-white rounded-full">
                {unreadNotifications.length}
              </span>
            )}
          </h3>
          <div className="flex gap-2">
            {unreadNotifications.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAllRead();
                }}
                title="Mark all as read"
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            )}
            {readNotifications.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearRead();
                }}
                title="Clear all read"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === "all"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("unread")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === "unread"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Unread
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 custom-scrollbar">
        {displayNotifications.length === 0 ? (
          <div className="px-4 py-12 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Inbox className="h-8 w-8 text-gray-400 dark:text-gray-600" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {activeTab === "unread"
                ? "No unread notifications"
                : "No notifications yet"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[200px] mx-auto">
              {activeTab === "unread"
                ? "You've read everything! Catch up on your history in the 'All' tab."
                : "We'll let you know when there's an update on your projects or evaluations."}
            </p>
          </div>
        ) : (
          displayNotifications.map((notification) => {
            const style = typeStyles[notification.type];
            return (
              <div
                key={notification.id}
                className={`group relative w-full text-left px-4 py-4 flex gap-4 transition-all duration-200 ${
                  notification.read
                    ? "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/70 opacity-75"
                    : "bg-blue-50/40 dark:bg-blue-900/10 hover:bg-blue-50/60 dark:hover:bg-blue-900/20"
                }`}
              >
                {/* Type Icon */}
                <div className="pt-1 flex-shrink-0">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center ${style.bg} ${style.text}`}
                  >
                    {style.icon}
                  </div>
                </div>

                {/* Main Content */}
                <div
                  className="flex-1 cursor-pointer min-w-0"
                  onClick={() => onSelect(notification)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm font-bold truncate ${notification.read ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-white"}`}
                    >
                      {notification.title}
                    </p>
                    <span className="text-[10px] whitespace-nowrap text-gray-400 dark:text-gray-500 font-medium">
                      {formatRelativeTime(notification.timestamp)}
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-1 leading-relaxed ${notification.read ? "text-gray-500 dark:text-gray-400" : "text-gray-600 dark:text-gray-300"}`}
                  >
                    {notification.message}
                  </p>

                  {notification.actionLabel && (
                    <div className="mt-2.5 flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors uppercase tracking-wider">
                      {notification.actionLabel}
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)] animate-pulse"></div>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemove(notification.id);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all duration-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
        <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center uppercase tracking-widest font-medium">
          HIT Project Evaluation System
        </p>
      </div>
    </div>
  );
}
