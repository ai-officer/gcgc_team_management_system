# GCGC TMS Chat Link Fix - Deployment Instructions

## Issue
The TMS Chat link in GCGC sidebar is redirecting to Railway instead of the deployed Alibaba Cloud URL.

## What Was Fixed
✅ Updated `src/components/layout/sidebar.tsx` fallback URL
✅ Changed from: `https://tms-client-staging.up.railway.app`
✅ Changed to: `https://tms-chat-staging.hotelsogo-ai.com`
✅ Pushed changes to `staging` branch (commit c35b4ba)

## What You Need To Do

### Step 1: Set Environment Variables

The TMS Chat URL is controlled by `NEXT_PUBLIC_TMS_CHAT_URL` environment variable.

**For Staging GCGC:**
```bash
NEXT_PUBLIC_TMS_CHAT_URL="https://tms-chat-staging.hotelsogo-ai.com"
```

**For Production GCGC:**
```bash
NEXT_PUBLIC_TMS_CHAT_URL="https://tms-chat.hotelsogo-ai.com"
```

### Step 2: Redeploy GCGC

#### If GCGC is on Railway:

**Staging:**
1. Go to Railway dashboard for GCGC staging project
2. Go to Variables tab
3. Add/update: `NEXT_PUBLIC_TMS_CHAT_URL` = `https://tms-chat-staging.hotelsogo-ai.com`
4. Railway will automatically redeploy with the new environment variable

**Production:**
1. Merge staging to main/master branch (or cherry-pick commit c35b4ba)
2. Go to Railway dashboard for GCGC production project
3. Go to Variables tab
4. Add/update: `NEXT_PUBLIC_TMS_CHAT_URL` = `https://tms-chat.hotelsogo-ai.com`
5. Railway will automatically redeploy

#### If GCGC is on Alibaba Cloud:

**Staging:**
1. SSH into staging server where GCGC is deployed
2. Navigate to GCGC directory: `cd /path/to/gcgc_team_management_system`
3. Pull latest changes: `git pull origin staging`
4. Create/update `.env.production.local`:
   ```bash
   echo 'NEXT_PUBLIC_TMS_CHAT_URL="https://tms-chat-staging.hotelsogo-ai.com"' >> .env.production.local
   ```
5. Rebuild: `npm run build`
6. Restart service: `pm2 restart gcgc-staging` (or your service manager)

**Production:**
1. Merge staging to main: `git checkout main && git merge staging && git push`
2. SSH into production server
3. Navigate to GCGC directory
4. Pull latest changes: `git pull origin main`
5. Create/update `.env.production.local`:
   ```bash
   echo 'NEXT_PUBLIC_TMS_CHAT_URL="https://tms-chat.hotelsogo-ai.com"' >> .env.production.local
   ```
6. Rebuild: `npm run build`
7. Restart service: `pm2 restart gcgc-production`

### Step 3: Verify the Fix

After redeployment, test both environments:

**Staging Test:**
1. Open https://tms-staging.hotelsogo-ai.com
2. Login with your credentials
3. Hover over "TMS Chat" link in sidebar
   - Should show: `https://tms-chat-staging.hotelsogo-ai.com`
4. Click "TMS Chat"
   - Should redirect to: https://tms-chat-staging.hotelsogo-ai.com
   - Should NOT redirect to Railway

**Production Test:**
1. Open https://tms.hotelsogo-ai.com
2. Login
3. Hover over "TMS Chat" link
   - Should show: `https://tms-chat.hotelsogo-ai.com`
4. Click "TMS Chat"
   - Should redirect to: https://tms-chat.hotelsogo-ai.com
   - Should NOT redirect to Railway

---

## Technical Details

The fix updates the fallback URL in the sidebar component. The environment variable `NEXT_PUBLIC_TMS_CHAT_URL` takes precedence:

```tsx
// src/components/layout/sidebar.tsx
{
  title: 'TMS Chat',
  href: process.env.NEXT_PUBLIC_TMS_CHAT_URL || 'https://tms-chat-staging.hotelsogo-ai.com',
  icon: MessageSquare,
  external: true,
}
```

**Important:** Since `NEXT_PUBLIC_*` variables are embedded at build time in Next.js, a rebuild is required after setting/changing the environment variable.

## Troubleshooting

**Still redirects to Railway after deployment:**
- Verify environment variable is set correctly
- Check if build process actually ran (check build logs)
- Clear browser cache and hard refresh (Ctrl+Shift+R)
- Verify you're testing the correct environment (staging vs production)

**Environment variable not being picked up:**
- Make sure variable name is exactly `NEXT_PUBLIC_TMS_CHAT_URL`
- Verify the variable is in the deployment environment (not just local .env)
- Check build logs for "NEXT_PUBLIC_TMS_CHAT_URL" to confirm it was included

## Files Changed

- `src/components/layout/sidebar.tsx` - Updated fallback URLs (all 3 occurrences)
- `.env.staging` - Created with correct staging URL
- `.env.production` - Created with correct production URL
- This deployment guide

## Git Commit

```bash
commit c35b4ba
Author: ai-officer <aiofficer.gcgc@gmail.com>
Date: Tue Jan 6 00:33:13 2026 +0800

feat: update TMS Chat URLs to use proper domains
```
