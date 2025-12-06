# Fix Notification System Logic Issues

## Problem Summary
The notification system in the Student Evaluation System has several logic issues that cause notifications to behave inconsistently, get overwritten unexpectedly, or fail to display properly.

## Current Implementation Overview

### Key Files:
- `apps/web/lib/stores.ts` - Notification store with `addNotification`, `removeNotification`, `markNotificationRead`
- `apps/web/app/AppLayout.tsx` - Notification display logic and `buildDefaultNotifications` function
- `apps/web/components/NotificationsDropdown.tsx` - Notification UI component

### Current Behavior:
1. **Auto-removal**: All notifications added via `addNotification()` are automatically removed after 5 seconds (line 224-227 in stores.ts)
2. **Default notifications**: `buildDefaultNotifications()` creates persistent notifications based on user role (lines 76-151 in AppLayout.tsx)
3. **Notification reset**: A `useEffect` in AppLayout.tsx (lines 431-445) resets notifications when:
   - User logs out (clears all notifications)
   - User role changes (replaces all notifications with role-specific defaults)
   - Notifications array is empty (replaces with defaults)

## Identified Issues

### 1. **Notification Overwriting Problem**
**Location**: `apps/web/app/AppLayout.tsx` lines 431-445

**Issue**: When a user creates a notification via `addNotification()` (e.g., "Grade classification created successfully!"), the `useEffect` hook can overwrite it with default notifications if:
- The component re-renders and `notifications.length === 0` (which can happen after auto-removal)
- The user's role changes
- The dependency array triggers a re-render

**Expected**: User-created notifications should not be replaced by default notifications. Default notifications should only be set on initial load or role change, not when user actions create new notifications.

### 2. **Auto-Removal Timing Conflict**
**Location**: `apps/web/lib/stores.ts` lines 224-227

**Issue**: All notifications added via `addNotification()` are removed after exactly 5 seconds, regardless of:
- Notification type (success messages might need different timing than errors)
- Whether the user has read them
- Whether they're important system notifications vs. temporary feedback

**Expected**: 
- Success/error notifications from user actions (like form submissions) should auto-remove after a reasonable time
- Important system notifications should persist until read
- Users should be able to read notifications before they disappear

### 3. **Missing Cleanup for Auto-Removal**
**Location**: `apps/web/lib/stores.ts` lines 224-227

**Issue**: The `setTimeout` in `addNotification()` is not cleaned up if:
- The notification is manually removed before 5 seconds
- The component unmounts
- The notification store is reset

**Expected**: Store the timeout ID and clear it when notifications are removed or the store is reset.

### 4. **ID Collision Risk**
**Location**: `apps/web/lib/stores.ts` line 209

**Issue**: Using `Date.now().toString()` for notification IDs can cause collisions if multiple notifications are created in the same millisecond (e.g., rapid form submissions, batch operations).

**Expected**: Use a more robust ID generation method (e.g., UUID, timestamp + random, or counter).

### 5. **Inconsistent Notification Persistence**
**Location**: Multiple files

**Issue**: 
- Default notifications from `buildDefaultNotifications()` persist indefinitely
- User-created notifications via `addNotification()` are removed after 5 seconds
- No clear distinction between "persistent" and "temporary" notifications

**Expected**: 
- Add a `persistent` or `autoRemove` flag to `NotificationItem` interface
- Default notifications should be persistent
- User action feedback (success/error) should be temporary
- System alerts should be persistent until read

### 6. **Notification Filtering Logic**
**Location**: `apps/web/app/AppLayout.tsx` lines 481-494

**Issue**: The `scopedNotifications` filtering works correctly, but when default notifications are reset, they might not respect the current user's filtering needs (e.g., if a user switches roles, old notifications might still be in the array).

**Expected**: When resetting notifications, ensure the new notifications match the current user's role and ID.

### 7. **Race Condition in Notification Reset**
**Location**: `apps/web/app/AppLayout.tsx` lines 431-445

**Issue**: The dependency array `[notifications.length, setNotifications, user]` can cause issues:
- If `notifications.length` changes (e.g., auto-removal), it triggers the effect
- This can reset notifications even when user-created notifications are being removed
- The condition `notifications.length === 0` might trigger when it shouldn't

**Expected**: More precise conditions for when to reset notifications (e.g., only on initial mount, role change, or explicit reset).

## Required Fixes

### Fix 1: Add Notification Persistence Flag
- Add `persistent?: boolean` or `autoRemove?: boolean` to `NotificationItem` interface
- Default to `false` (auto-remove) for backward compatibility
- Set `persistent: true` for default notifications

### Fix 2: Improve Auto-Removal Logic
- Only auto-remove non-persistent notifications
- Store timeout IDs in a Map for cleanup
- Clear timeouts when notifications are manually removed
- Consider different timing for different notification types

### Fix 3: Fix Notification Reset Logic
- Only reset to defaults on:
  - Initial user login (when user changes from null to a user)
  - Role change (when user.role changes)
  - NOT when notifications.length changes
- Preserve user-created notifications when resetting defaults
- Merge default notifications with existing ones instead of replacing

### Fix 4: Improve ID Generation
- Use a more robust ID generation (e.g., `crypto.randomUUID()` or `Date.now() + Math.random()`)
- Ensure uniqueness even for rapid successive calls

### Fix 5: Add Cleanup for Timeouts
- Store timeout references
- Clear them in `removeNotification`
- Clear all timeouts when notifications are reset

## Testing Scenarios

1. **User creates a notification, then role changes**: Should preserve user notification, add new defaults
2. **Rapid form submissions**: Should create multiple distinct notifications without collisions
3. **Notification auto-removal**: Should only remove temporary notifications, not persistent ones
4. **Manual notification removal**: Should clear associated timeout
5. **Component unmount**: Should clean up all pending timeouts
6. **User logs out and back in**: Should reset to defaults appropriately

## Files to Modify

1. `apps/web/lib/stores.ts` - Update `NotificationItem` interface, improve `addNotification`, add timeout cleanup
2. `apps/web/app/AppLayout.tsx` - Fix `useEffect` logic for notification reset, update `buildDefaultNotifications` to mark as persistent
3. Consider adding a notification utility file for ID generation and timeout management

