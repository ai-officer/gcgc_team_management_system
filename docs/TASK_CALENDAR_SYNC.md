# Task Calendar Sync Feature

## Overview

The TMS now syncs **Tasks** to Google Calendar in addition to Events. When sync is enabled, all tasks with due dates will automatically appear in your Google Calendar.

## What's New

### 1. **Automatic Task Sync**
- Tasks with due dates are automatically synced to Google Calendar
- Tasks appear with `[Task]` prefix in calendar title
- Color-coded by priority:
  - 🟢 **LOW** - Green
  - 🟡 **MEDIUM** - Yellow  
  - 🟠 **HIGH** - Orange
  - 🔴 **URGENT** - Red

### 2. **Task Details in Calendar**
Each synced task includes comprehensive details:
- Task status (TODO, IN_PROGRESS, etc.)
- Priority level
- Progress percentage
- Task type (INDIVIDUAL, TEAM, COLLABORATION)
- Assignee name
- Creator name
- Team members (for TEAM tasks)
- Collaborators (for COLLABORATION tasks)

### 3. **Smart Time Handling**
- If task has both `startDate` and `dueDate`, uses both
- If only `dueDate` exists, creates 1-hour event ending at due date
- If no `dueDate`, task won't be synced (tasks need deadlines to appear in calendar)

## How It Works

### Automatic Sync
Tasks are automatically synced when:

1. **Creating a task** - If the task has a due date and sync is enabled
2. **Updating a task** - Syncs changes to title, description, dates, priority, etc.
3. **Deleting a task** - Removes the task from Google Calendar
4. **Manual sync** - Click "Sync to Google" button in calendar settings

### Manual Sync
To manually sync all tasks:

1. Go to `/user/calendar`
2. Open "Google Calendar Sync" settings
3. Make sure "Sync Task Deadlines" is enabled
4. Click "Sync to Google"

All your tasks with due dates will be synced to your Google Calendar.

## Configuration

### Enable Task Sync

Task sync is controlled by the **"Sync Task Deadlines"** setting in Google Calendar Sync Settings:

1. Navigate to `/user/calendar`
2. Click "Google Calendar Sync" button
3. Ensure "Sync Task Deadlines" is checked
4. Choose sync direction:
   - **Two-way sync**: Tasks sync to Google (Events can sync from Google)
   - **TMS → Google only**: Tasks export to Google only
   - **Google → TMS only**: Tasks won't sync (only imports events)

### Task Filtering

Tasks are synced if:
- You are the **creator**, **assignee**, **team member**, or **collaborator**
- Task has a **due date** (tasks without due dates are not synced)
- Sync is **enabled** in your settings
- "Sync Task Deadlines" is **enabled**

## Technical Implementation

### Database Schema

Added to `Task` model:
```prisma
googleCalendarId      String?   // Which calendar it's synced to
googleCalendarEventId String?   // Google Calendar event ID
syncedAt              DateTime? // Last sync timestamp
```

### API Changes

#### Modified Endpoints

**POST `/api/calendar/sync-to-google`**
- Now syncs both Events AND Tasks
- Tasks only synced if `syncTaskDeadlines` is enabled
- Includes all tasks where user is involved

**POST `/api/tasks`**
- Automatically syncs task on creation if:
  - Task has a due date
  - User has sync enabled
  - syncTaskDeadlines is enabled

**PATCH `/api/tasks/[id]`**
- Automatically updates synced calendar event
- Creates new calendar event if task now has due date
- Deletes calendar event if due date removed

**DELETE `/api/tasks/[id]`**
- Automatically deletes synced calendar event

### New Helper Functions

Created `/src/lib/calendar-sync-helper.ts`:
- `autoSyncTask(taskId, userId)` - Automatically sync a single task
- `deleteSyncedTask(taskId, userId)` - Delete synced task from calendar

### Google Calendar Service

Added to `/src/lib/google-calendar.ts`:
- `convertTMSTaskToGoogle(task)` - Converts TMS task to Google Calendar event
- `formatTaskDescription(task)` - Formats task details for calendar description

## Example

### Before Sync
You have 3 tasks in TMS:
1. "Complete Project Report" - Due: Oct 25, 2025
2. "Team Meeting Prep" - Due: Oct 22, 2025  
3. "Code Review" - Due: Oct 20, 2025

### After Sync
Your Google Calendar shows:
1. **[Task] Complete Project Report** - Oct 25 (Orange - HIGH priority)
2. **[Task] Team Meeting Prep** - Oct 22 (Yellow - MEDIUM priority)
3. **[Task] Code Review** - Oct 20 (Red - URGENT priority)

Each calendar event includes full task details, assignee, status, and progress.

## Benefits

1. **Unified View** - See all tasks and events in one calendar
2. **Mobile Access** - View TMS tasks on Google Calendar mobile app
3. **Notifications** - Get Google Calendar notifications for task deadlines
4. **Integration** - Works with all Google Calendar integrations
5. **Automatic** - No manual effort needed, syncs happen automatically

## Troubleshooting

### Tasks Not Appearing in Calendar

**Check:**
1. Task has a due date
2. Google Calendar sync is enabled
3. "Sync Task Deadlines" is checked
4. Sync direction is not set to "Google → TMS only"
5. You are involved in the task (creator, assignee, team member, or collaborator)

**Solution:**
- Manually trigger sync by clicking "Sync to Google" in calendar settings
- Check browser console for errors
- Verify Google Calendar connection is active

### Task Updated but Calendar Not Reflecting Changes

**Check:**
1. Sync is still enabled
2. Google Calendar tokens are valid

**Solution:**
- Manually trigger sync
- If issue persists, disconnect and reconnect Google Calendar

### Calendar Event Not Deleted When Task Deleted

**Check:**
1. You have proper permissions to delete from Google Calendar

**Solution:**
- Manually delete the event from Google Calendar
- Reconnect Google Calendar to refresh permissions

## Future Enhancements

Potential future improvements:
- Bi-directional sync (update tasks from Google Calendar)
- Task status updates from calendar (mark complete, etc.)
- Calendar color customization per task type
- Selective task sync (choose specific tasks to sync)
- Sync task comments as calendar event updates

## Support

For issues with task calendar sync:
1. Check this documentation
2. Verify Google Calendar connection is active
3. Check the troubleshooting section
4. Contact system administrator

---

**Last Updated:** October 20, 2025
**Version:** 1.0.0

