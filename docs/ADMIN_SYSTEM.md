# Admin System Documentation

## Overview

The system now includes a separate admin authentication system that is completely independent from the regular user authentication system.

## Features

- **Separate Admin Model**: Admins are stored in a separate `admins` table with just username and password
- **Independent Authentication**: Admin authentication is separate from user authentication using NextAuth
- **Dedicated Admin Portal**: Access via `/administrator/login`
- **Protected Admin Routes**: All `/admin/*` routes require admin authentication
- **Admin API Protection**: Admin API routes require admin session

## Admin Model

```typescript
model Admin {
  id        String   @id @default(cuid())
  username  String   @unique
  password  String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Authentication Endpoints

- **Admin Login**: `/administrator/login`
- **Admin Auth API**: `/api/admin/auth/[...nextauth]`
- **User Login**: `/auth/signin` (unchanged)
- **User Auth API**: `/api/auth/[...nextauth]` (unchanged)

## Creating Admin Users

Use the provided script to create admin users:

```bash
npm run create-admin <username> <password>
```

Example:
```bash
npm run create-admin admin password123
```

## Usage

1. **Access Admin Portal**: Navigate to `/administrator/login`
2. **Login**: Use admin username and password
3. **Access Admin Dashboard**: After successful login, redirected to `/admin/dashboard`

## Security Features

- **Password Hashing**: Passwords are hashed using bcryptjs with 12 rounds
- **Session Management**: Admin sessions are separate from user sessions
- **Route Protection**: Middleware protects all admin routes
- **API Protection**: Admin API routes check for admin session
- **Active Status**: Admins can be deactivated without deletion

## Architecture

### Authentication Flow
1. Admin enters credentials at `/administrator/login`
2. Credentials are validated against `admins` table
3. If valid, admin session is created with `isAdmin: true` flag
4. Admin is redirected to `/admin/dashboard`
5. All subsequent admin route access is validated via middleware

### Middleware Protection
- `/admin/*` routes require `token.isAdmin === true`
- `/api/admin/*` routes (except auth) require admin session
- Regular user routes remain unchanged

### Session Structure
Admin sessions include:
```typescript
{
  user: {
    id: string
    name: string (username)
    email: string (username for compatibility)
    isAdmin: true
  }
}
```

## Configuration

Admin authentication is configured in `/src/lib/auth/admin-auth.ts` with:
- 8-hour session duration (more restrictive than user sessions)
- Credentials-only authentication (no OAuth)
- Custom redirect behavior to admin dashboard

## Database Schema Updates

The system adds:
- New `admins` table
- No changes to existing `users` table
- Maintains full backward compatibility

## Testing

Test admin user has been created:
- **Username**: `admin`
- **Password**: `password123`

Access the admin portal at: `/administrator/login`
