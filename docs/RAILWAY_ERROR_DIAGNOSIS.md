# Railway Error Diagnosis: 500 Internal Server Error

## 🔴 Problem Summary

**Dashboard, Tasks, Calendar, and Member Management are all failing to load on Railway.**

This is happening because:
1. Your **local database** has the new Google Calendar fields (location, meetingLink, allDay, recurrence, reminders)
2. Your **Railway production database** does NOT have these fields yet
3. Prisma is trying to query columns that don't exist, causing PostgreSQL errors

## 🔍 Root Cause Analysis

### What Happened

When you ran `npm run db:push` locally (or Prisma migrated your local database), it added these 5 new columns to your **local** `tasks` table:

```sql
ALTER TABLE "tasks"
ADD COLUMN "location" TEXT,
ADD COLUMN "meetingLink" TEXT,
ADD COLUMN "allDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "recurrence" TEXT,
ADD COLUMN "reminders" JSONB;
```

However, **Railway's database was never updated**. It still has the old schema without these columns.

### Why Everything is Failing

When any API route queries tasks (Dashboard, Tasks list, Calendar sync, etc.), Prisma generates SQL like:

```sql
SELECT id, title, description, ..., location, meetingLink, allDay, recurrence, reminders
FROM tasks;
```

But Railway's PostgreSQL responds with:
```
ERROR: column "location" does not exist
ERROR: column "meetingLink" does not exist
ERROR: column "allDay" does not exist
ERROR: column "recurrence" does not exist
ERROR: column "reminders" does not exist
```

This causes the 500 Internal Server Error.

### Affected API Routes

All routes that query the `tasks` table are broken:

1. **Dashboard** (`/api/user/dashboard`)
   - Queries: `recentTasks`, `upcomingDeadlines`

2. **Tasks** (`/api/tasks`)
   - Queries: All task listings

3. **Calendar Sync** (`/api/calendar/sync-to-google`, `/api/calendar/sync-from-google`)
   - Queries: Tasks with due dates for syncing

4. **Member Management** (if it displays tasks)
   - Any task-related queries

## ✅ Solution

You have **3 options** to fix this:

### Option 1: Railway Dashboard SQL Query (Fastest - Recommended)

1. Go to https://railway.app/
2. Navigate to your project: `gcgc-team-management-system-staging`
3. Click on your **PostgreSQL database** service
4. Click on the **"Query"** tab
5. Copy and paste this SQL:

```sql
-- Add new columns to tasks table
ALTER TABLE "tasks"
ADD COLUMN IF NOT EXISTS "location" TEXT,
ADD COLUMN IF NOT EXISTS "meetingLink" TEXT,
ADD COLUMN IF NOT EXISTS "allDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "recurrence" TEXT,
ADD COLUMN IF NOT EXISTS "reminders" JSONB;
```

6. Click **"Run"** or press Ctrl+Enter
7. Verify success (should see "ALTER TABLE" confirmation)

### Option 2: Railway CLI (Terminal)

```bash
# 1. Install Railway CLI (if not already installed)
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Link your project
railway link
# Select: gcgc-team-management-system-staging

# 4. Connect to database and run migration
railway run bash -c 'psql $DATABASE_URL < railway-migration.sql'
```

### Option 3: Prisma db push (Alternative)

```bash
# 1. Temporarily set DATABASE_URL to Railway
export DATABASE_URL="<your-railway-database-url>"

# 2. Push schema to Railway
npx prisma db push

# 3. Restore local DATABASE_URL
export DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/gcgc_team_management"
```

⚠️ **Warning**: Option 3 requires exposing Railway credentials in your terminal.

## 🧪 Verification Steps

After running the migration:

### 1. Verify Columns Were Added

