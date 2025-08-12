# Database Migration Scripts

This directory contains scripts for migrating data between different environments.

## Available Scripts

### `migrate-railway-to-local.ts`
Migrates all data from Railway staging database to your local development database.

**Usage:**
```bash
npm run migrate-from-railway
```

**Environment Variables Required:**
- `RAILWAY_DATABASE_URL` - Railway database connection string
- `DATABASE_URL` - Local database connection string

**What it does:**
1. Connects to both Railway and local databases
2. Exports all data from Railway in correct dependency order
3. Clears local database tables (preserving structure)
4. Imports data to local database
5. Provides detailed progress and error reporting

### `verify-migration.ts`
Verifies the integrity of migrated data.

**Usage:**
```bash
npm run verify-migration
```

**What it does:**
1. Counts records in all tables
2. Shows sample data from key tables
3. Verifies relationships and data integrity

## Environment Setup

1. Copy `.env.example` to `.env`
2. Update `RAILWAY_DATABASE_URL` with your Railway credentials
3. Ensure `DATABASE_URL` points to your local PostgreSQL database

## Security Notes

- Never commit actual database URLs to Git
- The `.env` file is gitignored for security
- Railway credentials should be treated as sensitive data
- Use environment variables for all database connections

## Migration Order

The migration follows this dependency order to ensure referential integrity:

1. Independent tables (adminSettings, admin, division, etc.)
2. Department (depends on Division)
3. Section (depends on Department) 
4. TeamLabel (depends on Section)
5. OrganizationalUnit (self-referencing)
6. User (with reports-to relationships handled separately)
7. Team, TeamMember, Task, and related tables
8. Comments and reactions
9. Events and activities
10. Auth-related tables

## Error Handling

- Foreign key constraint violations are handled gracefully
- Self-referencing relationships are processed in multiple passes
- Detailed error reporting shows exactly what failed
- Migration can be safely re-run (it clears local data first)

## Troubleshooting

**Connection Issues:**
- Verify database URLs are correct
- Ensure both databases are accessible
- Check network connectivity to Railway

**Schema Mismatches:**
- Run `npx prisma db push` to sync local schema
- Ensure both databases use the same Prisma schema version

**Data Conflicts:**
- The script clears local data before importing
- Use `--force-reset` flag with `prisma db push` if needed