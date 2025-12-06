# Implement Real-Time User-Specific Notifications System

## Problem Summary
The current notification system uses mock/default notifications that are the same for all users of the same role. We need to implement a real-time notification system where:
1. **Students** receive notifications specific to them (their projects, evaluations, deadlines)
2. **Admins** receive notifications specific to them (new submissions, approaching deadlines, system alerts)
3. Notifications are **real-time** and reflect actual events in the system
4. Notifications are **user-specific** - each user only sees notifications intended for them

## Current State

### Mock Notifications
- `buildDefaultNotifications()` in `AppLayout.tsx` creates hardcoded mock notifications
- All admins see the same 3 mock notifications
- All students see the same 3 mock notifications
- Notifications don't reflect actual system events

### Notification Infrastructure
- Notification store exists in `apps/web/lib/stores.ts` with proper filtering by `userId` and `audience`
- UI components are ready (`NotificationsDropdown.tsx`)
- Notification types: `success`, `error`, `info`, `warning`
- Support for `userId` filtering (notifications directed to specific users)
- Support for `audience` filtering (`ADMIN`, `STUDENT`, `ALL`)

## Required Implementation

### Phase 1: Backend API Endpoints

#### 1.1 Create Notification Model (Backend)
**Location**: `apps/api/app/models/models.py`

Create a `Notification` model with:
- `id` (primary key)
- `user_id` (foreign key to User, nullable for audience-based notifications)
- `title` (string)
- `message` (text)
- `type` (enum: 'success', 'error', 'info', 'warning')
- `read` (boolean, default False)
- `audience` (enum: 'ADMIN', 'STUDENT', 'ALL', nullable)
- `action_label` (string, nullable)
- `action_url` (string, nullable)
- `created_at` (datetime)
- `read_at` (datetime, nullable)

#### 1.2 Notification API Endpoints
**Location**: `apps/api/app/routes/api.py`

Create the following endpoints:

**GET `/api/notifications`**
- Returns all notifications for the current user
- Filters by:
  - `user_id` matches current user (if set)
  - OR `audience` matches user's role
  - OR `audience` is 'ALL'
- Query params: `?unread_only=true` (optional)
- Returns: `{ notifications: NotificationItem[] }`

**GET `/api/notifications/unread-count`**
- Returns count of unread notifications for current user
- Returns: `{ count: number }`

**POST `/api/notifications/:id/read`**
- Marks a notification as read
- Returns: `{ message: "Notification marked as read" }`

**POST `/api/notifications/mark-all-read`**
- Marks all notifications for current user as read
- Returns: `{ message: "All notifications marked as read" }`

**DELETE `/api/notifications/:id`**
- Deletes a notification (only if it belongs to current user)
- Returns: `{ message: "Notification deleted" }`

**POST `/api/notifications` (Admin only)**
- Creates a notification
- Body: `{ user_id?: number, audience?: 'ADMIN' | 'STUDENT' | 'ALL', title, message, type, action_label?, action_url? }`
- Returns: `{ notification: NotificationItem }`

#### 1.3 Notification Event Triggers
**Location**: Various route handlers in `apps/api/app/routes/api.py`

Add notification creation when these events occur:

**For Students:**
- **Project Approved**: When admin approves a project (`POST /api/projects/:id/approve`)
  - Create notification for the project's student
  - Type: `success`
  - Message: "Your project '{project_title}' has been approved!"
  - Action: Link to project page

- **Project Rejected**: When admin rejects a project (`POST /api/projects/:id/reject`)
  - Create notification for the project's student
  - Type: `error`
  - Message: "Your project '{project_title}' has been rejected. Reason: {reason}"
  - Action: Link to project page

- **Evaluation Released**: When admin creates/updates an evaluation (`POST /api/projects/:id/evaluations`, `PATCH /api/evaluations/:id`)
  - Create notification for the project's student
  - Type: `success`
  - Message: "Your project '{project_title}' has been evaluated. Score: {score}%"
  - Action: Link to project evaluation page

- **Deadline Approaching**: When deadline is within 2 days (cron job or scheduled check)
  - Create notification for students with projects approaching deadline
  - Type: `warning`
  - Message: "Your project deadline is approaching in {days} days"
  - Action: Link to project page

- **Deadline Missed**: When deadline has passed (cron job or scheduled check)
  - Create notification for students who missed deadline
  - Type: `error`
  - Message: "You have missed the deadline for your project"
  - Action: Link to project page

