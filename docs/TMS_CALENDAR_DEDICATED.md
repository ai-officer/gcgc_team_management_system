# Dedicated TMS Calendar Feature

## Overview

The TMS now supports creating a **dedicated "TMS Calendar"** in your Google Calendar account. This keeps your TMS tasks and events separate from your personal calendar for better organization.

## What is TMS Calendar?

TMS Calendar is a **separate calendar** created automatically in your Google Calendar account that contains **only** your TMS data:
- ✅ Tasks (with due dates)
- ✅ Events
- ✅ Holidays
- ✅ Team meetings

## Benefits

### 1. **Clean Separation**
- Your personal calendar remains uncluttered
- TMS work stays separate from personal events
- Easy to toggle TMS Calendar on/off in Google Calendar

### 2. **Better Organization**
- All work-related items in one place
- Can share TMS Calendar with colleagues without sharing personal events
- Different color coding for work vs personal

### 3. **Bi-directional Sync**
- Tasks created in TMS → Automatically appear in TMS Calendar
- Events created in TMS Calendar → Automatically appear in TMS
- Updates sync both ways in real-time

### 4. **Easy Management**
- Show/hide all TMS items with one click in Google Calendar
- Separate notifications for work and personal
- Can set different notification settings for TMS Calendar

## How to Use

### Initial Setup

1. **Go to Calendar Page**
   - Navigate to `/user/calendar` in TMS

2. **Open Google Calendar Sync**
   - Click "Google Calendar Sync" button

3. **Connect Google Account**
   - Click "Connect Google Calendar"
   - Sign in and authorize TMS

4. **Choose TMS Calendar (Recommended)**
   - Click "🎯 Use TMS Calendar"
   - This will automatically create a "TMS Calendar" in your Google account
   - All your tasks will sync to this dedicated calendar

### Alternative: Use Primary Calendar

If you prefer to use your main calendar instead:
1. Click "📅 Use Primary Calendar"
2. All TMS data will sync to your main Google Calendar

## What Happens When You Enable TMS Calendar?

### Automatic Creation
1. TMS checks if "TMS Calendar" already exists
2. If not found, creates new calendar named "TMS Calendar"
3. Sets description: "Calendar for GCGC Team Management System - Tasks and Events"
4. Configures timezone to UTC

### Initial Sync
1. All existing tasks (with due dates) sync to TMS Calendar
2. All existing events sync to TMS Calendar
3. Holidays sync to TMS Calendar

### Ongoing Sync
After initial setup:
- **Create task in TMS** → Appears in TMS Calendar instantly
- **Update task in TMS** → Updates in TMS Calendar automatically
- **Delete task in TMS** → Removes from TMS Calendar
- **Create event in TMS Calendar** → Appears in TMS
- **Update event in TMS Calendar** → Updates in TMS

## Viewing Your TMS Calendar

### In Google Calendar (Web)

