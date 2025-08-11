# Admin Portal Guide

This guide covers the administrative interface for managing the GCGC Team Management System.

## 📋 Table of Contents
- [Overview](#overview)
- [Access Control](#access-control)
- [Dashboard](#dashboard)
- [User Management](#user-management)
- [Team Management](#team-management)
- [System Settings](#system-settings)
- [Reports & Analytics](#reports--analytics)
- [Activity Monitoring](#activity-monitoring)

## 🎯 Overview

The Admin Portal provides comprehensive system management capabilities for administrators to:
- Manage all users and teams across the system
- Monitor system activity and performance
- Configure global settings and permissions
- Generate reports and analytics
- Handle system maintenance tasks

**Access URL:** `/admin`

## 🔒 Access Control

### Role Requirements
- **ADMIN** role required for all admin portal features
- Session-based authentication with JWT tokens
- Automatic redirection for unauthorized access

### Permission Levels
```typescript
// Admin-only features
ADMIN_PERMISSIONS = [
  'user:create',
  'user:update', 
  'user:delete',
  'user:suspend',
  'team:create',
  'team:update',
  'team:delete',
  'system:settings',
  'system:reports',
  'system:monitor'
]
```

## 📊 Dashboard

### Overview Stats
**Location:** `/admin/dashboard`

The admin dashboard provides:

#### System Metrics
- Total active users
- Total teams
- Active tasks
- System performance indicators

#### Recent Activity Feed
- User registrations
- Team creations
- Task completions
- System events

#### Quick Actions
- Create new user
- Create new team
- System announcements
- Maintenance mode toggle

### Dashboard Components
```typescript
// Key dashboard widgets
interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalTeams: number;
  activeTasks: number;
  completedTasks: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}
```

## 👥 User Management

### User List View
**Location:** `/admin/users`

#### Features
- **Search & Filter**
  - By name, email, role
  - By status (active, inactive, suspended)
  - By team membership
  
- **Bulk Actions**
  - Bulk user activation/deactivation
  - Bulk role updates
  - Export user data

- **User Actions**
  - View user profile
  - Edit user details
  - Reset password
  - Suspend/reactivate account
  - Delete user (with confirmation)

### User Creation
**Location:** `/admin/users/create`

#### Form Fields
```typescript
interface CreateUserForm {
  name: string;
  email: string;
  role: 'ADMIN' | 'LEADER' | 'MEMBER';
  status: 'ACTIVE' | 'INACTIVE';
  sendWelcomeEmail: boolean;
  assignToTeams?: string[];
}
```

#### Validation Rules
- Unique email validation
- Strong password requirements
- Role assignment restrictions
- Team assignment validation

### User Profile Management
**Location:** `/admin/users/[id]`

#### Profile Overview
- Personal information
- Role and permissions
- Team memberships
- Activity history
- Task assignments

#### Administrative Actions
- **Role Management**
  - Promote to leader/admin
  - Demote to member
  - Role change audit log

- **Account Status**
  - Activate/deactivate
  - Suspend with reason
  - Account recovery

- **Data Management**
  - Export user data
  - Anonymize user data
  - Delete account (GDPR compliance)

## 🏢 Team Management

### Team List View
**Location:** `/admin/teams`

#### Features
- **Team Overview**
  - Team name and description
  - Member count
  - Active tasks
  - Team leader information

- **Team Actions**
  - View team details
  - Edit team settings
  - Manage team members
  - Archive/delete team

### Team Creation
**Location:** `/admin/teams/create`

#### Form Configuration
```typescript
interface CreateTeamForm {
  name: string;
  description?: string;
  avatar?: string;
  leaderId: string;
  initialMembers?: string[];
  settings: {
    allowMemberInvites: boolean;
    requireApprovalForTasks: boolean;
    enableTimeTracking: boolean;
  };
}
```

### Team Management Dashboard
**Location:** `/admin/teams/[id]`

#### Team Analytics
- Member activity metrics
- Task completion rates
- Team performance indicators
- Resource utilization

#### Member Management
- Add/remove members
- Change member roles
- Transfer team ownership
- Member activity monitoring

## ⚙️ System Settings

### General Settings
**Location:** `/admin/settings`

#### Application Configuration
```typescript
interface SystemSettings {
  appName: string;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  defaultUserRole: UserRole;
  maxTeamSize: number;
  taskRetentionDays: number;
  maintenanceMode: boolean;
}
```

#### Email Configuration
- SMTP settings
- Email templates
- Notification preferences
- Delivery monitoring

#### Security Settings
- Password policies
- Session timeout
- Two-factor authentication
- API rate limiting

### Feature Flags
**Location:** `/admin/settings/features`

Control system-wide features:
- Calendar integration
- File uploads
- Real-time notifications
- Advanced reporting
- Third-party integrations

## 📈 Reports & Analytics

### System Reports
**Location:** `/admin/reports`

#### Available Reports
- **User Activity Report**
  - Login patterns
  - Feature usage
  - Engagement metrics

- **Team Performance Report**
  - Task completion rates
  - Team collaboration metrics
  - Resource utilization

- **System Usage Report**
  - Storage usage
  - API usage
  - Performance metrics

#### Report Generation
```typescript
interface ReportConfig {
  type: 'user-activity' | 'team-performance' | 'system-usage';
  dateRange: {
    start: Date;
    end: Date;
  };
  filters: Record<string, any>;
  format: 'pdf' | 'csv' | 'excel';
}
```

### Analytics Dashboard
**Location:** `/admin/analytics`

#### Key Metrics
- User growth trends
- Task completion trends
- Team performance comparisons
- System health indicators

#### Interactive Charts
- Time-series data visualization
- Comparative analysis tools
- Drill-down capabilities
- Export functionality

## 🔍 Activity Monitoring

### Real-time Activity Feed
**Location:** `/admin/activity`

#### Monitored Events
- User actions (login, logout, profile updates)
- Team activities (creation, member changes, settings)
- Task activities (creation, updates, completion)
- System events (errors, maintenance, updates)

#### Activity Filters
```typescript
interface ActivityFilter {
  userId?: string;
  teamId?: string;
  activityType?: ActivityType;
  dateRange?: DateRange;
  severity?: 'info' | 'warning' | 'error';
}
```

### Audit Logs
**Location:** `/admin/audit`

#### Audit Trail Features
- Complete action history
- User attribution
- IP address logging
- Timestamp tracking
- Data change tracking

#### Compliance Features
- GDPR compliance tools
- Data retention policies
- Export capabilities
- Legal hold functionality

## 🛠️ Administrative Workflows

### User Onboarding
1. **Bulk User Creation**
   - CSV import functionality
   - Validation and error handling
   - Welcome email automation

2. **Team Setup**
   - Template-based team creation
   - Bulk member assignment
   - Initial task creation

### System Maintenance
1. **Database Management**
   - Backup scheduling
   - Data cleanup tasks
   - Performance optimization

2. **Security Monitoring**
   - Failed login attempts
   - Suspicious activity alerts
   - Security incident response

### Emergency Procedures
1. **User Account Issues**
   - Password reset procedures
   - Account recovery process
   - Security incident response

2. **System Issues**
   - Maintenance mode activation
   - Emergency communication
   - Incident documentation

## 🚨 Alerts & Notifications

### System Alerts
- High error rates
- Performance degradation
- Security incidents
- Resource limitations

### Administrative Notifications
- New user registrations
- Team creation requests
- System maintenance windows
- Compliance deadlines

## 🔧 API Access

### Admin API Endpoints
```typescript
// User management
GET    /api/admin/users
POST   /api/admin/users
PUT    /api/admin/users/[id]
DELETE /api/admin/users/[id]

// Team management  
GET    /api/admin/teams
POST   /api/admin/teams
PUT    /api/admin/teams/[id]
DELETE /api/admin/teams/[id]

// System settings
GET    /api/admin/settings
PUT    /api/admin/settings

// Reports
GET    /api/admin/reports/[type]
POST   /api/admin/reports/generate
```

### Rate Limiting
- Admin actions: 100 requests per minute
- Report generation: 10 requests per hour
- Bulk operations: 5 requests per minute

## 📱 Mobile Responsiveness

The admin portal is fully responsive and optimized for:
- Desktop (primary interface)
- Tablet (dashboard monitoring)
- Mobile (emergency access)