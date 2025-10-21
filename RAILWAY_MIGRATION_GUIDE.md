# Railway Database Migration Guide

## Error You're Seeing
```
GET /api/user/dashboard 500 (Internal Server Error)
Error fetching dashboard data: Error: Failed to fetch dashboard data
```

**Cause**: Railway database doesn't have the new fields (`location`, `meetingLink`, `allDay`, `recurrence`, `reminders`) that were added to the schema.

## Solution: Migrate Railway Database

### Option 1: Using Railway Dashboard (Recommended)

1. **Go to Railway Dashboard**
   - Navigate to: https://railway.app/
   - Select your project: `gcgc-team-management-system-staging`
   - Click on your PostgreSQL database service

2. **Open Query Tab**
   - Click on the "Query" tab in the database service
   - This opens a SQL editor connected to your database

3. **Run the Migration**
   - Copy the SQL from `railway-migration.sql` file
   - Paste it into the Query editor
   - Click "Run" or press Ctrl+Enter

4. **Verify the Migration**
   - You should see a success message
   - The verification query will show the new columns

### Option 2: Using Prisma Migrate (Alternative)

1. **Update Environment Variable**
   ```bash
   # Temporarily set DATABASE_URL to Railway
   # Get this from Railway Dashboard -> Database -> Connect -> Connection String
   export DATABASE_URL="your-railway-database-url-here"
   ```

2. **Run Migration**
   ```bash
   npx prisma db push
   ```

3. **Restore Local Environment**
   ```bash
   # Reset to local database
   export DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/gcgc_team_management"
   ```

### Option 3: Using Railway CLI

1. **Install Railway CLI** (if not already installed)
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Link Project**
   ```bash
   railway link
   # Select: gcgc-team-management-system-staging
   ```

4. **Run Migration**
   ```bash
   railway run npx prisma db push
   ```

## Migration SQL (What Gets Run)

```sql
-- Add new columns to tasks table
ALTER TABLE "tasks"
ADD COLUMN IF NOT EXISTS "location" TEXT,
ADD COLUMN IF NOT EXISTS "meetingLink" TEXT,
ADD COLUMN IF NOT EXISTS "allDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "recurrence" TEXT,
ADD COLUMN IF NOT EXISTS "reminders" JSONB;
```

## New Fields Added

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `location` | TEXT | NULL | Physical location/address |
| `meetingLink` | TEXT | NULL | Virtual meeting URL (Google Meet, Zoom, etc.) |
| `allDay` | BOOLEAN | false | All-day event flag |
| `recurrence` | TEXT | NULL | Recurrence rule (RRULE format) |
| `reminders` | JSONB | NULL | Notification reminders |

## Verification Steps

1. **After Migration, Verify in Railway Dashboard**
   ```sql
   SELECT column_name, data_type, column_default
   FROM information_schema.columns
   WHERE table_name = 'tasks'
     AND column_name IN ('location', 'meetingLink', 'allDay', 'recurrence', 'reminders');
   ```

2. **Test the Application**
   - Visit: https://gcgc-team-management-system-staging.up.railway.app/user/dashboard
   - The 500 error should be gone
   - Dashboard should load successfully

3. **Create a Test Task**
   - Try creating a task with the new fields:
     - Location: "Conference Room A"
     - Meeting Link: "https://meet.google.com/test"
     - All-day: Toggle on/off
     - Recurrence: Select an option

## Troubleshooting

### If you still see errors after migration:

1. **Check Railway Logs**
   ```bash
   railway logs
   ```

2. **Restart Railway Service**
   - Go to Railway Dashboard
   - Click on your app service
   - Click "Restart"

3. **Verify Prisma Client**
   ```bash
   # In Railway, ensure Prisma client is generated in build
   # Check package.json scripts:
   "build": "prisma generate && next build"
   ```

4. **Clear Next.js Cache** (if needed)
   - Trigger a new deployment in Railway
   - Or manually run: `railway run npm run build`

## Environment Variables

Make sure these are set in Railway:

```env
DATABASE_URL=<get-from-railway-dashboard>
NEXTAUTH_URL=<your-railway-app-url>
NEXTAUTH_SECRET=<generate-secure-secret>
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
```

## Success Indicators

✅ Dashboard loads without 500 error
✅ Can create tasks with new fields
✅ Tasks sync to Google Calendar with location and meeting links
✅ No database-related errors in Railway logs

## Rollback (If Needed)

If something goes wrong, you can remove the fields:

```sql
ALTER TABLE "tasks"
DROP COLUMN IF EXISTS "location",
DROP COLUMN IF EXISTS "meetingLink",
DROP COLUMN IF EXISTS "allDay",
DROP COLUMN IF EXISTS "recurrence",
DROP COLUMN IF EXISTS "reminders";
```

## Need Help?

- Railway Docs: https://docs.railway.app/
- Prisma Migrate Docs: https://www.prisma.io/docs/concepts/components/prisma-migrate
- Check Railway Discord: https://discord.gg/railway
