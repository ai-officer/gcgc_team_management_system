-- Railway Migration: Add Google Calendar Fields to Tasks
-- Run this on your Railway PostgreSQL database

-- Add new columns to tasks table
ALTER TABLE "tasks"
ADD COLUMN IF NOT EXISTS "location" TEXT,
ADD COLUMN IF NOT EXISTS "meetingLink" TEXT,
ADD COLUMN IF NOT EXISTS "allDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "recurrence" TEXT,
ADD COLUMN IF NOT EXISTS "reminders" JSONB;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name IN ('location', 'meetingLink', 'allDay', 'recurrence', 'reminders')
ORDER BY column_name;
