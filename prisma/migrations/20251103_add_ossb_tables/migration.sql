-- CreateEnum for OSSB
DO $$ BEGIN
  CREATE TYPE "MIPClassification" AS ENUM ('MAINTENANCE', 'IMPROVEMENT', 'PROJECT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OSSBStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ENDORSED', 'RECOMMENDED', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable OSSB Requests
CREATE TABLE IF NOT EXISTS "ossb_requests" (
    "id" TEXT NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "branchOrDepartment" TEXT NOT NULL,
    "objectiveTitle" TEXT NOT NULL,
    "versionNo" TEXT,
    "partOfAnnualPlan" BOOLEAN NOT NULL DEFAULT false,
    "mipClassification" "MIPClassification" NOT NULL,
    "kraOrCpaNumber" INTEGER,
    "projectNumber" INTEGER,
    "kraOrCpaName" TEXT,
    "titleObjective" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "successMeasures" JSONB NOT NULL,
    "totalBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "preparedBy" TEXT,
    "preparedByPosition" TEXT,
    "datePrepared" TIMESTAMP(3),
    "endorsedBy" TEXT,
    "endorsedByPosition" TEXT,
    "dateEndorsed" TIMESTAMP(3),
    "recommendedBy" TEXT,
    "recommendedByPosition" TEXT,
    "dateRecommended" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedByPosition" TEXT,
    "dateApproved" TIMESTAMP(3),
    "hasGuidelines" BOOLEAN NOT NULL DEFAULT false,
    "hasComputationValue" BOOLEAN NOT NULL DEFAULT false,
    "otherAttachments" TEXT,
    "ccRecipients" TEXT,
    "remarks" TEXT,
    "status" "OSSBStatus" NOT NULL DEFAULT 'DRAFT',
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "ossb_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable OSSB Program Steps
CREATE TABLE IF NOT EXISTS "ossb_program_steps" (
    "id" TEXT NOT NULL,
    "ossbRequestId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "responsiblePerson" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ossb_program_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable OSSB Attachments
CREATE TABLE IF NOT EXISTS "ossb_attachments" (
    "id" TEXT NOT NULL,
    "ossbRequestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ossb_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ossb_requests_referenceNo_key" ON "ossb_requests"("referenceNo");

-- AddForeignKey
ALTER TABLE "ossb_requests" ADD CONSTRAINT "ossb_requests_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ossb_program_steps" ADD CONSTRAINT "ossb_program_steps_ossbRequestId_fkey" FOREIGN KEY ("ossbRequestId") REFERENCES "ossb_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ossb_attachments" ADD CONSTRAINT "ossb_attachments_ossbRequestId_fkey" FOREIGN KEY ("ossbRequestId") REFERENCES "ossb_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
