# Railway → Alibaba Cloud - Quick Summary

**TL;DR: What changed and what you need to do**

---

## ✅ What Changed (Automatically Updated)

These are already updated in your `.env.staging` and `.env.production` files:

| Variable | Changed From | Changed To |
|----------|--------------|------------|
| **DATABASE_URL** | Railway Postgres | Alibaba RDS PostgreSQL |
| **NEXTAUTH_URL** | `https://gcgc-team-management-system-staging.up.railway.app` | `http://***REDACTED_STAGING_IP***` (staging)<br>`http://***REDACTED_PRODUCTION_IP***` (production) |
| **APP_URL** | `https://gcgc-team-management-system-staging.up.railway.app` | `http://***REDACTED_STAGING_IP***` (staging)<br>`http://***REDACTED_PRODUCTION_IP***` (production) |
| **REDIS_*** | *(not used)* | **ADDED** - New Redis service |

---

## ✅ What Stayed the Same (No Changes Needed)

These work exactly as-is from Railway:

- ✅ **NEXTAUTH_SECRET** - Same secret = users stay logged in
- ✅ **API_KEY** - Your custom API key (unchanged)
- ✅ **GOOGLE_CLIENT_ID** - Same credentials
- ✅ **GOOGLE_CLIENT_SECRET** - Same credentials
- ✅ **CLOUDINARY_*** - All Cloudinary settings (file uploads continue working)
- ✅ **APP_NAME** - Application name

---

## ⚠️ What You MUST Do Before First Deployment

### 1. Update Google OAuth Redirect URI

**Location:** https://console.cloud.google.com/apis/credentials

**Action:** Add these redirect URIs:

**For Staging:**
```
http://***REDACTED_STAGING_IP***/api/calendar/google-callback
```

**For Production:**
```
http://***REDACTED_PRODUCTION_IP***/api/calendar/google-callback
```

**How:**
1. Click your OAuth 2.0 Client ID
2. Find "Authorized redirect URIs"
3. Click "Add URI"
4. Paste the new URI
5. Save

**⚠️ Keep Railway URIs active** until migration is complete and tested!

---

### 2. Migrate Your Database

**You need to copy data from Railway to Alibaba RDS.**

**Quick Method:**

```bash
# 1. Backup Railway database
railway run pg_dump $DATABASE_URL > railway_backup.sql

# 2. Upload to staging ECS
scp railway_backup.sql gcgc-staging:/tmp/

# 3. Restore to Alibaba RDS
ssh gcgc-staging
psql -h ***REDACTED_RDS_ID***.pgsql.ap-southeast-6.rds.aliyuncs.com \
     -U postgres \
     -d gcgc_tms_staging_db \
     -f /tmp/railway_backup.sql

# 4. Verify
psql -h ***REDACTED_RDS_ID***.pgsql.ap-southeast-6.rds.aliyuncs.com \
     -U postgres \
     -d gcgc_tms_staging_db \
     -c "SELECT COUNT(*) FROM users;"
```

---

### 3. Generate Production Secrets

**Your `.env.production` has placeholder secrets. Generate real ones:**

```bash
# Generate new NEXTAUTH_SECRET for production
openssl rand -base64 32

# Generate new API_KEY for production
openssl rand -base64 32
```

Then update in `deployment/.env.production`:
- Replace `CHANGE-THIS-FOR-PRODUCTION-USE-DIFFERENT-SECRET`
- Replace `CHANGE-THIS-FOR-PRODUCTION-USE-DIFFERENT-KEY`

**Why?** Staging and production should have different secrets for security.

---

## 🚀 Deployment Steps

### Deploy to Staging (First Time)

```bash
# 1. Setup SSH
bash deployment/setup-ssh.sh

# 2. Test SSH connection
ssh gcgc-staging

# 3. On the server, setup software
# (Run server-setup.sh - see DEPLOYMENT_GUIDE.md)

# 4. Upload environment file
scp deployment/.env.staging gcgc-staging:/var/www/gcgc-tms-staging/.env

# 5. Deploy!
bash deployment/deploy-staging.sh
```

### Deploy to Production (After Staging Works)

```bash
# 1. Update production secrets first!
# Edit deployment/.env.production with real values

# 2. Upload environment file
scp deployment/.env.production gcgc-production:/var/www/gcgc-tms-production/.env

# 3. Deploy!
bash deployment/deploy-production.sh
```

---

## 🧪 Testing Checklist

After deploying, test these:

