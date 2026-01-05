# GCGC TMS Deployment - Quick Reference Card

**Print this or keep it handy!** 📌

---

## 🔐 Your Infrastructure

### Servers
```
Staging:     ***REDACTED_STAGING_IP*** (192.168.1.164)
Production:  ***REDACTED_PRODUCTION_IP*** (192.168.1.163)
```

### SSH Access
```bash
ssh gcgc-staging      # Connect to staging
ssh gcgc-production   # Connect to production
```

### Application URLs
```
Staging:     http://***REDACTED_STAGING_IP***
Production:  http://***REDACTED_PRODUCTION_IP***
```

---

## 🚀 Deploy Commands

### Deploy to Staging
```bash
bash deployment/deploy-staging.sh
```

### Deploy to Production
```bash
bash deployment/deploy-production.sh
# Type "DEPLOY" to confirm
```

---

## 📊 Monitoring Commands

### Check Status
```bash
ssh gcgc-staging 'pm2 status'
```

### View Logs (Real-time)
```bash
ssh gcgc-staging 'pm2 logs gcgc-tms-staging'
```

### View Last 50 Lines
```bash
ssh gcgc-staging 'pm2 logs gcgc-tms-staging --lines 50'
```

### Monitoring Dashboard
```bash
ssh gcgc-staging 'pm2 monit'
```

---

## 🔧 Common Operations

### Restart Application
```bash
ssh gcgc-staging 'pm2 restart gcgc-tms-staging'
```

### Stop Application
```bash
ssh gcgc-staging 'pm2 stop gcgc-tms-staging'
```

### Start Application
```bash
ssh gcgc-staging 'pm2 start gcgc-tms-staging'
```

### Restart Nginx
```bash
ssh gcgc-staging 'sudo systemctl restart nginx'
```

### Check Nginx Status
```bash
ssh gcgc-staging 'sudo systemctl status nginx'
```

---

## 🐛 Troubleshooting

### Application Not Starting
```bash
# Check logs for errors
ssh gcgc-staging 'pm2 logs gcgc-tms-staging --lines 100'

# Check if port is in use
ssh gcgc-staging 'sudo netstat -tulpn | grep 3001'

# Restart everything
ssh gcgc-staging 'pm2 restart gcgc-tms-staging && sudo systemctl restart nginx'
```

### 502 Bad Gateway
```bash
# Check if app is running
ssh gcgc-staging 'pm2 status'

# Check Nginx logs
ssh gcgc-staging 'sudo tail -f /var/log/nginx/gcgc-tms-staging-error.log'

# Restart both
ssh gcgc-staging 'pm2 restart gcgc-tms-staging && sudo systemctl reload nginx'
```

### Database Connection Issues
```bash
# Test database connection
ssh gcgc-staging 'psql -h ***REDACTED_RDS_ID***.pgsql.ap-southeast-6.rds.aliyuncs.com -U postgres -d gcgc_tms_staging_db'

# Check environment variables
ssh gcgc-staging 'cat /var/www/gcgc-tms-staging/.env | grep DATABASE_URL'
```

### Out of Memory
```bash
# Check memory usage
ssh gcgc-staging 'free -h'

# Check app memory
ssh gcgc-staging 'pm2 status'

# Restart to free memory
ssh gcgc-staging 'pm2 restart gcgc-tms-staging'
```

---

## 📁 Important Paths

### Staging
```
App:         /var/www/gcgc-tms-staging
Logs:        /var/log/pm2/gcgc-tms-staging-*.log
Nginx:       /etc/nginx/sites-enabled/gcgc-tms-staging
Nginx Logs:  /var/log/nginx/gcgc-tms-staging-*.log
```

### Production
```
App:         /var/www/gcgc-tms-production
Logs:        /var/log/pm2/gcgc-tms-production-*.log
Nginx:       /etc/nginx/sites-enabled/gcgc-tms-production
Nginx Logs:  /var/log/nginx/gcgc-tms-production-*.log
```

---

## 🔒 Database Credentials

```
Host:     ***REDACTED_RDS_ID***.pgsql.ap-southeast-6.rds.aliyuncs.com
Port:     5432
User:     postgres
Password: tedzi9-zodvun-vohqeT

Staging DB:     gcgc_tms_staging_db
Production DB:  gcgc_tms_production_db
```

---

## 💾 Redis Credentials

```
Host:     ***REDACTED_REDIS_ID***.redis.ap-southeast-6.rds.aliyuncs.com
Port:     6379
Password: nuzWup-6defpo-jozcek
```

---

## 📦 OSS Credentials

```
Bucket:   ***REDACTED_OSS_BUCKET***
Region:   ap-southeast-6
Endpoint: oss-ap-southeast-6-internal.aliyuncs.com (from ECS)
          oss-ap-southeast-6.aliyuncs.com (public)
```

---

## ⚡ Quick Health Check

Run this to check everything at once:

```bash
ssh gcgc-staging << 'EOF'
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Nginx Status ==="
sudo systemctl status nginx --no-pager

echo ""
echo "=== Disk Space ==="
df -h | grep -E "Filesystem|/$"

echo ""
echo "=== Memory ==="
free -h

echo ""
echo "=== Last 10 Log Lines ==="
pm2 logs gcgc-tms-staging --lines 10 --nostream
EOF
```

---

## 📝 Manual Deployment Steps

If automated scripts fail, deploy manually:

```bash
# 1. SSH to server
ssh gcgc-staging

# 2. Pull latest code
cd /var/www/gcgc-tms-staging
git pull origin staging

# 3. Install dependencies
npm ci

# 4. Build
npm run build

# 5. Migrate database
npx prisma migrate deploy
npx prisma generate

# 6. Restart
pm2 restart gcgc-tms-staging

# 7. Check status
pm2 status
pm2 logs gcgc-tms-staging --lines 20
```

---

## 🆘 Emergency Contacts

| Issue | Action |
|-------|--------|
| **App down** | Check logs, restart PM2 |
| **502 Error** | Check Nginx and PM2 status |
| **Database error** | Verify RDS whitelist and credentials |
| **Out of disk space** | Clean up logs and old builds |

---

## 📞 Support Files

- **Full Guide**: `deployment/DEPLOYMENT_GUIDE.md`
- **Alibaba Setup**: `deployment/ALIBABA_CLOUD_SETUP.md`
- **README**: `deployment/README.md`

---

**Keep this handy for quick reference! 🚀**
