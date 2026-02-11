# 🚀 Complete Deployment Guide: Next.js App to Alibaba Cloud with HTTPS

## 📋 Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step 0: Preparation](#step-0-preparation)
- [Step 1: Set Up ECS Instances](#step-1-set-up-ecs-instances)
- [Step 2: Configure SSH Access](#step-2-configure-ssh-access)
- [Step 3: Install Server Software](#step-3-install-server-software)
- [Step 4: Set Up Database (RDS PostgreSQL)](#step-4-set-up-database-rds-postgresql)
- [Step 5: Configure Domain Name & DNS](#step-5-configure-domain-name--dns)
- [Step 6: Deploy Application Code](#step-6-deploy-application-code)
- [Step 7: Configure Environment Variables](#step-7-configure-environment-variables)
- [Step 8: Build and Start Application](#step-8-build-and-start-application)
- [Step 9: Configure Nginx (HTTP)](#step-9-configure-nginx-http)
- [Step 10: Set Up SSL Certificate (HTTPS)](#step-10-set-up-ssl-certificate-https)
- [Step 11: Configure Nginx (HTTPS)](#step-11-configure-nginx-https)
- [Step 12: Final Testing & Verification](#step-12-final-testing--verification)
- [Troubleshooting](#troubleshooting)
- [Maintenance & Updates](#maintenance--updates)

---

## Overview

This guide will walk you through deploying a **Next.js 14 application** to **Alibaba Cloud ECS** with:
- ✅ Two environments (Staging & Production)
- ✅ PostgreSQL database (RDS)
- ✅ Redis cache (Tair)
- ✅ Custom domain names
- ✅ **HTTPS with SSL certificate (Let's Encrypt)**
- ✅ PM2 process management
- ✅ Nginx reverse proxy
- ✅ Automatic restarts and logging

**Time Required:** 2-3 hours for first-time deployment

**Skill Level:** Intermediate (basic command line knowledge required)

---

## Prerequisites

### What You Need Before Starting:

1. **Alibaba Cloud Account**
   - Active account with billing enabled
   - Access to Alibaba Cloud Console

2. **ECS Instances** (2 servers)
   - Staging: Ubuntu 24.04 LTS, minimum 2GB RAM
   - Production: Ubuntu 24.04 LTS, minimum 2GB RAM
   - Public IP addresses assigned
   - Security groups configured (ports 22, 80, 443 open)

3. **RDS PostgreSQL Database**
   - PostgreSQL 16.x
   - Two databases created: staging_db, production_db
   - Connection details (host, username, password)

4. **Domain Name** (purchased and active)
   - Example: `yourdomain.com`
   - Access to DNS management

5. **Local Development Machine**
   - macOS, Linux, or Windows with WSL
   - Git installed
   - Your application code repository

6. **Application Requirements**
   - Next.js application (tested locally)
   - Prisma schema defined
   - Environment variables documented

---

## Step 0: Preparation

### 0.1 Gather Required Information

Create a checklist with all the information you'll need:

```plaintext
✅ CHECKLIST:

ECS Instances:
[ ] Staging IP: _________________
[ ] Production IP: _________________
[ ] SSH Key (.pem file location): _________________

Database (RDS):
[ ] Host: _________________
[ ] Port: 5432
[ ] Username: postgres
[ ] Password: _________________
[ ] Staging DB Name: _________________
[ ] Production DB Name: _________________

Domain:
[ ] Production domain: _________________
[ ] Staging subdomain: _________________
[ ] DNS provider: _________________

Application:
[ ] Repository URL: _________________
[ ] Required environment variables documented: [ ]
```

### 0.2 Prepare Your Local Project

```bash
# 1. Navigate to your project
cd /path/to/your/project

# 2. Ensure you're on the correct branch
git checkout main  # or master, or production

# 3. Pull latest changes
git pull origin main

# 4. Test the application locally
npm install
npm run build
npm run start

# 5. Verify tests pass (if you have them)
npm test

# 6. Create a deployment folder
mkdir -p deployment
```

### 0.3 Document Environment Variables

Create a template file listing all required environment variables:

```bash
# Create .env.example (DO NOT include actual values)
cat > .env.example << 'EOF'
# Database
DATABASE_URL=

# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# API Keys
API_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Redis
REDIS_URL=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=
EOF

# Commit this to your repository
git add .env.example
git commit -m "Add environment variables template"
```

---

## Step 1: Set Up ECS Instances

### 1.1 Access Alibaba Cloud Console

1. Go to: https://www.alibabacloud.com
2. Log in to your account
3. Navigate to: **Console** → **Elastic Compute Service (ECS)**

### 1.2 Verify ECS Instances

Check that your instances are running:

1. Go to **Instances & Images** → **Instances**
2. Verify two instances are in "Running" state:
   - Staging instance
   - Production instance
3. Note down the **Public IP** addresses

### 1.3 Configure Security Groups

**CRITICAL:** Open required ports for web traffic and SSH.

1. Click on your instance → **Security Groups**
2. Click **Modify Rules** → **Inbound**
3. Ensure these rules exist:

| Priority | Protocol | Port Range | Source | Description |
|----------|----------|------------|---------|-------------|
| 1 | TCP | 22 | 0.0.0.0/0 | SSH Access |
| 1 | TCP | 80 | 0.0.0.0/0 | HTTP |
| 1 | TCP | 443 | 0.0.0.0/0 | HTTPS |

**Security Note:** For production, restrict SSH (port 22) to your office IP instead of 0.0.0.0/0

### 1.4 Verify Instance Specifications

Check your instance specifications:
```
vCPU: 2 cores minimum (recommended: 4 cores for production)
Memory: 2 GB minimum (recommended: 4-8 GB for production)
Storage: 40 GB minimum
OS: Ubuntu 24.04 LTS
```

---

## Step 2: Configure SSH Access

### 2.1 Locate Your SSH Key

Find the `.pem` file provided by Alibaba Cloud:
```bash
# Typically in Downloads
ls ~/Downloads/*.pem
```

### 2.2 Set Up SSH Configuration

Create a script to configure SSH access:

```bash
# Create setup-ssh.sh in your project
cat > deployment/setup-ssh.sh << 'EOF'
#!/bin/bash
set -e

echo "🔐 Setting up SSH access to Alibaba Cloud ECS instances"

# Configuration
PEM_SOURCE="$HOME/Downloads/your-key-name.pem"  # ⚠️ CHANGE THIS
STAGING_IP="***REDACTED_STAGING_IP***"                        # ⚠️ CHANGE THIS
PRODUCTION_IP="***REDACTED_PRODUCTION_IP***"                     # ⚠️ CHANGE THIS

PEM_DEST="$HOME/.ssh/alibaba-ecs-key.pem"
SSH_CONFIG="$HOME/.ssh/config"

# Step 1: Copy SSH key to .ssh directory
echo "📋 Copying SSH key..."
cp "$PEM_SOURCE" "$PEM_DEST"

# Step 2: Set correct permissions (required by SSH)
echo "🔒 Setting permissions..."
chmod 400 "$PEM_DEST"

# Step 3: Add to SSH config for easy access
echo "⚙️  Configuring SSH..."

# Create SSH config if it doesn't exist
touch "$SSH_CONFIG"

# Remove old configurations if they exist
sed -i.bak '/Host.*staging/,/^$/d' "$SSH_CONFIG" 2>/dev/null || true
sed -i.bak '/Host.*production/,/^$/d' "$SSH_CONFIG" 2>/dev/null || true

# Add new configurations
cat >> "$SSH_CONFIG" << SSHEOF

# Alibaba Cloud - GCGC TMS Staging
Host gcgc-staging
    HostName $STAGING_IP
    User root
    IdentityFile $PEM_DEST
    ServerAliveInterval 60
    ServerAliveCountMax 3

# Alibaba Cloud - GCGC TMS Production
Host gcgc-production
    HostName $PRODUCTION_IP
    User root
    IdentityFile $PEM_DEST
    ServerAliveInterval 60
    ServerAliveCountMax 3
SSHEOF

echo "✅ SSH configuration complete!"
echo ""
echo "You can now connect using:"
echo "  ssh gcgc-staging"
echo "  ssh gcgc-production"
EOF

# Make executable
chmod +x deployment/setup-ssh.sh
```

### 2.3 Run SSH Setup

```bash
# Edit the script with your actual values
nano deployment/setup-ssh.sh
# Change PEM_SOURCE, STAGING_IP, PRODUCTION_IP

# Run the script
bash deployment/setup-ssh.sh
```

### 2.4 Test SSH Connection

```bash
# Test staging connection
ssh gcgc-staging "echo 'Staging connection successful!'"

# Test production connection
ssh gcgc-production "echo 'Production connection successful!'"
```

**Expected output:**
```
Staging connection successful!
Production connection successful!
```

If you get errors, see [Troubleshooting](#troubleshooting) section.

---

## Step 3: Install Server Software

### 3.1 Create Server Setup Script

This script installs all required software on your ECS instances.

```bash
cat > deployment/server-setup.sh << 'EOF'
#!/bin/bash

# GCGC Team Management System - Server Setup Script
# Run this script on EACH ECS instance (staging and production)
# This installs: Node.js, PM2, Nginx, Git, PostgreSQL Client

set -e

echo "🚀 GCGC TMS Server Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "This script will install:"
echo "  - Node.js 20.x LTS"
echo "  - PM2 (Process Manager)"
echo "  - Nginx (Web Server)"
echo "  - Git"
echo "  - PostgreSQL Client (for database management)"
echo ""

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    echo "✅ Detected OS: $OS"
else
    echo "❌ Cannot detect OS"
    exit 1
fi

echo ""
read -p "Continue with installation? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Installation cancelled"
    exit 1
fi

echo ""
echo "📦 Updating package lists..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt-get update
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    sudo yum update -y
fi

echo ""
echo "📦 Installing Node.js 20.x LTS..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    # Install Node.js 20.x on Ubuntu/Debian
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    # Install Node.js 20.x on CentOS/RHEL
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs
fi

# Verify installation
node --version
npm --version
echo "✅ Node.js installed successfully"

echo ""
echo "📦 Installing PM2 globally..."
sudo npm install -g pm2
pm2 --version
echo "✅ PM2 installed successfully"

echo ""
echo "📦 Setting up PM2 to start on system boot..."
sudo pm2 startup systemd -u $USER --hp $HOME
echo "✅ PM2 startup configured"

echo ""
echo "📦 Installing Nginx..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt-get install -y nginx
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    sudo yum install -y nginx
fi

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
echo "✅ Nginx installed and started"

echo ""
echo "📦 Installing Git..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt-get install -y git
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    sudo yum install -y git
fi

git --version
echo "✅ Git installed successfully"

echo ""
echo "📦 Installing PostgreSQL Client (for database management)..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt-get install -y postgresql-client
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    sudo yum install -y postgresql
fi
echo "✅ PostgreSQL client installed"

echo ""
echo "📂 Creating application directory structure..."
sudo mkdir -p /var/www/gcgc-tms-staging
sudo mkdir -p /var/www/gcgc-tms-production
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/www
sudo chown -R $USER:$USER /var/log/pm2
echo "✅ Directories created"

echo ""
echo "🔥 Configuring firewall (if enabled)..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp   # SSH
    sudo ufw allow 80/tcp   # HTTP
    sudo ufw allow 443/tcp  # HTTPS
    echo "✅ Firewall rules added (UFW)"
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-service=ssh
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --reload
    echo "✅ Firewall rules added (firewalld)"
else
    echo "⚠️  No firewall detected (UFW or firewalld)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Server setup complete!"
echo ""
echo "📊 Installed versions:"
node --version
npm --version
pm2 --version
nginx -v
git --version
echo ""
echo "📝 Next steps:"
echo "  1. Clone your repository to /var/www/"
echo "  2. Upload .env file"
echo "  3. Install dependencies and build"
echo "  4. Configure Nginx"
echo "  5. Start application with PM2"
echo ""
echo "See deployment/DEPLOYMENT_GUIDE.md for detailed instructions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
EOF

chmod +x deployment/server-setup.sh
```

### 3.2 Upload and Run Server Setup

**For Staging:**
```bash
# Upload the script
scp deployment/server-setup.sh gcgc-staging:/tmp/

# SSH and run it
ssh gcgc-staging
chmod +x /tmp/server-setup.sh
/tmp/server-setup.sh
```

**For Production:**
```bash
# Upload the script
scp deployment/server-setup.sh gcgc-production:/tmp/

# SSH and run it
ssh gcgc-production
chmod +x /tmp/server-setup.sh
/tmp/server-setup.sh
```

### 3.3 Verify Installation

```bash
# On each server, verify:
ssh gcgc-staging "node --version && npm --version && pm2 --version && nginx -v"
ssh gcgc-production "node --version && npm --version && pm2 --version && nginx -v"
```

**Expected output:**
```
v20.19.6
10.8.2
6.0.14
nginx version: nginx/1.24.0 (Ubuntu)
```

---

## Step 4: Set Up Database (RDS PostgreSQL)

### 4.1 Access Alibaba Cloud RDS

1. Go to Alibaba Cloud Console
2. Navigate to **ApsaraDB for RDS** → **Instances**
3. Click on your PostgreSQL instance

### 4.2 Create Databases

```bash
# Connect to your RDS instance
psql -h your-rds-host.rds.aliyuncs.com \
     -U postgres \
     -p 5432

# Create staging database
CREATE DATABASE gcgc_tms_staging_db;

# Create production database
CREATE DATABASE gcgc_tms_production_db;

# Verify
\l

# Exit
\q
```

### 4.3 Configure Database Access

1. In RDS Console, go to **Data Security** → **Whitelist Settings**
2. Add your ECS instance IPs to whitelist:
   - Staging ECS IP
   - Production ECS IP

### 4.4 Test Database Connection

From your local machine:
```bash
# Test staging database
psql postgresql://postgres:YOUR_PASSWORD@rds-host.rds.aliyuncs.com:5432/gcgc_tms_staging_db -c "SELECT version();"

# Test production database
psql postgresql://postgres:YOUR_PASSWORD@rds-host.rds.aliyuncs.com:5432/gcgc_tms_production_db -c "SELECT version();"
```

---

## Step 5: Configure Domain Name & DNS

### 5.1 Plan Your Domain Structure

Decide on your domain structure:

**Option A: Separate Domains**
```
Staging:    staging-tms.yourcompany.com
Production: tms.yourcompany.com
```

**Option B: Subdomains** (Recommended)
```
Staging:    staging.tms.yourcompany.com
Production: tms.yourcompany.com
```

### 5.2 Configure DNS Records

Go to your DNS provider (Alibaba Cloud DNS, Cloudflare, etc.)

**Add A Records:**

For **Production:**
```
Type: A
Name: tms (or @)
Value: YOUR_PRODUCTION_IP (e.g., ***REDACTED_PRODUCTION_IP***)
TTL: 600
```

For **Staging:**
```
Type: A
Name: staging.tms (or staging)
Value: YOUR_STAGING_IP (e.g., ***REDACTED_STAGING_IP***)
TTL: 600
```

### 5.3 Verify DNS Propagation

```bash
# Check if DNS is resolving (may take 5-30 minutes)
dig tms.yourcompany.com
dig staging.tms.yourcompany.com

# Or use nslookup
nslookup tms.yourcompany.com
nslookup staging.tms.yourcompany.com
```

**Expected output:**
```
tms.yourcompany.com.    600    IN    A    ***REDACTED_PRODUCTION_IP***
staging.tms.yourcompany.com. 600 IN A ***REDACTED_STAGING_IP***
```

### 5.4 Test Domain Access

```bash
# Try to connect via domain (will show Nginx default page for now)
curl -I http://tms.yourcompany.com
curl -I http://staging.tms.yourcompany.com
```

---

## Step 6: Deploy Application Code

### 6.1 Prepare Application for Deployment

On your **local machine**:

```bash
# Navigate to project
cd /path/to/your/project

# Ensure everything is committed
git status
git add .
git commit -m "Prepare for deployment"

# Optional: Create a deployment tag
git tag -a v1.0.0 -m "First production deployment"
git push origin main --tags
```

### 6.2 Upload Application Code

**Option A: Using rsync (Recommended - works with private repos)**

```bash
# Upload to staging
rsync -avz --exclude 'node_modules' \
           --exclude '.next' \
           --exclude '.git' \
           --exclude 'deployment/.env.*' \
           ./ gcgc-staging:/var/www/gcgc-tms-staging/

# Upload to production
rsync -avz --exclude 'node_modules' \
           --exclude '.next' \
           --exclude '.git' \
           --exclude 'deployment/.env.*' \
           ./ gcgc-production:/var/www/gcgc-tms-production/
```

**Option B: Using git clone (if repository is public)**

```bash
# On staging server
ssh gcgc-staging
cd /var/www/gcgc-tms-staging
git clone https://github.com/yourusername/your-repo.git .

# On production server
ssh gcgc-production
cd /var/www/gcgc-tms-production
git clone https://github.com/yourusername/your-repo.git .
```

### 6.3 Verify Upload

```bash
# Check files on staging
ssh gcgc-staging "ls -la /var/www/gcgc-tms-staging/"

# Check files on production
ssh gcgc-production "ls -la /var/www/gcgc-tms-production/"
```

**You should see:**
```
src/
prisma/
public/
package.json
next.config.js
server.js
... (all your project files)
```

---

## Step 7: Configure Environment Variables

### 7.1 Create Staging Environment File

```bash
# Create deployment/.env.staging locally
cat > deployment/.env.staging << 'EOF'
# Node Environment
NODE_ENV=production

# Application URLs
NEXTAUTH_URL=http://staging.tms.yourcompany.com  # ⚠️ CHANGE THIS
APP_URL=http://staging.tms.yourcompany.com        # ⚠️ CHANGE THIS

# Database (RDS PostgreSQL)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@rds-host.rds.aliyuncs.com:5432/gcgc_tms_staging_db?schema=public&connection_limit=10&pool_timeout=20

# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your_staging_secret_here

# API Key (generate with: openssl rand -base64 32)
API_KEY=your_staging_api_key_here

# Redis (Tair)
REDIS_URL=redis://default:YOUR_REDIS_PASSWORD@redis-host.redis.aliyuncs.com:6379

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_FOLDER=GCGC_TMS_STAGING
EOF
```

### 7.2 Create Production Environment File

```bash
# Create deployment/.env.production locally
cat > deployment/.env.production << 'EOF'
# Node Environment
NODE_ENV=production

# Application URLs (⚠️ Will be HTTP initially, change to HTTPS after SSL setup)
NEXTAUTH_URL=http://tms.yourcompany.com  # ⚠️ CHANGE THIS
APP_URL=http://tms.yourcompany.com        # ⚠️ CHANGE THIS

# Database (RDS PostgreSQL)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@rds-host.rds.aliyuncs.com:5432/gcgc_tms_production_db?schema=public&connection_limit=20&pool_timeout=20

# NextAuth Secret (⚠️ GENERATE NEW SECRET FOR PRODUCTION)
NEXTAUTH_SECRET=your_production_secret_here

# API Key (⚠️ GENERATE NEW KEY FOR PRODUCTION)
API_KEY=your_production_api_key_here

# Redis (Tair)
REDIS_URL=redis://default:YOUR_REDIS_PASSWORD@redis-host.redis.aliyuncs.com:6379

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_FOLDER=GCGC_TMS_PRODUCTION
EOF
```

### 7.3 Generate Secure Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate API_KEY
openssl rand -base64 32
```

### 7.4 Upload Environment Files

```bash
# Upload to staging
scp deployment/.env.staging gcgc-staging:/var/www/gcgc-tms-staging/.env

# Upload to production
scp deployment/.env.production gcgc-production:/var/www/gcgc-tms-production/.env

# Set proper permissions
ssh gcgc-staging "chmod 600 /var/www/gcgc-tms-staging/.env"
ssh gcgc-production "chmod 600 /var/www/gcgc-tms-production/.env"
```

### 7.5 Verify Environment Files

```bash
# Check staging (do NOT print to terminal for security)
ssh gcgc-staging "test -f /var/www/gcgc-tms-staging/.env && echo 'Staging .env exists' || echo 'ERROR: .env missing'"

# Check production
ssh gcgc-production "test -f /var/www/gcgc-tms-production/.env && echo 'Production .env exists' || echo 'ERROR: .env missing'"
```

---

## Step 8: Build and Start Application

### 8.1 Install Dependencies and Build (Staging)

```bash
# SSH into staging
ssh gcgc-staging

# Navigate to app directory
cd /var/www/gcgc-tms-staging

# Install dependencies (use npm ci for clean install)
npm ci

# Generate Prisma client
npx prisma generate

# Build Next.js application
npm run build

# Run database migrations
npx prisma migrate deploy

# Exit SSH
exit
```

**Expected output:**
```
✓ Compiled successfully
✓ Generating static pages
5 migrations applied successfully
```

### 8.2 Create PM2 Configuration (Staging)

```bash
# Create PM2 config locally
cat > deployment/pm2.staging.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'gcgc-tms-staging',
    script: 'server.js',
    instances: 1,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/pm2/gcgc-tms-staging-error.log',
    out_file: '/var/log/pm2/gcgc-tms-staging-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
}
EOF

# Upload to staging
scp deployment/pm2.staging.config.js gcgc-staging:/var/www/gcgc-tms-staging/
```

### 8.3 Start Application with PM2 (Staging)

```bash
# Start the application
ssh gcgc-staging "cd /var/www/gcgc-tms-staging && pm2 start pm2.staging.config.js && pm2 save"

# Check status
ssh gcgc-staging "pm2 status"
```

**Expected output:**
```
┌────┬──────────────────┬─────────┬─────────┬──────┬────────┬
│ id │ name             │ status  │ cpu     │ mem  │ uptime │
├────┼──────────────────┼─────────┼─────────┼──────┼────────┼
│ 0  │ gcgc-tms-staging │ online  │ 0%      │ 95mb │ 10s    │
└────┴──────────────────┴─────────┴─────────┴──────┴────────┘
```

### 8.4 Repeat for Production

```bash
# SSH into production
ssh gcgc-production
cd /var/www/gcgc-tms-production

# Install and build
npm ci
npx prisma generate
npm run build
npx prisma migrate deploy
exit

# Create PM2 config for production
cat > deployment/pm2.production.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'gcgc-tms-production',
    script: 'server.js',
    instances: 2,  // Multiple instances for production
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/gcgc-tms-production-error.log',
    out_file: '/var/log/pm2/gcgc-tms-production-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
}
EOF

# Upload and start
scp deployment/pm2.production.config.js gcgc-production:/var/www/gcgc-tms-production/
ssh gcgc-production "cd /var/www/gcgc-tms-production && pm2 start pm2.production.config.js && pm2 save"
ssh gcgc-production "pm2 status"
```

### 8.5 Test Application Directly

```bash
# Test staging on localhost
ssh gcgc-staging "curl -I http://localhost:3001"

# Test production on localhost
ssh gcgc-production "curl -I http://localhost:3000"
```

**Expected:** HTTP 200 or 404 (both mean app is running)

---

## Step 9: Configure Nginx (HTTP)

### 9.1 Create Nginx Configuration (Staging)

```bash
cat > deployment/nginx-staging.conf << 'EOF'
# GCGC TMS - Staging Nginx Configuration

upstream gcgc_tms_staging {
    server 127.0.0.1:3001;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;

    server_name staging.tms.yourcompany.com;  # ⚠️ CHANGE THIS

    # Logging
    access_log /var/log/nginx/gcgc-tms-staging-access.log;
    error_log /var/log/nginx/gcgc-tms-staging-error.log;

    # Client upload size
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript;

    # Root location
    location / {
        proxy_pass http://gcgc_tms_staging;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO WebSocket support
    location /socket.io/ {
        proxy_pass http://gcgc_tms_staging;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;

        proxy_buffering off;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
EOF
```

### 9.2 Create Nginx Configuration (Production)

```bash
cat > deployment/nginx-production.conf << 'EOF'
# GCGC TMS - Production Nginx Configuration

upstream gcgc_tms_production {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;

    server_name tms.yourcompany.com;  # ⚠️ CHANGE THIS

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/gcgc-tms-production-access.log;
    error_log /var/log/nginx/gcgc-tms-production-error.log;

    # Client upload size
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript;

    # Root location
    location / {
        proxy_pass http://gcgc_tms_production;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO WebSocket support
    location /socket.io/ {
        proxy_pass http://gcgc_tms_production;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;

        proxy_buffering off;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Static files cache
    location /_next/static {
        proxy_pass http://gcgc_tms_production;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
EOF
```

### 9.3 Deploy Nginx Configuration

**For Staging:**
```bash
# Upload config
scp deployment/nginx-staging.conf gcgc-staging:/tmp/

# Install config
ssh gcgc-staging << 'ENDSSH'
sudo mv /tmp/nginx-staging.conf /etc/nginx/sites-available/gcgc-tms-staging
sudo ln -sf /etc/nginx/sites-available/gcgc-tms-staging /etc/nginx/sites-enabled/gcgc-tms-staging
sudo nginx -t
sudo systemctl reload nginx
ENDSSH
```

**For Production:**
```bash
# Upload config
scp deployment/nginx-production.conf gcgc-production:/tmp/

# Install config
ssh gcgc-production << 'ENDSSH'
sudo mv /tmp/nginx-production.conf /etc/nginx/sites-available/gcgc-tms-production
sudo ln -sf /etc/nginx/sites-available/gcgc-tms-production /etc/nginx/sites-enabled/gcgc-tms-production
sudo nginx -t
sudo systemctl reload nginx
ENDSSH
```

### 9.4 Test HTTP Access

```bash
# Test staging via domain
curl -I http://staging.tms.yourcompany.com

# Test production via domain
curl -I http://tms.yourcompany.com
```

**You should now be able to access:**
- Staging: `http://staging.tms.yourcompany.com`
- Production: `http://tms.yourcompany.com`

**⚠️ Still shows "Not Secure" - we'll fix this in the next step!**

---

## Step 10: Set Up SSL Certificate (HTTPS)

This is the most important step for security!

### 10.1 Install Certbot (Let's Encrypt Client)

**On Staging Server:**
```bash
ssh gcgc-staging << 'ENDSSH'
# Install Certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
ENDSSH
```

**On Production Server:**
```bash
ssh gcgc-production << 'ENDSSH'
# Install Certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
ENDSSH
```

### 10.2 Obtain SSL Certificate (Staging)

```bash
ssh gcgc-staging

# Run Certbot
sudo certbot --nginx -d staging.tms.yourcompany.com

# Follow the prompts:
# - Enter email address
# - Agree to terms (Y)
# - Share email with EFF (optional)
# - Choose option 2: Redirect HTTP to HTTPS (recommended)

# Exit
exit
```

**Certbot will automatically:**
1. Verify domain ownership
2. Generate SSL certificate
3. Modify Nginx configuration
4. Set up auto-renewal

### 10.3 Obtain SSL Certificate (Production)

```bash
ssh gcgc-production

# Run Certbot
sudo certbot --nginx -d tms.yourcompany.com

# Follow the prompts (same as staging)
# Choose option 2: Redirect HTTP to HTTPS

# Exit
exit
```

### 10.4 Verify SSL Certificates

```bash
# Check staging certificate
ssh gcgc-staging "sudo certbot certificates"

# Check production certificate
ssh gcgc-production "sudo certbot certificates"
```

**Expected output:**
```
Certificate Name: staging.tms.yourcompany.com
  Domains: staging.tms.yourcompany.com
  Expiry Date: [90 days from now]
  Certificate Path: /etc/letsencrypt/live/staging.tms.yourcompany.com/fullchain.pem
  Private Key Path: /etc/letsencrypt/live/staging.tms.yourcompany.com/privkey.pem
```

### 10.5 Test Auto-Renewal

```bash
# Test renewal on staging
ssh gcgc-staging "sudo certbot renew --dry-run"

# Test renewal on production
ssh gcgc-production "sudo certbot renew --dry-run"
```

**Expected:** "Congratulations, all simulated renewals succeeded"

---

## Step 11: Configure Nginx (HTTPS)

### 11.1 Verify Certbot Modified Nginx Config

Certbot should have automatically updated your Nginx configuration. Let's verify:

```bash
# Check staging Nginx config
ssh gcgc-staging "sudo cat /etc/nginx/sites-available/gcgc-tms-staging | grep -A5 'listen 443'"

# Check production Nginx config
ssh gcgc-production "sudo cat /etc/nginx/sites-available/gcgc-tms-production | grep -A5 'listen 443'"
```

**You should see:**
```nginx
listen 443 ssl; # managed by Certbot
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem; # managed by Certbot
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem; # managed by Certbot
```

### 11.2 Update Environment Variables for HTTPS

Now that SSL is working, update your environment variables:

**Update .env.staging:**
```bash
# Edit local file
nano deployment/.env.staging

# Change:
NEXTAUTH_URL=http://staging.tms.yourcompany.com
# To:
NEXTAUTH_URL=https://staging.tms.yourcompany.com

# And:
APP_URL=http://staging.tms.yourcompany.com
# To:
APP_URL=https://staging.tms.yourcompany.com

# Upload updated file
scp deployment/.env.staging gcgc-staging:/var/www/gcgc-tms-staging/.env

# Restart app
ssh gcgc-staging "cd /var/www/gcgc-tms-staging && pm2 restart gcgc-tms-staging"
```

**Update .env.production:**
```bash
# Edit local file
nano deployment/.env.production

# Change HTTP to HTTPS
NEXTAUTH_URL=https://tms.yourcompany.com
APP_URL=https://tms.yourcompany.com

# Upload
scp deployment/.env.production gcgc-production:/var/www/gcgc-tms-production/.env

# Restart
ssh gcgc-production "cd /var/www/gcgc-tms-production && pm2 restart gcgc-tms-production"
```

### 11.3 Optimize SSL Configuration (Optional but Recommended)

Create enhanced SSL configuration:

```bash
# Create SSL configuration file on staging
ssh gcgc-staging << 'ENDSSH'
sudo cat > /etc/nginx/snippets/ssl-params.conf << 'EOF'
# SSL Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HSTS (uncomment after testing)
# add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
EOF

# Include in your site config
sudo sed -i '/ssl_certificate_key/a\    include /etc/nginx/snippets/ssl-params.conf;' /etc/nginx/sites-available/gcgc-tms-staging

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
ENDSSH

# Repeat for production
ssh gcgc-production << 'ENDSSH'
sudo cat > /etc/nginx/snippets/ssl-params.conf << 'EOF'
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_stapling on;
ssl_stapling_verify on;
EOF

sudo sed -i '/ssl_certificate_key/a\    include /etc/nginx/snippets/ssl-params.conf;' /etc/nginx/sites-available/gcgc-tms-production
sudo nginx -t && sudo systemctl reload nginx
ENDSSH
```

---

## Step 12: Final Testing & Verification

### 12.1 Test HTTPS Access

Open in your browser:
```
https://staging.tms.yourcompany.com
https://tms.yourcompany.com
```

**You should see:**
- ✅ Green padlock 🔒 in address bar
- ✅ "Connection is secure"
- ✅ No browser warnings
- ✅ Your application loads correctly

### 12.2 Test HTTP to HTTPS Redirect

```bash
# Test redirect on staging
curl -I http://staging.tms.yourcompany.com

# Test redirect on production
curl -I http://tms.yourcompany.com
```

**Expected output:**
```
HTTP/1.1 301 Moved Permanently
Location: https://staging.tms.yourcompany.com/
```

### 12.3 Verify SSL Certificate

Test with SSL Labs:
1. Go to: https://www.ssllabs.com/ssltest/
2. Enter your domain: `tms.yourcompany.com`
3. Wait for analysis
4. **Target grade: A or A+**

### 12.4 Test All Application Features

**Staging:** https://staging.tms.yourcompany.com

- [ ] Landing page loads
- [ ] Sign in page loads
- [ ] Registration page loads
- [ ] Can create admin account
- [ ] Admin login works
- [ ] Admin dashboard accessible
- [ ] Can create users
- [ ] Can create tasks
- [ ] WebSocket/real-time features work
- [ ] File uploads work (Cloudinary)
- [ ] Google Calendar OAuth works

**Production:** https://tms.yourcompany.com

- [ ] Repeat all tests above
- [ ] Test with multiple users simultaneously
- [ ] Check performance (page load times)
- [ ] Verify mobile responsiveness

### 12.5 Update Google OAuth Redirect URIs

**CRITICAL:** Update Google Cloud Console:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. Add Authorized redirect URIs:
   ```
   https://staging.tms.yourcompany.com/api/calendar/google-callback
   https://tms.yourcompany.com/api/calendar/google-callback
   ```
4. Click **Save**

### 12.6 Verify Database Connections

```bash
# Check database on staging
ssh gcgc-staging "cd /var/www/gcgc-tms-staging && npx prisma db pull"

# Check database on production
ssh gcgc-production "cd /var/www/gcgc-tms-production && npx prisma db pull"
```

### 12.7 Monitor Application Logs

```bash
# Staging logs
ssh gcgc-staging "pm2 logs gcgc-tms-staging --lines 50"

# Production logs
ssh gcgc-production "pm2 logs gcgc-tms-production --lines 50"

# Nginx logs
ssh gcgc-staging "sudo tail -f /var/log/nginx/gcgc-tms-staging-access.log"
ssh gcgc-production "sudo tail -f /var/log/nginx/gcgc-tms-production-access.log"
```

### 12.8 Performance Check

```bash
# Check PM2 status and resource usage
ssh gcgc-staging "pm2 status && pm2 monit"
ssh gcgc-production "pm2 status && pm2 monit"
```

**Expected:**
- CPU: 0-5% idle
- Memory: < 500MB per instance
- Status: online
- Restarts: 0

---

## 🎉 Deployment Complete!

Your application is now:
- ✅ **Deployed** to Alibaba Cloud ECS
- ✅ **Accessible** via custom domain names
- ✅ **Secured** with HTTPS/SSL certificates
- ✅ **Running** with PM2 process management
- ✅ **Proxied** through Nginx
- ✅ **Connected** to PostgreSQL and Redis
- ✅ **Monitored** with logs and auto-restart

**Your URLs:**
- Production: `https://tms.yourcompany.com` 🔒
- Staging: `https://staging.tms.yourcompany.com` 🔒

---

## Troubleshooting

### Issue: Cannot SSH to Server

**Symptoms:**
```
Permission denied (publickey)
```

**Solutions:**
1. Check SSH key permissions:
   ```bash
   chmod 400 ~/.ssh/your-key.pem
   ```

2. Verify you're using correct user:
   ```bash
   ssh -i ~/.ssh/your-key.pem root@YOUR_IP
   ```

3. Check Alibaba Cloud security group allows port 22

---

### Issue: Domain Not Resolving

**Symptoms:**
```
This site can't be reached
```

**Solutions:**
1. Check DNS propagation:
   ```bash
   dig yourdomain.com
   nslookup yourdomain.com
   ```

2. Wait for DNS propagation (up to 48 hours, usually 5-30 minutes)

3. Verify A record points to correct IP:
   ```bash
   # Should show your ECS IP
   host yourdomain.com
   ```

---

### Issue: Nginx Shows Default Page

**Symptoms:**
"Welcome to nginx!" page instead of your app

**Solutions:**
1. Check Nginx configuration:
   ```bash
   ssh gcgc-staging "sudo nginx -t"
   ```

2. Verify site is enabled:
   ```bash
   ssh gcgc-staging "ls -la /etc/nginx/sites-enabled/"
   ```

3. Check server_name in config matches your domain:
   ```bash
   ssh gcgc-staging "sudo cat /etc/nginx/sites-enabled/gcgc-tms-staging | grep server_name"
   ```

4. Reload Nginx:
   ```bash
   ssh gcgc-staging "sudo systemctl reload nginx"
   ```

---

### Issue: SSL Certificate Failed

**Symptoms:**
```
Failed authorization procedure
```

**Solutions:**
1. Verify domain DNS is correct:
   ```bash
   dig yourdomain.com  # Should show your ECS IP
   ```

2. Check port 80 is open:
   ```bash
   curl -I http://yourdomain.com
   ```

3. Try manual verification:
   ```bash
   sudo certbot certonly --webroot -w /var/www/html -d yourdomain.com
   ```

4. Check Nginx is running:
   ```bash
   sudo systemctl status nginx
   ```

---

### Issue: Application Not Starting

**Symptoms:**
```
PM2: Process exited
```

**Solutions:**
1. Check PM2 logs:
   ```bash
   ssh gcgc-staging "pm2 logs gcgc-tms-staging --lines 100"
   ```

2. Verify environment variables:
   ```bash
   ssh gcgc-staging "cat /var/www/gcgc-tms-staging/.env"
   ```

3. Test application manually:
   ```bash
   ssh gcgc-staging
   cd /var/www/gcgc-tms-staging
   npm run start
   ```

4. Check database connection:
   ```bash
   npx prisma db pull
   ```

---

### Issue: Database Connection Failed

**Symptoms:**
```
Can't reach database server
```

**Solutions:**
1. Check RDS whitelist includes your ECS IP
2. Verify database credentials in .env
3. Test connection manually:
   ```bash
   psql "postgresql://user:pass@host:5432/dbname"
   ```

4. Check RDS instance is running in Alibaba Cloud Console

---

### Issue: 502 Bad Gateway

**Symptoms:**
"502 Bad Gateway" error page

**Solutions:**
1. Check if app is running:
   ```bash
   ssh gcgc-staging "pm2 status"
   ```

2. Verify app is listening on correct port:
   ```bash
   ssh gcgc-staging "netstat -tlnp | grep 3001"
   ```

3. Check PM2 logs for errors:
   ```bash
   ssh gcgc-staging "pm2 logs --err"
   ```

4. Restart application:
   ```bash
   ssh gcgc-staging "pm2 restart gcgc-tms-staging"
   ```

---

## Maintenance & Updates

### Deploying Code Updates

**Create a deployment script:**

```bash
cat > deployment/deploy-staging.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying to Staging..."

# Upload new code
rsync -avz --exclude 'node_modules' \
           --exclude '.next' \
           --exclude '.git' \
           ./ gcgc-staging:/var/www/gcgc-tms-staging/

# SSH and rebuild
ssh gcgc-staging << 'ENDSSH'
cd /var/www/gcgc-tms-staging
npm ci
npm run build
npx prisma migrate deploy
pm2 restart gcgc-tms-staging
ENDSSH

echo "✅ Staging deployment complete!"
echo "Visit: https://staging.tms.yourcompany.com"
EOF

chmod +x deployment/deploy-staging.sh
```

**Usage:**
```bash
# Deploy to staging
./deployment/deploy-staging.sh

# Deploy to production (create similar script)
./deployment/deploy-production.sh
```

### SSL Certificate Renewal

Certbot auto-renews certificates. To check:

```bash
# Check auto-renewal timer
ssh gcgc-staging "sudo systemctl status certbot.timer"

# Manually renew if needed
ssh gcgc-staging "sudo certbot renew"
```

### Database Backups

```bash
# Create backup script
cat > deployment/backup-database.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump "postgresql://user:pass@host:5432/dbname" > backup_$DATE.sql
EOF
```

### Monitoring

Set up monitoring for:
- Application uptime (UptimeRobot, Pingdom)
- Server resources (Alibaba Cloud Monitor)
- SSL expiration (SSL Monitor)
- Error tracking (Sentry)

---

## Security Checklist

Before going live:

- [ ] SSL/HTTPS enabled and working
- [ ] SSH key authentication (no password login)
- [ ] Firewall configured (UFW or security groups)
- [ ] Database has strong password
- [ ] Environment variables are secure
- [ ] No secrets in git repository
- [ ] CORS configured properly
- [ ] Security headers enabled in Nginx
- [ ] Regular backups scheduled
- [ ] Monitoring and alerts set up

---

## Conclusion

You now have a fully functional, secure, production-ready Next.js application deployed on Alibaba Cloud with HTTPS!

**What you accomplished:**
1. ✅ Set up two ECS instances (staging & production)
2. ✅ Installed and configured all required software
3. ✅ Deployed your application code
4. ✅ Configured custom domain names
5. ✅ Secured with SSL/HTTPS certificates
6. ✅ Set up automated deployment
7. ✅ Implemented monitoring and logging

**Next steps:**
- Monitor your application
- Set up automated backups
- Configure CI/CD pipeline
- Add monitoring/alerting
- Optimize performance
- Scale as needed

**Need help?** Refer to the troubleshooting section or consult:
- Alibaba Cloud Documentation
- Next.js Documentation
- Nginx Documentation
- Let's Encrypt Documentation

---

**Deployment Guide Version:** 1.0.0
**Last Updated:** December 2025
**Maintained by:** GCGC Development Team
