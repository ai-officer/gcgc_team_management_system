# Domain Setup Guide
## Migrating from IP addresses to tms.hotelsogo-ai.com

This guide walks you through completing the domain setup for your GCGC Team Management System.

## Current Status

✅ **DNS Configuration** - Your DNS is working correctly:
- `tms.hotelsogo-ai.com` → ***REDACTED_PRODUCTION_IP*** (Production)
- `tms-staging.hotelsogo-ai.com` → ***REDACTED_STAGING_IP*** (Staging)

✅ **Configuration Files Updated**:
- Nginx configurations updated with domain names
- Environment files updated with domain URLs
- Ready for deployment

## Deployment Steps

### 1. Upload Updated Configuration Files to Servers

**For Production (***REDACTED_PRODUCTION_IP***):**
```bash
# Upload the updated Nginx config
scp deployment/nginx-production.conf root@***REDACTED_PRODUCTION_IP***:/etc/nginx/sites-available/gcgc-tms-production

# Upload the updated .env file
scp deployment/.env.production root@***REDACTED_PRODUCTION_IP***:/var/www/gcgc-tms-production/.env
```

**For Staging (***REDACTED_STAGING_IP***):**
```bash
# Upload the updated Nginx config
scp deployment/nginx-staging.conf root@***REDACTED_STAGING_IP***:/etc/nginx/sites-available/gcgc-tms-staging

# Upload the updated .env file
scp deployment/.env.staging root@***REDACTED_STAGING_IP***:/var/www/gcgc-tms-staging/.env
```

### 2. Restart Services on Both Servers

**On Production Server (***REDACTED_PRODUCTION_IP***):**
```bash
ssh root@***REDACTED_PRODUCTION_IP***

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Restart the application
pm2 restart gcgc-tms-production

# Check status
pm2 status
sudo systemctl status nginx
```

**On Staging Server (***REDACTED_STAGING_IP***):**
```bash
ssh root@***REDACTED_STAGING_IP***

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Restart the application
pm2 restart gcgc-tms-staging

# Check status
pm2 status
sudo systemctl status nginx
```

### 3. Update Google OAuth Redirect URIs

You need to update the redirect URIs in your Google Cloud Console:

1. Go to https://console.cloud.google.com/
2. Select your project
3. Navigate to "APIs & Services" > "Credentials"
4. Find your OAuth 2.0 Client ID: `367856887591-1rqt4dqnm8u4jvp8tju7m1ofbaf405q6`
5. Click "Edit"
6. Add the following **Authorized redirect URIs**:
   - `http://tms.hotelsogo-ai.com/api/calendar/google-callback` (Production)
   - `http://tms-staging.hotelsogo-ai.com/api/calendar/google-callback` (Staging)
7. **Keep the old Railway URLs** for now in case you need to rollback
8. Save changes

### 4. Test Your Application

**Test Production:**
```bash
# From your local machine
curl -I http://tms.hotelsogo-ai.com

# Or open in browser
open http://tms.hotelsogo-ai.com
```

**Test Staging:**
```bash
# From your local machine
curl -I http://tms-staging.hotelsogo-ai.com

# Or open in browser
open http://tms-staging.hotelsogo-ai.com
```

### 5. Verify Everything Works

Check the following on both environments:
- [ ] Homepage loads correctly
- [ ] Login works
- [ ] Google Calendar integration works (after OAuth update)
- [ ] File uploads work (Cloudinary)
- [ ] Database connections work
- [ ] Redis caching works

## Next Steps: SSL/HTTPS Setup (Recommended)

After verifying everything works with HTTP, you should set up SSL certificates:

### Option 1: Let's Encrypt (Free, Recommended)

**On Production Server:**
```bash
ssh root@***REDACTED_PRODUCTION_IP***

# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d tms.hotelsogo-ai.com

# Certbot will automatically update your Nginx config
# Test auto-renewal
sudo certbot renew --dry-run
```

**On Staging Server:**
```bash
ssh root@***REDACTED_STAGING_IP***

# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d tms-staging.hotelsogo-ai.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### After SSL Setup

Once you have SSL certificates, update the environment files:

1. Change `APP_URL` from `http://` to `https://`
2. Change `NEXTAUTH_URL` from `http://` to `https://`
3. Change `ALLOWED_ORIGINS` from `http://` to `https://`
4. Update Google OAuth redirect URIs to use `https://`
5. Restart the applications with `pm2 restart`

## Troubleshooting

### Application doesn't load
```bash
# Check Nginx logs
sudo tail -f /var/log/nginx/gcgc-tms-production-error.log
sudo tail -f /var/log/nginx/gcgc-tms-staging-error.log

# Check application logs
pm2 logs gcgc-tms-production
pm2 logs gcgc-tms-staging
```

### DNS not resolving
```bash
# Test DNS resolution
nslookup tms.hotelsogo-ai.com
nslookup tms-staging.hotelsogo-ai.com

# Test connection
telnet tms.hotelsogo-ai.com 80
telnet tms-staging.hotelsogo-ai.com 80
```

### Nginx configuration errors
```bash
# Test configuration
sudo nginx -t

# If errors, check the config file
sudo nano /etc/nginx/sites-available/gcgc-tms-production
sudo nano /etc/nginx/sites-available/gcgc-tms-staging
```

### Can't connect to server
```bash
# Make sure you can SSH
ssh root@***REDACTED_PRODUCTION_IP***
ssh root@***REDACTED_STAGING_IP***

# Check if firewall allows HTTP/HTTPS
# (On Alibaba Cloud Console, check Security Group rules)
```

## Summary

**What Changed:**
- ✅ Nginx: `server_name` updated from IP to domain
- ✅ `.env`: `APP_URL`, `NEXTAUTH_URL`, `ALLOWED_ORIGINS` updated
- ✅ Google OAuth redirect URIs documented (you need to update these manually)

**What You Need to Do:**
1. Upload configuration files to servers (via scp)
2. Reload Nginx and restart PM2 on both servers
3. Update Google OAuth redirect URIs in Google Cloud Console
4. Test both environments
5. (Recommended) Set up SSL certificates with Let's Encrypt

**URLs:**
- Production: http://tms.hotelsogo-ai.com (Soon: https://)
- Staging: http://tms-staging.hotelsogo-ai.com (Soon: https://)
