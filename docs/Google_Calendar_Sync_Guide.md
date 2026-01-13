# Google Calendar Two-Way Sync Guide

## Overview
The TMS (Team Management System) now supports two-way synchronization with Google Calendar. This means:
- ✅ You can see Google Calendar events in TMS
- ✅ TMS tasks appear in your Google Calendar (with due dates)
- ✅ Updates in TMS sync to Google Calendar
- ✅ All related tasks appear in your calendar (individual, team, and collaboration tasks)

## How to Enable Two-Way Sync

### Step 1: Connect Your Google Calendar
1. Navigate to the **Calendar** page in TMS
2. Click the **Settings** (⚙️) button in the top-right corner
3. Click **"Connect Google Calendar"**
4. Sign in with your Google account and grant permissions
5. TMS will automatically create a dedicated "TMS Calendar" in your Google account

### Step 2: Configure Sync Settings
After connecting, configure what you want to sync:

1. **Sync Direction**: Choose one of:
   - **Two-Way Sync** (Recommended) - TMS ↔ Google Calendar
   - **TMS to Google** - TMS tasks appear in Google
   - **Google to TMS** - Google events appear in TMS

2. **What to Sync**:
   - ☑️ **Personal Events** - Your personal calendar events
   - ☑️ **Team Events** - Events from your team
   - ☑️ **Task Deadlines** - Your tasks with due dates (Required for two-way sync)

3. Click **"Save Settings"**

### Step 3: Trigger Initial Sync
1. After saving settings, click **"Sync Now"** button
2. Wait for the sync to complete (you'll see a success message)
3. Check your Google Calendar - you should see a new "TMS Calendar" with your tasks

## What Gets Synced to Google Calendar?

### Tasks That Sync:
- ✅ **Individual Tasks** - Tasks assigned to you
- ✅ **Team Tasks** - Tasks where you're a team member
- ✅ **Collaboration Tasks** - Tasks where you're a collaborator
- ✅ **Tasks with Due Dates** - Only tasks with due dates are synced

### Task Information in Google Calendar:
- Task title (with priority badge: 🔴 URGENT, 🟠 HIGH, 🟡 MEDIUM, 🟢 LOW)
- Description with task details
- Due date/time
- Task status
- Link back to TMS task

## What Appears in TMS Calendar?

Your TMS calendar now shows **ALL** tasks related to you:
- **[My Task]** - Tasks assigned directly to you
- **[Team Task]** - Tasks where you're a team member
- **[Collaboration]** - Tasks where you're a collaborator
- **[Created by Me]** - Tasks you created for others

Plus:
- Regular TMS events (meetings, deadlines, etc.)
- Google Calendar events (if sync enabled)
- Philippine holidays

## Automatic Sync

Once enabled, tasks are synced automatically:
- ✅ When you create a new task (instant)
- ✅ When you update a task (instant)
- ✅ When you delete a task (instant)
- 🔄 Periodic sync every few minutes (for Google → TMS)

## Manual Sync

You can manually trigger a sync anytime:
1. Go to **Calendar** page
2. Click the **Sync Now** button (🔄) in the top bar
3. Wait for completion

## Troubleshooting

### Tasks Not Appearing in Google Calendar?
1. Check that **"Task Deadlines"** is enabled in sync settings
2. Verify sync direction is NOT "Google to TMS Only"
3. Ensure the task has a due date
4. Click **"Sync Now"** to force a sync
5. Check your Google Calendar - look for the "TMS Calendar"

### Google Events Not Showing in TMS?
1. Check sync settings - "Google to TMS" must be enabled
2. Click **"Sync Now"** to refresh
3. Reload the calendar page

### Can't Connect Google Calendar?
1. Make sure you're using a valid Google account
2. Grant all requested permissions
3. Check that pop-ups are not blocked
4. Try disconnecting and reconnecting

### Duplicate Events?
The system uses a dedicated "TMS Calendar" to prevent duplicates:
- TMS tasks only appear in the "TMS Calendar"
- You can hide/show this calendar in Google Calendar settings
- Never sync to your primary calendar

## Best Practices

1. **Enable Two-Way Sync** for the best experience
2. **Always sync Task Deadlines** to see tasks in Google Calendar
3. **Use the TMS Calendar** in Google (don't delete it)
4. **Sync regularly** or use automatic sync
5. **Set due dates** on tasks you want in Google Calendar

## Calendar Access

### View-Only TMS Calendar Link
You can share a view-only link to your TMS calendar:
1. Go to Calendar settings
2. Copy the "Calendar View Link"
3. Share with others (they won't need to log in)

Note: This only shows TMS events, not your Google Calendar events.

## Default Password for New Members

When creating accounts for team members, the default password is:
```
sogopassword
```

The new member should change this password on first login.
