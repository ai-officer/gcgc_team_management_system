# GCGC Team Management System

A comprehensive team management system built with Next.js, featuring dual portals for administrators and users, with task tracking, calendar integration, and role-based access control.

## 🚀 Features

- **Dual Portal Architecture**: Separate interfaces for Admin and User roles
- **Role-Based Access Control**: Admin, Leader, and Member roles with granular permissions
- **Task Management**: Create, assign, and track tasks with status and priority management
- **Calendar Integration**: Full Calendar support with event management
- **Team Management**: Create and manage teams with member roles
- **Real-time Updates**: Activity tracking and notifications
- **Responsive Design**: Mobile-first approach with TailwindCSS
- **Type Safety**: Full TypeScript integration
- **Database**: PostgreSQL with Prisma ORM

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Styling**: TailwindCSS
- **UI Components**: Radix UI (ShadCN/UI)
- **Calendar**: FullCalendar
- **State Management**: React Query (TanStack Query)

## 📋 Prerequisites

- Node.js 18.0.0 or later
- PostgreSQL 14 or later
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd gcgc_team_management_system

# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your configuration
```

Required environment variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/gcgc_team_management?schema=public"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Optional: OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# OR run migrations (for production)
npm run db:migrate

# Seed the database with sample data
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 👤 Default Login Credentials

After seeding the database, you can use these credentials:

**Admin Portal:**
- Email: `admin@gcgc.com`
- Password: `admin123`

**Leader Portal:**
- Email: `leader1@gcgc.com`
- Password: `leader123`

**Member Portal:**
- Email: `member1@gcgc.com`
- Password: `member123`

## 📁 Project Structure

```
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts               # Database seeding
├── public/                   # Static assets
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── admin/           # Admin portal pages
│   │   ├── user/            # User portal pages
│   │   ├── api/             # API routes
│   │   └── auth/            # Authentication pages
│   ├── components/          # Reusable components
│   │   ├── ui/              # Base UI components (ShadCN)
│   │   ├── forms/           # Form components
│   │   ├── layout/          # Layout components
│   │   ├── dashboard/       # Dashboard components
│   │   ├── calendar/        # Calendar components
│   │   └── shared/          # Shared components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility libraries
│   │   ├── auth.ts          # NextAuth configuration
│   │   ├── prisma.ts        # Prisma client
│   │   ├── permissions.ts   # Role-based permissions
│   │   └── validations/     # Zod schemas
│   ├── providers/           # React context providers
│   ├── types/               # TypeScript type definitions
│   ├── constants/           # Application constants
│   └── styles/              # Global styles
├── components.json          # ShadCN/UI configuration
├── next.config.js           # Next.js configuration
├── tailwind.config.ts       # TailwindCSS configuration
└── tsconfig.json           # TypeScript configuration
```

## 🔐 Authentication & Authorization

### User Roles

1. **Admin**: Full system access, can manage all users, teams, and tasks
2. **Leader**: Team management capabilities, can create and assign tasks within their teams
3. **Member**: Basic user access, can view and update assigned tasks

### Permission System

The application uses a granular permission system based on:
- **Resource**: What the user wants to access (task, team, user, etc.)
- **Action**: What they want to do (create, read, update, delete)
- **Scope**: The extent of access (own, team, all)

## 📊 Database Schema

### Core Entities

- **Users**: System users with roles and authentication data
- **Teams**: Groups of users working together
- **TeamMembers**: Junction table for user-team relationships
- **Tasks**: Work items with status, priority, and assignments
- **Events**: Calendar events with team and task associations
- **Comments**: Task discussions and updates
- **Activities**: System activity tracking

## 🔧 Development Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema changes (dev)
npm run db:migrate       # Create and run migrations
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database with sample data

# Type checking
npm run type-check       # TypeScript type checking

# Code formatting
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting
```

## 🚀 Deployment

### Environment Variables for Production

```env
DATABASE_URL="your-production-database-url"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-production-secret"
```

### Build and Deploy

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## 🔍 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - User registration
- `GET/POST /api/auth/[...nextauth]` - NextAuth.js handlers

### Core API Endpoints

- `GET/POST /api/tasks` - Task management
- `GET/PATCH/DELETE /api/tasks/[id]` - Individual task operations
- `GET/POST /api/teams` - Team management
- `GET/POST /api/events` - Event management
- `GET/POST /api/users` - User management (Admin only)

## 📱 Features by Portal

### Admin Portal (`/admin`)
- Dashboard with system overview
- User management (create, edit, deactivate)
- Team management (create, edit, assign members)
- Global task overview and management
- System calendar with all events
- Settings and configuration

### User Portal (`/user`)
- Personal dashboard with assigned tasks
- Task creation and management within teams
- Team calendar and events
- Profile management
- Activity tracking

## 🎨 UI Components

Built with Radix UI primitives and styled with TailwindCSS:
- Form components with validation
- Data tables with sorting and filtering
- Modal dialogs and confirmations
- Toast notifications
- Loading states and skeletons
- Responsive navigation

## 🔄 State Management

- **Server State**: React Query (TanStack Query) for API data
- **Client State**: React hooks and context
- **Form State**: React Hook Form with Zod validation

## 📅 Calendar Integration

- FullCalendar React integration
- Multiple view types (month, week, day)
- Event creation and editing
- Task deadline visualization
- Team event sharing

## 🧪 Testing

```bash
# Run tests (when implemented)
npm run test
npm run test:watch
npm run test:coverage
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🚧 Roadmap

- [ ] Real-time notifications with WebSocket
- [ ] File attachments for tasks
- [ ] Advanced reporting and analytics
- [ ] Mobile app development
- [ ] Integration with external calendar services
- [ ] Advanced team hierarchy management
- [ ] Automated task assignment rules
- [ ] Time tracking capabilities