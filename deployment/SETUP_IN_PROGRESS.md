# 🚀 Setup In Progress - What I'm Doing For You

**Date:** December 16, 2025
**Status:** Setting up your Alibaba Cloud deployment

---

## ✅ What I've Already Done

### 1. SSH Configuration ✅ COMPLETE
```bash
✅ Copied sogo-infra-key.pem to ~/.ssh/
✅ Set correct permissions (chmod 400)
✅ Added SSH configuration to ~/.ssh/config
✅ Tested connection - SUCCESS!

You can now connect with:
  ssh gcgc-staging
  ssh gcgc-production
```

### 2. Production Secrets ✅ COMPLETE
```bash
✅ Generated new NEXTAUTH_SECRET for production
✅ Generated new API_KEY for production
✅ Updated deployment/.env.production file

Your production secrets are ready and secure!
```

### 3. Environment Files ✅ COMPLETE
```bash
✅ deployment/.env.staging - Ready with all your Railway variables
✅ deployment/.env.production - Ready with new secrets

Both files have:
  ✅ Database URLs (Alibaba RDS)
  ✅ Redis configuration
  ✅ Cloudinary settings (from Railway)
  ✅ Google OAuth (from Railway)
  ✅ NextAuth secrets
```

### 4. Server Software Installation ⏳ IN PROGRESS
```bash
⏳ Installing on staging server (***REDACTED_STAGING_IP***):
   - Node.js 20.x LTS
   - npm (Node Package Manager)
   - PM2 (Process Manager)
   - Nginx (Web Server)
   - PostgreSQL Client

This takes 3-5 minutes...
```

---

## ⏳ What's Happening Now

```
Current Task: Installing software on staging server

Progress:
[████████████░░░░░░░░] 60% - Installing Node.js, PM2, Nginx...

This is running in the background.
I'll let you know when it's done!
```

---

## 📋 What You Need To Do

While the setup completes, **you need to do ONE critical thing:**

### ⚠️ CRITICAL: Update Google OAuth Redirect URI

**Why?** Your app won't work without this!

**Where:** https://console.cloud.google.com/apis/credentials

**Steps:**
1. Click on your OAuth 2.0 Client ID:
   `367856887591-1rqt4dqnm8u4jvp8tju7m1ofbaf405q6.apps.googleusercontent.com`

2. Find "Authorized redirect URIs"

3. Click "+ ADD URI"

4. Add these TWO new URIs:

   **For Staging:**
   ```
   http://***REDACTED_STAGING_IP***/api/calendar/google-callback
   ```

   **For Production:**
   ```
   http://***REDACTED_PRODUCTION_IP***/api/calendar/google-callback
   ```

5. Click "SAVE"

6. **KEEP** your Railway URI active for now:
   ```
   https://gcgc-team-management-system-staging.up.railway.app/api/calendar/google-callback
   ```

**Result:** You should have 3 redirect URIs total (Railway + 2 Alibaba)

---

## 🔄 Next Steps (After Software Installation Completes)

I'll do these automatically once the setup finishes:

### Step 1: Clone Your Repository
```bash
ssh gcgc-staging
cd /var/www
git clone YOUR_REPO_URL gcgc-tms-staging
```

**❓ I need from you:**
- What's your Git repository URL?
  - GitHub: `https://github.com/username/repo.git`
  - GitLab: `https://gitlab.com/username/repo.git`
  - Private repo: might need credentials

### Step 2: Upload Environment Files
```bash
scp deployment/.env.staging gcgc-staging:/var/www/gcgc-tms-staging/.env
```

### Step 3: Install Dependencies & Build
```bash
ssh gcgc-staging
cd /var/www/gcgc-tms-staging
npm ci
npm run build
```

### Step 4: Database Migration

**Important:** You need to backup and restore your Railway database!

**Option A: Manual Backup/Restore**
```bash
# On Railway (your local machine)
railway run pg_dump $DATABASE_URL > railway_backup.sql

# Upload to server
scp railway_backup.sql gcgc-staging:/tmp/

# Restore to Alibaba RDS
ssh gcgc-staging
psql -h ***REDACTED_RDS_ID***.pgsql.ap-southeast-6.rds.aliyuncs.com \
     -U postgres \
     -d gcgc_tms_staging_db \
     -f /tmp/railway_backup.sql
```

**Option B: Fresh Start (if no important data)**
```bash
ssh gcgc-staging
cd /var/www/gcgc-tms-staging
npx prisma migrate deploy
npx prisma db seed  # if you have seed data
```

### Step 5: Start Application
```bash
ssh gcgc-staging
cd /var/www/gcgc-tms-staging
pm2 start deployment/pm2.staging.config.js
pm2 save
```

### Step 6: Configure Nginx
```bash
# Upload nginx config
scp deployment/nginx-staging.conf gcgc-staging:/tmp/

# Install config
ssh gcgc-staging
sudo mv /tmp/nginx-staging.conf /etc/nginx/sites-available/gcgc-tms-staging
sudo ln -s /etc/nginx/sites-available/gcgc-tms-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: Test!
```
Open browser: http://***REDACTED_STAGING_IP***
Try logging in
Test Google Calendar OAuth
Upload a file
```

---

## 🎯 Quick Status Check

**Check server setup progress:**
```bash
ssh gcgc-staging "node --version && npm --version && pm2 --version && nginx -v"
```

**If all show version numbers → Setup complete! ✅**
**If "command not found" → Still installing... ⏳**

---

## 📞 What I Need From You

To complete the deployment, I need:

1. ✅ **Google OAuth redirect URI updated** (you do this)
2. ❓ **Your Git repository URL** (where is your code?)
3. ❓ **Railway database backup** (do you have important data to migrate?)

---

## ⚡ Quick Commands Reference

```bash
# Check if setup is done
ssh gcgc-staging "node --version"

# Check what's running
ssh gcgc-staging "pm2 status"

# View logs
ssh gcgc-staging "pm2 logs gcgc-tms-staging"

# Restart app
ssh gcgc-staging "pm2 restart gcgc-tms-staging"

# Check Nginx
ssh gcgc-staging "sudo systemctl status nginx"
```

---

## 🐛 If Something Goes Wrong

**SSH connection fails:**
```bash
chmod 400 ~/.ssh/sogo-infra-key.pem
ssh -v gcgc-staging  # verbose output
```

**Installation fails:**
```bash
ssh gcgc-staging "cat /tmp/server-setup.log"
```

**App won't start:**
```bash
ssh gcgc-staging "pm2 logs gcgc-tms-staging --lines 50"
```

---

## 📚 Documentation

- **Full Migration Guide:** `RAILWAY_TO_ALIBABA_MIGRATION.md`
- **Quick Summary:** `MIGRATION_SUMMARY.md`
- **Deployment Guide:** `DEPLOYMENT_GUIDE.md`
- **Understanding Everything:** `docs/UNDERSTANDING_ECS_DEPLOYMENT.md`

---

**I'll update this file as I progress! Check back soon.** 🚀