**For Admins:**
- **New Project Submitted**: When student creates a project (`POST /api/projects` or `POST /api/students/me/project`)
  - Create notification for all admins (`audience: 'ADMIN'`)
  - Type: `info`
  - Message: "New project '{project_title}' submitted by {student_name}"
  - Action: Link to project page

- **Project Status Changed**: When student updates project submission (`PUT /api/students/me/projects/:id/submission`)
  - Create notification for all admins
  - Type: `info`
  - Message: "Project '{project_title}' has been updated"
  - Action: Link to project page

- **Deadline Approaching (Admin View)**: When multiple projects approaching deadline
  - Create notification for all admins
  - Type: `warning`
  - Message: "{count} projects will reach their deadline in the next 24 hours"
  - Action: Link to deadlines page

- **Missed Deadlines**: When students miss deadlines (cron job)
  - Create notification for all admins
  - Type: `warning`
  - Message: "{count} students have missed their project deadlines"
  - Action: Link to deadlines/missed-deadlines page

### Phase 2: Frontend API Integration

#### 2.1 Add Notification API Methods
**Location**: `apps/web/lib/api.ts`

Add to the API client:

```typescript
export const notificationsAPI = {
  getAll: async (params?: { unread_only?: boolean }) => {
    const queryParams = new URLSearchParams()
    if (params?.unread_only) queryParams.append('unread_only', 'true')
    const response = await apiClient.get(`/notifications?${queryParams.toString()}`)
    return response.data
  },

  getUnreadCount: async () => {
    const response = await apiClient.get('/notifications/unread-count')
    return response.data
  },

  markAsRead: async (id: string) => {
    const response = await apiClient.post(`/notifications/${id}/read`)
    return response.data
  },

  markAllAsRead: async () => {
    const response = await apiClient.post('/notifications/mark-all-read')
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/notifications/${id}`)
    return response.data
  },

  create: async (notificationData: {
    user_id?: number
    audience?: 'ADMIN' | 'STUDENT' | 'ALL'
    title: string
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
    action_label?: string
    action_url?: string
  }) => {
    const response = await apiClient.post('/notifications', notificationData)
    return response.data
  }
}
```

#### 2.2 Update Notification Store
**Location**: `apps/web/lib/stores.ts`

Add methods to fetch notifications from API:

```typescript
export interface UIState {
  // ... existing properties
  fetchNotifications: () => Promise<void>
  syncNotifications: () => Promise<void>
}
```

Implementation:
- `fetchNotifications()`: Fetches all notifications from API and replaces store notifications
- `syncNotifications()`: Fetches notifications and merges with existing (for real-time updates)

#### 2.3 Replace Mock Notifications with Real Data
**Location**: `apps/web/app/AppLayout.tsx`

**Remove or modify `buildDefaultNotifications()`**:
- Option 1: Remove it entirely and only use API notifications
- Option 2: Keep as fallback for when API is unavailable, but prioritize API notifications

**Update the `useEffect` that loads notifications**:
- On user login/load: Call `fetchNotifications()` instead of `buildDefaultNotifications()`
- Only use `buildDefaultNotifications()` as fallback if API fails

### Phase 3: Real-Time Updates

#### Option A: Polling (Simpler Implementation)
**Location**: `apps/web/app/AppLayout.tsx`

Add polling mechanism:
- Use `setInterval` to call `syncNotifications()` every 30-60 seconds
- Only poll when user is authenticated
- Stop polling when component unmounts or user logs out
- Consider exponential backoff on errors

```typescript
useEffect(() => {
  if (!user || !isAuthenticated) return

  // Initial fetch
  fetchNotifications()

  // Poll for updates every 30 seconds
  const intervalId = setInterval(() => {
    syncNotifications()
  }, 30000)

  return () => clearInterval(intervalId)
}, [user, isAuthenticated])
```

#### Option B: WebSocket (Better Real-Time Experience)
**Location**: Create `apps/web/lib/websocket.ts`

Implement WebSocket connection:
- Connect to WebSocket endpoint on user login
- Listen for notification events
- Update store when new notifications arrive
- Handle reconnection on disconnect
- Close connection on logout

**Backend WebSocket Endpoint**:
- Create WebSocket endpoint that sends notifications to connected clients
- Filter notifications by user ID/role before sending
- Send notification when events occur (project approved, evaluation created, etc.)

### Phase 4: Notification Event Mapping

#### 4.1 Student Notification Events
Map these backend events to frontend notifications:

| Backend Event | Notification Type | Recipient | Message |
|--------------|------------------|-----------|---------|
| Project approved | `success` | Project student | "Your project '{title}' has been approved!" |
| Project rejected | `error` | Project student | "Your project '{title}' has been rejected" |
| Evaluation created/updated | `success` | Project student | "Your project has been evaluated. Score: {score}%" |
| Deadline approaching (2 days) | `warning` | Affected students | "Project deadline approaching in {days} days" |
| Deadline missed | `error` | Affected students | "You have missed the project deadline" |

#### 4.2 Admin Notification Events
Map these backend events to frontend notifications:

| Backend Event | Notification Type | Recipient | Message |
|--------------|------------------|-----------|---------|
| New project submitted | `info` | All admins | "New project '{title}' submitted by {student}" |
| Project updated | `info` | All admins | "Project '{title}' has been updated" |
| Multiple deadlines approaching | `warning` | All admins | "{count} projects approaching deadline" |
| Students missed deadlines | `warning` | All admins | "{count} students missed deadlines" |

### Phase 5: Notification Persistence and Cleanup

#### 5.1 Notification Lifecycle
- **Persistent notifications**: System notifications (deadlines, evaluations) should persist until read
- **Temporary notifications**: Success/error messages from user actions can auto-remove after 5 seconds
- **Cleanup**: Old read notifications can be auto-deleted after 30 days (backend)

#### 5.2 Mark as Read on Click
**Location**: `apps/web/app/AppLayout.tsx`

Update `handleNotificationSelect`:
- Call `notificationsAPI.markAsRead(notification.id)` when notification is clicked
- Update local store state

## Implementation Steps

1. **Backend Database & Model**
   - Create `Notification` model in `models.py`
   - Run database migration
   - Add model to database initialization

2. **Backend API Endpoints**
   - Implement GET, POST, DELETE endpoints for notifications
   - Add notification creation in existing route handlers (approve, reject, evaluate, etc.)
   - Add scheduled jobs for deadline checks (using APScheduler or similar)

3. **Frontend API Integration**
   - Add `notificationsAPI` to `api.ts`
   - Update store with `fetchNotifications` and `syncNotifications`
   - Remove/replace mock notifications in `AppLayout.tsx`

4. **Real-Time Updates**
   - Implement polling or WebSocket connection
   - Test notification delivery

5. **Testing**
   - Test student receives notification when project approved
   - Test admin receives notification when project submitted
   - Test deadline notifications
   - Test notification filtering (user-specific)
   - Test real-time updates

## Files to Create/Modify

### Backend
- `apps/api/app/models/models.py` - Add Notification model
- `apps/api/app/routes/api.py` - Add notification endpoints and event triggers
- `apps/api/migrations/` - Create migration for Notification table
- `apps/api/app/utils/notification_service.py` (new) - Notification creation helper functions

### Frontend
- `apps/web/lib/api.ts` - Add `notificationsAPI`
- `apps/web/lib/stores.ts` - Add `fetchNotifications` and `syncNotifications`
- `apps/web/app/AppLayout.tsx` - Replace mock notifications, add polling/WebSocket
- `apps/web/lib/websocket.ts` (new, if using WebSocket) - WebSocket connection management

## Testing Checklist

- [ ] Student receives notification when their project is approved
- [ ] Student receives notification when their project is rejected
- [ ] Student receives notification when evaluation is created/updated
- [ ] Student receives deadline warning notifications
- [ ] Admin receives notification when new project is submitted
- [ ] Admin receives notification when project is updated
- [ ] Admin receives deadline-related notifications
- [ ] Notifications are filtered correctly (students only see their notifications)
- [ ] Notifications are filtered correctly (admins see admin notifications)
- [ ] Real-time updates work (polling or WebSocket)
- [ ] Mark as read functionality works
- [ ] Mark all as read functionality works
- [ ] Delete notification functionality works
- [ ] Unread count is accurate
- [ ] Notifications persist across page refreshes
- [ ] Notifications are cleared on logout

## Additional Considerations

1. **Performance**: Limit number of notifications fetched (pagination)
2. **Rate Limiting**: Prevent notification spam
3. **Notification Preferences**: Future feature - allow users to configure which notifications they want
4. **Email Notifications**: Future feature - send email for important notifications
5. **Push Notifications**: Future feature - browser push notifications
6. **Notification Groups**: Group similar notifications (e.g., "3 new projects submitted")

