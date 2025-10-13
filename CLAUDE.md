# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server
npm run dev              # Start development server on port 3000

# Build and deployment
npm run build            # Build for production
npm run start            # Start production server
npm run type-check       # TypeScript type checking without emitting files

# Code quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting

# Database operations
npm run db:generate      # Generate Prisma client after schema changes
npm run db:push          # Push schema changes to database (development)
npm run db:migrate       # Create and run migrations (production)
npm run db:studio        # Open Prisma Studio for database management
npm run db:seed          # Seed database with sample data

# Utility scripts
npm run create-admin     # Create admin user (scripts/create-admin-user.ts)
npm run migrate-from-railway    # Migration script
npm run verify-migration        # Verify migration script
```

## Architecture Overview

This is a **Next.js 14 App Router** team management system with dual portal architecture:

### Core Architecture
- **Framework**: Next.js 14 with App Router (not Pages Router)
- **Language**: TypeScript with strict mode enabled
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with role-based access control
- **Styling**: TailwindCSS with Radix UI components (ShadCN/UI)

### Portal Structure
- **Admin Portal** (`/admin/*`): Full system management, user administration, global task oversight
- **User Portal** (`/user/*`): Team-specific task management, personal dashboard

### Key Directories
```
src/
├── app/                     # Next.js App Router pages
│   ├── admin/              # Admin portal routes
│   ├── user/               # User portal routes  
│   ├── auth/               # Authentication pages
│   └── api/                # API routes
├── components/             # React components
│   ├── ui/                 # Base UI components (ShadCN)
│   ├── forms/              # Form components
│   ├── dashboard/          # Dashboard components
│   └── shared/             # Shared components
├── lib/                    # Core utilities
│   ├── auth.ts             # NextAuth configuration
│   ├── permissions.ts      # Role-based access control
│   ├── prisma.ts           # Prisma client
│   └── validations/        # Zod validation schemas
├── types/                  # TypeScript type definitions
├── hooks/                  # Custom React hooks
└── middleware.ts           # Route protection middleware
```

### Role-Based Permission System
Three user roles with granular permissions:
- **Admin**: Full system access, user management, global oversight
- **Leader**: Team management, task assignment within teams
- **Member**: Basic access, task updates, team participation

Permission checks are centralized in `src/lib/permissions.ts` with resource-action-scope model.

### Database Schema (Prisma)
Core entities: Users, Teams, TeamMembers, Tasks, Events, Comments, Activities
- User roles and team hierarchies
- Task assignment and status tracking
- Calendar integration with events
- Activity logging for audit trails

### State Management
- **Server State**: TanStack Query (React Query) for API data fetching
- **Client State**: React hooks and context providers
- **Form State**: React Hook Form with Zod validation

### Path Aliases (tsconfig.json)
```typescript
"@/*": ["./src/*"]
"@/components/*": ["./src/components/*"]
"@/lib/*": ["./src/lib/*"]
"@/types/*": ["./src/types/*"]
"@/hooks/*": ["./src/hooks/*"]
```

## Important Notes

### Development Workflow
1. **Database First**: Always run `npm run db:generate` after schema changes
2. **Type Safety**: Run `npm run type-check` before commits
3. **Code Quality**: ESLint configured with strict rules, run `npm run lint`
4. **Environment**: Copy `.env.example` to `.env.local` for local development

### Key Configuration Files
- `next.config.js`: TypeScript build errors ignored, Prisma external packages configured
- `.eslintrc.json`: Strict TypeScript rules, no unused variables
- `prisma/schema.prisma`: Database schema with comprehensive relationships
- `src/middleware.ts`: Route protection and authentication

### Common Patterns
- Use Server Components by default, Client Components when needed
- Form validation with Zod schemas in `src/lib/validations/`
- API routes follow REST conventions in `src/app/api/`
- Components use TypeScript interfaces from `src/types/`
- Database operations use Prisma client from `src/lib/prisma.ts`

### Deployment Considerations
- Railway deployment script configured in package.json
- Database migrations should use `npm run db:migrate` in production
- Environment variables required: DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET