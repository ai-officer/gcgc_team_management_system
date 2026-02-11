# Railway to Alibaba Cloud Migration Guide

Complete guide for migrating from Railway to Alibaba Cloud.

---

## 📊 Variable Comparison

### What Changed vs What Stayed the Same

| Variable | Railway Value | Alibaba Value | Status |
|----------|---------------|---------------|--------|
| **DATABASE_URL** | `postgres://...railway.app` | `postgresql://...aliyuncs.com` | ✅ CHANGED |
| **NEXTAUTH_URL** | `https://gcgc-team-management-system-staging.up.railway.app` | `http://***REDACTED_STAGING_IP***` | ✅ CHANGED |
| **APP_URL** | `https://gcgc-team-management-system-staging.up.railway.app` | `http://***REDACTED_STAGING_IP***` | ✅ CHANGED |
| **REDIS_*** | Not used on Railway | Added for Alibaba | ✅ ADDED |
| **NEXTAUTH_SECRET** | `v1hM2qTu7ck...` | Same value | ✅ KEPT |
| **API_KEY** | `goh9oNDRy0Hs...` | Same value | ✅ KEPT |
| **GOOGLE_CLIENT_ID** | `<your-google-client-id>` | Same value | ⚠️ KEPT (update redirect) |
| **GOOGLE_CLIENT_SECRET** | `<your-google-client-secret>` | Same value | ⚠️ KEPT (update redirect) |
| **CLOUDINARY_*** | All values | Same values | ✅ KEPT |
| **APP_NAME** | `GCGC Team Management System` | Same value | ✅ KEPT |

---

## 🔄 What You Need to Change

### 1. Database Migration

**Railway Database:**
```
DATABASE_URL="${{STAGING_DB.DATABASE_URL}}"
(Managed by Railway)
```

**Alibaba RDS:**
```
DATABASE_URL="postgresql://postgres:tedzi9-zodvun-vohqeT@***REDACTED_RDS_ID***.pgsql.ap-southeast-6.rds.aliyuncs.com:5432/gcgc_tms_staging_db?schema=public&connection_limit=10&pool_timeout=20"
```

**Migration Steps:**

1. **Backup Railway Database:**
   ```bash
   # On Railway
   railway run pg_dump $DATABASE_URL > railway_backup.sql
   ```

2. **Restore to Alibaba RDS:**
   ```bash
   # Upload backup to ECS
   scp railway_backup.sql gcgc-staging:/tmp/

   # On ECS, restore to RDS
   ssh gcgc-staging
   psql -h ***REDACTED_RDS_ID***.pgsql.ap-southeast-6.rds.aliyuncs.com \
        -U postgres \
        -d gcgc_tms_staging_db \
        -f /tmp/railway_backup.sql
   ```

3. **Verify Migration:**
   ```bash
   # Check table counts
   psql -h ***REDACTED_RDS_ID***.pgsql.ap-southeast-6.rds.aliyuncs.com \
        -U postgres \
        -d gcgc_tms_staging_db \
        -c "\dt"
   ```

---

### 2. URLs and Domains

**Railway:**
- Automatic HTTPS
- Subdomain: `gcgc-team-management-system-staging.up.railway.app`

**Alibaba:**
- HTTP initially (add HTTPS later)
- IP address: `***REDACTED_STAGING_IP***`
- Custom domain (optional): `staging.yourdomain.com`

**Changes:**
```bash
# Old Railway URLs
NEXTAUTH_URL="https://gcgc-team-management-system-staging.up.railway.app"
APP_URL="https://gcgc-team-management-system-staging.up.railway.app"

# New Alibaba URLs
NEXTAUTH_URL="http://***REDACTED_STAGING_IP***"
APP_URL="http://***REDACTED_STAGING_IP***"

# After setting up domain and SSL
NEXTAUTH_URL="https://staging.yourdomain.com"
APP_URL="https://staging.yourdomain.com"
```

---

### 3. Google OAuth Redirect URI

**⚠️ CRITICAL: You must update this in Google Cloud Console!**

**Current redirect URI (Railway):**
```
https://gcgc-team-management-system-staging.up.railway.app/api/calendar/google-callback
```

**New redirect URI (Alibaba):**
```
http://***REDACTED_STAGING_IP***/api/calendar/google-callback
```

**How to Update:**