1. Go to [calendar.google.com](https://calendar.google.com)
2. Look in "My calendars" sidebar
3. You'll see "TMS Calendar" listed
4. Check/uncheck to show/hide TMS items

### In Google Calendar (Mobile)

1. Open Google Calendar app
2. Tap menu (☰)
3. Scroll to "TMS Calendar"
4. Toggle on/off to show/hide

### Color Coding in Google Calendar

Tasks appear color-coded by priority:
- 🟢 **GREEN** - Low priority
- 🟡 **YELLOW** - Medium priority
- 🟠 **ORANGE** - High priority
- 🔴 **RED** - Urgent priority

Events appear in their event type colors.

## Managing TMS Calendar

### Show/Hide TMS Calendar

**To hide TMS items:**
1. In Google Calendar, uncheck "TMS Calendar"
2. All TMS tasks/events disappear from view
3. They're still there, just hidden

**To show TMS items:**
1. Check "TMS Calendar" again
2. All TMS items reappear

### Change Calendar Settings

1. In Google Calendar, click ⋮ next to "TMS Calendar"
2. Select "Settings and sharing"
3. Customize:
   - Calendar color
   - Notifications
   - Sharing permissions
   - Event defaults

### Share TMS Calendar

You can share your TMS Calendar with team members:

1. Click ⋮ next to "TMS Calendar"
2. Select "Settings and sharing"
3. Scroll to "Share with specific people"
4. Add email addresses
5. Set permissions (view only or edit)

## Switching Between Calendars

### From TMS Calendar to Primary Calendar

1. Go to TMS Calendar Sync Settings
2. Click "Disconnect"
3. Reconnect and choose "Primary Calendar"
4. All future items will sync to primary calendar

**Note:** Existing items in TMS Calendar will remain there unless manually deleted.

### From Primary Calendar to TMS Calendar

1. Go to TMS Calendar Sync Settings
2. Click "Disconnect"
3. Reconnect and choose "TMS Calendar"
4. TMS will create/find TMS Calendar
5. All items will sync to TMS Calendar going forward

## Technical Details

### Calendar Creation

```typescript
// Checks for existing TMS Calendar
const existingTMSCalendar = calendars.find(
  (cal) => cal.summary === 'TMS Calendar' || cal.summary === 'GCGC Team Management'
)

// Creates new if not found
calendar.calendars.insert({
  summary: 'TMS Calendar',
  description: 'Calendar for GCGC Team Management System - Tasks and Events',
  timeZone: 'UTC',
})
```

### Sync Process

1. **Task Created in TMS**
   - Triggers `autoSyncTask()`
   - Converts task to Google Calendar event
   - Creates event in TMS Calendar
   - Saves `googleCalendarEventId` in database

2. **Task Updated in TMS**
   - Triggers `autoSyncTask()`
   - Updates existing Google Calendar event
   - Syncs changes to TMS Calendar

3. **Event Created in TMS Calendar**
   - Google Calendar webhook triggers
   - TMS imports new event
   - Creates Event in TMS database

### Database Schema

Same schema as regular sync, but `googleCalendarId` points to TMS Calendar:

```prisma
model Task {
  googleCalendarId      String?   // TMS Calendar ID
  googleCalendarEventId String?   // Event ID in TMS Calendar
  syncedAt              DateTime? // Last sync timestamp
}

model Event {
  googleCalendarId      String?   // TMS Calendar ID
  googleCalendarEventId String?   // Event ID in TMS Calendar
  syncedAt              DateTime? // Last sync timestamp
}
```

## API Endpoints

### Find or Create TMS Calendar

```typescript
POST /api/calendar/sync-settings
Body: {
  isEnabled: true,
  createTMSCalendar: true,  // Triggers TMS Calendar creation
  syncTaskDeadlines: true,
  syncTeamEvents: true,
  syncPersonalEvents: true
}
```

### List Available Calendars

```typescript
GET /api/calendar/sync-settings
Response: {
  syncSettings: {...},
  calendars: [
    { id: "primary", summary: "My Calendar" },
    { id: "xxx@group.calendar.google.com", summary: "TMS Calendar" }
  ]
}
```

## Troubleshooting

### TMS Calendar Not Appearing

**Problem:** Can't see TMS Calendar in Google Calendar

**Solution:**
1. Refresh Google Calendar page
2. Check "My calendars" section - click "+"
3. Select "Show hidden calendars"
4. Check if TMS Calendar is hidden

### Duplicate Calendars

**Problem:** Multiple "TMS Calendar" entries

**Solution:**
- TMS automatically finds existing TMS Calendar
- If duplicates exist, manually delete extras in Google Calendar
- TMS will use the first one it finds

### Tasks Not Syncing to TMS Calendar

**Problem:** Tasks created but not appearing in TMS Calendar

**Check:**
1. Task has a due date (required for calendar sync)
2. Sync is enabled in TMS
3. "Sync Task Deadlines" is checked
4. TMS Calendar is visible in Google Calendar

**Solution:**
- Go to Calendar Sync Settings
- Click "Sync to Google" to manual trigger sync
- Check TMS Calendar in Google Calendar

### Can't Delete TMS Calendar

**Problem:** Want to remove TMS Calendar from Google

**Solution:**
1. First disconnect in TMS:
   - Go to Calendar Sync Settings
   - Click "Disconnect"
2. Then in Google Calendar:
   - Click ⋮ next to "TMS Calendar"
   - Select "Settings and sharing"
   - Scroll to bottom
   - Click "Delete calendar"

## Best Practices

### 1. **Use TMS Calendar for Work**
- Keep work tasks separate from personal
- Easier to share with team
- Better work-life balance visibility

### 2. **Enable All Sync Options**
- Sync Task Deadlines ✓
- Sync Team Events ✓
- Sync Personal Events ✓
- This ensures everything stays in sync

### 3. **Regular Sync Checks**
- TMS auto-syncs, but occasionally manually sync
- Click "Sync Now" button to ensure everything is current

### 4. **Customize Notifications**
- Set different notification preferences for TMS Calendar
- Example: 15 min before for tasks, 30 min for meetings

### 5. **Share Wisely**
- Only share TMS Calendar with colleagues
- Keep personal calendar private
- Use view-only permissions unless collaboration needed

## FAQ

**Q: Will this delete my existing tasks in primary calendar?**
A: No, switching to TMS Calendar won't delete anything. Old items stay in primary calendar, new items go to TMS Calendar.

**Q: Can I sync multiple TMS accounts to different calendars?**
A: Yes, each TMS account can have its own TMS Calendar. Just use different Google accounts.

**Q: What happens if I delete TMS Calendar in Google?**
A: Tasks will fail to sync. TMS will try to recreate the calendar on next sync attempt.

**Q: Can team members see my TMS Calendar?**
A: Only if you explicitly share it with them through Google Calendar sharing settings.

**Q: Does this work on mobile?**
A: Yes! TMS Calendar appears in Google Calendar mobile app just like any other calendar.

**Q: Can I rename "TMS Calendar"?**
A: Yes, but TMS will create a new one. Better to keep the default name.

**Q: What if I already have a calendar named "TMS Calendar"?**
A: TMS will find and use the existing one automatically.

## Summary

The dedicated TMS Calendar feature provides:
- ✅ Clean separation of work and personal calendars
- ✅ Automatic bi-directional sync
- ✅ Easy show/hide in Google Calendar
- ✅ Better organization and sharing options
- ✅ Color-coded priority tasks
- ✅ Real-time updates

It's the recommended way to sync TMS with Google Calendar!

---

**Last Updated:** October 20, 2025
**Version:** 2.0.0

