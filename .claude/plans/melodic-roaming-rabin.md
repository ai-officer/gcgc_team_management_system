# Plan: Subtasks Feature

## Overview
Add parent-child task relationships, allowing tasks to have subtasks. Subtasks appear within the parent task's view modal and can be quickly added/managed.

## Files to Modify

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `parentId`, `parent`, `subtasks` to Task model |
| `src/app/api/tasks/route.ts` | Update POST to accept `parentId`, update GET to include subtasks |
| `src/app/api/tasks/[id]/route.ts` | Update GET/PATCH/DELETE to handle subtasks |
| `src/lib/validations/task.ts` | Add `parentId` to validation schemas |
| `src/components/tasks/TaskViewModal.tsx` | Add subtasks section with add/manage UI |
| `src/types/index.ts` | Update TaskWithRelations to include subtasks |

---

## Implementation Steps

### Step 1: Database Schema
Add self-referential relationship to Task model:

```prisma
model Task {
  // ... existing fields

  // Subtask relationship
  parentId    String?
  parent      Task?     @relation("TaskSubtasks", fields: [parentId], references: [id], onDelete: Cascade)
  subtasks    Task[]    @relation("TaskSubtasks")
}
```

Run: `npm run db:generate && npm run db:push`

### Step 2: Update Type Definitions
Update `src/types/index.ts`:

```typescript
export interface TaskWithRelations extends Task {
  // ... existing fields
  subtasks?: TaskWithRelations[]
  parent?: Task | null
}
```

### Step 3: Update Validation Schema
Update `src/lib/validations/task.ts`:
- Add `parentId: z.string().optional()` to createTaskSchema
- Add `parentId: z.string().optional()` to updateTaskSchema

### Step 4: Update Task APIs

**POST `/api/tasks`:**
- Accept `parentId` in request body
- When creating subtask: inherit `teamId` from parent if not specified
- Include subtasks in response

**GET `/api/tasks`:**
- Add `parentId` filter parameter
- By default, return only top-level tasks (`parentId: null`)
- Include subtasks array in response

**GET `/api/tasks/[id]`:**
- Include subtasks with their basic info (id, title, status, priority, assignee)

**PATCH `/api/tasks/[id]`:**
- Allow updating `parentId` (move subtask to different parent)

**DELETE `/api/tasks/[id]`:**
- Cascade delete handled by Prisma relation

### Step 5: Update TaskViewModal UI

Add subtasks section below description:

```tsx
{/* Subtasks Section */}
<div className="border-t pt-4">
  <div className="flex items-center justify-between mb-3">
    <h4 className="font-medium flex items-center gap-2">
      <ListTodo className="h-4 w-4" />
      Subtasks ({subtasks.length})
    </h4>
    <Button size="sm" variant="ghost" onClick={() => setShowAddSubtask(true)}>
      <Plus className="h-4 w-4 mr-1" /> Add
    </Button>
  </div>

  {/* Subtask list */}
  <div className="space-y-2">
    {subtasks.map(subtask => (
      <div key={subtask.id} className="flex items-center gap-2 p-2 rounded border">
        <Checkbox
          checked={subtask.status === 'COMPLETED'}
          onCheckedChange={(checked) => handleSubtaskStatusChange(subtask.id, checked)}
        />
        <span className={subtask.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''}>
          {subtask.title}
        </span>
        <Badge variant="outline">{subtask.priority}</Badge>
        {subtask.assignee && <UserAvatar user={subtask.assignee} size="sm" />}
      </div>
    ))}
  </div>

  {/* Quick add form */}
  {showAddSubtask && (
    <div className="mt-2 flex gap-2">
      <Input
        placeholder="Subtask title..."
        value={newSubtaskTitle}
        onChange={(e) => setNewSubtaskTitle(e.target.value)}
      />
      <Button onClick={handleAddSubtask}>Add</Button>
      <Button variant="ghost" onClick={() => setShowAddSubtask(false)}>Cancel</Button>
    </div>
  )}
</div>
```

### Step 6: Auto-Calculate Parent Progress
When subtasks exist, parent progress = (completed subtasks / total subtasks) * 100

**Implementation:**
- In `PATCH /api/tasks/[id]` (when subtask status changes): Recalculate parent's progress
- In TaskViewModal: Hide progress slider when task has subtasks, show calculated progress instead
- Add helper function `calculateParentProgress(subtasks)` in task API

---

## Subtask Behavior Rules

1. **Inheritance**: Subtasks inherit `teamId` from parent if not explicitly set
2. **Depth**: Only 1 level deep (subtasks cannot have subtasks)
3. **Deletion**: Deleting parent cascades to all subtasks
4. **Status**: Completing all subtasks does NOT auto-complete parent (user decides)
5. **Visibility**: Subtasks appear only in parent's view modal, not in main task list

---

## Verification

1. **Create subtask**: Add subtask from parent task modal
2. **View subtasks**: Subtasks display with checkbox, title, priority, assignee
3. **Toggle completion**: Clicking checkbox toggles COMPLETED status
4. **Delete parent**: Confirm subtasks are also deleted
5. **API filter**: `GET /api/tasks?parentId=null` returns only top-level tasks
6. **Progress**: (Optional) Verify parent progress updates with subtask changes

---

## Deployment
After implementation:
```bash
npm run db:generate && npm run db:push
npm run build
# Deploy to staging
```
