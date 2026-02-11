# GCGC TMS Deployment Files

This folder contains everything you need to deploy the GCGC Team Management System to Alibaba Cloud ECS.

## 📁 Files Overview

| File | Purpose |
|------|---------|
| **DEPLOYMENT_GUIDE.md** | 📖 Complete step-by-step deployment instructions |
| **ALIBABA_CLOUD_SETUP.md** | ☁️ Alibaba Cloud Console configuration guide |
| **.env.staging** | 🔒 Staging environment variables (with real credentials) |
| **.env.production** | 🔒 Production environment variables (with real credentials) |
| **setup-ssh.sh** | 🔐 Configure SSH access to servers |
| **server-setup.sh** | 🖥️ Install Node.js, PM2, Nginx on servers |
| **deploy-staging.sh** | 🚀 Deploy updates to staging |
| **deploy-production.sh** | 🚀 Deploy updates to production |
| **pm2.staging.config.js** | ⚙️ PM2 configuration for staging |
| **pm2.production.config.js** | ⚙️ PM2 configuration for production |
| **nginx-staging.conf** | 🌐 Nginx configuration for staging |
| **nginx-production.conf** | 🌐 Nginx configuration for production |

---

## 🚀 Quick Start

### First Time Setup

```bash
# 1. Configure SSH access
bash deployment/setup-ssh.sh

# 2. Test connection
ssh gcgc-staging

# 3. Setup the server (run on server via SSH)
# Upload and run server-setup.sh

# 4. Clone your repository on the server
# See DEPLOYMENT_GUIDE.md for details

# 5. Deploy!
bash deployment/deploy-staging.sh
```

### Deploying Updates

```bash
# Deploy to staging
bash deployment/deploy-staging.sh

# Deploy to production (requires confirmation)
bash deployment/deploy-production.sh
```

---

## 📚 Documentation

### Start Here
👉 **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Complete deployment instructions

### Also Read
- **[ALIBABA_CLOUD_SETUP.md](./ALIBABA_CLOUD_SETUP.md)** - Console configuration guide

---

## 🔒 Security Notes

### ⚠️ IMPORTANT: Credential Files

The following files contain **real credentials** and should **NEVER** be committed to Git:

- `.env.staging` ❌ DO NOT COMMIT
- `.env.production` ❌ DO NOT COMMIT

These files are already in `.gitignore` to prevent accidental commits.

### SSH Key Security

Your SSH key (`sogo-infra-key.pem`) should:
- Have `400` permissions: `chmod 400 ~/.ssh/sogo-infra-key.pem`
- Never be shared publicly
- Be backed up securely

---

## 🏗️ Infrastructure Overview

### Servers

| Environment | Public IP | Private IP | App Port |
|-------------|-----------|------------|----------|
| **Staging** | ***REDACTED_STAGING_IP*** | 192.168.1.164 | 3001 |
| **Production** | ***REDACTED_PRODUCTION_IP*** | 192.168.1.163 | 3000 |

### Services

| Service | Details |
|---------|---------|
| **Database** | RDS PostgreSQL on `***REDACTED_RDS_ID***.pgsql.ap-southeast-6.rds.aliyuncs.com` |
| **Cache** | Redis on `***REDACTED_REDIS_ID***.redis.ap-southeast-6.rds.aliyuncs.com` |
| **Storage** | OSS bucket `***REDACTED_OSS_BUCKET***` in `ap-southeast-6` |

---

## 🔧 Common Commands

### SSH Access
```bash
# Connect to staging
ssh gcgc-staging

# Connect to production
ssh gcgc-production
```

### Deployment
```bash
# Deploy to staging
bash deployment/deploy-staging.sh

# Deploy to production
bash deployment/deploy-production.sh
```

### Monitoring
```bash
# View logs
ssh gcgc-staging 'pm2 logs gcgc-tms-staging'

# Check status
ssh gcgc-staging 'pm2 status'

# Real-time monitoring
ssh gcgc-staging 'pm2 monit'
```

### Troubleshooting
```bash
# Restart app
ssh gcgc-staging 'pm2 restart gcgc-tms-staging'

# View Nginx logs
ssh gcgc-staging 'sudo tail -f /var/log/nginx/gcgc-tms-staging-error.log'

# Check if app is running
ssh gcgc-staging 'pm2 status && sudo systemctl status nginx'
```

---

## 📋 Deployment Checklist

### Before First Deployment

- [ ] Read DEPLOYMENT_GUIDE.md completely
- [ ] Run `setup-ssh.sh` and test SSH access
- [ ] Configure Alibaba Cloud (see ALIBABA_CLOUD_SETUP.md)
- [ ] Verify RDS whitelist includes ECS private IPs
- [ ] Verify Redis whitelist includes ECS private IPs
- [ ] Get OSS AccessKey credentials
- [ ] Generate unique NEXTAUTH_SECRET for each environment

### For Each Deployment

- [ ] Code changes committed and pushed
- [ ] Database migrations tested locally
- [ ] Environment variables updated if needed
- [ ] Backup database before deploying to production
- [ ] Run deployment script
- [ ] Verify app is running: `pm2 status`
- [ ] Test the application in browser
- [ ] Monitor logs for 10 minutes: `pm2 logs`

---

## 🆘 Getting Help

### Troubleshooting Resources

1. **Deployment Guide**: See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) → Troubleshooting section
2. **Logs**: Always check logs first
   - Application: `pm2 logs gcgc-tms-staging`
   - Nginx: `sudo tail -f /var/log/nginx/error.log`
3. **Check Services**: Verify all services are running
   ```bash
   pm2 status
   sudo systemctl status nginx
   ```

### Common Issues

| Issue | Quick Fix |
|-------|-----------|
| SSH fails | Check key permissions: `chmod 400 ~/.ssh/sogo-infra-key.pem` |
| App crashes | Check logs: `pm2 logs` |
| 502 Bad Gateway | Restart app: `pm2 restart gcgc-tms-staging` |
| Database connection fails | Verify ECS IP in RDS whitelist |

---

## 🎯 Next Steps

After successful deployment:

1. ✅ Setup custom domain name
2. ✅ Enable HTTPS with SSL certificate
3. ✅ Configure monitoring and alerts
4. ✅ Set up automated backups
5. ✅ Enable CI/CD (optional)

See DEPLOYMENT_GUIDE.md → "Next Steps" section for details.

---

## 📞 Support

If you encounter issues not covered in the documentation:

1. Check the Troubleshooting section in DEPLOYMENT_GUIDE.md
2. Review all log files (`pm2 logs`, Nginx logs)
3. Verify environment variables in `.env` files
4. Check Alibaba Cloud Console (security groups, whitelists)

---

**Good luck with your deployment! 🚀**