1. Go to https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Find "Authorized redirect URIs"
4. **Add** (don't replace yet): `http://***REDACTED_STAGING_IP***/api/calendar/google-callback`
5. Save
6. After migration is complete and tested, remove Railway URL

**After setting up domain and SSL:**
```
https://staging.yourdomain.com/api/calendar/google-callback
```

---

### 4. Redis (New Service)

**Railway:**
- No Redis (or used Railway Redis)

**Alibaba:**
- Dedicated Tair Redis instance
- Used for caching and sessions

**New Variables:**
```bash
REDIS_URL="redis://default:nuzWup-6defpo-jozcek@***REDACTED_REDIS_ID***.redis.ap-southeast-6.rds.aliyuncs.com:6379"
REDIS_HOST="***REDACTED_REDIS_ID***.redis.ap-southeast-6.rds.aliyuncs.com"
REDIS_PORT="6379"
REDIS_PASSWORD="nuzWup-6defpo-jozcek"
```

**If your app uses Redis:**
- Connection will automatically work with new variables
- No code changes needed (if using `REDIS_URL` env variable)

---

## ✅ What You DON'T Need to Change

### 1. Cloudinary (File Storage)

**Keep using Cloudinary!** No changes needed.

```bash
# These stay exactly the same:
CLOUDINARY_CLOUD_NAME="dvjptzyhg"
CLOUDINARY_API_KEY="393189787928487"
CLOUDINARY_API_SECRET="uverPN2E2TYkxy82-tVvBY8F9k"
CLOUDINARY_URL="cloudinary://393189787928487:uverPN2E2TYkxy82-tVvBY8F9k@dvjptzyhg"
CLOUDINARY_FOLDER="GCGC_TEAM_MANAGEMENT_SYSTEM"
```

**Why keep Cloudinary?**
- ✅ Already working
- ✅ No code changes needed
- ✅ Cloudinary is globally fast
- ✅ Save time on migration

**Future option:** Switch to Alibaba OSS later if you want (but not required)

---

### 2. Authentication Secrets

**Keep your existing secrets!** This ensures users stay logged in during migration.

```bash
# These stay exactly the same:
NEXTAUTH_SECRET="v1hM2qTu7ckPz8evUzN3EEn0tNUyndttn/sRvkeEl7k="
API_KEY="goh9oNDRy0Hs6O6CjnpI6ZiUMOT3xXnlhm+oFQvMamw="
```

**Why keep the same?**
- ✅ Existing user sessions continue working
- ✅ No need to re-login all users
- ✅ Smooth migration

---

### 3. Google OAuth Credentials

**Keep your existing credentials!** Just update redirect URI.

```bash
# These stay exactly the same:
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

**Only action needed:** Update redirect URI in Google Console (see above)

---

## 📋 Pre-Migration Checklist

Before migrating from Railway to Alibaba:

### Database
- [ ] Backup Railway database
- [ ] Test connection to Alibaba RDS
- [ ] Verify RDS whitelist includes ECS IP (192.168.1.164)

### Application
- [ ] All code pushed to Git repository
- [ ] Latest commit tested on Railway
- [ ] No pending database migrations

### Google OAuth
- [ ] Added new redirect URI in Google Console
- [ ] Both Railway and Alibaba URIs active (for smooth transition)

### Services
- [ ] ECS instance running and accessible via SSH
- [ ] Node.js, PM2, Nginx installed on ECS
- [ ] `.env.staging` file prepared with correct values

---

## 🚀 Migration Steps

### Phase 1: Prepare (30 minutes)

1. **Backup Railway Database:**
   ```bash
   railway run pg_dump $DATABASE_URL > railway_backup_$(date +%Y%m%d).sql
   ```

2. **Update Google OAuth redirect URI:**
   - Add Alibaba URL to Google Console
   - Keep Railway URL active

3. **Verify ECS is ready:**
   ```bash
   ssh gcgc-staging
   node --version
   pm2 --version
   nginx -v
   ```

---

### Phase 2: Deploy to Alibaba (1 hour)

1. **Upload environment file:**
   ```bash
   scp deployment/.env.staging gcgc-staging:/var/www/gcgc-tms-staging/.env
   ```

2. **Restore database:**
   ```bash
   scp railway_backup_*.sql gcgc-staging:/tmp/
   ssh gcgc-staging
   psql -h ***REDACTED_RDS_ID***.pgsql.ap-southeast-6.rds.aliyuncs.com \
        -U postgres \
        -d gcgc_tms_staging_db \
        -f /tmp/railway_backup_*.sql
   ```

3. **Deploy application:**
   ```bash
   bash deployment/deploy-staging.sh
   ```

4. **Test on Alibaba:**
   - Visit: http://***REDACTED_STAGING_IP***
   - Try login
   - Test Google Calendar OAuth
   - Upload a file (Cloudinary)
   - Verify all features work

---

### Phase 3: Switch Traffic (15 minutes)

**Option A: Update DNS (if using custom domain)**
```
staging.yourdomain.com → ***REDACTED_STAGING_IP***
```

**Option B: Direct users to new IP**
```
http://***REDACTED_STAGING_IP***
```

---

### Phase 4: Cleanup (optional, after 1 week)

1. **Remove Railway redirect URI from Google Console**
   - Keep only Alibaba URL

2. **Shut down Railway project**
   - Download final backup
   - Delete Railway service

---

## 🔍 Testing Checklist

After migration, verify:

### Authentication
- [ ] User login works
- [ ] NextAuth session works
- [ ] API key authentication works
- [ ] Logout works

### Google OAuth
- [ ] Google Calendar OAuth redirect works
- [ ] Calendar sync works
- [ ] No CORS errors

### File Uploads
- [ ] File upload works (Cloudinary)
- [ ] Files display correctly
- [ ] Avatar uploads work

### Database
- [ ] All data migrated correctly
- [ ] Queries are fast
- [ ] No connection errors

### Application
- [ ] All pages load
- [ ] No console errors
- [ ] WebSocket/Socket.IO works (if used)
- [ ] Real-time features work

---

## 🐛 Troubleshooting

### Issue: Google OAuth redirect fails

**Symptoms:**
```
Error: redirect_uri_mismatch
```

**Solution:**
1. Check Google Console has correct redirect URI
2. Verify NEXTAUTH_URL in .env is correct
3. Clear browser cookies and try again

---

### Issue: Cloudinary uploads fail

**Symptoms:**
```
Error: Cloudinary API error
```

**Solution:**
1. Verify all CLOUDINARY_* variables copied correctly
2. Check no typos in API key/secret
3. Test Cloudinary directly:
   ```bash
   curl -X POST https://api.cloudinary.com/v1_1/dvjptzyhg/image/upload \
        -F "file=@test.jpg" \
        -F "api_key=393189787928487" \
        -F "api_secret=uverPN2E2TYkxy82-tVvBY8F9k"
   ```

---

### Issue: Database connection fails

**Symptoms:**
```
Error: Can't reach database server
```

**Solution:**
1. Verify ECS IP in RDS whitelist (192.168.1.164)
2. Test connection:
   ```bash
   psql -h ***REDACTED_RDS_ID***.pgsql.ap-southeast-6.rds.aliyuncs.com \
        -U postgres \
        -d gcgc_tms_staging_db
   ```
3. Check DATABASE_URL has correct password

---

### Issue: Users logged out after migration

**Cause:** Changed NEXTAUTH_SECRET

**Prevention:** Use the same NEXTAUTH_SECRET from Railway!

**Fix if happened:**
- Users just need to login again
- Sessions will work going forward

---

## 💰 Cost Comparison

### Railway (Estimated)
```
Database:     $10-20/month
Hosting:      $5-10/month
Total:        $15-30/month
```

### Alibaba Cloud (Your Setup)
```
ECS Staging:  ~$20/month
RDS:          ~$30/month (shared with production)
Redis:        ~$15/month (shared with production)
Cloudinary:   Free tier or existing plan
Total:        ~$30-35/month for staging
             (~$65-85/month for both staging + production)
```

---

## 📝 Summary

**What Changes:**
- ✅ Database: Railway Postgres → Alibaba RDS
- ✅ URLs: Railway domain → Alibaba ECS IP
- ✅ Redis: Added (new service)
- ⚠️ Google OAuth: Update redirect URI

**What Stays the Same:**
- ✅ Cloudinary (file storage)
- ✅ NEXTAUTH_SECRET (auth)
- ✅ API_KEY (custom auth)
- ✅ Google credentials (just update redirect)

**Migration Time:** 2-3 hours total
**Downtime:** Can be zero if you switch DNS/users gradually

---

**Ready to migrate? Follow the steps above!** 🚀
