-- Add TASK_SUBMITTED_FOR_REVIEW to NotificationType enum.
-- Postgres requires ALTER TYPE ADD VALUE outside a transaction; wrap in DO blocks
-- so re-running the migration on a DB that already has the value is a no-op.

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'TASK_SUBMITTED_FOR_REVIEW';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
