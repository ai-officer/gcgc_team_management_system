-- Admin tooling: audit log, invitations, password reset links, impersonation.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AdminActionType" AS ENUM (
    'ADMIN_LOGIN',
    'ADMIN_LOGIN_FAILED',
    'ADMIN_LOGOUT',
    'ADMIN_CREATED',
    'ADMIN_UPDATED',
    'ADMIN_DEACTIVATED',
    'ADMIN_DELETED',
    'USER_UPDATED',
    'USER_DEACTIVATED',
    'USER_PASSWORD_RESET',
    'USER_ROLE_CHANGED',
    'TEAM_CREATED',
    'TEAM_UPDATED',
    'TEAM_DELETED',
    'ORG_UNIT_CREATED',
    'ORG_UNIT_UPDATED',
    'ORG_UNIT_DELETED',
    'SETTINGS_UPDATED',
    'JOB_LEVELS_INITIALIZED',
    'INVITATION_CREATED',
    'INVITATION_REVOKED',
    'INVITATION_ACCEPTED',
    'USER_IMPERSONATED',
    'IMPERSONATION_ENDED',
    'PASSWORD_RESET_LINK_CREATED',
    'PASSWORD_RESET_LINK_CONSUMED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AdminActionStatus" AS ENUM ('SUCCESS', 'FAILURE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable: admin_activities
CREATE TABLE IF NOT EXISTS "admin_activities" (
    "id"             TEXT                NOT NULL,
    "adminId"        TEXT,
    "adminUsername"  TEXT,
    "action"         "AdminActionType"   NOT NULL,
    "description"    TEXT                NOT NULL,
    "targetType"     TEXT,
    "targetId"       TEXT,
    "ipAddress"      TEXT,
    "userAgent"      TEXT,
    "status"         "AdminActionStatus" NOT NULL DEFAULT 'SUCCESS',
    "metadata"       JSONB,
    "createdAt"      TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "admin_activities_adminId_idx"   ON "admin_activities"("adminId");
CREATE INDEX IF NOT EXISTS "admin_activities_createdAt_idx" ON "admin_activities"("createdAt");
CREATE INDEX IF NOT EXISTS "admin_activities_action_idx"    ON "admin_activities"("action");

DO $$ BEGIN
  ALTER TABLE "admin_activities"
    ADD CONSTRAINT "admin_activities_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "admins"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable: invitations
CREATE TABLE IF NOT EXISTS "invitations" (
    "id"                     TEXT               NOT NULL,
    "token"                  TEXT               NOT NULL,
    "email"                  TEXT               NOT NULL,
    "role"                   "UserRole"         NOT NULL DEFAULT 'MEMBER',
    "hierarchyLevel"         "HierarchyLevel",
    "isLeader"               BOOLEAN            NOT NULL DEFAULT false,
    "division"               TEXT,
    "department"             TEXT,
    "section"                TEXT,
    "team"                   TEXT,
    "positionTitle"          TEXT,
    "jobLevel"               TEXT,
    "reportsToId"            TEXT,
    "status"                 "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt"              TIMESTAMP(3)       NOT NULL,
    "createdByAdminId"       TEXT,
    "createdByAdminUsername" TEXT,
    "acceptedByUserId"       TEXT,
    "acceptedAt"             TIMESTAMP(3),
    "revokedAt"              TIMESTAMP(3),
    "createdAt"              TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3)       NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "invitations_token_key"      ON "invitations"("token");
CREATE INDEX        IF NOT EXISTS "invitations_email_idx"     ON "invitations"("email");
CREATE INDEX        IF NOT EXISTS "invitations_status_idx"    ON "invitations"("status");
CREATE INDEX        IF NOT EXISTS "invitations_expiresAt_idx" ON "invitations"("expiresAt");

-- CreateTable: password_reset_tokens
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id"                     TEXT          NOT NULL,
    "token"                  TEXT          NOT NULL,
    "userId"                 TEXT          NOT NULL,
    "expiresAt"              TIMESTAMP(3)  NOT NULL,
    "consumedAt"             TIMESTAMP(3),
    "createdByAdminId"       TEXT,
    "createdByAdminUsername" TEXT,
    "createdAt"              TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_key"     ON "password_reset_tokens"("token");
CREATE INDEX        IF NOT EXISTS "password_reset_tokens_userId_idx"    ON "password_reset_tokens"("userId");
CREATE INDEX        IF NOT EXISTS "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
