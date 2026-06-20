-- CreateTable
CREATE TABLE "intake_forms" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intro" TEXT,
    "token" TEXT NOT NULL,
    "targetStatusId" TEXT,
    "defaultAssigneeId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_forms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "intake_forms_token_key" ON "intake_forms"("token");

-- CreateIndex
CREATE INDEX "intake_forms_boardId_idx" ON "intake_forms"("boardId");

-- AddForeignKey
ALTER TABLE "intake_forms" ADD CONSTRAINT "intake_forms_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "kanban_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

