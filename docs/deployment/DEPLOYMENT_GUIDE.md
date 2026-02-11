# GCGC Team Management System - Complete Deployment Guide

Complete step-by-step guide to deploy your Next.js application to Alibaba Cloud ECS.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (For Impatient Developers)](#quick-start)
3. [Step 1: Setup SSH Access](#step-1-setup-ssh-access)
4. [Step 2: Prepare ECS Servers](#step-2-prepare-ecs-servers)
5. [Step 3: Initial Server Setup](#step-3-initial-server-setup)
6. [Step 4: Deploy Application Code](#step-4-deploy-application-code)
7. [Step 5: Configure Nginx](#step-5-configure-nginx)
8. [Step 6: Test Your Deployment](#step-6-test-your-deployment)
9. [Step 7: Deploying Updates](#step-7-deploying-updates)
10. [Troubleshooting](#troubleshooting)
11. [Maintenance Commands](#maintenance-commands)

---

## Prerequisites

### What You Need

- ✅ **2 ECS Instances** (already provisioned)
  - Staging: `***REDACTED_STAGING_IP***`
  - Production: `***REDACTED_PRODUCTION_IP***`
- ✅ **SSH Key**: `sogo-infra-key.pem`
- ✅ **RDS PostgreSQL**: Credentials ready
- ✅ **Redis**: Connection string ready
- ✅ **OSS Bucket**: Access keys ready
- ✅ **Your local machine**: macOS/Linux with terminal access

### What's Already Created

All configuration files are ready in the `deployment/` folder:
- `.env.staging` - Staging environment variables (with real credentials)
- `.env.production` - Production environment variables (with real credentials)
- `setup-ssh.sh` - SSH configuration script
- `server-setup.sh` - Server installation script
- `deploy-staging.sh` - Staging deployment script
- `deploy-production.sh` - Production deployment script
- PM2 configuration files

---

## Quick Start (For Impatient Developers)

If you want to deploy ASAP, run these commands in order:

```bash
# 1. Setup SSH access (one-time)
bash deployment/setup-ssh.sh

# 2. Test SSH connection
ssh gcgc-staging

# 3. Run server setup on staging (inside SSH session)
# Copy and paste the server-setup.sh content, or upload the file

# 4. Clone your repository on the server
cd /var/www
git clone YOUR_REPO_URL gcgc-tms-staging
cd gcgc-tms-staging
git checkout staging

# 5. Upload environment file
# From your local machine:
scp deployment/.env.staging gcgc-staging:/var/www/gcgc-tms-staging/.env

# 6. Build and start (on server)
npm ci
npm run build
npx prisma migrate deploy
npx prisma generate
pm2 start deployment/pm2.staging.config.js
pm2 save

# Done! Access at http://***REDACTED_STAGING_IP***
```

**For detailed explanations, continue reading below.**

---

## Step 1: Setup SSH Access

### 1.1 Run the SSH Setup Script

This script will configure your computer to easily connect to your servers.

```bash
cd /path/to/gcgc_team_management_system
bash deployment/setup-ssh.sh
```

**What this does:**
- Copies your SSH key to `~/.ssh/sogo-infra-key.pem`
- Sets correct permissions (required for SSH security)
- Adds configuration to `~/.ssh/config`

### 1.2 Test SSH Connection

```bash
# Test staging server
ssh gcgc-staging

# Test production server
ssh gcgc-production
```

**Expected result:**
```
Welcome to Ubuntu 22.04.1 LTS
...
root@iZ5tsj3f83uq7wal98hk9cZ:~#
```

**If connection fails**, try different usernames in `~/.ssh/config`:
- Change `User root` to `User ubuntu` or `User admin`

**First time connecting?** Type `yes` when asked about host authenticity.

---

## Step 2: Prepare ECS Servers

### 2.1 What Needs to Be Installed

Each ECS server needs:
- **Node.js 20.x** - Runtime for your Next.js app
- **PM2** - Process manager to keep app running
- **Nginx** - Web server for routing traffic
- **Git** - To clone and update your code
- **PostgreSQL Client** - For database operations

### 2.2 Install Required Software

**Option A: Automatic Installation (Recommended)**

1. SSH into staging server:
   ```bash
   ssh gcgc-staging
   ```

2. Upload the setup script:
   ```bash
   # From your LOCAL machine (new terminal):
   scp deployment/server-setup.sh gcgc-staging:/tmp/server-setup.sh
   ```

3. Run the setup script on the server:
   ```bash
   # Back in SSH session:
   bash /tmp/server-setup.sh
   ```

4. Repeat for production:
   ```bash
   ssh gcgc-production
   # (upload and run server-setup.sh)
   ```

**Option B: Manual Installation**

If you prefer to install manually, run these commands on each server:

```bash
# Update packages
sudo apt-get update

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2
sudo pm2 startup systemd

# Install Nginx
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Install Git
sudo apt-get install -y git

# Install PostgreSQL client
sudo apt-get install -y postgresql-client

# Create directories
sudo mkdir -p /var/www /var/log/pm2
sudo chown -R $USER:$USER /var/www /var/log/pm2
```

### 2.3 Verify Installation

```bash
node --version    # Should show v20.x.x
npm --version
pm2 --version
nginx -v
git --version
```

---

## Step 3: Initial Server Setup

### 3.1 Clone Your Repository (STAGING)

```bash
# SSH into staging
ssh gcgc-staging

# Clone repository
cd /var/www
git clone YOUR_REPOSITORY_URL gcgc-tms-staging
cd gcgc-tms-staging

# Checkout staging branch
git checkout staging

# Verify
git branch
# Should show: * staging
```

**Replace `YOUR_REPOSITORY_URL`** with your actual Git repository URL:
- GitHub: `https://github.com/username/gcgc_team_management_system.git`
- GitLab: `https://gitlab.com/username/gcgc_team_management_system.git`
- Or use SSH: `git@github.com:username/repo.git`

### 3.2 Upload Environment File

**From your LOCAL machine** (not SSH):

```bash
# Upload staging environment file
scp deployment/.env.staging gcgc-staging:/var/www/gcgc-tms-staging/.env

# Verify it was uploaded
ssh gcgc-staging "cat /var/www/gcgc-tms-staging/.env | head -n 5"
```

**⚠️ Important:** The `.env` file contains sensitive credentials. Never commit it to Git!

### 3.3 Install Dependencies and Build

**Back in SSH session:**

```bash
cd /var/www/gcgc-tms-staging

# Install dependencies
npm ci

# Build the application
npm run build

# This will:
# - Generate Prisma client
# - Build Next.js for production
# - Take 2-5 minutes
```

### 3.4 Setup Database

```bash
# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# (Optional) Seed database if needed
npm run db:seed
```

### 3.5 Start Application with PM2

```bash
# Start application
pm2 start deployment/pm2.staging.config.js

# Save PM2 process list (to survive reboots)
pm2 save

# Check status
pm2 status

# View logs
pm2 logs gcgc-tms-staging
```

**Expected output:**
```
┌─────┬───────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                  │ status  │ ↺       │ cpu      │
├─────┼───────────────────────┼─────────┼─────────┼──────────┤
│ 0   │ gcgc-tms-staging      │ online  │ 0       │ 0%       │
└─────┴───────────────────────┴─────────┴─────────┴──────────┘
```

### 3.6 Test Direct Access

```bash
# On the server
curl http://localhost:3001

# Should return HTML from your Next.js app
```

---

## Step 4: Deploy Application Code

### 4.1 Configure Nginx

Nginx will route traffic from port 80 to your Node.js app on port 3001.

**Upload Nginx configuration:**

```bash
# From your LOCAL machine
scp deployment/nginx-staging.conf gcgc-staging:/tmp/

# On the server
ssh gcgc-staging
sudo mv /tmp/nginx-staging.conf /etc/nginx/sites-available/gcgc-tms-staging
sudo ln -s /etc/nginx/sites-available/gcgc-tms-staging /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 4.2 Verify Nginx is Running

```bash
sudo systemctl status nginx

# Should show: Active: active (running)
```

---

## Step 5: Configure Nginx

### 5.1 Understanding the Nginx Configuration

The Nginx config does the following:
- Listens on port 80 (HTTP)
- Forwards requests to your Node.js app on port 3001
- Handles WebSocket connections (for Socket.IO)
- Sets up caching for static files
- Adds security headers

### 5.2 Key Configuration Settings

```nginx
upstream gcgc_tms_staging {
    server 127.0.0.1:3001;  # Your Node.js app
}

server {
    listen 80;
    server_name ***REDACTED_STAGING_IP***;  # Your server IP

    location / {
        proxy_pass http://gcgc_tms_staging;
        # ... proxy headers
    }

    location /socket.io/ {
        # WebSocket configuration
    }
}
```

### 5.3 Test Nginx Configuration

```bash
# Test syntax
sudo nginx -t

# Expected output:
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5.4 View Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/gcgc-tms-staging-access.log

# Error logs
sudo tail -f /var/log/nginx/gcgc-tms-staging-error.log
```

---

## Step 6: Test Your Deployment

### 6.1 Test from Command Line

```bash
# Test HTTP response
curl http://***REDACTED_STAGING_IP***

# Test with headers
curl -I http://***REDACTED_STAGING_IP***

# Expected: HTTP/1.1 200 OK
```

### 6.2 Test from Browser

Open your browser and visit:
```
http://***REDACTED_STAGING_IP***
```

**You should see:** Your GCGC TMS login page

### 6.3 Test Login

1. Try logging in with your credentials
2. Check if database connection works
3. Test creating/viewing data

### 6.4 Monitor Application

```bash
# SSH to server
ssh gcgc-staging

# View real-time logs
pm2 logs gcgc-tms-staging

# View monitoring dashboard
pm2 monit

# Check memory usage
pm2 status
```

---

## Step 7: Deploying Updates

After the initial setup, deploying updates is easy!

### 7.1 Deploy to Staging (Automated)

**From your LOCAL machine:**

```bash
# Make sure you committed and pushed your changes to staging branch
git add .
git commit -m "Your changes"
git push origin staging

# Run deployment script
bash deployment/deploy-staging.sh
```

**What this does automatically:**
1. Connects to staging server via SSH
2. Pulls latest code from `staging` branch
3. Installs dependencies
4. Builds the application
5. Runs database migrations
6. Restarts PM2

### 7.2 Deploy to Production (Automated)

**⚠️ WARNING: This deploys to LIVE production!**

```bash
# Push changes to main branch
git push origin main

# Run production deployment
bash deployment/deploy-production.sh

# Type "DEPLOY" to confirm
```

### 7.3 Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# SSH to server
ssh gcgc-staging

# Pull latest code
cd /var/www/gcgc-tms-staging
git pull origin staging

# Install dependencies
npm ci

# Build
npm run build

# Run migrations
npx prisma migrate deploy
npx prisma generate

# Restart
pm2 restart gcgc-tms-staging

# Check logs
pm2 logs gcgc-tms-staging --lines 50
```

---

## Step 8: Production Setup

Repeat all the steps for **production server**:

1. SSH into production: `ssh gcgc-production`
2. Run server setup script
3. Clone repository to `/var/www/gcgc-tms-production`
4. Checkout `main` branch
5. Upload `.env.production`
6. Install dependencies and build
7. Setup database
8. Start with PM2 using `pm2.production.config.js`
9. Configure Nginx with `nginx-production.conf`
10. Test at `http://***REDACTED_PRODUCTION_IP***`

**Key differences for production:**
- Uses `main` branch instead of `staging`
- Uses port 3000 instead of 3001
- Runs 2 instances with PM2 (for better performance)
- Different database: `gcgc_tms_production_db`

---

## Troubleshooting

### Issue: Cannot SSH to Server

**Symptoms:** `Permission denied` or `Connection refused`

**Solutions:**
```bash
# Check key permissions
chmod 400 ~/.ssh/sogo-infra-key.pem

# Test SSH with verbose output
ssh -v gcgc-staging

# Try different username
# Edit ~/.ssh/config and change User from root to ubuntu
```

### Issue: npm install fails

**Symptoms:** `EACCES` or `permission denied`

**Solutions:**
```bash
# Check Node.js version
node --version  # Should be v20.x.x

# Clear npm cache
npm cache clean --force

# Use npm ci instead of npm install
npm ci
```

### Issue: Build fails with out of memory

**Symptoms:** `JavaScript heap out of memory`

**Solutions:**
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

### Issue: PM2 app shows "errored" status

**Symptoms:** App crashes immediately after starting

**Solutions:**
```bash
# View detailed logs
pm2 logs gcgc-tms-staging --lines 100

# Check for common issues:
# 1. Wrong DATABASE_URL
# 2. Missing .env file
# 3. Build failed
# 4. Port already in use

# Restart with logs
pm2 restart gcgc-tms-staging
pm2 logs gcgc-tms-staging
```

### Issue: Database connection fails

**Symptoms:** `P1001: Can't reach database server`

**Solutions:**
```bash
# Test database connection
psql -h ***REDACTED_RDS_ID***.pgsql.ap-southeast-6.rds.aliyuncs.com \
     -U postgres \
     -d gcgc_tms_staging_db

# Check if ECS IP is in RDS whitelist (Alibaba Cloud Console)
# Should include: 192.168.1.164 (staging) and 192.168.1.163 (production)

# Verify DATABASE_URL in .env file
cat .env | grep DATABASE_URL
```

### Issue: Nginx returns 502 Bad Gateway

**Symptoms:** Browser shows 502 error

**Solutions:**
```bash
# Check if app is running
pm2 status

# Check if app is listening on correct port
sudo netstat -tulpn | grep 3001

# Check Nginx error logs
sudo tail -f /var/log/nginx/gcgc-tms-staging-error.log

# Restart both
pm2 restart gcgc-tms-staging
sudo systemctl restart nginx
```

### Issue: WebSocket/Socket.IO not working

**Symptoms:** Real-time features don't work

**Solutions:**
```bash
# Check Nginx config has WebSocket support
sudo nginx -t

# Check Socket.IO logs in browser console
# Should see: "Socket.IO connection established"

# Verify server.js has Socket.IO configured
pm2 logs gcgc-tms-staging | grep socket
```

---

## Maintenance Commands

### Viewing Logs

```bash
# Application logs
pm2 logs gcgc-tms-staging           # Real-time logs
pm2 logs gcgc-tms-staging --lines 100  # Last 100 lines

# Nginx logs
sudo tail -f /var/log/nginx/gcgc-tms-staging-access.log
sudo tail -f /var/log/nginx/gcgc-tms-staging-error.log

# System logs
sudo journalctl -u nginx -f
```

### Managing PM2

```bash
# Status
pm2 status

# Restart
pm2 restart gcgc-tms-staging

# Stop
pm2 stop gcgc-tms-staging

# Start
pm2 start gcgc-tms-staging

# Delete (removes from PM2)
pm2 delete gcgc-tms-staging

# Monitoring dashboard
pm2 monit

# Save process list
pm2 save
```

### Managing Nginx

```bash
# Test configuration
sudo nginx -t

# Reload (no downtime)
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# Stop
sudo systemctl stop nginx

# Status
sudo systemctl status nginx
```

### Database Operations

```bash
# Connect to database
psql -h ***REDACTED_RDS_ID***.pgsql.ap-southeast-6.rds.aliyuncs.com \
     -U postgres \
     -d gcgc_tms_staging_db

# Run migrations
npx prisma migrate deploy

# Reset database (⚠️ DANGER: Deletes all data!)
npx prisma migrate reset

# Seed database
npm run db:seed

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Server Maintenance

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check running processes
ps aux | grep node

# System updates (⚠️ Do during maintenance window)
sudo apt-get update
sudo apt-get upgrade
```

---

## Security Checklist

Before going to production, ensure:

- [ ] Generate unique `NEXTAUTH_SECRET` for production (use `openssl rand -base64 32`)
- [ ] Change database password from default
- [ ] Enable HTTPS with SSL certificate
- [ ] Configure firewall (only allow ports 22, 80, 443)
- [ ] Set up regular database backups
- [ ] Enable Nginx rate limiting
- [ ] Review and update security groups in Alibaba Cloud
- [ ] Set up monitoring and alerts
- [ ] Document all credentials in a secure password manager

---

## Next Steps

After successful deployment:

1. **Setup Domain Name**
   - Point your domain to the ECS public IPs
   - Update `NEXTAUTH_URL` in `.env` files
   - Update Nginx `server_name` directive

2. **Enable HTTPS**
   - Obtain SSL certificate (Let's Encrypt or Alibaba Cloud)
   - Configure Nginx for HTTPS
   - Force redirect HTTP to HTTPS

3. **Setup Monitoring**
   - Install PM2 monitoring: `pm2 install pm2-server-monit`
   - Set up uptime monitoring (e.g., UptimeRobot)
   - Configure error reporting (e.g., Sentry)

4. **Backups**
   - Enable RDS automated backups
   - Set up OSS bucket versioning
   - Regular database dumps

5. **CI/CD (Optional)**
   - Set up GitHub Actions / GitLab CI
   - Automate testing before deployment
   - Automated deployments on merge to main

---

## Summary

You now have:

✅ SSH access configured
✅ Servers setup with Node.js, PM2, Nginx
✅ Application deployed to staging
✅ Application deployed to production
✅ Automated deployment scripts ready
✅ Monitoring and logging configured

**Staging URL:** http://***REDACTED_STAGING_IP***
**Production URL:** http://***REDACTED_PRODUCTION_IP***

---

## Need Help?

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review logs: `pm2 logs` and `sudo tail -f /var/log/nginx/error.log`
3. Verify environment variables: `cat .env`
4. Check if all services are running: `pm2 status` and `sudo systemctl status nginx`

**Happy Deploying! 🚀**
