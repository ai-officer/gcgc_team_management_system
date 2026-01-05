#!/bin/bash

# GCGC Team Management System - Server Setup Script
# Run this script on EACH ECS instance (staging and production)
# This installs all required software: Node.js, PM2, Nginx, Git

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
sudo mkdir -p /var/www
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/www
sudo chown -R $USER:$USER /var/log/pm2
echo "✅ Directories created"

echo ""
echo "🔥 Configuring firewall (if enabled)..."
if command -v ufw &> /dev/null; then
    # Ubuntu firewall
    sudo ufw allow 22/tcp   # SSH
    sudo ufw allow 80/tcp   # HTTP
    sudo ufw allow 443/tcp  # HTTPS
    echo "✅ Firewall rules added (UFW)"
elif command -v firewall-cmd &> /dev/null; then
    # CentOS firewall
    sudo firewall-cmd --permanent --add-service=ssh
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --reload
    echo "✅ Firewall rules added (firewalld)"
else
    echo "⚠️  No firewall detected or disabled"
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
