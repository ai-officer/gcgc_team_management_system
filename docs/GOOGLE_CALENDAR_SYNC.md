# Google Calendar Synchronization

## Overview

The GCGC Team Management System now supports two-way synchronization with Google Calendar. This feature allows users to:

- Export TMS events to their Google Calendar
- **Export TMS tasks (with due dates) to their Google Calendar**
- Import Google Calendar events into TMS
- Maintain sync between both calendars
- Choose which event types to synchronize

> **New in v1.1:** Tasks with due dates are now automatically synced to Google Calendar! See [Task Calendar Sync Documentation](./TASK_CALENDAR_SYNC.md) for details.

## Features

### 1. **Two-Way Sync**
- Sync events from TMS to Google Calendar
- Import events from Google Calendar to TMS
- Choose sync direction (both ways, export only, or import only)

### 2. **Event Type Filtering**
Control which events are synchronized:
- **Task Deadlines**: Sync task due dates as calendar events (now syncs actual Task objects with full details!)
- **Team Events**: Sync team meetings and events
- **Personal Events**: Sync personal calendar events

### 3. **Multiple Calendar Support**
- Select which Google Calendar to sync with
- Default is the primary calendar, but can choose any calendar

### 4. **Automatic Token Refresh**
- Google access tokens are automatically refreshed
- No need to re-authenticate frequently

## Setup Instructions

### Prerequisites

1. **Google Cloud Project with Calendar API**
   - Ensure you have a Google Cloud project
   - Enable the Google Calendar API
   - Configure OAuth 2.0 credentials

2. **Environment Variables**
   Make sure these are set in your `.env` file:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   NEXTAUTH_URL=http://localhost:3000  # or your production URL
   NEXTAUTH_SECRET=your_nextauth_secret
   ```

3. **OAuth Consent Screen**
   - Configure the OAuth consent screen in Google Cloud Console
   - Add the following scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`