In Railway Query tab:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name IN ('location', 'meetingLink', 'allDay', 'recurrence', 'reminders')
ORDER BY column_name;
```

Expected output:
```
column_name  | data_type | column_default
-------------|-----------|---------------
allDay       | boolean   | false
location     | text      | NULL
meetingLink  | text      | NULL
recurrence   | text      | NULL
reminders    | jsonb     | NULL
```

### 2. Restart Railway Service (Optional but Recommended)

1. Go to Railway Dashboard
2. Click on your **app service** (not database)
3. Click **"Restart"**
4. Wait for deployment to complete

### 3. Test the Application

Visit your Railway app and test:

- ✅ Dashboard loads without errors
- ✅ Tasks page loads
- ✅ Calendar page loads
- ✅ Can create new tasks with location and meeting link
- ✅ Existing tasks still display correctly

### 4. Check Railway Logs

```bash
railway logs
```

Look for:
- ✅ No more "column does not exist" errors
- ✅ Successful API responses (200 status codes)
- ✅ No Prisma query errors

## 📋 Migration File Location

The migration SQL is in:
```
/railway-migration.sql
```

Contents:
```sql
ALTER TABLE "tasks"
ADD COLUMN IF NOT EXISTS "location" TEXT,
ADD COLUMN IF NOT EXISTS "meetingLink" TEXT,
ADD COLUMN IF NOT EXISTS "allDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "recurrence" TEXT,
ADD COLUMN IF NOT EXISTS "reminders" JSONB;
```

## 🔄 Why This Happened

This is a common issue when developing with Prisma:

1. **Local Development**: You modify `schema.prisma` and run `prisma db push`
2. **Local Database**: Gets updated immediately ✅
3. **Railway Database**: Does NOT get updated automatically ❌
4. **Deployment**: Railway builds and deploys your app with the new Prisma client
5. **Runtime Error**: New Prisma client tries to query columns that don't exist in Railway DB

## 🛡️ Preventing This in the Future

### Best Practice: Always Migrate Production After Schema Changes

```bash
# 1. Update schema.prisma locally
vim prisma/schema.prisma

# 2. Test locally
npm run db:push
npm run dev  # Test everything works

# 3. Commit changes
git add prisma/schema.prisma
git commit -m "feat: add Google Calendar fields to Task"

# 4. BEFORE pushing to Railway, migrate Railway DB
railway run npx prisma db push

# 5. Then deploy
git push origin staging  # Or main
```

### Alternative: Use Prisma Migrate (Production-Safe)

Instead of `db push`, use migrations:

```bash
# 1. Create migration
npx prisma migrate dev --name add_google_calendar_fields

# 2. In Railway, set up automatic migrations on deploy
# Add to package.json:
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

This ensures Railway runs migrations automatically on every deployment.

## 📝 Summary

| Issue | Status |
|-------|--------|
| Root Cause | Schema mismatch: Local DB has new fields, Railway DB doesn't |
| Affected Routes | Dashboard, Tasks, Calendar, Member Management |
| Error Type | PostgreSQL: "column does not exist" |
| Fix | Run migration SQL on Railway database |
| Time to Fix | ~2 minutes (using Railway Dashboard Query tab) |
| Prevention | Always migrate production DB before or during deployment |

## 🆘 Still Having Issues?

If the error persists after migration:

1. **Clear Railway Cache**
   - Trigger a new deployment (push a small change)
   - Or manually restart the service

2. **Verify Environment Variables**
   ```bash
   railway variables
   ```
   Ensure `DATABASE_URL` points to the correct Railway database

3. **Check Prisma Client**
   ```bash
   railway run npx prisma validate
   railway run npx prisma generate
   ```

4. **Review Railway Build Logs**
   - Check if Prisma client generation succeeded during build
   - Look for any schema validation errors

## 📚 Related Files

- `railway-migration.sql` - Migration SQL to add columns
- `RAILWAY_MIGRATION_GUIDE.md` - Detailed migration instructions
- `SECURITY_RECOVERY.md` - Database credential rotation guide (do this first!)
- `prisma/schema.prisma` - Source of truth for database schema (lines 156-160 have new fields)

---

**Next Step**: Run the migration SQL in Railway Dashboard → PostgreSQL → Query tab, then restart your app service.
