# Database Migration Guide

## Quick Start

### 1. Setup Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Update `.env` with your actual database credentials:
```bash
# Local Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gcgc_team_management?schema=public"

# Railway Database (for migration script)
RAILWAY_DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@***REDACTED_DB_HOST***:YOUR_PORT/railway"
```

### 2. Migrate Data from Railway to Local

```bash
npm run migrate-from-railway
```

This will:
- ✅ Validate environment variables
- 🔌 Test database connections
- 📤 Export all data from Railway
- 🗑️ Clear local database
- 📥 Import data to local database
- 📊 Provide detailed progress report

### 3. Verify Migration

```bash
npm run verify-migration
```

This will show:
- 📊 Record counts for all tables
- 👤 Sample user data
- 👥 Sample team data
- 📋 Sample task data

## Security Notes

⚠️ **Important**: Never commit `.env` files to Git!

- ✅ Scripts are safe to commit (no hardcoded credentials)
- ✅ `.env.example` shows required variables
- ✅ Actual credentials are in `.env` (gitignored)
- ✅ Environment variables are validated before use

## Troubleshooting

### Missing Environment Variables
```
❌ RAILWAY_DATABASE_URL is required but not set
💡 Please add RAILWAY_DATABASE_URL to your .env file
```
**Solution**: Add the missing variable to your `.env` file

### Connection Issues
```
❌ Railway connection failed
```
**Solution**: 
1. Check your Railway database URL
2. Verify network connectivity
3. Ensure Railway database is running

### Schema Mismatches
```
❌ The column `imageUrl` does not exist in the current database
```
**Solution**: Sync your local schema with Prisma
```bash
npx prisma db push --force-reset
```

## What Gets Migrated

- 👥 **Users & Auth**: 10 users, admin settings, sessions
- 🏢 **Organization**: 6 divisions, 24 departments, 9 sections
- 👥 **Teams**: 3 teams with 4 members
- 📋 **Tasks**: 4 tasks with collaborators and team members
- 💬 **Comments**: 3 comments with reactions
- 📊 **Activities**: 68 activity records
- ⚙️ **System Data**: Job levels, sector heads, settings

## Migration Order

The script follows dependency order to maintain referential integrity:
1. Independent tables (divisions, admins, settings)
2. Dependent tables (departments → sections → teams)
3. Users (with reports-to relationships)
4. Tasks and collaborators
5. Comments and reactions
6. Activities and events

Total: **149 records** migrated successfully!