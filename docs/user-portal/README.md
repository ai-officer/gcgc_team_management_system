# User Portal Guide

This guide covers the user interface for team members and leaders in the GCGC Team Management System.

## 📋 Table of Contents
- [Overview](#overview)
- [Access Levels](#access-levels)
- [Dashboard](#dashboard)
- [Team Management](#team-management)
- [Task Management](#task-management)
- [Calendar & Events](#calendar--events)
- [Profile Management](#profile-management)
- [Notifications](#notifications)

## 🎯 Overview

The User Portal provides role-based access for team members and leaders to:
- Manage personal and team tasks
- Collaborate on projects
- Track progress and deadlines
- Communicate with team members
- View team calendar and events

**Access URL:** `/user`

## 🔐 Access Levels

### Member Access (MEMBER)
- View assigned tasks
- Update task status
- Comment on tasks
- View team calendar
- Manage personal profile

### Leader Access (LEADER)
All member permissions plus:
- Create and assign tasks
- Manage team members
- Create team events
- View team analytics
- Approve task completions

### Permission Matrix
```typescript
interface UserPermissions {
  // Task permissions
  'task:view': boolean;      // View tasks
  'task:create': boolean;    // Create new tasks (Leaders only)
  'task:assign': boolean;    // Assign tasks (Leaders only)
  'task:update': boolean;    // Update assigned tasks
  'task:comment': boolean;   // Comment on tasks
  
  // Team permissions
  'team:view': boolean;      // View team info
  'team:invite': boolean;    // Invite members (Leaders only)
  'team:manage': boolean;    // Manage team settings (Leaders only)
  
  // Calendar permissions
  'calendar:view': boolean;  // View team calendar
  'calendar:create': boolean; // Create events (Leaders only)
}
```

## 📊 Dashboard

### User Dashboard
**Location:** `/user/dashboard`

#### Overview Widgets
- **My Tasks Summary**
  - Assigned tasks count
  - Pending tasks
  - Overdue tasks
  - Completed this week

- **Team Activity**
  - Recent team activities
  - Upcoming deadlines
  - Team announcements
  - New task assignments

- **Calendar Preview**
  - Today's events
  - Upcoming meetings
  - Task deadlines
  - Team milestones

#### Quick Actions
```typescript
interface QuickActions {
  member: [
    'Create Personal Task',
    'View My Calendar', 
    'Update Profile',
    'View Notifications'
  ];
  leader: [
    'Create Team Task',
    'Assign Task',
    'Schedule Meeting',
    'Team Analytics',
    'Manage Members'
  ];
}
```

### Personalized Experience
- Role-based widget visibility
- Customizable dashboard layout
- Personal task filters
- Team-specific notifications

## 🏢 Team Management

### Team Overview
**Location:** `/user/teams`

#### Team List (Multi-team support)
- Teams user belongs to
- Role in each team
- Team activity status
- Quick team switching

#### Team Details
**Location:** `/user/teams/[id]`

##### For Members:
- Team information
- Member directory
- Team tasks overview
- Team calendar

##### For Leaders:
All member features plus:
- Team settings management
- Member role management
- Team analytics
- Invitation management

### Member Management (Leaders Only)
**Location:** `/user/teams/[id]/members`

#### Member Actions
```typescript
interface MemberActions {
  view: 'View member profile';
  promote: 'Promote to leader';
  demote: 'Demote to member'; 
  remove: 'Remove from team';
  invite: 'Invite new member';
}
```

#### Invitation System
- Email-based invitations
- Invitation link generation
- Invitation status tracking
- Bulk invitation support

### Team Settings (Leaders Only)
**Location:** `/user/teams/[id]/settings`

#### Configurable Settings
```typescript
interface TeamSettings {
  general: {
    name: string;
    description: string;
    avatar: string;
  };
  permissions: {
    allowMemberTaskCreation: boolean;
    requireTaskApproval: boolean;
    allowMemberInvites: boolean;
  };
  notifications: {
    taskAssignment: boolean;
    taskCompletion: boolean;
    teamAnnouncements: boolean;
  };
}
```

## ✅ Task Management

### My Tasks
**Location:** `/user/tasks`

#### Task Views
- **All Tasks** - Complete task list
- **Assigned to Me** - Tasks assigned by leaders
- **Created by Me** - Tasks I created
- **Overdue** - Past due tasks
- **Completed** - Finished tasks

#### Task Filtering & Sorting
```typescript
interface TaskFilters {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  team: string;
  assignee: string;
  dateRange: DateRange;
  tags: string[];
}

interface TaskSorting {
  field: 'dueDate' | 'priority' | 'createdAt' | 'title';
  direction: 'asc' | 'desc';
}
```

### Task Details
**Location:** `/user/tasks/[id]`

#### Task Information
- Title and description
- Status and priority
- Assignment details
- Due date and time tracking
- Attachments and links

#### Task Actions
##### For Assignees:
- Update task status
- Add comments
- Log time spent
- Upload attachments
- Request help

##### For Leaders:
All assignee actions plus:
- Edit task details
- Reassign task
- Change priority
- Set due date
- Archive task

### Task Creation (Leaders Only)
**Location:** `/user/tasks/create`

#### Task Form
```typescript
interface CreateTaskForm {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: Date;
  assigneeId?: string;
  teamId: string;
  tags?: string[];
  attachments?: File[];
  estimatedHours?: number;
}
```

#### Advanced Features
- Template-based task creation
- Recurring task setup
- Dependency management
- Bulk task creation
- Task automation rules

### Task Comments & Collaboration
- Real-time commenting system
- @mention functionality
- File attachments
- Comment threads
- Activity timeline

## 📅 Calendar & Events

### Team Calendar
**Location:** `/user/calendar`

#### Calendar Views
- Monthly view (default)
- Weekly view
- Daily view
- Agenda view
- Task deadline view

#### Event Types
```typescript
interface EventTypes {
  MEETING: 'Team meetings and calls';
  DEADLINE: 'Task and project deadlines';
  MILESTONE: 'Project milestones';
  PERSONAL: 'Personal events';
  HOLIDAY: 'Team holidays and breaks';
}
```

### Event Management (Leaders Only)
**Location:** `/user/calendar/create`

#### Event Creation
```typescript
interface CreateEventForm {
  title: string;
  description?: string;
  type: EventType;
  startDate: DateTime;
  endDate?: DateTime;
  allDay: boolean;
  location?: string;
  attendees?: string[];
  reminder?: ReminderSettings;
  recurring?: RecurringSettings;
}
```

#### Event Features
- Meeting link integration
- Attendee management
- Reminder notifications
- Recurring events
- Calendar sync (Google/Outlook)

### Calendar Integration
- Export to external calendars
- Import from external sources
- Sync with team calendars
- Automated deadline tracking

## 👤 Profile Management

### Personal Profile
**Location:** `/user/profile`

#### Profile Information
```typescript
interface UserProfile {
  personal: {
    name: string;
    email: string;
    avatar?: string;
    bio?: string;
    timezone: string;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: NotificationSettings;
    language: string;
    dateFormat: string;
  };
  security: {
    password: string;
    twoFactorAuth: boolean;
    sessions: ActiveSession[];
  };
}
```

#### Avatar Management
- Upload custom avatar
- Cloudinary integration
- Image cropping and resizing
- Avatar removal option

### Notification Preferences
**Location:** `/user/profile/notifications`

#### Notification Categories
```typescript
interface NotificationSettings {
  email: {
    taskAssignment: boolean;
    taskDueReminder: boolean;
    taskCompletion: boolean;
    teamInvitation: boolean;
    systemUpdates: boolean;
  };
  browser: {
    taskReminders: boolean;
    teamMessages: boolean;
    systemAlerts: boolean;
  };
  frequency: 'immediate' | 'daily' | 'weekly';
}
```

### Privacy Settings
- Data visibility controls
- Activity sharing preferences
- Profile visibility settings
- Data export/deletion requests

## 🔔 Notifications

### Notification Center
**Location:** `/user/notifications`

#### Notification Types
- Task assignments
- Task due reminders
- Task completions
- Team invitations
- Calendar reminders
- System announcements

#### Notification Features
```typescript
interface NotificationFeatures {
  realTime: 'Browser push notifications';
  email: 'Email digest and alerts';
  markAsRead: 'Mark individual/bulk as read';
  filter: 'Filter by type or team';
  search: 'Search notification history';
}
```

### Real-time Updates
- WebSocket connections
- Live task status updates
- Instant messaging
- Activity feed updates

## 📊 Personal Analytics

### Performance Dashboard
**Location:** `/user/analytics`

#### Personal Metrics (Members)
- Tasks completed this week/month
- Average completion time
- Productivity trends
- Goal progress

#### Team Metrics (Leaders)
All personal metrics plus:
- Team performance overview
- Member productivity comparison
- Task completion rates
- Team goal progress

### Time Tracking
- Manual time entry
- Automatic tracking
- Time reports
- Productivity insights

## 🔍 Search & Filters

### Global Search
**Location:** Search bar in navigation

#### Searchable Content
- Tasks (title, description, comments)
- Team members
- Calendar events
- Documents and files
- Activity history

#### Advanced Filters
```typescript
interface SearchFilters {
  contentType: 'tasks' | 'events' | 'members' | 'files';
  team: string[];
  dateRange: DateRange;
  assignee: string[];
  status: string[];
  tags: string[];
}
```

## 📱 Mobile Experience

### Mobile-Optimized Features
- Responsive design
- Touch-friendly interface
- Offline task viewing
- Push notifications
- Quick actions menu

### Mobile-Specific Functions
- Camera integration for attachments
- GPS location for events
- Voice notes
- Swipe gestures for task management

## 🔗 Integrations

### Available Integrations
- **Google Calendar** - Calendar sync
- **Slack** - Team notifications
- **Email** - Task and event notifications
- **File Storage** - Cloudinary for attachments
- **Time Tracking** - Built-in time tracking

### Webhook Support
- Task status changes
- Team membership changes
- Calendar event updates
- Custom automation triggers

## 🛠️ Troubleshooting

### Common Issues
1. **Task Not Updating**
   - Check network connection
   - Refresh the page
   - Clear browser cache

2. **Notifications Not Working**
   - Check browser permissions
   - Verify notification settings
   - Check email spam folder

3. **Calendar Sync Issues**
   - Re-authenticate calendar integration
   - Check timezone settings
   - Verify calendar permissions