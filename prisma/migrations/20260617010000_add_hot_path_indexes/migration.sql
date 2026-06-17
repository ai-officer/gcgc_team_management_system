-- CreateIndex
CREATE INDEX "tasks_assigneeId_idx" ON "tasks"("assigneeId");

-- CreateIndex
CREATE INDEX "tasks_creatorId_idx" ON "tasks"("creatorId");

-- CreateIndex
CREATE INDEX "tasks_teamId_status_idx" ON "tasks"("teamId", "status");

-- CreateIndex
CREATE INDEX "tasks_boardId_idx" ON "tasks"("boardId");

-- CreateIndex
CREATE INDEX "tasks_parentId_idx" ON "tasks"("parentId");

-- CreateIndex
CREATE INDEX "tasks_dueDate_idx" ON "tasks"("dueDate");

-- CreateIndex
CREATE INDEX "tasks_recurringParentId_idx" ON "tasks"("recurringParentId");

-- CreateIndex
CREATE INDEX "comments_taskId_idx" ON "comments"("taskId");

-- CreateIndex
CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");

-- CreateIndex
CREATE INDEX "comments_parentId_idx" ON "comments"("parentId");

-- CreateIndex
CREATE INDEX "events_creatorId_idx" ON "events"("creatorId");

-- CreateIndex
CREATE INDEX "events_taskId_idx" ON "events"("taskId");

-- CreateIndex
CREATE INDEX "events_teamId_idx" ON "events"("teamId");

-- CreateIndex
CREATE INDEX "events_googleCalendarEventId_idx" ON "events"("googleCalendarEventId");

-- CreateIndex
CREATE INDEX "activities_userId_idx" ON "activities"("userId");

-- CreateIndex
CREATE INDEX "activities_entityId_idx" ON "activities"("entityId");

-- CreateIndex
CREATE INDEX "task_collaborators_userId_idx" ON "task_collaborators"("userId");

-- CreateIndex
CREATE INDEX "task_team_members_userId_idx" ON "task_team_members"("userId");
