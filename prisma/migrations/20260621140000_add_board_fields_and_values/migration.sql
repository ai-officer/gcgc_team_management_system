-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT');

-- CreateTable
CREATE TABLE "board_fields" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_field_values" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "task_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_fields_boardId_idx" ON "board_fields"("boardId");

-- CreateIndex
CREATE UNIQUE INDEX "board_fields_boardId_name_key" ON "board_fields"("boardId", "name");

-- CreateIndex
CREATE INDEX "task_field_values_taskId_idx" ON "task_field_values"("taskId");

-- CreateIndex
CREATE INDEX "task_field_values_fieldId_idx" ON "task_field_values"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "task_field_values_taskId_fieldId_key" ON "task_field_values"("taskId", "fieldId");

-- AddForeignKey
ALTER TABLE "board_fields" ADD CONSTRAINT "board_fields_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "kanban_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_field_values" ADD CONSTRAINT "task_field_values_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_field_values" ADD CONSTRAINT "task_field_values_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "board_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