**Staging (http://***REDACTED_STAGING_IP***):**
- [ ] App loads
- [ ] Login works
- [ ] Google Calendar OAuth works
- [ ] File upload works (Cloudinary)
- [ ] All features functional

**Production (http://***REDACTED_PRODUCTION_IP***):**
- [ ] App loads
- [ ] Login works
- [ ] Google Calendar OAuth works
- [ ] File upload works (Cloudinary)
- [ ] All features functional

---

## 📊 What's Using What

```
┌─────────────────────────────────────────┐
│  Your App on Alibaba Cloud ECS          │
│  (Running Node.js + Next.js)            │
└──────┬─────────┬──────────┬─────────────┘
       │         │          │
       ▼         ▼          ▼
   ┌───────┐ ┌──────┐  ┌──────────┐
   │  RDS  │ │Redis │  │Cloudinary│
   │(NEW)  │ │(NEW) │  │ (SAME)   │
   └───────┘ └──────┘  └──────────┘

Alibaba   Alibaba    3rd Party
(Managed) (Managed)  (External)
```

**Changed:** Database + Added Redis
**Kept:** Cloudinary (external, still works)

---

## 💰 Cost Comparison

| Service | Railway | Alibaba Cloud |
|---------|---------|---------------|
| **Hosting** | ~$5-10/mo | ECS: ~$20/mo |
| **Database** | ~$10-20/mo | RDS: ~$30/mo (shared) |
| **Redis** | Included or $5 | ~$15/mo (shared) |
| **Files** | Cloudinary | Cloudinary (same) |
| **TOTAL** | ~$20-35/mo | ~$35-40/mo per environment |

Both staging + production: ~$65-85/month

---

## 🔒 Security Notes

### Kept From Railway (Good!)
- ✅ Same NEXTAUTH_SECRET → Users stay logged in
- ✅ Same Google OAuth → Calendar integration works
- ✅ Same Cloudinary → Files stay accessible

### New for Production (Required!)
- ⚠️ Different NEXTAUTH_SECRET → Separate auth
- ⚠️ Different API_KEY → Better security
- ⚠️ Different Cloudinary folder → Separate files

---

## 📝 Files You Have

```
deployment/
├── .env.staging              ✅ Updated with your Railway vars
├── .env.production           ✅ Updated (needs secret generation)
├── RAILWAY_TO_ALIBABA_MIGRATION.md   ✅ Complete migration guide
├── MIGRATION_SUMMARY.md      ✅ This file (quick reference)
├── DEPLOYMENT_GUIDE.md       ✅ Step-by-step deployment
├── QUICK_REFERENCE.md        ✅ Command cheat sheet
├── setup-ssh.sh              ✅ SSH configuration
├── server-setup.sh           ✅ Server installation
├── deploy-staging.sh         ✅ Staging deployment
└── deploy-production.sh      ✅ Production deployment
```

---

## 🎯 Your Action Plan

### Today
1. ✅ Read this summary
2. ✅ Update Google OAuth redirect URIs
3. ✅ Backup Railway database

### This Week
4. ✅ Deploy to Alibaba staging
5. ✅ Test thoroughly
6. ✅ Fix any issues

### Next Week
7. ✅ Generate production secrets
8. ✅ Deploy to Alibaba production
9. ✅ Switch traffic
10. ✅ Monitor for 1 week

### After Migration Success
11. ✅ Remove Railway redirect URIs
12. ✅ Shut down Railway (optional)

---

## 🆘 Quick Help

**If deployment fails:**
```bash
# Check logs
ssh gcgc-staging 'pm2 logs gcgc-tms-staging'

# Check status
ssh gcgc-staging 'pm2 status'

# Restart
ssh gcgc-staging 'pm2 restart gcgc-tms-staging'
```

**If Google OAuth fails:**
- Verify redirect URI in Google Console
- Clear browser cookies
- Check NEXTAUTH_URL in .env

**If file uploads fail:**
- Verify all CLOUDINARY_* variables copied correctly
- Check no typos in keys/secrets

---

## 📚 More Info

- **Complete Guide:** `RAILWAY_TO_ALIBABA_MIGRATION.md`
- **Deployment Steps:** `DEPLOYMENT_GUIDE.md`
- **Understanding Everything:** `docs/UNDERSTANDING_ECS_DEPLOYMENT.md`
- **Commands:** `QUICK_REFERENCE.md`

---

**You're ready to migrate! Start with staging, test thoroughly, then production.** 🚀
