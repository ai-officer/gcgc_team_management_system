# Model Guide - Prisma & PostgreSQL

This guide explains the database models, relationships, and best practices for the GCGC Team Management System.

## 📋 Table of Contents
- [Database Schema Overview](#database-schema-overview)
- [Core Models](#core-models)
- [Model Relationships](#model-relationships)
- [Creating New Models](#creating-new-models)
- [Migration Best Practices](#migration-best-practices)

## 🗄️ Database Schema Overview

The system uses PostgreSQL with Prisma ORM for type-safe database operations. The schema is designed to support:
- Multi-tenant team management
- Role-based access control
- Task and project tracking
- Calendar and event management
- Activity logging and audit trails

## 🏗️ Core Models

### User Model
```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  name            String
  avatar          String?
  role            UserRole  @default(MEMBER)
  status          UserStatus @default(ACTIVE)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  teamMemberships TeamMember[]
  assignedTasks   Task[]
  createdTasks    Task[]     @relation("TaskCreator")
  comments        Comment[]
  activities      Activity[]
  events          Event[]
}
```

**Key Features:**
- Unique email identification
- Role-based permissions (ADMIN, LEADER, MEMBER)
- Status tracking (ACTIVE, INACTIVE, SUSPENDED)
- Avatar support via Cloudinary
- Audit trail timestamps

### Team Model
```prisma
model Team {
  id          String   @id @default(cuid())
  name        String
  description String?
  avatar      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  members     TeamMember[]
  tasks       Task[]
  events      Event[]
  activities  Activity[]
}
```

**Key Features:**
- Team branding with avatar
- Hierarchical member structure
- Isolated team data

### Task Model
```prisma
model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(PENDING)
  priority    TaskPriority @default(MEDIUM)
  dueDate     DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  
  // Foreign Keys
  teamId      String
  assigneeId  String?
  creatorId   String
  
  // Relations
  team        Team       @relation(fields: [teamId], references: [id], onDelete: Cascade)
  assignee    User?      @relation(fields: [assigneeId], references: [id])
  creator     User       @relation("TaskCreator", fields: [creatorId], references: [id])
  comments    Comment[]
  activities  Activity[]
}
```

**Key Features:**
- Status workflow (PENDING → IN_PROGRESS → COMPLETED → CANCELLED)
- Priority levels (LOW, MEDIUM, HIGH, URGENT)
- Assignment and creation tracking
- Due date management

## 🔗 Model Relationships

### User ↔ Team Relationship (Many-to-Many)
```prisma
model TeamMember {
  id        String   @id @default(cuid())
  role      TeamRole @default(MEMBER)
  joinedAt  DateTime @default(now())
  
  // Foreign Keys
  userId    String
  teamId    String
  
  // Relations
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  
  @@unique([userId, teamId])
}
```

### Activity Logging
```prisma
model Activity {
  id          String       @id @default(cuid())
  type        ActivityType
  description String
  metadata    Json?
  createdAt   DateTime     @default(now())
  
  // Foreign Keys
  userId      String?
  teamId      String?
  taskId      String?
  
  // Relations
  user        User?        @relation(fields: [userId], references: [id])
  team        Team?        @relation(fields: [teamId], references: [id])
  task        Task?        @relation(fields: [taskId], references: [id])
}
```

## 🆕 Creating New Models

### 1. Define the Model
Add to `prisma/schema.prisma`:
```prisma
model NewModel {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2. Generate Migration
```bash
npx prisma db push
# or for production
npx prisma migrate dev --name add_new_model
```

### 3. Update Types
```bash
npx prisma generate
```

### 4. Create API Routes
```typescript
// src/app/api/new-model/route.ts
import { prisma } from '@/lib/prisma';

export async function GET() {
  const items = await prisma.newModel.findMany();
  return Response.json(items);
}
```

## 🔄 Migration Best Practices

### Development Migrations
```bash
# Create and apply migration
npx prisma migrate dev --name descriptive_name

# Reset database (development only)
npx prisma migrate reset
```

### Production Migrations
```bash
# Deploy migrations
npx prisma migrate deploy

# Generate client
npx prisma generate
```

### Data Seeding
```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create seed data
  await prisma.user.createMany({
    data: [
      { email: 'admin@gcgc.com', name: 'Admin User', role: 'ADMIN' },
      // ... more seed data
    ]
  });
}

main().catch(console.error);
```

## 🔍 Query Examples

### Basic Queries
```typescript
// Find user with teams
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
  include: {
    teamMemberships: {
      include: { team: true }
    }
  }
});

// Find team with members and tasks
const team = await prisma.team.findUnique({
  where: { id: teamId },
  include: {
    members: {
      include: { user: true }
    },
    tasks: {
      include: { assignee: true }
    }
  }
});
```

### Complex Queries
```typescript
// Tasks assigned to user in specific team
const tasks = await prisma.task.findMany({
  where: {
    teamId: teamId,
    assigneeId: userId,
    status: { in: ['PENDING', 'IN_PROGRESS'] }
  },
  orderBy: [
    { priority: 'desc' },
    { dueDate: 'asc' }
  ]
});
```

## 📊 Performance Optimization

### Indexes
```prisma
model Task {
  // ... fields
  
  @@index([teamId, status])
  @@index([assigneeId, dueDate])
  @@index([createdAt])
}
```

### Query Optimization
- Use `select` for specific fields
- Use `include` wisely to avoid N+1 queries
- Implement cursor-based pagination for large datasets
- Add database indexes for frequently queried fields

## 🛡️ Security Considerations

### Row-Level Security
```typescript
// Always filter by user's accessible teams
const tasks = await prisma.task.findMany({
  where: {
    team: {
      members: {
        some: { userId: currentUserId }
      }
    }
  }
});
```

### Data Validation
```typescript
import { z } from 'zod';

const taskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
});
```