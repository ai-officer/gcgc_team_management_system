# Business Requirements Specification (BRS)
## GCGC Team Management System

**Document Version:** 1.0
**Date:** November 10, 2025
**Project Name:** GCGC Team Management System
**Document Owner:** Technical Team
**Status:** Final

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Detailed Functional Requirements](#3-detailed-functional-requirements)
4. [Data Requirements](#4-data-requirements)
5. [Interface Requirements](#5-interface-requirements)
6. [Technical Architecture](#6-technical-architecture)
7. [Security Specifications](#7-security-specifications)
8. [Performance Specifications](#8-performance-specifications)
9. [Integration Specifications](#9-integration-specifications)
10. [User Interface Specifications](#10-user-interface-specifications)
11. [Testing Requirements](#11-testing-requirements)
12. [Deployment Requirements](#12-deployment-requirements)
13. [Traceability Matrix](#13-traceability-matrix)

---

## 1. Introduction

### 1.1 Purpose
This Business Requirements Specification (BRS) document provides detailed technical specifications for the GCGC Team Management System. It serves as a comprehensive guide for developers, testers, and technical stakeholders.

### 1.2 Scope
This document covers all technical specifications including:
- Detailed functional requirements with acceptance criteria
- Data models and database schemas
- API specifications
- User interface specifications
- Integration requirements
- Security and performance specifications

### 1.3 Intended Audience
- Software Developers
- QA Engineers
- System Architects
- Database Administrators
- DevOps Engineers
- Technical Project Managers

### 1.4 Document Conventions
- **SHALL**: Mandatory requirement
- **SHOULD**: Recommended requirement
- **MAY**: Optional requirement
- **FR**: Functional Requirement
- **NFR**: Non-Functional Requirement
- **BR**: Business Requirement

---

## 2. System Overview

### 2.1 System Architecture
The GCGC Team Management System is built using:
- **Frontend**: Next.js 14 (App Router) with React 18
- **Backend**: Next.js API Routes (Server Components)
- **Database**: PostgreSQL 14+
- **ORM**: Prisma 5.18
- **Authentication**: NextAuth.js 4.24
- **UI Framework**: TailwindCSS + Radix UI (ShadCN/UI)
- **State Management**: TanStack Query (React Query)
- **Form Management**: React Hook Form + Zod validation

### 2.2 Deployment Architecture
```
┌─────────────────────────────────────────────┐
│          Client Browser                      │
│  (Desktop/Tablet/Mobile)                     │
└──────────────┬──────────────────────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────────────────────┐
│     Next.js Application Server               │
│  - Server Components                         │
│  - API Routes                                │
│  - Authentication Middleware                 │
└──────────────┬──────────────────────────────┘
               │
         ┌─────┴─────┐
         │           │
         ▼           ▼
┌──────────────┐  ┌──────────────────────┐
│  PostgreSQL  │  │  Google Calendar API  │
│   Database   │  │   (External Service)  │
└──────────────┘  └──────────────────────┘
```

### 2.3 Technology Stack Details

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Frontend Framework | Next.js | 14.2.5 | Server-side rendering, routing |
| UI Library | React | 18.3.1 | Component-based UI |
| Language | TypeScript | 5.5.4 | Type-safe development |
| Database | PostgreSQL | 14+ | Data persistence |
| ORM | Prisma | 5.18.0 | Database access layer |
| Authentication | NextAuth.js | 4.24.7 | User authentication |
| Styling | TailwindCSS | 3.4.7 | Utility-first CSS |
| UI Components | Radix UI | Various | Accessible components |
| Form Management | React Hook Form | 7.62.0 | Form state management |
| Validation | Zod | 3.23.8 | Schema validation |
| Calendar | FullCalendar | 6.1.15 | Calendar UI |
| State Management | TanStack Query | 5.51.21 | Server state management |
| API Integration | googleapis | 164.0.0 | Google Calendar API |

---

## 3. Detailed Functional Requirements

### 3.1 User Management Module

#### FR-UM-001: User Registration
**Description**: System shall allow new users to register with email and password

**Acceptance Criteria**:
1. User can access registration page at `/auth/register`
2. Required fields: email, password, name, firstName, lastName
3. Optional fields: middleName, contactNumber, positionTitle
4. Email must be unique in the system
5. Password must be at least 8 characters
6. Password is hashed using bcrypt with 10 rounds
7. Success message displayed after registration
8. User redirected to login page after successful registration
9. Validation errors displayed inline

**API Endpoint**: `POST /api/auth/register`
**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "middleName": "Smith",
  "contactNumber": "+1234567890",
  "positionTitle": "Project Manager"
}
```
**Response**: `201 Created`
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "clxxx123456",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Database Table**: `users`
**Related Files**:
- `/src/app/auth/register/page.tsx`
- `/src/app/api/auth/register/route.ts`
- `/src/lib/validations/auth.ts`

---

#### FR-UM-002: User Authentication
**Description**: System shall authenticate users using email/password or OAuth

**Acceptance Criteria**:
1. User can login at `/auth/signin`
2. Support email/password authentication
3. Support Google OAuth2 authentication
4. Session token created on successful login
5. Session expires after 60 minutes of inactivity
6. Invalid credentials show error message
7. User redirected to appropriate portal based on role

**API Endpoint**: `POST /api/auth/[...nextauth]`
**Authentication Flow**:
```typescript
// Email/Password Flow
1. User submits credentials
2. System validates credentials
3. Password verified using bcrypt.compare()
4. JWT token generated
5. Session created in database
6. User redirected to dashboard

// OAuth Flow
1. User clicks "Sign in with Google"
2. Redirect to Google OAuth consent screen
3. User authorizes application
4. Google returns authorization code
5. System exchanges code for tokens
6. User account created/linked
7. Session created
8. User redirected to dashboard
```

**Related Files**:
- `/src/app/auth/signin/page.tsx`
- `/src/app/api/auth/[...nextauth]/route.ts`
- `/src/lib/auth.ts`

---

#### FR-UM-003: User Profile Management
**Description**: Users shall be able to view and update their profile information

**Acceptance Criteria**:
1. User can access profile page
2. Display current profile information
3. Editable fields: name, firstName, lastName, middleName, contactNumber, positionTitle, image
4. Profile image upload supported (JPG, PNG, max 5MB)
5. Changes saved to database
6. Success/error feedback provided
7. Profile image displayed in navigation bar

**API Endpoint**: `PATCH /api/users/[id]`
**Request Body**:
```json
{
  "name": "John Doe Updated",
  "firstName": "John",
  "lastName": "Doe",
  "contactNumber": "+1234567890",
  "positionTitle": "Senior Project Manager",
  "image": "https://storage.example.com/avatars/user123.jpg"
}
```

**Related Files**:
- `/src/app/user/profile/page.tsx`
- `/src/app/api/users/[id]/route.ts`
- `/src/components/forms/ProfileForm.tsx`

---

#### FR-UM-004: Role-Based Access Control
**Description**: System shall implement role-based access control with three roles

**Roles and Permissions**:

| Role | Permissions |
|------|-------------|
| **ADMIN** | - Full system access<br>- Create/edit/delete users<br>- Manage all teams<br>- View all tasks<br>- System configuration<br>- Approve OSSB requests |
| **LEADER** | - Manage own teams<br>- Create/assign tasks within teams<br>- View team member tasks<br>- Create OSSB requests<br>- Team reporting |
| **MEMBER** | - View assigned tasks<br>- Update own tasks<br>- Comment on tasks<br>- View team calendar<br>- Update own profile |

**Permission Check Implementation**:
```typescript
// File: src/lib/permissions.ts
export function checkPermission(
  user: User,
  resource: Resource,
  action: Action,
  scope?: Scope
): boolean {
  // Admin has all permissions
  if (user.role === 'ADMIN') return true;

  // Leader permissions
  if (user.role === 'LEADER') {
    // Can manage own teams
    if (resource === 'team' && scope === 'own') return true;
    // Can manage tasks within teams
    if (resource === 'task' && scope === 'team') return true;
  }

  // Member permissions
  if (user.role === 'MEMBER') {
    // Can only update own tasks
    if (resource === 'task' && action === 'update' && scope === 'own') return true;
  }

  return false;
}
```

**Middleware Protection**:
```typescript
// File: src/middleware.ts
export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  }

  // Protect user routes
  if (request.nextUrl.pathname.startsWith('/user')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  }

  return NextResponse.next();
}
```

---

### 3.2 Team Management Module

#### FR-TM-001: Create Team
**Description**: Admin and Leaders shall be able to create teams

**Acceptance Criteria**:
1. Admin can create teams from admin portal
2. Required fields: name
3. Optional fields: description
4. Team name must be unique
5. Creator automatically becomes team member
6. Team is active by default
7. Success message displayed

**API Endpoint**: `POST /api/teams`
**Request Body**:
```json
{
  "name": "Marketing Team",
  "description": "Responsible for marketing campaigns and brand management"
}
```
**Response**: `201 Created`
```json
{
  "id": "clxxx789012",
  "name": "Marketing Team",
  "description": "Responsible for marketing campaigns and brand management",
  "isActive": true,
  "createdAt": "2025-11-10T10:00:00Z"
}
```

**Database Schema**:
```prisma
model Team {
  id          String       @id @default(cuid())
  name        String
  description String?
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  events      Event[]
  tasks       Task[]
  members     TeamMember[]
}
```

---

#### FR-TM-002: Assign Team Members
**Description**: Admin and Team Leaders shall assign members to teams

**Acceptance Criteria**:
1. Can assign multiple users to a team
2. Can specify member role (LEADER or MEMBER)
3. User can be member of multiple teams
4. Cannot assign same user twice to same team
5. Activity logged when member added
6. Team members list updated

**API Endpoint**: `POST /api/user/team-members`
**Request Body**:
```json
{
  "teamId": "clxxx789012",
  "userId": "clxxx123456",
  "role": "MEMBER"
}
```

**Database Schema**:
```prisma
model TeamMember {
  id       String         @id @default(cuid())
  userId   String
  teamId   String
  role     TeamMemberRole @default(MEMBER)
  joinedAt DateTime       @default(now())
  team     Team           @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user     User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, teamId])
}

enum TeamMemberRole {
  LEADER
  MEMBER
}
```

---

### 3.3 Task Management Module

#### FR-TK-001: Create Task
**Description**: Users shall create tasks with full details

**Acceptance Criteria**:
1. Required fields: title, creatorId
2. Optional fields: description, priority, status, dueDate, startDate, assigneeId, teamId
3. Task types: INDIVIDUAL, TEAM, COLLABORATION
4. Priorities: LOW, MEDIUM, HIGH, URGENT
5. Default status: TODO
6. Default priority: MEDIUM
7. Can assign to user or team
8. Activity logged on creation
9. Calendar event created if dueDate specified

**API Endpoint**: `POST /api/tasks`
**Request Body**:
```json
{
  "title": "Complete Q4 Marketing Report",
  "description": "Prepare comprehensive marketing performance report for Q4 2025",
  "priority": "HIGH",
  "status": "TODO",
  "taskType": "INDIVIDUAL",
  "dueDate": "2025-12-15T23:59:59Z",
  "startDate": "2025-11-10T09:00:00Z",
  "assigneeId": "clxxx123456",
  "teamId": "clxxx789012",
  "location": "Marketing Office",
  "meetingLink": "https://meet.google.com/abc-defg-hij"
}
```

**Response**: `201 Created`
```json
{
  "id": "clxxx345678",
  "title": "Complete Q4 Marketing Report",
  "description": "Prepare comprehensive marketing performance report for Q4 2025",
  "priority": "HIGH",
  "status": "TODO",
  "taskType": "INDIVIDUAL",
  "dueDate": "2025-12-15T23:59:59Z",
  "startDate": "2025-11-10T09:00:00Z",
  "progressPercentage": 0,
  "createdAt": "2025-11-10T10:00:00Z"
}
```

**Database Schema**:
```prisma
model Task {
  id                    String             @id @default(cuid())
  title                 String
  description           String?
  status                TaskStatus         @default(TODO)
  priority              Priority           @default(MEDIUM)
  dueDate               DateTime?
  startDate             DateTime?
  assigneeId            String?
  creatorId             String
  teamId                String?
  progressPercentage    Int                @default(0)
  taskType              TaskType           @default(INDIVIDUAL)
  location              String?
  meetingLink           String?
  allDay                Boolean            @default(false)
  googleCalendarId      String?
  googleCalendarEventId String?
  syncedAt              DateTime?
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  COMPLETED
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TaskType {
  INDIVIDUAL
  TEAM
  COLLABORATION
}
```

---

#### FR-TK-002: Update Task Status
**Description**: Assignee and authorized users can update task status

**Acceptance Criteria**:
1. Status can change through workflow: TODO → IN_PROGRESS → IN_REVIEW → COMPLETED
2. Can mark as CANCELLED from any status
3. Activity logged on status change
4. Progress percentage can be updated (0-100)
5. Last updated timestamp recorded
6. Notifications sent to relevant users

**API Endpoint**: `PATCH /api/tasks/[id]`
**Request Body**:
```json
{
  "status": "IN_PROGRESS",
  "progressPercentage": 30
}
```

**Business Logic**:
```typescript
// Valid status transitions
const statusTransitions = {
  TODO: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['IN_REVIEW', 'TODO', 'CANCELLED'],
  IN_REVIEW: ['COMPLETED', 'IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [], // Cannot change from completed
  CANCELLED: ['TODO'] // Can reopen
};
```

---

#### FR-TK-003: Task Comments
**Description**: Users can add comments to tasks with optional image attachments

**Acceptance Criteria**:
1. Comment requires content (text)
2. Supports image attachments (JPG, PNG, GIF, max 10MB)
3. Supports threaded replies (parent-child relationship)
4. Can add emoji reactions to comments
5. Comment author and timestamp displayed
6. Comments displayed in chronological order
7. Activity logged when comment added

**API Endpoint**: `POST /api/tasks/[id]/comments`
**Request Body**:
```json
{
  "content": "I've completed the initial draft. Please review.",
  "imageUrl": "https://storage.example.com/comments/comment123.jpg",
  "parentId": null
}
```

**Response**: `201 Created`
```json
{
  "id": "clxxx456789",
  "content": "I've completed the initial draft. Please review.",
  "imageUrl": "https://storage.example.com/comments/comment123.jpg",
  "authorId": "clxxx123456",
  "taskId": "clxxx345678",
  "parentId": null,
  "createdAt": "2025-11-10T14:30:00Z",
  "author": {
    "id": "clxxx123456",
    "name": "John Doe",
    "image": "https://storage.example.com/avatars/user123.jpg"
  }
}
```

**Database Schema**:
```prisma
model Comment {
  id        String            @id @default(cuid())
  content   String
  taskId    String
  authorId  String
  parentId  String?
  imageUrl  String?
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt
  author    User              @relation(fields: [authorId], references: [id], onDelete: Cascade)
  task      Task              @relation(fields: [taskId], references: [id], onDelete: Cascade)
  parent    Comment?          @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies   Comment[]         @relation("CommentReplies")
  reactions CommentReaction[]
}

model CommentReaction {
  id        String   @id @default(cuid())
  emoji     String
  commentId String
  userId    String
  createdAt DateTime @default(now())
  comment   Comment  @relation(fields: [commentId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([commentId, userId, emoji])
}
```

---

### 3.4 Calendar Management Module

#### FR-CAL-001: Calendar Event Management
**Description**: System shall provide calendar functionality with event management

**Acceptance Criteria**:
1. Display calendar in month, week, day views
2. Events can be created, edited, deleted
3. Event types: MEETING, DEADLINE, REMINDER, MILESTONE, PERSONAL
4. Support all-day events
5. Support recurring events (RRULE format)
6. Color coding by event type
7. Task deadlines appear as calendar events
8. Team events visible to team members

**API Endpoint**: `POST /api/events`
**Request Body**:
```json
{
  "title": "Q4 Planning Meeting",
  "description": "Quarterly planning session for marketing team",
  "startTime": "2025-11-15T10:00:00Z",
  "endTime": "2025-11-15T12:00:00Z",
  "allDay": false,
  "type": "MEETING",
  "color": "#3b82f6",
  "teamId": "clxxx789012"
}
```

**Database Schema**:
```prisma
model Event {
  id                    String    @id @default(cuid())
  title                 String
  description           String?
  startTime             DateTime
  endTime               DateTime
  allDay                Boolean   @default(false)
  color                 String?
  type                  EventType @default(MEETING)
  creatorId             String
  teamId                String?
  taskId                String?
  googleCalendarId      String?
  googleCalendarEventId String?
  syncedAt              DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  creator               User      @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  task                  Task?     @relation(fields: [taskId], references: [id])
  team                  Team?     @relation(fields: [teamId], references: [id])
}

enum EventType {
  MEETING
  DEADLINE
  REMINDER
  MILESTONE
  PERSONAL
}
```

---

#### FR-CAL-002: Google Calendar Integration
**Description**: System shall integrate with Google Calendar for bidirectional sync

**Acceptance Criteria**:
1. User can connect Google Calendar account via OAuth2
2. Support bidirectional sync (TMS ↔ Google Calendar)
3. Sync task deadlines to Google Calendar
4. Sync team events to Google Calendar
5. Import events from Google Calendar to TMS
6. Handle sync conflicts gracefully
7. Display sync status and last sync time
8. Allow manual sync trigger
9. Support webhook notifications for real-time sync

**OAuth2 Flow**:
```typescript
// Step 1: Initiate OAuth
GET /api/calendar/connect-google
→ Redirect to Google OAuth consent screen

// Step 2: Handle callback
GET /api/calendar/google-callback?code=AUTH_CODE
→ Exchange code for access and refresh tokens
→ Store tokens securely
→ Create initial sync

// Step 3: Ongoing sync
POST /api/calendar/sync-from-google
→ Fetch events from Google Calendar
→ Create/update events in TMS

POST /api/calendar/sync-to-google
→ Push TMS events to Google Calendar
```

**Sync Settings**:
```prisma
model CalendarSyncSettings {
  id                      String                @id @default(cuid())
  userId                  String                @unique
  isEnabled               Boolean               @default(false)
  googleCalendarId        String?
  syncDirection           CalendarSyncDirection @default(BOTH)
  syncTaskDeadlines       Boolean               @default(true)
  syncTeamEvents          Boolean               @default(true)
  syncPersonalEvents      Boolean               @default(true)
  googleAccessToken       String?
  googleRefreshToken      String?
  googleTokenExpiry       DateTime?
  webhookChannelId        String?
  webhookResourceId       String?
  webhookExpiration       DateTime?
  lastSyncedAt            DateTime?
  createdAt               DateTime              @default(now())
  updatedAt               DateTime              @updatedAt
}

enum CalendarSyncDirection {
  TMS_TO_GOOGLE
  GOOGLE_TO_TMS
  BOTH
}
```

**Related Files**:
- `/src/app/api/calendar/connect-google/route.ts`
- `/src/app/api/calendar/google-callback/route.ts`
- `/src/app/api/calendar/sync-from-google/route.ts`
- `/src/app/api/calendar/webhook/route.ts`
- `/src/lib/google-calendar.ts`

---

### 3.5 OSSB Request Module

#### FR-OSSB-001: Create OSSB Request
**Description**: Users shall create OSSB (Objective/Specific Steps Budget) requests

**Acceptance Criteria**:
1. Wizard-based form with 7 sections
2. Section 1: Header Information (branch, objective title, version, annual plan flag)
3. Section 2: Project Information (M/I/P classification, KRA/CPA, dates)
4. Section 3: Success Measures (up to 10 measures)
5. Section 4: Program Steps (up to 10 steps with budget)
6. Section 5: Signatories (prepared, endorsed, recommended, approved)
7. Section 6: Attachments (file uploads, checkboxes)
8. Section 7: CC and Remarks
9. Real-time validation with Zod schema
10. Auto-calculate total budget
11. Generate reference number automatically
12. Create calendar events for program step deadlines
13. Sync to Google Calendar if enabled

**Complete Field List** (90 fields total):

**Section 1 - Header (4 fields)**:
1. branchOrDepartment (String, required)
2. objectiveTitle (String, required)
3. versionNo (String, optional)
4. partOfAnnualPlan (Boolean)

**Section 2 - Project Info (7 fields)**:
5. mipClassification (Enum: MAINTENANCE|IMPROVEMENT|PROJECT, required)
6. kraOrCpaNumber (Int, optional)
7. projectNumber (Int, optional)
8. kraOrCpaName (String, optional)
9. titleObjective (String, required)
10. startDate (DateTime, required)
11. endDate (DateTime, required)

**Section 3 - Success Measures (10 fields max)**:
12-21. successMeasures[0-9] (String array, min 1, max 10)

**Section 4 - Program Steps (50 fields max, 5 per step × 10 steps)**:
22-26. programSteps[0].stepNumber, description, responsiblePerson, deadline, budget
27-31. programSteps[1]...
... (up to 10 steps)
67-71. programSteps[9]...
72. totalBudget (Float, auto-calculated)

**Section 5 - Signatories (12 fields)**:
73. preparedBy (String)
74. preparedByPosition (String)
75. datePrepared (DateTime)
76. endorsedBy (String)
77. endorsedByPosition (String)
78. dateEndorsed (DateTime)
79. recommendedBy (String)
80. recommendedByPosition (String)
81. dateRecommended (DateTime)
82. approvedBy (String)
83. approvedByPosition (String)
84. dateApproved (DateTime)

**Section 6 - Attachments (3 fields)**:
85. hasGuidelines (Boolean)
86. hasComputationValue (Boolean)
87. otherAttachments (String)

**Section 7 - CC/Remarks (2 fields)**:
88. ccRecipients (String)
89. remarks (String)

**Meta Fields (1 field)**:
90. status (Enum: DRAFT|SUBMITTED|ENDORSED|RECOMMENDED|APPROVED|REJECTED)

**API Endpoint**: `POST /api/ossb`
**Request Body** (example):
```json
{
  "branchOrDepartment": "Marketing Department",
  "objectiveTitle": "Digital Marketing Campaign 2025",
  "versionNo": "ver211001",
  "partOfAnnualPlan": true,
  "mipClassification": "PROJECT",
  "kraOrCpaNumber": 1,
  "projectNumber": 2025001,
  "kraOrCpaName": "Marketing",
  "titleObjective": "Launch comprehensive digital marketing campaign to increase brand awareness by 40%",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "successMeasures": [
    "Increase website traffic by 50%",
    "Achieve 10,000 new social media followers",
    "Generate 500 qualified leads"
  ],
  "programSteps": [
    {
      "stepNumber": 1,
      "description": "Market research and competitor analysis",
      "responsiblePerson": "John Doe",
      "deadline": "2025-02-28T23:59:59Z",
      "budget": 50000.00
    },
    {
      "stepNumber": 2,
      "description": "Develop marketing materials and content",
      "responsiblePerson": "Jane Smith",
      "deadline": "2025-04-30T23:59:59Z",
      "budget": 100000.00
    }
  ],
  "totalBudget": 150000.00,
  "preparedBy": "John Doe",
  "preparedByPosition": "Marketing Manager",
  "datePrepared": "2025-11-10T10:00:00Z",
  "hasGuidelines": true,
  "hasComputationValue": true,
  "otherAttachments": "ROI calculation spreadsheet",
  "ccRecipients": "ceo@gcgc.com, cfo@gcgc.com",
  "remarks": "Urgent approval required for Q1 2025 launch",
  "status": "DRAFT"
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "ossbRequest": {
    "id": "clxxx567890",
    "referenceNo": "OSSB-2025-001",
    "status": "DRAFT",
    "createdAt": "2025-11-10T10:00:00Z"
  },
  "syncResults": {
    "tmsEventsCreated": 2,
    "googleSyncAttempted": true,
    "googleSyncSucceeded": 2,
    "googleSyncFailed": 0
  }
}
```

**Database Schema**:
```prisma
model OSSBRequest {
  id                    String              @id @default(cuid())
  referenceNo           String              @unique @default(cuid())
  branchOrDepartment    String
  objectiveTitle        String
  versionNo             String?
  partOfAnnualPlan      Boolean             @default(false)
  mipClassification     MIPClassification
  kraOrCpaNumber        Int?
  projectNumber         Int?
  kraOrCpaName          String?
  titleObjective        String
  startDate             DateTime
  endDate               DateTime
  successMeasures       Json
  programSteps          OSSBProgramStep[]
  totalBudget           Float               @default(0)
  preparedBy            String?
  preparedByPosition    String?
  datePrepared          DateTime?
  endorsedBy            String?
  endorsedByPosition    String?
  dateEndorsed          DateTime?
  recommendedBy         String?
  recommendedByPosition String?
  dateRecommended       DateTime?
  approvedBy            String?
  approvedByPosition    String?
  dateApproved          DateTime?
  hasGuidelines         Boolean             @default(false)
  hasComputationValue   Boolean             @default(false)
  otherAttachments      String?
  attachments           OSSBAttachment[]
  ccRecipients          String?
  remarks               String?
  status                OSSBStatus          @default(DRAFT)
  creatorId             String
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  submittedAt           DateTime?
  creator               User                @relation(fields: [creatorId], references: [id])
}

model OSSBProgramStep {
  id                String      @id @default(cuid())
  ossbRequestId     String
  stepNumber        Int
  description       String
  responsiblePerson String
  deadline          DateTime
  budget            Float       @default(0)
  createdAt         DateTime    @default(now())
  ossbRequest       OSSBRequest @relation(fields: [ossbRequestId], references: [id], onDelete: Cascade)
}

model OSSBAttachment {
  id            String      @id @default(cuid())
  ossbRequestId String
  fileName      String
  fileUrl       String
  fileSize      Int
  fileType      String
  uploadedAt    DateTime    @default(now())
  ossbRequest   OSSBRequest @relation(fields: [ossbRequestId], references: [id], onDelete: Cascade)
}

enum MIPClassification {
  MAINTENANCE
  IMPROVEMENT
  PROJECT
}

enum OSSBStatus {
  DRAFT
  SUBMITTED
  ENDORSED
  RECOMMENDED
  APPROVED
  REJECTED
}
```

**Validation Schema** (Zod):
```typescript
// File: src/lib/validations/ossb.ts
export const ossbRequestSchema = z.object({
  branchOrDepartment: z.string().min(1).max(100).trim(),
  objectiveTitle: z.string().min(5).max(200).trim(),
  versionNo: z.string().max(50).optional().or(z.literal('')),
  partOfAnnualPlan: z.boolean().default(false),
  mipClassification: z.enum(['MAINTENANCE', 'IMPROVEMENT', 'PROJECT']),
  kraOrCpaNumber: z.number().int().positive().max(999999).optional().nullable(),
  projectNumber: z.number().int().positive().max(999999).optional().nullable(),
  kraOrCpaName: z.string().max(200).trim().optional().or(z.literal('')),
  titleObjective: z.string().min(10).max(1000).trim(),
  startDate: z.date(),
  endDate: z.date(),
  successMeasures: z.array(z.string().min(5).max(500).trim()).min(1).max(10),
  programSteps: z.array(
    z.object({
      stepNumber: z.number().int().positive().max(100),
      description: z.string().min(10).max(1000).trim(),
      responsiblePerson: z.string().min(2).max(200).trim(),
      deadline: z.date(),
      budget: z.number().nonnegative().max(999999999.99).default(0)
    })
  ).min(1).max(10),
  totalBudget: z.number().nonnegative().max(9999999999.99).default(0),
  // ... signatories, attachments, cc/remarks fields
  status: z.enum(['DRAFT', 'SUBMITTED', 'ENDORSED', 'RECOMMENDED', 'APPROVED', 'REJECTED']).default('DRAFT')
})
.refine(data => data.endDate >= data.startDate, {
  message: 'End date must be after or equal to start date',
  path: ['endDate']
})
.refine(data => {
  const calculatedTotal = data.programSteps.reduce((sum, step) => sum + step.budget, 0);
  return Math.abs(calculatedTotal - data.totalBudget) < 0.01;
}, {
  message: 'Total budget must equal the sum of all program step budgets',
  path: ['totalBudget']
});
```

**Related Files**:
- `/src/components/ossb/OSSBWizardForm.tsx` (7-step wizard UI)
- `/src/lib/validations/ossb.ts` (validation schemas)
- `/src/app/api/ossb/route.ts` (API endpoint)

---

#### FR-OSSB-002: OSSB Approval Workflow
**Description**: System shall support multi-level approval workflow for OSSB requests

**Workflow States**:
```
DRAFT → SUBMITTED → ENDORSED → RECOMMENDED → APPROVED
                            ↓
                        REJECTED
```

**State Transitions**:

| From State | To State | Required Field | Permission |
|------------|----------|----------------|------------|
| DRAFT | SUBMITTED | datePrepared, preparedBy | Creator |
| SUBMITTED | ENDORSED | dateEndorsed, endorsedBy | Admin/Approver |
| ENDORSED | RECOMMENDED | dateRecommended, recommendedBy | Admin/Approver |
| RECOMMENDED | APPROVED | dateApproved, approvedBy | Admin/Approver |
| Any | REJECTED | remarks | Admin/Approver |

**Business Rules**:
1. Approval dates must be chronological (prepared < endorsed < recommended < approved)
2. Cannot skip approval levels
3. Rejection can happen at any stage after submission
4. Rejected requests can be revised and resubmitted
5. Approved requests are immutable
6. Email notifications sent at each approval stage

---

### 3.6 Dashboard and Analytics Module

#### FR-DASH-001: Admin Dashboard
**Description**: Admin dashboard shall display system-wide statistics and insights

**Metrics Displayed**:
1. Total users (active/inactive)
2. Total teams
3. Total tasks by status
4. Task completion rate
5. Overdue tasks count
6. Recent activities
7. User registration trend
8. Task creation trend
9. OSSB requests by status
10. Top performing teams

**API Endpoint**: `GET /api/admin/dashboard/stats`
**Response**:
```json
{
  "users": {
    "total": 150,
    "active": 142,
    "inactive": 8,
    "byRole": {
      "ADMIN": 5,
      "LEADER": 25,
      "MEMBER": 120
    }
  },
  "teams": {
    "total": 20,
    "active": 18
  },
  "tasks": {
    "total": 450,
    "byStatus": {
      "TODO": 120,
      "IN_PROGRESS": 180,
      "IN_REVIEW": 50,
      "COMPLETED": 95,
      "CANCELLED": 5
    },
    "overdue": 15,
    "completionRate": 78.5
  },
  "ossbRequests": {
    "total": 25,
    "byStatus": {
      "DRAFT": 5,
      "SUBMITTED": 8,
      "ENDORSED": 6,
      "RECOMMENDED": 4,
      "APPROVED": 2,
      "REJECTED": 0
    }
  },
  "recentActivities": [
    {
      "id": "clxxx111222",
      "type": "TASK_CREATED",
      "description": "John Doe created task 'Q4 Report'",
      "createdAt": "2025-11-10T10:00:00Z"
    }
  ]
}
```

---

#### FR-DASH-002: User Dashboard
**Description**: User dashboard shall display personalized information

**Sections**:
1. Assigned tasks summary
2. Upcoming deadlines
3. Recent activity feed
4. Team events
5. Task distribution chart (by status)
6. Progress overview
7. Quick actions (create task, view calendar)

**API Endpoint**: `GET /api/user/dashboard`
**Response**:
```json
{
  "assignedTasks": {
    "total": 12,
    "todo": 4,
    "inProgress": 6,
    "inReview": 2,
    "overdue": 1
  },
  "upcomingDeadlines": [
    {
      "taskId": "clxxx345678",
      "title": "Complete Q4 Marketing Report",
      "dueDate": "2025-11-15T23:59:59Z",
      "priority": "HIGH"
    }
  ],
  "recentActivities": [
    {
      "id": "clxxx111222",
      "type": "TASK_ASSIGNED",
      "description": "You were assigned to 'Q4 Report'",
      "createdAt": "2025-11-10T10:00:00Z"
    }
  ],
  "teams": [
    {
      "id": "clxxx789012",
      "name": "Marketing Team",
      "role": "MEMBER",
      "taskCount": 8
    }
  ]
}
```

---

## 4. Data Requirements

### 4.1 Database Schema Overview

The system uses PostgreSQL with Prisma ORM. Total of 20 database models:

**Core Models** (8):
1. User - System users with authentication
2. Admin - System administrators
3. Team - User groups
4. TeamMember - User-team relationships
5. Task - Work items
6. Comment - Task discussions
7. Event - Calendar events
8. Activity - Audit trail

**OSSB Models** (3):
9. OSSBRequest - Budget requests
10. OSSBProgramStep - OSSB program steps
11. OSSBAttachment - OSSB file attachments

**Organizational Models** (7):
12. Division - Top-level organizational unit
13. Department - Division subdivisions
14. Section - Department subdivisions
15. TeamLabel - Section team labels
16. SectorHead - Leadership positions
17. JobLevel - Job hierarchy levels
18. OrganizationalUnit - Flexible org structure

**Configuration Models** (2):
19. AdminSettings - System configuration
20. CalendarSyncSettings - Google Calendar sync config

**Authentication Models** (3):
21. Account - OAuth accounts
22. Session - User sessions
23. VerificationToken - Email verification

---

### 4.2 Key Relationships

```
User (1) ─── (N) TeamMember (N) ─── (1) Team
User (1) ─── (N) Task [creator]
User (1) ─── (N) Task [assignee]
User (1) ─── (N) Comment [author]
User (1) ─── (N) Event [creator]
User (1) ─── (N) OSSBRequest [creator]
Team (1) ─── (N) Task
Team (1) ─── (N) Event
Task (1) ─── (N) Comment
Task (1) ─── (N) Event
Task (1) ─── (N) TaskCollaborator (N) ─── (1) User
OSSBRequest (1) ─── (N) OSSBProgramStep
OSSBRequest (1) ─── (N) OSSBAttachment
Division (1) ─── (N) Department
Department (1) ─── (N) Section
Section (1) ─── (N) TeamLabel
```

---

### 4.3 Data Validation Rules

**User Data**:
- Email: Valid email format, unique, max 255 chars
- Password: Min 8 chars, hashed with bcrypt (10 rounds)
- Name: Max 200 chars
- Contact: Valid phone format (optional)

**Task Data**:
- Title: Required, 1-500 chars
- Description: Optional, max 5000 chars
- Due Date: Must be future date or null
- Start Date: Must be before due date if both provided
- Progress: 0-100 integer

**Team Data**:
- Name: Required, unique, max 200 chars
- Description: Optional, max 1000 chars

**OSSB Data**:
- Branch/Department: Required, 1-100 chars
- Objective Title: Required, 5-200 chars
- Title/Objective: Required, 10-1000 chars
- Success Measures: Min 1, max 10, each 5-500 chars
- Program Steps: Min 1, max 10
- Budget: Non-negative, max 9,999,999,999.99
- Dates: startDate < endDate, max 5 years duration

---

## 5. Interface Requirements

### 5.1 API Specifications

**RESTful API Design**:
- Base URL: `https://your-domain.com/api`
- Content-Type: `application/json`
- Authentication: Bearer token (JWT)

**Standard Response Format**:
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful",
  "timestamp": "2025-11-10T10:00:00Z"
}
```

**Error Response Format**:
```json
{
  "success": false,
  "error": "Error message",
  "details": { /* validation errors */ },
  "statusCode": 400,
  "timestamp": "2025-11-10T10:00:00Z"
}
```

**HTTP Status Codes**:
- 200 OK: Successful GET/PUT/PATCH
- 201 Created: Successful POST
- 204 No Content: Successful DELETE
- 400 Bad Request: Validation errors
- 401 Unauthorized: Authentication required
- 403 Forbidden: Insufficient permissions
- 404 Not Found: Resource not found
- 409 Conflict: Duplicate resource
- 500 Internal Server Error: Server error

---

### 5.2 API Endpoints Summary

**Authentication**:
- `POST /api/auth/register` - User registration
- `POST /api/auth/[...nextauth]` - NextAuth handlers
- `POST /api/v1/auth/token` - Server-to-server auth

**Users**:
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/users/[id]` - Get user details
- `PATCH /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user
- `GET /api/users/search` - Search users

**Teams**:
- `GET /api/teams` - List teams
- `POST /api/teams` - Create team
- `GET /api/teams/[id]` - Get team details
- `PATCH /api/teams/[id]` - Update team
- `DELETE /api/teams/[id]` - Delete team

**Tasks**:
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/[id]` - Get task details
- `PATCH /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task
- `GET /api/tasks/[id]/comments` - Get task comments
- `POST /api/tasks/[id]/comments` - Add comment

**Events**:
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `GET /api/events/[id]` - Get event details
- `PATCH /api/events/[id]` - Update event
- `DELETE /api/events/[id]` - Delete event

**OSSB**:
- `GET /api/ossb` - List OSSB requests
- `POST /api/ossb` - Create OSSB request
- `GET /api/ossb/[id]` - Get OSSB details
- `PATCH /api/ossb/[id]` - Update OSSB request
- `POST /api/ossb/upload` - Upload attachment

**Calendar**:
- `POST /api/calendar/connect-google` - Connect Google Calendar
- `GET /api/calendar/google-callback` - OAuth callback
- `POST /api/calendar/sync-from-google` - Import from Google
- `GET /api/calendar/sync-settings` - Get sync settings
- `PATCH /api/calendar/sync-settings` - Update sync settings
- `POST /api/calendar/webhook` - Google Calendar webhook

**Admin**:
- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `GET /api/admin/users` - Admin user management
- `GET /api/admin/teams` - Admin team management
- `GET /api/admin/settings` - System settings
- `PATCH /api/admin/settings` - Update settings

---

### 5.3 External API Integrations

**Google Calendar API**:
- API Version: v3
- Authentication: OAuth 2.0
- Scopes:
  - `https://www.googleapis.com/auth/calendar`
  - `https://www.googleapis.com/auth/calendar.events`
- Rate Limits: 1,000,000 requests/day
- Documentation: https://developers.google.com/calendar

**Key Operations**:
- `calendar.events.list` - Fetch events
- `calendar.events.insert` - Create event
- `calendar.events.update` - Update event
- `calendar.events.delete` - Delete event
- `calendar.events.watch` - Setup webhook

---

## 6. Technical Architecture

### 6.1 Frontend Architecture

**Component Structure**:
```
src/
├── app/                          # Next.js App Router
│   ├── admin/                   # Admin portal pages
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── teams/
│   │   ├── tasks/
│   │   └── settings/
│   ├── user/                    # User portal pages
│   │   ├── dashboard/
│   │   ├── tasks/
│   │   ├── calendar/
│   │   ├── profile/
│   │   └── ossb/
│   ├── auth/                    # Authentication pages
│   │   ├── signin/
│   │   └── register/
│   └── api/                     # API routes
│       ├── auth/
│       ├── users/
│       ├── teams/
│       ├── tasks/
│       ├── events/
│       ├── ossb/
│       └── calendar/
├── components/                  # React components
│   ├── ui/                     # Base UI (ShadCN)
│   ├── forms/                  # Form components
│   ├── dashboard/              # Dashboard widgets
│   ├── calendar/               # Calendar components
│   ├── ossb/                   # OSSB components
│   └── shared/                 # Shared components
├── lib/                        # Utility libraries
│   ├── auth.ts                # NextAuth config
│   ├── prisma.ts              # Prisma client
│   ├── permissions.ts         # RBAC logic
│   ├── google-calendar.ts     # Google API client
│   └── validations/           # Zod schemas
├── hooks/                      # Custom React hooks
├── types/                      # TypeScript types
└── providers/                  # React context providers
```

**State Management**:
- **Server State**: TanStack Query (React Query)
  - Automatic caching
  - Background refetching
  - Optimistic updates
  - Automatic retries

- **Client State**: React hooks (useState, useContext)
  - UI state
  - Form state
  - Modal/dialog state

- **Form State**: React Hook Form
  - Form validation
  - Field-level validation
  - Submission handling

---

### 6.2 Backend Architecture

**API Layer**:
```typescript
// Next.js API Route Handler Pattern
// File: src/app/api/tasks/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { taskSchema } from '@/lib/validations/task';

export async function GET(req: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Extract query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const teamId = searchParams.get('teamId');

    // 3. Build query with filters
    const tasks = await prisma.task.findMany({
      where: {
        ...(status && { status }),
        ...(teamId && { teamId }),
      },
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        creator: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 4. Return response
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await req.json();
    const validated = taskSchema.parse(body);

    // 3. Create task in database
    const task = await prisma.task.create({
      data: {
        ...validated,
        creatorId: session.user.id,
      },
      include: {
        assignee: true,
        creator: true,
        team: true,
      },
    });

    // 4. Create activity log
    await prisma.activity.create({
      data: {
        type: 'TASK_CREATED',
        description: `Created task: ${task.title}`,
        userId: session.user.id,
        entityId: task.id,
        entityType: 'TASK',
      },
    });

    // 5. Create calendar event if dueDate exists
    if (task.dueDate) {
      await prisma.event.create({
        data: {
          title: `Deadline: ${task.title}`,
          startTime: task.dueDate,
          endTime: task.dueDate,
          type: 'DEADLINE',
          creatorId: session.user.id,
          taskId: task.id,
        },
      });
    }

    // 6. Return created task
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### 6.3 Database Architecture

**Connection Pooling**:
```typescript
// File: src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Indexes** (for performance):
```prisma
// User indexes
@@index([email])
@@index([role])
@@index([isActive])

// Task indexes
@@index([status])
@@index([priority])
@@index([dueDate])
@@index([assigneeId])
@@index([teamId])
@@index([creatorId])

// Event indexes
@@index([startTime])
@@index([creatorId])
@@index([teamId])

// OSSB indexes
@@index([status])
@@index([creatorId])
@@index([referenceNo])
```

---

## 7. Security Specifications

### 7.1 Authentication Security

**Password Hashing**:
```typescript
import bcrypt from 'bcryptjs';

// Hash password on registration
const hashedPassword = await bcrypt.hash(password, 10);

// Verify password on login
const isValid = await bcrypt.compare(password, user.password);
```

**Session Management**:
- JWT tokens with 60-minute expiry
- Refresh token rotation
- Secure HTTP-only cookies
- CSRF protection enabled

**OAuth2 Security**:
- State parameter validation
- PKCE (Proof Key for Code Exchange)
- Token encryption at rest
- Automatic token refresh

---

### 7.2 API Security

**Rate Limiting**:
```typescript
// API route protection
const rateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});
```

**Input Validation**:
- All inputs validated with Zod schemas
- SQL injection prevention via Prisma ORM
- XSS prevention via React's built-in escaping
- CSRF tokens for state-changing operations

**Authorization**:
```typescript
// Middleware checks
export async function checkPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;

  // Role-based checks
  if (user.role === 'ADMIN') return true;

  // Resource-specific checks
  return hasPermission(user, resource, action);
}
```

---

### 7.3 Data Security

**Encryption**:
- TLS 1.3 for data in transit
- Database-level encryption at rest
- Sensitive fields (tokens) encrypted with AES-256

**Data Privacy**:
- Personal data minimization
- Data retention policies
- Right to erasure support
- Audit logging for compliance

---

## 8. Performance Specifications

### 8.1 Response Time Requirements

| Operation | Target | Maximum |
|-----------|--------|---------|
| Page load (first contentful paint) | < 1.5s | 3s |
| API response (simple query) | < 200ms | 500ms |
| API response (complex query) | < 500ms | 1s |
| Database query | < 100ms | 300ms |
| Google Calendar sync | < 5s | 10s |

### 8.2 Throughput Requirements

- Concurrent users: 500
- Requests per second: 1,000
- Database connections: 100 (connection pool)

### 8.3 Optimization Strategies

**Frontend**:
- Code splitting with Next.js dynamic imports
- Image optimization with Next.js Image component
- Static page generation where possible
- ISR (Incremental Static Regeneration) for semi-static content
- Client-side caching with React Query

**Backend**:
- Database query optimization with indexes
- N+1 query prevention with Prisma includes
- Response caching with Redis (future)
- Background job processing for heavy tasks

**Database**:
- Proper indexing on frequently queried fields
- Connection pooling
- Query optimization
- Materialized views for complex analytics (future)

---

## 9. Integration Specifications

### 9.1 Google Calendar Integration

**Authentication Flow**:
```typescript
// Step 1: Initiate OAuth
export async function connectGoogleCalendar(userId: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/calendar/google-callback`
  );

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: userId, // Pass user ID in state
  });

  return authUrl;
}

// Step 2: Handle callback and exchange code for tokens
export async function handleGoogleCallback(code: string, userId: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/calendar/google-callback`
  );

  const { tokens } = await oauth2Client.getToken(code);

  // Store tokens in database
  await prisma.calendarSyncSettings.upsert({
    where: { userId },
    create: {
      userId,
      isEnabled: true,
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token,
      googleTokenExpiry: new Date(tokens.expiry_date!),
    },
    update: {
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token,
      googleTokenExpiry: new Date(tokens.expiry_date!),
    },
  });

  return tokens;
}
```

**Sync Operations**:
```typescript
// Sync TMS event to Google Calendar
export async function syncEventToGoogle(eventId: string, userId: string) {
  // 1. Get event from TMS
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error('Event not found');

  // 2. Get user's Google Calendar credentials
  const syncSettings = await prisma.calendarSyncSettings.findUnique({
    where: { userId },
  });
  if (!syncSettings?.googleAccessToken) {
    throw new Error('Google Calendar not connected');
  }

  // 3. Initialize Google Calendar API client
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: syncSettings.googleAccessToken,
    refresh_token: syncSettings.googleRefreshToken,
  });
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // 4. Create event in Google Calendar
  const googleEvent = {
    summary: event.title,
    description: event.description,
    start: {
      dateTime: event.startTime.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: event.endTime.toISOString(),
      timeZone: 'UTC',
    },
    colorId: getColorId(event.type),
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: googleEvent,
  });

  // 5. Update TMS event with Google Calendar IDs
  await prisma.event.update({
    where: { id: eventId },
    data: {
      googleCalendarEventId: response.data.id,
      syncedAt: new Date(),
    },
  });

  return response.data;
}

// Sync from Google Calendar to TMS
export async function syncFromGoogle(userId: string) {
  // 1. Get sync settings
  const syncSettings = await prisma.calendarSyncSettings.findUnique({
    where: { userId },
  });
  if (!syncSettings?.isEnabled) return;

  // 2. Initialize Google Calendar API
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: syncSettings.googleAccessToken,
    refresh_token: syncSettings.googleRefreshToken,
  });
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // 3. Fetch events from Google Calendar
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 250,
    singleEvents: true,
    orderBy: 'startTime',
  });

  // 4. Process and create events in TMS
  const events = response.data.items || [];
  for (const googleEvent of events) {
    // Check if event already exists
    const existingEvent = await prisma.event.findFirst({
      where: { googleCalendarEventId: googleEvent.id },
    });

    if (!existingEvent) {
      // Create new event in TMS
      await prisma.event.create({
        data: {
          title: googleEvent.summary || 'Untitled Event',
          description: googleEvent.description,
          startTime: new Date(googleEvent.start?.dateTime || googleEvent.start?.date!),
          endTime: new Date(googleEvent.end?.dateTime || googleEvent.end?.date!),
          type: 'PERSONAL',
          creatorId: userId,
          googleCalendarEventId: googleEvent.id,
          syncedAt: new Date(),
        },
      });
    } else {
      // Update existing event
      await prisma.event.update({
        where: { id: existingEvent.id },
        data: {
          title: googleEvent.summary || existingEvent.title,
          description: googleEvent.description,
          startTime: new Date(googleEvent.start?.dateTime || googleEvent.start?.date!),
          endTime: new Date(googleEvent.end?.dateTime || googleEvent.end?.date!),
          syncedAt: new Date(),
        },
      });
    }
  }

  // 5. Update last synced timestamp
  await prisma.calendarSyncSettings.update({
    where: { userId },
    data: { lastSyncedAt: new Date() },
  });
}
```

**Webhook Setup** (for real-time sync):
```typescript
export async function setupGoogleWebhook(userId: string) {
  const syncSettings = await prisma.calendarSyncSettings.findUnique({
    where: { userId },
  });

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: syncSettings.googleAccessToken,
    refresh_token: syncSettings.googleRefreshToken,
  });
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.events.watch({
    calendarId: 'primary',
    requestBody: {
      id: uuidv4(), // Unique channel ID
      type: 'web_hook',
      address: `${process.env.NEXTAUTH_URL}/api/calendar/webhook`,
    },
  });

  // Store webhook details
  await prisma.calendarSyncSettings.update({
    where: { userId },
    data: {
      webhookChannelId: response.data.id,
      webhookResourceId: response.data.resourceId,
      webhookExpiration: new Date(response.data.expiration!),
    },
  });
}
```

---

### 9.2 Server-to-Server API Authentication

**JWT Token Generation**:
```typescript
// File: src/app/api/v1/auth/token/route.ts
import { sign } from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { clientId, clientSecret } = body;

  // Verify credentials (stored in environment variables)
  if (
    clientId !== process.env.API_CLIENT_ID ||
    clientSecret !== process.env.API_CLIENT_SECRET
  ) {
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }

  // Generate JWT token
  const token = sign(
    {
      clientId,
      type: 'server-to-server',
    },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  return NextResponse.json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 3600,
  });
}
```

**API Endpoint Protection**:
```typescript
// Middleware for v1 API routes
export async function authenticateServerRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  try {
    const decoded = verify(token, process.env.JWT_SECRET!);
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
```

---

## 10. User Interface Specifications

### 10.1 Design System

**Color Palette**:
```typescript
// Tailwind config colors
colors: {
  primary: {
    50: '#eff6ff',
    500: '#3b82f6',
    700: '#1d4ed8',
  },
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
}
```

**Typography**:
- Font Family: Inter (system font fallback)
- Headings: 24px, 20px, 18px, 16px
- Body: 14px
- Small: 12px

**Spacing**:
- Based on 4px grid system
- Common spacing: 4px, 8px, 12px, 16px, 24px, 32px, 48px

**Components** (ShadCN/UI):
- Button
- Input
- Textarea
- Select
- Checkbox
- Radio
- Dialog (Modal)
- Dropdown Menu
- Tooltip
- Badge
- Avatar
- Card
- Table
- Tabs
- Progress
- Calendar
- Date Picker

---

### 10.2 Responsive Design

**Breakpoints**:
```typescript
// Tailwind breakpoints
sm: '640px'   // Mobile landscape
md: '768px'   // Tablet
lg: '1024px'  // Desktop
xl: '1280px'  // Large desktop
2xl: '1536px' // Extra large desktop
```

**Mobile-First Approach**:
- Default styles for mobile
- Progressive enhancement for larger screens
- Touch-friendly controls (min 44px tap targets)
- Hamburger menu on mobile, sidebar on desktop

---

### 10.3 Accessibility

**WCAG 2.1 Level AA Compliance**:
- Color contrast ratio minimum 4.5:1
- Keyboard navigation support
- Screen reader compatibility
- ARIA labels and roles
- Focus indicators
- Skip navigation links
- Alt text for images
- Form label associations

---

## 11. Testing Requirements

### 11.1 Unit Testing

**Framework**: Jest + React Testing Library

**Coverage Targets**:
- Utility functions: 90%
- API routes: 80%
- React components: 70%

**Example Test**:
```typescript
// Task creation test
describe('POST /api/tasks', () => {
  it('should create a task successfully', async () => {
    const mockSession = {
      user: { id: 'user123', role: 'LEADER' }
    };

    const taskData = {
      title: 'Test Task',
      description: 'Test description',
      priority: 'HIGH',
      assigneeId: 'user456',
    };

    const response = await POST(
      new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      })
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.task.title).toBe('Test Task');
  });

  it('should return 401 if not authenticated', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(401);
  });
});
```

---

### 11.2 Integration Testing

**Scope**:
- API endpoint workflows
- Database operations
- Authentication flows
- Google Calendar integration
- OSSB request workflow

**Example Test Scenario**:
```
Scenario: Complete OSSB request workflow
1. User creates OSSB request (DRAFT status)
2. User fills all required fields
3. User submits request (SUBMITTED status)
4. Admin endorses request (ENDORSED status)
5. Approver recommends request (RECOMMENDED status)
6. Final approver approves request (APPROVED status)
7. Calendar events created for program steps
8. Events synced to Google Calendar
9. Notifications sent to all parties
```

---

### 11.3 End-to-End Testing

**Framework**: Playwright or Cypress

**Critical User Journeys**:
1. User registration and login
2. Create team and assign members
3. Create task and assign to team member
4. Update task status and add comments
5. Create calendar event
6. Connect Google Calendar and sync
7. Submit OSSB request and approve workflow
8. Admin manage users and teams

---

### 11.4 Performance Testing

**Tools**: k6, Artillery, or Lighthouse

**Scenarios**:
- Load test: 500 concurrent users
- Stress test: Gradual increase to 1000 users
- Spike test: Sudden traffic burst
- Endurance test: Sustained load for 2 hours

**Metrics**:
- Response time (p50, p95, p99)
- Error rate (< 0.1%)
- Throughput (requests/sec)
- Resource utilization (CPU, memory, DB connections)

---

## 12. Deployment Requirements

### 12.1 Environment Configuration

**Development**:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/gcgc_dev"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-key"
NODE_ENV="development"
```

**Staging**:
```env
DATABASE_URL="postgresql://user:pass@staging-db:5432/gcgc_staging"
NEXTAUTH_URL="https://staging.gcgc.com"
NEXTAUTH_SECRET="staging-secret-key"
NODE_ENV="production"
```

**Production**:
```env
DATABASE_URL="postgresql://user:pass@prod-db:5432/gcgc_prod"
NEXTAUTH_URL="https://app.gcgc.com"
NEXTAUTH_SECRET="production-secret-key"
NODE_ENV="production"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

---

### 12.2 Deployment Process

**Build Process**:
```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npm run db:generate

# 3. Run database migrations
npm run db:migrate

# 4. Build Next.js application
npm run build

# 5. Start production server
npm run start
```

**Railway Deployment**:
```bash
# Automatic deployment via GitHub integration
# Triggered on push to main branch

# Environment variables set in Railway dashboard
# Database provisioned as Railway PostgreSQL plugin
# Automatic SSL certificate
```

---

### 12.3 Monitoring and Logging

**Application Logs**:
- Error logs: All errors logged with stack traces
- Access logs: API request/response logging
- Activity logs: User actions tracked in database

**Monitoring Metrics**:
- Application uptime
- Response times
- Error rates
- Database performance
- API usage

**Tools** (recommended):
- Sentry for error tracking
- Vercel Analytics for performance monitoring
- Database slow query logs
- Custom dashboard for business metrics

---

## 13. Traceability Matrix

### 13.1 Business Requirements to Functional Requirements

| Business Req | Functional Req | Status |
|--------------|----------------|--------|
| BR-UM-001 | FR-UM-001 | ✅ Implemented |
| BR-UM-002 | FR-UM-002, FR-UM-004 | ✅ Implemented |
| BR-TM-001 | FR-TM-001 | ✅ Implemented |
| BR-TM-002 | FR-TM-002 | ✅ Implemented |
| BR-TK-001 | FR-TK-001 | ✅ Implemented |
| BR-TK-002 | FR-TK-001 | ✅ Implemented |
| BR-TK-006 | FR-TK-003 | ✅ Implemented |
| BR-CAL-001 | FR-CAL-001 | ✅ Implemented |
| BR-CAL-002 | FR-CAL-002 | ✅ Implemented |
| BR-OSSB-001 to BR-OSSB-011 | FR-OSSB-001, FR-OSSB-002 | ✅ Implemented |
| BR-DASH-001 | FR-DASH-001 | ✅ Implemented |
| BR-DASH-002 | FR-DASH-002 | ✅ Implemented |

---

### 13.2 Functional Requirements to Test Cases

| Functional Req | Test Cases | Status |
|----------------|------------|--------|
| FR-UM-001 | TC-UM-001 to TC-UM-005 | ⏳ Pending |
| FR-UM-002 | TC-UM-006 to TC-UM-010 | ⏳ Pending |
| FR-TM-001 | TC-TM-001 to TC-TM-005 | ⏳ Pending |
| FR-TK-001 | TC-TK-001 to TC-TK-010 | ⏳ Pending |
| FR-CAL-002 | TC-CAL-001 to TC-CAL-015 | ⏳ Pending |
| FR-OSSB-001 | TC-OSSB-001 to TC-OSSB-020 | ⏳ Pending |

---

## Appendices

### Appendix A: Database Entity-Relationship Diagram

```
[User] ──────────────────────┐
  │                           │
  │ 1:N                       │ 1:N
  │                           │
  ├───[TeamMember]            ├───[Task (creator)]
  │       │                   │
  │       │ N:1               │ 1:N
  │       │                   │
  │   [Team]──────────────────┤
  │       │                   │
  │       │ 1:N               ├───[Task (assignee)]
  │       │                   │
  │   [Event]                 │ 1:N
  │                           │
  │                       [Comment]
  │                           │
  │                           │ 1:N
  │                           │
  │                   [CommentReaction]
  │
  ├───[OSSBRequest]
  │       │
  │       │ 1:N
  │       │
  │   [OSSBProgramStep]
  │       │
  │   [OSSBAttachment]
```

---

### Appendix B: API Endpoint Reference

**Complete API Endpoint List** (100+ endpoints):

See Section 5.2 for detailed endpoint specifications.

---

### Appendix C: Glossary

- **OSSB**: Objective/Specific Steps Budget - A budgeting and planning document
- **M/I/P**: Maintenance/Improvement/Project classification
- **KRA**: Key Result Area
- **CPA**: Critical Performance Area
- **TMS**: Team Management System
- **RBAC**: Role-Based Access Control
- **JWT**: JSON Web Token
- **OAuth**: Open Authorization
- **CRUD**: Create, Read, Update, Delete
- **ORM**: Object-Relational Mapping
- **ISR**: Incremental Static Regeneration
- **SSR**: Server-Side Rendering
- **CSR**: Client-Side Rendering

---

### Appendix D: Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-10 | Technical Team | Initial BRS creation |

---

**End of Business Requirements Specification**
