-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "customStatusId" TEXT;

-- CreateTable
CREATE TABLE "board_statuses" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TaskStatus" NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#94A3B8',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_statuses_boardId_idx" ON "board_statuses"("boardId");

-- CreateIndex
CREATE UNIQUE INDEX "board_statuses_boardId_name_key" ON "board_statuses"("boardId", "name");

-- AddForeignKey
ALTER TABLE "board_statuses" ADD CONSTRAINT "board_statuses_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "kanban_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_customStatusId_fkey" FOREIGN KEY ("customStatusId") REFERENCES "board_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
