#!/bin/bash

# GCGC Team Management System - Production Deployment Script
# Target Server: ***REDACTED_PRODUCTION_IP*** (i-5ts5z9v1p0b82nz8whpr)

set -e

echo "🚀 Deploying to Alibaba Cloud ECS - PRODUCTION Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configuration
REMOTE_HOST="gcgc-production"
REMOTE_DIR="/var/www/gcgc-tms-production"
APP_NAME="gcgc-tms-production"
BRANCH="main"
ENV_FILE="deployment/.env.production"

echo "📋 Configuration:"
echo "   Server: ***REDACTED_PRODUCTION_IP*** (via SSH alias: $REMOTE_HOST)"
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

# Double confirmation for production
echo "⚠️  ⚠️  ⚠️  WARNING: PRODUCTION DEPLOYMENT  ⚠️  ⚠️  ⚠️"
echo ""
echo "This will deploy to the LIVE PRODUCTION server!"
echo "This may cause brief downtime for users."
echo ""
read -p "Type 'DEPLOY' to continue: " CONFIRM
if [ "$CONFIRM" != "DEPLOY" ]; then
    echo "❌ Deployment cancelled"
    exit 1
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

echo "📤 Deploying to production server..."

# Deploy to server
ssh $REMOTE_HOST << 'ENDSSH'
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 On server: $(hostname)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Navigate to application directory
cd /var/www/gcgc-tms-production

echo ""
echo "📥 Pulling latest code from main branch..."
git fetch origin
git checkout main
git pull origin main

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
echo "♻️  Restarting application with PM2 (zero-downtime reload)..."
pm2 reload gcgc-tms-production || pm2 start /var/www/gcgc-tms-production/deployment/pm2.production.config.js

echo ""
echo "💾 Saving PM2 process list..."
pm2 save

echo ""
echo "⏳ Waiting for application to start..."
sleep 5

echo ""
echo "📊 Application status:"
pm2 status gcgc-tms-production
pm2 info gcgc-tms-production --no-daemon

# Health check
echo ""
echo "🏥 Performing health check..."
sleep 2
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "⚠️  Health check failed - please verify manually"
fi

ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ PRODUCTION deployment completed successfully!"
    echo ""
    echo "🌐 Application URL: http://***REDACTED_PRODUCTION_IP***"
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
    echo "   View app logs:  ssh $REMOTE_HOST 'tail -f /var/log/pm2/gcgc-tms-production-out.log'"
    echo ""
    echo "⚠️  IMPORTANT: Monitor the application for the next 15 minutes"
    echo "   to ensure everything is working correctly!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo ""
    echo "❌ Deployment failed"
    echo "   Check logs: ssh $REMOTE_HOST 'pm2 logs $APP_NAME'"
    exit 1
fi
