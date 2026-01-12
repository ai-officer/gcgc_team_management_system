# Understanding Your ECS Deployment - Complete Educational Guide

This guide explains **every single detail** of your deployment setup. Perfect for learning and future reference!

---

## 📚 Table of Contents

1. [What is ECS and How Does It Work?](#what-is-ecs)
2. [Your Server Architecture Explained](#server-architecture)
3. [Understanding Each Shell Script](#shell-scripts-explained)
4. [How PM2 Works](#pm2-deep-dive)
5. [How Nginx Works](#nginx-deep-dive)
6. [The Complete Deployment Flow](#deployment-flow)
7. [Network Architecture](#network-architecture)
8. [Security Concepts](#security-concepts)
9. [Troubleshooting from First Principles](#troubleshooting-principles)

---

## What is ECS?

### ECS = Elastic Compute Service

Think of ECS as **renting a computer in the cloud**. That's it!

```
Your ECS Instance = A Virtual Computer Running Linux

Just like your laptop, but:
- Runs 24/7 in a data center
- Has a public IP address (accessible from internet)
- Has a private IP address (for internal communication)
- You access it via SSH (remote terminal)
```

### What's Inside Your ECS?

```
┌─────────────────────────────────────────────┐
│         Your ECS Instance                    │
│  ┌────────────────────────────────────┐     │
│  │   Operating System (Ubuntu/CentOS) │     │
│  └────────────────────────────────────┘     │
│                                              │
│  Software We Install:                        │
│  ├─ Node.js 20.x   (runs your app)          │
│  ├─ PM2            (keeps app running)       │
│  ├─ Nginx          (web server)              │
│  ├─ Git            (pull code updates)       │
│  └─ PostgreSQL CLI (database management)     │
│                                              │
│  Your Application:                           │
│  └─ /var/www/gcgc-tms-staging/              │
│     ├─ Your Next.js code                     │
│     ├─ node_modules/                         │
│     ├─ .next/ (built app)                    │
│     └─ .env (environment variables)          │
└──────────────────────────────────────────────┘
```

### ECS vs Your Local Computer

| Feature | Your Laptop | ECS Instance |
|---------|-------------|--------------|
| **Location** | On your desk | In Alibaba data center |
| **Uptime** | When you're using it | 24/7/365 |
| **Access** | Direct (keyboard) | Via SSH (internet) |
| **IP Address** | Changes | Fixed (static) |
| **Purpose** | Development | Production hosting |
| **Cost** | One-time | Monthly subscription |

---

## Server Architecture

### The Big Picture

```
                    INTERNET
                       │
                       │ HTTP Request
                       │
                       ▼
        ┌──────────────────────────────┐
        │   Alibaba Cloud ECS          │
        │   IP: ***REDACTED_STAGING_IP***           │
        │                              │
        │   ┌──────────────────┐       │
        │   │   Nginx          │◄──────┼─── Port 80 (HTTP)
        │   │   (Web Server)   │       │    Port 443 (HTTPS)
        │   └────────┬─────────┘       │
        │            │                 │
        │            │ Proxy Pass      │
        │            │                 │
        │   ┌────────▼─────────┐       │
        │   │   PM2            │◄──────┼─── Port 3001 (internal)
        │   │   Process Mgr    │       │
        │   └────────┬─────────┘       │
        │            │                 │
        │            │ Runs            │
        │            │                 │
        │   ┌────────▼─────────┐       │
        │   │   Node.js        │       │
        │   │   Your App       │       │
        │   │   (Next.js)      │       │
        │   └──┬───┬───┬───────┘       │
        │      │   │   │               │
        └──────┼───┼───┼───────────────┘
               │   │   │
               │   │   │ Network Calls
               │   │   │
         ┌─────▼┐  │  ┌▼────────────┐
         │ RDS  │  │  │    OSS      │
         │ DB   │  │  │ File Storage│
         └──────┘  │  └─────────────┘
              ┌────▼──┐
              │ Redis │
              │ Cache │
              └───────┘
```

### Why This Architecture?

#### **Why Nginx?**
```
Without Nginx:
User → Your App (port 3001)
Problems:
- Can't handle SSL/HTTPS easily
- No static file caching
- No load balancing
- Security issues

With Nginx:
User → Nginx (port 80/443) → Your App (port 3001)
Benefits:
✅ SSL/HTTPS termination
✅ Static file caching
✅ Compression (gzip)
✅ Security headers
✅ Load balancing (multiple instances)
```

#### **Why PM2?**
```
Without PM2:
node server.js
Problems:
- Crashes? App dies
- Server restarts? App doesn't start
- No monitoring
- Single process (no clustering)

With PM2:
pm2 start server.js
Benefits:
✅ Auto-restart on crash
✅ Auto-start on server reboot
✅ Clustering (multiple processes)
✅ Log management
✅ Monitoring
```

---

## Shell Scripts Explained

### Script 1: `setup-ssh.sh`

**Purpose**: Configure your computer to easily connect to ECS servers.

**Line-by-Line Explanation**:

```bash
#!/bin/bash
# This is called a "shebang" - tells the system to run this with bash
```

```bash
set -e
# "Exit on error" - if any command fails, stop the script
# Without this, script continues even after errors
```

```bash
PEM_SOURCE="/Users/kyleisaacmendoza/Downloads/sogo-infra-key.pem"
PEM_DEST="$HOME/.ssh/sogo-infra-key.pem"
# Define variables for source and destination of SSH key
# $HOME = your home directory (e.g., /Users/kyleisaacmendoza)
```

```bash
if [ ! -f "$PEM_SOURCE" ]; then
# Checks if file exists
# -f = "is this a file?"
# ! = "not"
# So: "if file does NOT exist"
```

```bash
mkdir -p ~/.ssh
# Create .ssh directory if it doesn't exist
# -p = "don't error if directory already exists, create parent directories if needed"
```

```bash
cp "$PEM_SOURCE" "$PEM_DEST"
# Copy SSH key from Downloads to .ssh folder
# Why? Convention - SSH keys go in ~/.ssh/
```

```bash
chmod 400 "$PEM_DEST"
# Change file permissions to 400
# 4 = read permission
# 0 = no write permission
# 0 = no execute permission
# First digit = owner, second = group, third = others
# SSH REQUIRES this - won't work with more permissive permissions
```

**Why 400 permissions?**
```
Permissions explained:
777 = Everyone can read, write, execute (DANGEROUS!)
644 = Owner read/write, others read (normal file)
400 = Owner read only (SSH key requirement)

SSH refuses to use keys with loose permissions for security:
- Prevents malware from modifying your key
- Prevents other users from reading your key
```

```bash
cat >> "$SSH_CONFIG" << 'EOF'
# Append to SSH config file
# >> = append (not overwrite)
# << 'EOF' = "here document" - everything until EOF is the content
# 'EOF' (with quotes) = don't substitute variables
```

**SSH Config Explanation**:
```bash
Host gcgc-staging
# This is a nickname - you type: ssh gcgc-staging

    HostName ***REDACTED_STAGING_IP***
    # The actual IP address to connect to

    User root
    # Username to login as
    # Could be: root, ubuntu, admin (depends on OS)

    IdentityFile ~/.ssh/sogo-infra-key.pem
    # Path to your SSH private key

    ServerAliveInterval 60
    # Send "keepalive" packet every 60 seconds
    # Prevents connection timeout

    ServerAliveCountMax 3
    # After 3 failed keepalives (180 seconds), disconnect
    # Total timeout = 60 × 3 = 180 seconds
```

**What happens when you run this?**
```
Before:
ssh -i /Users/.../Downloads/sogo-infra-key.pem root@***REDACTED_STAGING_IP***

After:
ssh gcgc-staging
```

---

### Script 2: `server-setup.sh`

**Purpose**: Install all required software on your ECS server.

**Section 1: OS Detection**
```bash
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
```

**What this does:**
```
/etc/os-release contains:
ID=ubuntu
VERSION_ID="22.04"
...

The . command "sources" the file (loads variables)
Then we extract $ID to know: ubuntu, centos, debian, etc.

Why? Different Linux distributions use different package managers:
- Ubuntu/Debian → apt-get
- CentOS/RHEL → yum
```

**Section 2: Package Updates**
```bash
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt-get update
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    sudo yum update -y
fi
```

**Understanding apt-get update:**
```
What it does:
1. Contacts package repositories (servers with software lists)
2. Downloads latest package lists
3. Updates local database of available software

Think of it like:
- App Store → "Check for Updates"
- apt-get update → Gets the latest catalog
- apt-get install → Actually installs software
```

**Section 3: Installing Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
```

**Breaking this down:**
```bash
curl
# Command to download files from internet

-fsSL
# f = Fail silently on server errors
# s = Silent (no progress bar)
# S = Show errors
# L = Follow redirects

https://deb.nodesource.com/setup_20.x
# URL of Node.js setup script

|
# Pipe operator - sends output to next command

sudo -E bash -
# sudo = Run as administrator
# -E = Preserve environment variables
# bash - = Execute the downloaded script
```

**Why this method?**
```
Ubuntu default Node.js = v12 (old)
We need v20 (latest LTS)

NodeSource provides official packages:
1. Setup script adds NodeSource repository
2. Then apt-get can install Node.js 20.x
```

**Section 4: Installing PM2**
```bash
sudo npm install -g pm2
```

```bash
npm install
# Install npm package

-g
# "global" - available system-wide, not just in current directory
# Installs to: /usr/local/lib/node_modules/
# Creates command: /usr/local/bin/pm2

sudo
# Required because we're installing to system directories
# Without sudo, you'd get "permission denied"
```

**Section 5: PM2 Startup**
```bash
sudo pm2 startup systemd -u $USER --hp $HOME
```

**What this does:**
```
Creates a systemd service that:
1. Starts PM2 when server boots
2. Restores saved PM2 processes
3. Runs as your user (not root)

systemd = Linux system manager
-u $USER = Run as current user
--hp $HOME = Set home directory

Result:
Server reboots → systemd starts PM2 → PM2 starts your app
```

**Section 6: Installing Nginx**
```bash
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

```bash
systemctl start nginx
# Starts Nginx immediately

systemctl enable nginx
# Enable auto-start on boot

What's the difference?
start = starts NOW
enable = starts on REBOOT
You usually want both!
```

**Section 7: Directory Creation**
```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
```

```bash
mkdir -p /var/www
# Create directory
# -p = create parent directories if needed

chown -R $USER:$USER /var/www
# Change ownership
# -R = Recursive (all files inside)
# $USER:$USER = user:group
# Now you can write to /var/www without sudo
```

---

### Script 3: `deploy-staging.sh`

**Purpose**: Automatically deploy code updates to staging server.

**Section 1: Configuration Variables**
```bash
REMOTE_HOST="gcgc-staging"
REMOTE_DIR="/var/www/gcgc-tms-staging"
APP_NAME="gcgc-tms-staging"
BRANCH="staging"
```

**Why use variables?**
```bash
# Without variables (hard to maintain):
ssh gcgc-staging
cd /var/www/gcgc-tms-staging
pm2 restart gcgc-tms-staging

# With variables (change once, update everywhere):
ssh $REMOTE_HOST
cd $REMOTE_DIR
pm2 restart $APP_NAME

If server changes, update one line!
```

**Section 2: SSH Config Check**
```bash
if ! grep -q "Host $REMOTE_HOST" ~/.ssh/config 2>/dev/null; then
```

```bash
grep
# Search for text in file

-q
# "Quiet" mode - don't print matches, just return success/fail

"Host $REMOTE_HOST"
# Search for: Host gcgc-staging

~/.ssh/config
# File to search

2>/dev/null
# Redirect error output (stderr) to /dev/null (trash)
# So if file doesn't exist, no error message

!
# Negate the result - "if NOT found"
```

**Section 3: SSH Connection Test**
```bash
if ! ssh -o ConnectTimeout=10 $REMOTE_HOST "echo 'SSH OK'"; then
```

```bash
-o ConnectTimeout=10
# Option: timeout after 10 seconds
# Without this, SSH might hang for minutes

"echo 'SSH OK'"
# Command to run on remote server
# If successful, prints "SSH OK"

The entire if statement:
"If SSH command fails, show error and exit"
```

**Section 4: Remote Deployment Commands**
```bash
ssh $REMOTE_HOST << 'ENDSSH'
set -e
...commands...
ENDSSH
```

**Understanding Here Documents:**
```bash
ssh server << 'ENDSSH'
# Everything between << 'ENDSSH' and ENDSSH is sent to the remote server

The 'ENDSSH' (with quotes) means:
- Don't expand variables on local machine
- Send them to remote machine as-is

Example:
ssh server << 'EOF'
  echo $HOSTNAME
EOF

$HOSTNAME is expanded on REMOTE server, not your local machine
```

**Section 5: Git Operations**
```bash
git fetch origin
git checkout staging
git pull origin staging
```

```bash
git fetch origin
# Download all changes from remote repository
# Doesn't modify your working files

git checkout staging
# Switch to staging branch
# Ensures we're on the right branch

git pull origin staging
# Download and merge changes from staging branch
# Updates your working files
```

**Why three commands?**
```
fetch + checkout + pull = Safe

Direct pull might fail if you're on wrong branch
This way we ensure we're always on correct branch
```

**Section 6: npm ci**
```bash
npm ci --production=false
```

```bash
npm ci
# "Clean install" - different from npm install

Differences:
npm install:
- Reads package.json
- Updates package-lock.json
- Installs latest compatible versions

npm ci:
- Reads package-lock.json only
- Doesn't update package-lock.json
- Installs EXACT versions
- Faster
- More reliable for production

--production=false
# Install ALL dependencies (including devDependencies)
# We need devDependencies to build (like TypeScript, ESLint)
```

**Section 7: Build Process**
```bash
npm run build
```

**What happens during build:**
```bash
1. Prisma generates client code
   - Reads prisma/schema.prisma
   - Generates TypeScript types
   - Creates database query functions

2. TypeScript compiles to JavaScript
   - .ts → .js
   - Type checking
   - Creates .d.ts files

3. Next.js builds for production
   - Optimizes pages
   - Creates static assets
   - Generates .next/ directory
   - Takes 2-5 minutes

Result: /var/www/gcgc-tms-staging/.next/
```

**Section 8: Database Migrations**
```bash
npx prisma migrate deploy
```

```bash
npx
# "Node Package eXecute"
# Runs a package's binary without installing globally

prisma migrate deploy
# Runs pending database migrations
# Only runs migrations that haven't been applied yet

How it knows:
- Checks _prisma_migrations table
- Compares with prisma/migrations/ folder
- Runs only new migrations

Safe for production:
- Won't rerun old migrations
- Won't lose data
- Idempotent (safe to run multiple times)
```

**Section 9: PM2 Operations**
```bash
pm2 restart gcgc-tms-staging || pm2 start /var/www/gcgc-tms-staging/deployment/pm2.staging.config.js
```

```bash
||
# OR operator
# Try first command, if it fails, try second

pm2 restart gcgc-tms-staging
# If app is already running, restart it

pm2 start pm2.staging.config.js
# If app is not running, start it for first time

This handles both scenarios:
- First deployment → start
- Updates → restart
```

```bash
pm2 save
# Saves current process list
# When server reboots, PM2 restores these processes
# Essential for persistence!
```

---

## PM2 Deep Dive

### What is PM2?

PM2 = **Process Manager 2**

Think of it as a **babysitter for your Node.js app**:
- Keeps it running 24/7
- Restarts if it crashes
- Starts automatically on server reboot
- Manages logs
- Monitors performance

### PM2 Configuration File Explained

**File: `pm2.staging.config.js`**

```javascript
module.exports = {
  apps: [{
    name: 'gcgc-tms-staging',
    // App name (used in pm2 commands)
    // pm2 restart gcgc-tms-staging

    script: 'server.js',
    // Entry point of your app
    // PM2 runs: node server.js

    instances: 1,
    // Number of processes to run
    // 1 = single process
    // 2+ = cluster mode (load balancing)
    // -1 or 'max' = one per CPU core

    exec_mode: 'cluster',
    // 'fork' = single process
    // 'cluster' = multiple processes with load balancing

    autorestart: true,
    // Automatically restart if app crashes
    // Very important for production!

    watch: false,
    // Watch for file changes and auto-restart?
    // false for production (we restart manually)
    // true for development (auto-reload on code changes)

    max_memory_restart: '1G',
    // Restart if memory usage exceeds 1GB
    // Prevents memory leaks from crashing server

    env: {
      NODE_ENV: 'production',
      // Environment variables for the app
      // NODE_ENV=production enables optimizations

      PORT: 3001
      // Port for staging app
      // Production uses 3000
    },

    error_file: '/var/log/pm2/gcgc-tms-staging-error.log',
    // Where to write error logs (stderr)

    out_file: '/var/log/pm2/gcgc-tms-staging-out.log',
    // Where to write output logs (stdout)

    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Timestamp format for logs
    // Example: 2025-12-16 10:30:45 +08:00

    merge_logs: true,
    // Combine logs from all instances
    // Only relevant when instances > 1

    time: true
    // Prefix each log line with timestamp
  }]
}
```

### PM2 Process Lifecycle

```
┌─────────────────────────────────────────────┐
│  PM2 Process States                         │
├─────────────────────────────────────────────┤
│                                             │
│  ┌────────┐  pm2 start   ┌────────┐       │
│  │ Stopped├─────────────►│ Online │       │
│  └────────┘              └───┬────┘       │
│      ▲                       │            │
│      │                       │ Crash      │
│      │  pm2 stop             │ detected   │
│      │                       │            │
│      │                   ┌───▼────┐       │
│      └───────────────────┤Errored │       │
│                          └───┬────┘       │
│                              │            │
│                              │ autorestart│
│                              │            │
│                              ▼            │
│                          ┌────────┐       │
│                          │ Online │       │
│                          └────────┘       │
└─────────────────────────────────────────────┘
```

### PM2 Cluster Mode Explained

```
Single Instance (instances: 1):
┌──────────────────┐
│   Your App       │
│   (Port 3001)    │
└──────────────────┘
Handles all requests sequentially

Cluster Mode (instances: 2):
┌──────────────────────────────────┐
│        PM2 Load Balancer         │
└─────┬────────────────────┬───────┘
      │                    │
┌─────▼────────┐    ┌──────▼───────┐
│ Instance 1   │    │ Instance 2   │
│ (Port 3001)  │    │ (Port 3001)  │
└──────────────┘    └──────────────┘

Requests distributed across instances
Better performance, handles more users
```

### PM2 Commands Reference

```bash
# Start app
pm2 start server.js --name my-app

# Start with config file
pm2 start pm2.config.js

# Restart app
pm2 restart my-app

# Stop app (doesn't delete from PM2)
pm2 stop my-app

# Delete app from PM2
pm2 delete my-app

# View status of all apps
pm2 status

# View logs (real-time)
pm2 logs my-app

# View logs (last 100 lines)
pm2 logs my-app --lines 100

# View monitoring dashboard
pm2 monit

# Save current process list
pm2 save

# Resurrect saved process list
pm2 resurrect

# View detailed info about app
pm2 info my-app

# View all PM2 commands
pm2 --help
```

### PM2 Log Management

```bash
# Log files location
/var/log/pm2/
├── gcgc-tms-staging-error.log  (errors only)
├── gcgc-tms-staging-out.log    (console.log, etc)
└── pm2.log                     (PM2 system logs)

# View logs
tail -f /var/log/pm2/gcgc-tms-staging-out.log

# Search logs
grep "error" /var/log/pm2/gcgc-tms-staging-error.log

# Clear logs (when they get too big)
pm2 flush
# or
echo "" > /var/log/pm2/gcgc-tms-staging-out.log
```

---

## Nginx Deep Dive

### What is Nginx?

Nginx = **High-performance web server and reverse proxy**

**Pronunciation**: "Engine-X"

### Why Use Nginx?

```
Without Nginx:
Internet → Your Node.js App (Port 3001)

Problems:
❌ Node.js isn't optimized for static files
❌ No SSL/HTTPS handling
❌ No caching
❌ No compression
❌ Security vulnerabilities
❌ Can't run multiple apps on same server

With Nginx:
Internet → Nginx (Port 80/443) → Your App (Port 3001)

Benefits:
✅ Handles static files efficiently
✅ SSL/HTTPS termination
✅ Gzip compression
✅ Caching
✅ Security headers
✅ Can proxy to multiple apps
✅ WebSocket support
```

### Nginx Configuration Explained

**File: `nginx-staging.conf`**

**Section 1: Upstream**
```nginx
upstream gcgc_tms_staging {
    server 127.0.0.1:3001;
    keepalive 64;
}
```

**What is an upstream?**
```
upstream = Backend server(s) to proxy to

server 127.0.0.1:3001;
- 127.0.0.1 = localhost (same machine)
- 3001 = Port your Node.js app listens on

keepalive 64;
- Keep 64 connections open to backend
- Reduces overhead of opening new connections
- Improves performance

You can have multiple servers:
upstream gcgc_tms {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}
# Nginx will load balance between them!
```

**Section 2: Server Block**
```nginx
server {
    listen 80;
    listen [::]:80;
```

```nginx
listen 80;
# Listen on port 80 (HTTP)
# IPv4

listen [::]:80;
# Listen on port 80
# IPv6 (the :: is IPv6 notation)

Why both?
Some users have IPv4, some have IPv6
This supports both
```

```nginx
server_name ***REDACTED_STAGING_IP***;
# Server responds to requests for this domain/IP
# Can be: example.com, www.example.com, ***REDACTED_STAGING_IP***

Multiple server names:
server_name example.com www.example.com;

Wildcard:
server_name *.example.com;
```

**Section 3: Security Headers**
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

**Security headers explained:**

```nginx
X-Frame-Options "SAMEORIGIN"
# Prevents your site from being embedded in iframe on other sites
# Protects against clickjacking attacks

X-Content-Type-Options "nosniff"
# Prevents browser from MIME-sniffing
# Browser must respect Content-Type header
# Prevents XSS attacks

X-XSS-Protection "1; mode=block"
# Enables browser's XSS filter
# Blocks page if XSS attack detected
# Legacy header but still useful
```

**Section 4: Logging**
```nginx
access_log /var/log/nginx/gcgc-tms-staging-access.log;
error_log /var/log/nginx/gcgc-tms-staging-error.log;
```

```
access_log
# Logs every request
# Example line:
# 123.45.67.89 - - [16/Dec/2025:10:30:45] "GET / HTTP/1.1" 200 1234

error_log
# Logs only errors
# 404 not found, 500 server errors, etc.
```

**Section 5: Client Upload Size**
```nginx
client_max_body_size 50M;
```

```
Controls max upload size
Default: 1MB
Our setting: 50MB

If user tries to upload 100MB file:
→ Nginx returns 413 (Request Entity Too Large)

Increase if you need larger uploads:
client_max_body_size 100M;
```

**Section 6: Gzip Compression**
```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml ...;
```

**Gzip explained:**
```
gzip on;
# Enable compression

gzip_vary on;
# Add "Vary: Accept-Encoding" header
# Tells caches that response varies based on encoding

gzip_proxied any;
# Compress responses even for proxied requests

gzip_comp_level 6;
# Compression level (1-9)
# 1 = fastest, least compression
# 9 = slowest, most compression
# 6 = good balance

gzip_types ...;
# Which file types to compress
# HTML is always compressed
# Add: CSS, JS, JSON, XML, fonts, SVG

Example:
Uncompressed: 100KB JavaScript file
Compressed: 30KB (70% reduction!)
Faster page loads!
```

**Section 7: Main Location Block**
```nginx
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
```

**Understanding location blocks:**
```nginx
location / {
    # Matches all requests starting with /
    # / matches: /, /about, /api/users, /images/logo.png
}

location /api/ {
    # Matches only /api/*
}

location ~ \.jpg$ {
    # Regex match
    # ~ means regex
    # \.jpg$ means "ends with .jpg"
}
```

**Proxy headers explained:**
```nginx
proxy_pass http://gcgc_tms_staging;
# Forward request to upstream (your Node.js app)

proxy_http_version 1.1;
# Use HTTP/1.1 (required for keepalive and WebSockets)

proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
# Required for WebSocket connections
# Your Socket.IO needs these!

proxy_set_header Host $host;
# Pass original Host header to your app
# Your app sees: example.com (not localhost)

proxy_set_header X-Real-IP $remote_addr;
# Pass client's real IP address
# Without this, your app only sees 127.0.0.1

proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
# Chain of IPs if request went through multiple proxies

proxy_set_header X-Forwarded-Proto $scheme;
# Was original request HTTP or HTTPS?
# Important for generating correct URLs in your app

proxy_buffering off;
# Don't buffer responses
# Important for real-time features (Socket.IO)

proxy_cache_bypass $http_upgrade;
# Don't cache WebSocket upgrade requests
```

**Section 8: Socket.IO Location**
```nginx
location /socket.io/ {
    proxy_pass http://gcgc_tms_staging;
    proxy_http_version 1.1;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_buffering off;

    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
}
```

```nginx
Why separate location for Socket.IO?

Different timeout requirements:

Normal HTTP request:
- Connects, gets response, disconnects
- Timeout: 60 seconds is fine

WebSocket connection:
- Connects and stays connected
- Long-lived connection (hours/days)
- Timeout: 7 days!

proxy_connect_timeout 7d;
# Timeout for establishing connection: 7 days

proxy_send_timeout 7d;
# Timeout for sending data: 7 days

proxy_read_timeout 7d;
# Timeout for reading data: 7 days

7d = 7 days (can use: s, m, h, d, w, M, y)
```

**Section 9: Static File Caching**
```nginx
location /_next/static {
    proxy_pass http://gcgc_tms_staging;
    proxy_cache_valid 200 365d;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

```nginx
Why cache _next/static?

Next.js puts static assets in /_next/static/:
- JavaScript bundles
- CSS files
- Images
- Fonts

These files have hashes in filename:
- main-abc123.js
- styles-def456.css

Hash changes when file changes!
So we can cache forever:

proxy_cache_valid 200 365d;
# Cache successful responses (200) for 365 days

add_header Cache-Control "public, max-age=31536000, immutable";
# Tell browser to cache for 1 year
# immutable = never revalidate, file won't change

Result:
First visit: Download files
Second visit: Use cached files (instant!)
```

### Nginx Command Reference

```bash
# Test configuration (very important!)
sudo nginx -t
# Always run before reloading!

# Reload configuration (no downtime)
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Stop Nginx
sudo systemctl stop nginx

# Start Nginx
sudo systemctl start nginx

# Check status
sudo systemctl status nginx

# View error log
sudo tail -f /var/log/nginx/error.log

# View access log
sudo tail -f /var/log/nginx/access.log

# View configuration files
cat /etc/nginx/nginx.conf
cat /etc/nginx/sites-enabled/gcgc-tms-staging
```

### Nginx Directory Structure

```
/etc/nginx/
├── nginx.conf                 (Main config)
├── sites-available/           (Available site configs)
│   ├── default
│   └── gcgc-tms-staging
├── sites-enabled/             (Enabled site configs - symlinks)
│   ├── default → ../sites-available/default
│   └── gcgc-tms-staging → ../sites-available/gcgc-tms-staging
├── conf.d/                    (Additional configs)
└── modules-enabled/           (Nginx modules)

/var/log/nginx/
├── access.log
├── error.log
├── gcgc-tms-staging-access.log
└── gcgc-tms-staging-error.log
```

**Understanding sites-available vs sites-enabled:**
```
sites-available/
# All configuration files
# Disabled sites also here

sites-enabled/
# Symlinks to enabled sites
# Only these are active

To enable a site:
sudo ln -s /etc/nginx/sites-available/mysite /etc/nginx/sites-enabled/

To disable a site:
sudo rm /etc/nginx/sites-enabled/mysite

Why this structure?
- Keep all configs
- Enable/disable without deleting
- Easy to test new configs
```

---

## Deployment Flow

### Complete Deployment Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Local Development                                  │
├─────────────────────────────────────────────────────────────┤
│  1. Write code on your laptop                               │
│  2. Test locally: npm run dev                               │
│  3. Commit changes: git commit -m "..."                     │
│  4. Push to GitHub/GitLab: git push origin staging          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Run Deployment Script                              │
├─────────────────────────────────────────────────────────────┤
│  bash deployment/deploy-staging.sh                          │
│                                                              │
│  Script does:                                                │
│  ✓ Checks SSH configuration                                 │
│  ✓ Tests connection to server                               │
│  ✓ Asks for confirmation                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Connect to Server                                  │
├─────────────────────────────────────────────────────────────┤
│  SSH connection established:                                │
│  Local Machine → Internet → Alibaba ECS                     │
│                                                              │
│  Encrypted connection using your .pem key                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Pull Latest Code (On Server)                       │
├─────────────────────────────────────────────────────────────┤
│  cd /var/www/gcgc-tms-staging                               │
│  git fetch origin                                            │
│  git checkout staging                                        │
│  git pull origin staging                                     │
│                                                              │
│  Downloads your changes from Git repository                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Install Dependencies (On Server)                   │
├─────────────────────────────────────────────────────────────┤
│  npm ci --production=false                                   │
│                                                              │
│  Installs:                                                   │
│  • React, Next.js                                            │
│  • Prisma                                                    │
│  • All your npm packages                                     │
│  Takes: 1-2 minutes                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: Build Application (On Server)                      │
├─────────────────────────────────────────────────────────────┤
│  npm run build                                               │
│                                                              │
│  Does:                                                       │
│  1. Prisma generates database client                         │
│  2. TypeScript compiles to JavaScript                        │
│  3. Next.js optimizes pages                                  │
│  4. Creates .next/ directory                                 │
│  Takes: 2-5 minutes                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 7: Database Migrations (On Server)                    │
├─────────────────────────────────────────────────────────────┤
│  npx prisma migrate deploy                                   │
│                                                              │
│  Connects to RDS PostgreSQL                                  │
│  Runs any new database schema changes                        │
│  Safe - won't rerun old migrations                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 8: Restart Application (On Server)                    │
├─────────────────────────────────────────────────────────────┤
│  pm2 restart gcgc-tms-staging                                │
│                                                              │
│  PM2 does:                                                   │
│  1. Gracefully stops old process                             │
│  2. Starts new process with updated code                     │
│  3. Switches traffic to new process                          │
│  Downtime: < 1 second                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 9: Verify Deployment                                  │
├─────────────────────────────────────────────────────────────┤
│  pm2 status                                                  │
│  pm2 logs gcgc-tms-staging --lines 20                        │
│                                                              │
│  Check:                                                      │
│  ✓ App is "online"                                           │
│  ✓ No errors in logs                                         │
│  ✓ Test in browser                                           │
└─────────────────────────────────────────────────────────────┘
```

### What Happens During a Request?

```
User types: http://***REDACTED_STAGING_IP*** in browser
                │
                ▼
┌─────────────────────────────────────────┐
│  1. DNS Resolution                      │
│  ***REDACTED_STAGING_IP*** → Your ECS Server         │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  2. TCP Connection                      │
│  Browser → ECS Server Port 80           │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  3. HTTP Request Sent                   │
│  GET / HTTP/1.1                         │
│  Host: ***REDACTED_STAGING_IP***                     │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  4. Nginx Receives Request              │
│  Port 80 → Nginx Process                │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  5. Nginx Checks Configuration          │
│  Which location block matches?          │
│  → location / { ... }                   │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  6. Nginx Proxies to Node.js            │
│  proxy_pass http://127.0.0.1:3001       │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  7. PM2 Load Balances (if clustered)    │
│  Picks an available instance            │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  8. Your Next.js App Processes Request  │
│  • Authenticates user                   │
│  • Queries database (RDS)               │
│  • Fetches data from Redis              │
│  • Generates HTML                       │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  9. Response Sent Back                  │
│  Node.js → PM2 → Nginx → Browser        │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  10. Nginx Post-Processing              │
│  • Gzip compression                     │
│  • Add security headers                 │
│  • Logging                              │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  11. Browser Receives Response          │
│  HTML + CSS + JavaScript                │
│  Renders the page                       │
└─────────────────────────────────────────┘

Total time: 100-500ms
```

---

## Network Architecture

### IP Addresses Explained

**Your ECS has TWO IP addresses:**

```
Public IP: ***REDACTED_STAGING_IP***
• Accessible from anywhere on the internet
• You use this to SSH in
• Users access your website via this IP
• Can be expensive for data transfer

Private IP: 192.168.1.164
• Only accessible within Alibaba Cloud VPC
• FREE data transfer within VPC
• Used to connect to RDS, Redis, OSS
• More secure (not exposed to internet)
```

**Why use private IPs for services?**

```
❌ Using Public IPs:

Your App (***REDACTED_STAGING_IP***)
   │
   │ Via Internet
   │ Costs money per GB
   │ Slower
   ▼
RDS (Public Endpoint)

✅ Using Private IPs:

Your App (192.168.1.164)
   │
   │ Within VPC
   │ FREE
   │ Faster (< 1ms latency)
   ▼
RDS (Private Endpoint)
```

### VPC (Virtual Private Cloud) Explained

```
Think of VPC like a private network for your services

┌─────────────────────────────────────────────────┐
│  Alibaba Cloud VPC (192.168.1.0/24)             │
│                                                  │
│  ┌──────────────┐      ┌──────────────┐         │
│  │ ECS Staging  │      │ ECS Prod     │         │
│  │ 192.168.1.164│      │ 192.168.1.163│         │
│  └──────┬───────┘      └──────┬───────┘         │
│         │                     │                 │
│         │   Private Network   │                 │
│         │                     │                 │
│  ┌──────▼─────────────────────▼───────┐         │
│  │     RDS PostgreSQL                 │         │
│  │     192.168.1.x                    │         │
│  └────────────────────────────────────┘         │
│                                                  │
│  ┌─────────────────────────────────────┐        │
│  │     Redis                           │        │
│  │     192.168.1.x                     │        │
│  └─────────────────────────────────────┘        │
└──────────────────┬──────────────────────────────┘
                   │
                   │ Internet Gateway
                   │
                   ▼
             THE INTERNET
```

**VPC Benefits:**
- ✅ Services can communicate privately
- ✅ Free data transfer within VPC
- ✅ Lower latency
- ✅ More secure (isolated network)
- ✅ Can set custom IP ranges

### Port Numbers Explained

```
Port = Like an apartment number on a building

IP Address = Street address (***REDACTED_STAGING_IP***)
Port = Apartment number (80, 443, 3001, etc.)

Common Ports:
22   = SSH (remote terminal)
80   = HTTP (web traffic)
443  = HTTPS (secure web traffic)
3000 = Custom (your production app)
3001 = Custom (your staging app)
5432 = PostgreSQL
6379 = Redis
```

**Your Port Configuration:**

```
┌─────────────────────────────────────────┐
│  ECS Server (***REDACTED_STAGING_IP***)              │
│                                         │
│  Port 22  → SSH (for your access)       │
│  Port 80  → Nginx                       │
│             │                           │
│             └→ Port 3001 → Your App     │
│                            │            │
│                            └→ External: │
│                               RDS :5432 │
│                               Redis:6379│
└─────────────────────────────────────────┘

Firewall Rules (Security Group):
✅ Allow 22 (SSH)
✅ Allow 80 (HTTP)
✅ Allow 443 (HTTPS)
❌ Block 3001 (internal only)
```

### Security Group (Firewall) Rules

```
Security Group = Firewall for your ECS

Rules are like a bouncer at a club:
"Who can come in? Which doors?"

Inbound Rules (who can access your server):
┌─────────┬──────────┬────────────┬──────────┐
│ Port    │ Protocol │ Source     │ Purpose  │
├─────────┼──────────┼────────────┼──────────┤
│ 22      │ TCP      │ 0.0.0.0/0  │ SSH      │
│ 80      │ TCP      │ 0.0.0.0/0  │ HTTP     │
│ 443     │ TCP      │ 0.0.0.0/0  │ HTTPS    │
│ 3001    │ TCP      │ 127.0.0.1  │ App      │
└─────────┴──────────┴────────────┴──────────┘

0.0.0.0/0 = Everyone (any IP)
127.0.0.1 = Only localhost (same machine)

Outbound Rules (where your server can go):
Usually: Allow All (needed for npm, git, API calls)
```

**Security Best Practices:**

```
❌ Bad Security Group:
Port 3001 → 0.0.0.0/0
(Your Node.js app exposed to internet)
(Bypasses Nginx security)

✅ Good Security Group:
Port 80/443 → 0.0.0.0/0 (Nginx)
Port 3001 → 127.0.0.1 (localhost only)
(All traffic goes through Nginx)
```

---

## Security Concepts

### RDS Whitelist Explained

```
RDS Whitelist = Who can connect to database?

By default:
❌ Nobody can connect (secure!)

You must whitelist:
┌────────────────────────────────────┐
│  RDS Whitelist                     │
├────────────────────────────────────┤
│  ✅ 192.168.1.164 (Staging ECS)    │
│  ✅ 192.168.1.163 (Production ECS) │
│  ❌ 0.0.0.0/0     (Internet)       │
└────────────────────────────────────┘

Why use private IPs?
• More secure (not exposed to internet)
• Free data transfer
• Lower latency
```

**What if you whitelist wrong IP?**

```bash
# Connection will fail:
psql -h rds-host.aliyuncs.com -U postgres

Error: Connection timed out

# Fix: Check whitelist in Alibaba Cloud Console
# Add correct ECS private IP
```

### Environment Variables Security

```
Why .env files must stay secret:

.env contains:
• Database passwords
• API keys
• Secret tokens

If exposed:
❌ Attackers can access your database
❌ Delete all your data
❌ Steal user information
❌ Impersonate users

Protection:
1. Never commit to Git (.gitignore)
2. Only upload via secure methods (SCP, SSH)
3. Set file permissions: chmod 600 .env
4. Different secrets for staging/production
```

### SSH Key Security

```
Your .pem file = Master key to your servers

If someone gets your .pem file:
❌ They can SSH into your servers
❌ Read all data
❌ Delete everything
❌ Install malware

Protection:
1. chmod 400 key.pem (restrictive permissions)
2. Store in ~/.ssh/ directory
3. Never commit to Git
4. Never share via email/Slack
5. Use different keys for different projects
```

### HTTPS vs HTTP

```
HTTP (Port 80):
┌──────┐   Login: user/pass   ┌──────┐
│Client├─────────────────────►│Server│
└──────┘   ⚠️ Visible!         └──────┘
Anyone on network can see password!

HTTPS (Port 443):
┌──────┐   Login: encrypted   ┌──────┐
│Client├─────────────────────►│Server│
└──────┘   ✅ Encrypted!       └──────┘
Nobody can see password!

Setup HTTPS:
1. Get SSL certificate (Let's Encrypt - free)
2. Configure Nginx for HTTPS
3. Force redirect HTTP → HTTPS
```

---

## Troubleshooting from First Principles

### Debugging Methodology

```
When something goes wrong, think systematically:

1. What is the expected behavior?
2. What is the actual behavior?
3. Where is the error occurring?
4. What changed recently?

Check in order:
1. Application logs (PM2)
2. Nginx logs
3. System logs
4. External service status (RDS, Redis)
```

### Common Error Patterns

#### **Pattern 1: App Won't Start**

```
pm2 status
┌─────┬──────┬──────────┐
│ id  │ name │ status   │
├─────┼──────┼──────────┤
│ 0   │ app  │ errored  │
└─────┴──────┴──────────┘

Check:
1. pm2 logs app
   Look for error message

2. Common causes:
   • Missing .env file
   • Wrong DATABASE_URL
   • Port already in use
   • Build not completed

3. Debug:
   cd /var/www/app
   node server.js
   (Run directly to see errors)
```

#### **Pattern 2: 502 Bad Gateway**

```
Browser shows: 502 Bad Gateway

Meaning:
Nginx can't connect to your Node.js app

Check:
1. Is app running?
   pm2 status

2. Is app listening on correct port?
   sudo netstat -tulpn | grep 3001

3. Check Nginx logs:
   sudo tail /var/log/nginx/error.log

Common causes:
• App crashed
• Wrong port in Nginx config
• App startup takes too long
```

#### **Pattern 3: Database Connection Error**

```
Error: Can't reach database server

Check:
1. Is DATABASE_URL correct?
   cat .env | grep DATABASE_URL

2. Is ECS IP in RDS whitelist?
   Alibaba Console → RDS → Whitelist
   Should have: 192.168.1.164

3. Test connection:
   psql -h host -U postgres -d database

4. Check network:
   ping rds-host
   telnet rds-host 5432
```

### Debugging Tools

```bash
# Check if port is in use
sudo netstat -tulpn | grep 3001

# Check process memory usage
ps aux | grep node

# Check disk space
df -h

# Check memory
free -h

# Test HTTP endpoint
curl http://localhost:3001

# Check DNS resolution
nslookup rds-host.aliyuncs.com

# Check connectivity
telnet rds-host.aliyuncs.com 5432

# View all environment variables
printenv

# Check file permissions
ls -la .env

# View full process tree
ps auxf
```

---

## Summary

You now understand:

✅ What ECS is and how it works
✅ Every line in the shell scripts
✅ How PM2 manages your application
✅ How Nginx proxies and secures traffic
✅ The complete deployment flow
✅ Network architecture and security
✅ How to debug issues from first principles

**This knowledge applies to:**
- Any Linux server deployment
- AWS EC2, Google Compute Engine, etc.
- Traditional VPS hosting
- Future projects

**Keep this guide handy!** It's your complete reference for understanding server deployments.

---

**Next Steps:**
1. Save this guide for future reference
2. Practice deployments on staging
3. Try breaking things to understand how they work
4. Experiment with configurations
5. Read logs to understand application behavior

**Remember:** Understanding > Memorization. You now know the "why" behind every command! 🎓
