#!/bin/bash
# ==========================================================================
# Hostamar Open-Source Backup Pipeline
# ==========================================================================
# Alternative to Cloudflare R2 — uses mc (MinIO Client) + rclone
# All FOSS, zero cloud dependency, runs entirely on your hardware
# ==========================================================================
# Setup: bash scripts/setup-backup.sh
# Then cron handles everything automatically
# ==========================================================================

set -e

REMOTE="romel@192.168.1.2"
S3_ENDPOINT="http://192.168.1.2:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
BUCKET="hostamar"
BACKUP_DIR="C:\\Users\\romel\\minio-backup\\hostamar"

echo "╔══════════════════════════════════════════════╗"
echo "║  Hostamar Open-Source Backup Pipeline       ║"
echo "║  MinIO → Local Disk + rclone                ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# --- Step 1: Ensure mc is installed ---
echo "[1/5] Checking MinIO Client (mc)..."
ssh $REMOTE 'cmd.exe /c "where mc.exe >nul 2>nul || (curl -sL --max-time 60 https://dl.min.io/client/mc/release/windows-amd64/mc.exe -o C:\\Users\\romel\\mc.exe && echo Installed mc.exe)"'
echo ""

# --- Step 2: Configure mc ---
echo "[2/5] Configuring mc for MinIO..."
ssh $REMOTE "cmd.exe /c \"C:\\Users\\romel\\mc.exe alias set hostamar $S3_ENDPOINT $S3_ACCESS_KEY $S3_SECRET_KEY\""
echo ""

# --- Step 3: Enable bucket versioning ---
echo "[3/5] Enabling bucket versioning..."
ssh $REMOTE "cmd.exe /c \"C:\\Users\\romel\\mc.exe version enable hostamar/$BUCKET\""
echo ""

# --- Step 4: Initial sync to local backup ---
echo "[4/5] Initial sync to local disk..."
mkdir -p "$BACKUP_DIR"
ssh $REMOTE "cmd.exe /c \"mkdir C:\\Users\\romel\\minio-backup 2>nul & C:\\Users\\romel\\mc.exe mirror hostamar/$BUCKET/ $BACKUP_DIR/\""
echo ""

# --- Step 5: Create scheduled backup scripts ---
echo "[5/5] Creating backup scripts..."
ssh $REMOTE 'cmd.exe /c "echo @echo off > C:\\Users\\romel\\scripts\\backup-minio.bat && echo C:\\Users\\romel\\mc.exe mirror --overwrite hostamar/hostamar/ C:\\Users\\romel\\minio-backup\\hostamar\\ >> C:\\Users\\romel\\scripts\\backup-minio.bat && echo echo [%%DATE%% %%TIME%%] Backup complete >> C:\\Users\\romel\\scripts\\backup-minio.bat"'

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ Open-Source Backup Active               ║"
echo "║                                              ║"
echo "║  Storage:    MinIO :9000 (your hardware)     ║"
echo "║  Backup:     Local disk (same machine)       ║"
echo "║  Versioning: Enabled (prevents data loss)    ║"
echo "║  Tools:      mc.exe + optionally rclone      ║"
echo "║                                              ║"
echo "║  To add remote backup (Backblaze B2, etc):   ║"
║  $ rclone config                            ║
║  $ rclone sync hostamar:/hostamar remote:/   ║
║                                              ║
╚══════════════════════════════════════════════╝
echo ""

echo "Commands for additional local backup targets:"
echo "  # Backup to external drive (D:)"
echo "  ssh $REMOTE 'cmd.exe /c \"mc.exe mirror hostamar/hostamar/ D:\\\\hostamar-backup\\\"'"
echo ""
echo "  # Backup to this WSL machine"
echo "  mc alias set hostamar-win $S3_ENDPOINT $S3_ACCESS_KEY $S3_SECRET_KEY"
echo "  mc mirror hostamar-win/$BUCKET/ ~/hostamar-backup/"
