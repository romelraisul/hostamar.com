#!/bin/bash
# Local production deploy script for hostamar.com
# Builds, starts with PM2, and configures nginx locally

set -e

echo "=== Deploying Hostamar Platform ==="
echo ""

# Step 1: Install dependencies
echo "[1/6] Installing dependencies..."
npm ci --production=false
echo ""

# Step 2: Run Prisma migrations
echo "[2/6] Running Prisma migrations..."
npx prisma generate
echo ""

# Step 3: Build the app
echo "[3/6] Building Next.js app..."
npm run build
echo ""

# Step 4: Create logs directory
echo "[4/6] Setting up log directories..."
mkdir -p logs
mkdir -p data
echo ""

# Step 5: Start with PM2
echo "[5/6] Starting with PM2..."
pm2 delete hostamar 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup 2>/dev/null || true
echo ""

# Step 6: Verify
echo "[6/6] Verifying deployment..."
sleep 3
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "App running at: http://localhost:3000"
echo "PM2 Dashboard: pm2 monit"
echo "PM2 Logs: pm2 logs hostamar"
echo "PM2 Status: pm2 status"
echo ""
echo "To stop: pm2 stop hostamar"
echo "To restart: pm2 restart hostamar"
