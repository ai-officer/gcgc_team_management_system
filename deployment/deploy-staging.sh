#!/bin/bash

# GCGC Team Management System - Staging Deployment Script
# Target Server: 8.220.141.16 (i-5tsj3f83uq7wal98hk9c)

set -e

echo "🚀 Deploying to Alibaba Cloud ECS - STAGING Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configuration
REMOTE_HOST="gcgc-staging"
REMOTE_DIR="/var/www/gcgc-tms-staging"
APP_NAME="gcgc-tms-staging"
BRANCH="staging"
ENV_FILE="deployment/.env.staging"

echo "📋 Configuration:"
echo "   Server: 8.220.141.16 (via SSH alias: $REMOTE_HOST)"
echo "   Directory: $REMOTE_DIR"
echo "   Branch: $BRANCH"
echo ""

# Check if SSH config is set up
if ! grep -q "Host $REMOTE_HOST" ~/.ssh/config 2>/dev/null; then
    echo "⚠️  SSH configuration not found!"
    echo "   Please run: bash deployment/setup-ssh.sh"
    exit 1
fi

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file not found: $ENV_FILE"
    echo "   Please ensure the file exists with proper credentials"
    exit 1
fi

echo "✅ SSH configuration found"
echo "✅ Environment file found"
echo ""

# Confirm deployment
if [ "$FORCE" != "yes" ]; then
    read -p "⚠️  Deploy to STAGING server? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

echo ""
echo "🔍 Testing SSH connection..."
if ! ssh -o ConnectTimeout=10 $REMOTE_HOST "echo 'SSH OK'"; then
    echo "❌ Cannot connect to server"
    echo "   Please check:"
    echo "   - SSH key permissions: chmod 400 ~/.ssh/sogo-infra-key.pem"
    echo "   - Security group allows SSH from your IP"
    echo "   - Server is running"
    exit 1
fi

echo "✅ SSH connection successful"
echo ""

echo "📤 Deploying to server..."

# Deploy to server
ssh $REMOTE_HOST << 'ENDSSH'
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 On server: $(hostname)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Navigate to application directory
cd /var/www/gcgc-tms-staging

echo ""
echo "📥 Pulling latest code from staging branch..."
git fetch origin
git checkout staging
git pull origin staging

echo ""
echo "📦 Installing dependencies..."
npm ci --production=false

echo ""
echo "🔨 Building application..."
npm run build

echo ""
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

echo ""
echo "📊 Generating Prisma client..."
npx prisma generate

echo ""
echo "♻️  Restarting application with PM2..."
pm2 restart gcgc-tms-staging || pm2 start /var/www/gcgc-tms-staging/deployment/pm2.staging.config.js

echo ""
echo "💾 Saving PM2 process list..."
pm2 save

echo ""
echo "⏳ Waiting for application to start..."
sleep 5

echo ""
echo "📊 Application status:"
pm2 status gcgc-tms-staging
pm2 info gcgc-tms-staging --no-daemon

ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ STAGING deployment completed successfully!"
    echo ""
    echo "🌐 Application URL: https://tms-staging.hotelsogo-ai.com"
    echo ""
    echo "📊 Useful commands:"
    echo "   View logs:      ssh $REMOTE_HOST 'pm2 logs $APP_NAME'"
    echo "   Check status:   ssh $REMOTE_HOST 'pm2 status'"
    echo "   Restart app:    ssh $REMOTE_HOST 'pm2 restart $APP_NAME'"
    echo "   Stop app:       ssh $REMOTE_HOST 'pm2 stop $APP_NAME'"
    echo "   Monitor:        ssh $REMOTE_HOST 'pm2 monit'"
    echo ""
    echo "🐛 Debug commands:"
    echo "   SSH to server:  ssh $REMOTE_HOST"
    echo "   Check Nginx:    ssh $REMOTE_HOST 'sudo nginx -t && sudo systemctl status nginx'"
    echo "   View app logs:  ssh $REMOTE_HOST 'tail -f /var/log/pm2/gcgc-tms-staging-out.log'"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo ""
    echo "❌ Deployment failed"
    echo "   Check logs: ssh $REMOTE_HOST 'pm2 logs $APP_NAME'"
    exit 1
fi
