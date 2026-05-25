#!/bin/bash
# ==========================================================================
# Hostamar Cloudflare R2 Setup — One-Click Mirror
# ==========================================================================
# PREREQUISITE: Create R2 API token at:
#   https://dash.cloudflare.com/profile/api-tokens → Create Token → R2 Edit
#   Permissions: R2:Read + R2:Write
#   Then copy the Access Key ID + Secret Access Key (shown only once!)
#
# USAGE:
#   bash scripts/setup-r2-mirror.sh
#   → paste R2 Access Key ID + Secret Access Key
#   → done — mirror runs
# ==========================================================================

set -e

ACCOUNT_ID="e00717304c1139751214b8cda5078a8d"
BUCKET_NAME="hostamar-mirror"
MINIO_ENDPOINT="http://192.168.1.2:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"

echo "┌──────────────────────────────────────────────┐"
echo "│   Hostamar R2 Mirror Setup                   │"
echo "└──────────────────────────────────────────────┘"
echo ""

read -p "R2 Access Key ID: " R2_ACCESS_KEY
read -sp "R2 Secret Access Key: " R2_SECRET_KEY
echo ""
read -p "R2 Bucket Name [$BUCKET_NAME]: " INPUT_BUCKET
BUCKET_NAME=${INPUT_BUCKET:-$BUCKET_NAME}
echo ""

REMOTE_SSH="romel@192.168.1.2"

echo "[1/3] Installing MinIO client on remote..."
ssh $REMOTE_SSH 'cmd.exe /c "where mc.exe >nul 2>nul || curl -sL https://dl.min.io/client/mc/release/windows-amd64/mc.exe -o C:\\Users\\romel\\mc.exe"'

echo "[2/3] Configuring endpoints..."
ssh $REMOTE_SSH "cmd.exe /c \"C:\\Users\\romel\\mc.exe alias set minio $MINIO_ENDPOINT $MINIO_ACCESS_KEY $MINIO_SECRET_KEY\""
ssh $REMOTE_SSH "cmd.exe /c \"C:\\Users\\romel\\mc.exe alias set r2 https://$ACCOUNT_ID.r2.cloudflarestorage.com $R2_ACCESS_KEY $R2_SECRET_KEY\""

echo "[3/3] Creating bucket + initial sync..."
ssh $REMOTE_SSH "cmd.exe /c \"C:\\Users\\romel\\mc.exe mb r2/$BUCKET_NAME 2>nul || echo Bucket exists\""
ssh $REMOTE_SSH "cmd.exe /c \"C:\\Users\\romel\\mc.exe mirror --watch minio/hostamar/ r2/$BUCKET_NAME/\""

echo ""
echo "✅ R2 Mirror Active!"
echo "MinIO :9000 → Cloudflare R2 ($BUCKET_NAME)"
