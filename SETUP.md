# Setup Instructions

## Prerequisites

1. **Node.js**: Version 18.0.0 or later
2. **PostgreSQL**: Version 14 or later
3. **npm**: Package manager (comes with Node.js)

## Step-by-Step Setup

### 1. Database Setup

First, set up PostgreSQL and create a database:

```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE gcgc_team_management;
CREATE USER gcgc_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE gcgc_team_management TO gcgc_user;
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database - Replace with your actual database credentials
DATABASE_URL="postgresql://gcgc_user:your_password@localhost:5432/gcgc_team_management?schema=public"

# NextAuth.js - Generate a secret key
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Optional: Google OAuth (if you want Google login)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# App Configuration
APP_NAME="GCGC Team Management System"
APP_URL="http://localhost:3000"
```

**To generate a secure NEXTAUTH_SECRET:**

```bash
# Using openssl
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Database Migration and Setup

```bash
# Generate Prisma client
npm run db:generate

# Push the schema to your database (for development)
npm run db:push

# Seed the database with initial data
npm run db:seed
```

**Alternative (for production):**

```bash
# Create and run migrations (recommended for production)
npm run db:migrate
npm run db:seed
```

### 5. Verify Setup

Start the development server:

```bash
npm run dev
```

The application should be available at [http://localhost:3000](http://localhost:3000).

## Initial Login

After seeding, you can login with these accounts:

**Admin Account:**
- Email: `admin@gcgc.com`
- Password: `***REDACTED_DEFAULT_PWD***`

**Leader Account:**
- Email: `leader1@gcgc.com`
- Password: `***REDACTED_DEFAULT_PWD***`

**Member Account:**
- Email: `member1@gcgc.com`
- Password: `***REDACTED_DEFAULT_PWD***`

## Troubleshooting

### Common Issues

1. **Database Connection Error:**
   - Verify PostgreSQL is running
   - Check DATABASE_URL format
   - Ensure database and user exist

2. **Prisma Schema Issues:**
   ```bash
   # Reset database (WARNING: This will delete all data)
   npx prisma migrate reset
   ```

3. **Missing Environment Variables:**
   - Ensure all required variables are set in `.env.local`
   - Restart the development server after changes

4. **Port Already in Use:**
   ```bash
   # Run on different port
   npm run dev -- -p 3001
   ```

### Database Commands Reference

```bash
# View database in Prisma Studio
npm run db:studio

# Generate Prisma client after schema changes
npm run db:generate

# Create new migration
npx prisma migrate dev --name your-migration-name

# Reset database (development only)
npx prisma migrate reset

# Deploy migrations (production)
npx prisma migrate deploy
```

## Production Deployment

### Environment Variables for Production

```env
NODE_ENV="production"
DATABASE_URL="your-production-database-url"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-production-secret"
```

### Build and Deploy

```bash
# Build the application
npm run build

# Start production server
npm run start
```

## Next Steps

1. **Customize the Application:**
   - Update branding in `/src/constants/index.ts`
   - Modify the color scheme in `tailwind.config.ts`
   - Add your logo to `/public/`

2. **Configure OAuth Providers:**
   - Set up Google OAuth in Google Cloud Console
   - Add other providers in `/src/lib/auth.ts`

3. **Set Up Email (Optional):**
   - Configure SMTP settings for password reset emails
   - Add email templates

4. **Security Considerations:**
   - Use strong, unique passwords
   - Enable SSL/TLS in production
   - Regularly update dependencies
   - Implement proper backup strategies

5. **Monitoring and Logging:**
   - Set up error tracking (e.g., Sentry)
   - Implement application logging
   - Monitor database performance

## Support

If you encounter issues during setup:

1. Check the troubleshooting section above
2. Verify all prerequisites are met
3. Ensure environment variables are correctly configured
4. Check the application logs for specific error messages

For additional help, refer to the main README.md file or create an issue in the repository.