4. **Authorized Redirect URIs**
   Add these to your Google OAuth credentials:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`

### Database Migration

The feature requires new database tables. Run:

```bash
npm run db:generate
npm run db:push
```

This will create:
- `calendar_sync_settings` table for user preferences
- New fields in the `events` table for Google Calendar IDs

## User Guide

### Initial Setup

1. **Navigate to Calendar Page**
   - Go to `/user/calendar` in the TMS

2. **Open Sync Settings**
   - Click the "Google Calendar Sync" button in the top right

3. **Connect Google Account**
   - Click "Connect Google Calendar"
   - Sign in with your Google account
   - Grant calendar permissions

4. **Configure Sync Settings**
   - Select which calendar to sync with
   - Choose sync direction:
     - **Two-way sync (recommended)**: Events sync both directions
     - **TMS → Google only**: Export TMS events to Google
     - **Google → TMS only**: Import Google events to TMS
   - Select which event types to sync

5. **Save Settings**
   - Click "Save Settings" to apply your configuration

### Manual Sync

You can manually trigger sync at any time:

1. Open the sync settings modal
2. Click "Sync to Google" to export TMS events
3. Click "Import from Google" to import Google events

### Automatic Sync

Events and Tasks are automatically synced when:
- You create a new event or task in TMS (if sync is enabled)
- You modify an existing synced event or task
- You delete a synced task (automatically removes from calendar)
- You manually trigger sync

**Tasks** are synced to Google Calendar if:
- Task has a due date
- "Sync Task Deadlines" is enabled
- You are involved in the task (creator, assignee, team member, or collaborator)

## Technical Details

### Database Schema

#### CalendarSyncSettings Model
```prisma
model CalendarSyncSettings {
  id                      String
  userId                  String                @unique
  isEnabled               Boolean               @default(false)
  googleCalendarId        String?
  syncDirection           CalendarSyncDirection @default(BOTH)
  syncTaskDeadlines       Boolean               @default(true)
  syncTeamEvents          Boolean               @default(true)
  syncPersonalEvents      Boolean               @default(true)
  googleAccessToken       String?
  googleRefreshToken      String?
  googleTokenExpiry       DateTime?
  lastSyncedAt            DateTime?
  createdAt               DateTime              @default(now())
  updatedAt               DateTime              @updatedAt
}
```

#### Event Model Updates
New fields added to track Google Calendar sync:
- `googleCalendarId`: Which Google Calendar the event is synced with
- `googleCalendarEventId`: The Google Calendar event ID
- `syncedAt`: Last sync timestamp

#### Task Model Updates (New in v1.1)
New fields added to track Google Calendar sync:
- `googleCalendarId`: Which Google Calendar the task is synced with
- `googleCalendarEventId`: The Google Calendar event ID for this task
- `syncedAt`: Last sync timestamp

Tasks are synced as calendar events with:
- Title prefixed with `[Task]`
- Color-coded by priority (LOW=Green, MEDIUM=Yellow, HIGH=Orange, URGENT=Red)
- Detailed description including status, progress, assignee, team members, etc.

### API Endpoints

#### GET `/api/calendar/sync-settings`
Fetch current sync settings and available calendars

**Response:**
```json
{
  "syncSettings": {
    "isEnabled": true,
    "googleCalendarId": "primary",
    "syncDirection": "BOTH",
    "syncTaskDeadlines": true,
    "syncTeamEvents": true,
    "syncPersonalEvents": true,
    "lastSyncedAt": "2025-10-20T10:30:00Z"
  },
  "calendars": [
    {
      "id": "primary",
      "summary": "My Calendar"
    }
  ]
}
```

#### PUT `/api/calendar/sync-settings`
Update sync settings

**Request Body:**
```json
{
  "isEnabled": true,
  "googleCalendarId": "primary",
  "syncDirection": "BOTH",
  "syncTaskDeadlines": true,
  "syncTeamEvents": true,
  "syncPersonalEvents": true
}
```

#### POST `/api/calendar/sync-to-google`
Export TMS events to Google Calendar

**Response:**
```json
{
  "success": true,
  "results": {
    "created": 5,
    "updated": 3,
    "failed": 0,
    "errors": []
  }
}
```

#### POST `/api/calendar/sync-from-google`
Import Google Calendar events to TMS

**Response:**
```json
{
  "success": true,
  "results": {
    "created": 8,
    "updated": 2,
    "skipped": 1,
    "failed": 0,
    "errors": []
  }
}
```

#### DELETE `/api/calendar/sync-settings`
Disconnect Google Calendar

### Event Color Mapping

TMS event types are mapped to Google Calendar colors:

| TMS Event Type | Google Calendar Color |
|----------------|----------------------|
| MEETING        | Blue (9)             |
| DEADLINE       | Red (11)             |
| REMINDER       | Yellow (5)           |
| MILESTONE      | Green (10)           |
| PERSONAL       | Purple (3)           |

### Token Management

- **Access Token**: Automatically refreshed when expired
- **Refresh Token**: Stored securely in database
- **Token Expiry**: Tracked and validated before each API call

## Security Considerations

1. **Token Storage**: Google tokens are stored encrypted in the database
2. **User Isolation**: Users can only access their own sync settings
3. **Permission Scopes**: Only calendar permissions requested
4. **HTTPS Required**: Production should use HTTPS for OAuth

## Troubleshooting

### "Access token expired and no refresh token available"

**Solution**: Disconnect and reconnect your Google Calendar:
1. Open sync settings
2. Click "Disconnect"
3. Click "Connect Google Calendar" again
4. Re-authorize the application

### "Failed to sync events to Google Calendar"

**Possible causes:**
- Google Calendar API quota exceeded
- Network connectivity issues
- Invalid calendar ID selected

**Solution**:
1. Wait a few minutes and try again
2. Check your internet connection
3. Verify calendar ID in settings

### "Google Calendar sync is not enabled"

**Solution**:
1. Open sync settings
2. Connect your Google account
3. Enable sync in settings

## Limitations

1. **Sync Frequency**: Manual sync required (no automatic background sync yet)
2. **Event Limit**: Maximum 100 events per sync operation
3. **Time Range**: Imports events from the last 30 days by default
4. **Conflict Resolution**: Last update wins (no manual conflict resolution)

## Future Enhancements

Planned features for future releases:
- Automatic background sync (webhook-based)
- Conflict resolution UI
- Sync history and logs
- Multi-calendar support (sync with multiple calendars)
- Custom sync time ranges
- Real-time sync notifications

## Support

For issues or questions about Google Calendar sync:
1. Check this documentation
2. Review the troubleshooting section
3. Contact your system administrator
4. Submit an issue on GitHub
