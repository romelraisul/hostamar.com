#!/bin/bash
# Deploy hostamar.com to production
# Prerequisites: Docker, Docker Compose, domain pointing to server IP

set -e

DOMAIN="hostamar.com"
APP_DIR="/opt/hostamar"

echo "=== Deploying $DOMAIN ==="

# Step 1: Create app directory
mkdir -p $APP_DIR

# Step 2: Copy files to server (run from local machine)
# scp -r ./* root@YOUR_SERVER_IP:$APP_DIR/

# Step 3: Build and start
cd $APP_DIR
docker compose build
docker compose up -d

# Step 4: Setup SSL
bash scripts/setup-ssl.sh

# Step 5: Verify
echo "Verifying deployment..."
sleep 5
curl -I https://$DOMAIN

echo "=== Deployment complete ==="
echo "Visit: https://$DOMAIN"
