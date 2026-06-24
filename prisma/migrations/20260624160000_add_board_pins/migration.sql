-- CreateTable
CREATE TABLE "board_pins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_pins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_pins_userId_idx" ON "board_pins"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "board_pins_userId_boardId_key" ON "board_pins"("userId", "boardId");

-- AddForeignKey
ALTER TABLE "board_pins" ADD CONSTRAINT "board_pins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_pins" ADD CONSTRAINT "board_pins_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "kanban_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
