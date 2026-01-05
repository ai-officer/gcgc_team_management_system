#!/bin/bash

# Setup SSH configuration for GCGC TMS deployment
# This script will configure your SSH to easily connect to Alibaba Cloud ECS

set -e

echo "🔐 Setting up SSH configuration for GCGC TMS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if .pem file exists
PEM_SOURCE="/Users/kyleisaacmendoza/Downloads/sogo-infra-key.pem"
PEM_DEST="$HOME/.ssh/sogo-infra-key.pem"

if [ ! -f "$PEM_SOURCE" ]; then
    echo "❌ Error: SSH key not found at $PEM_SOURCE"
    echo ""
    echo "Please ensure the file exists at this location, or update the path in this script."
    exit 1
fi

echo "✅ Found SSH key: $PEM_SOURCE"
echo ""

# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
echo "✅ ~/.ssh directory ready"
echo ""

# Copy .pem file to .ssh directory
if [ "$PEM_SOURCE" != "$PEM_DEST" ]; then
    cp "$PEM_SOURCE" "$PEM_DEST"
    echo "✅ Copied SSH key to $PEM_DEST"
else
    echo "✅ SSH key already in correct location"
fi
echo ""

# Set correct permissions (REQUIRED for SSH to work)
chmod 400 "$PEM_DEST"
echo "✅ Set correct permissions (400) on SSH key"
echo ""

# Add SSH config
SSH_CONFIG="$HOME/.ssh/config"
CONFIG_MARKER="# GCGC TMS SSH Config"

# Check if config already exists
if grep -q "$CONFIG_MARKER" "$SSH_CONFIG" 2>/dev/null; then
    echo "⚠️  SSH config already exists in $SSH_CONFIG"
    echo "   Skipping to avoid duplicates."
else
    echo "📝 Adding SSH configuration to $SSH_CONFIG"

    # Create config file if it doesn't exist
    touch "$SSH_CONFIG"
    chmod 600 "$SSH_CONFIG"

    # Append configuration
    cat >> "$SSH_CONFIG" << 'EOF'

# GCGC TMS SSH Config
# Added by deployment/setup-ssh.sh

# GCGC Staging Server
Host gcgc-staging
    HostName ***REDACTED_STAGING_IP***
    User root
    IdentityFile ~/.ssh/sogo-infra-key.pem
    ServerAliveInterval 60
    ServerAliveCountMax 3

# GCGC Production Server
Host gcgc-production
    HostName ***REDACTED_PRODUCTION_IP***
    User root
    IdentityFile ~/.ssh/sogo-infra-key.pem
    ServerAliveInterval 60
    ServerAliveCountMax 3

EOF

    echo "✅ SSH configuration added"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SSH setup complete!"
echo ""
echo "🧪 Test your connection with:"
echo "   ssh gcgc-staging"
echo "   ssh gcgc-production"
echo ""
echo "📝 Note: If connection fails with 'root' user, try editing ~/.ssh/config"
echo "   and change 'User root' to 'User ubuntu' or 'User admin'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
