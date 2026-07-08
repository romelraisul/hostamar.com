# Backup Strategy — Hostamar

## Schedule
- **Frequency:** Every 6 hours via Windows Task Scheduler
- **Script:** `C:\Users\User\backup-postgres.ps1`
- **Retention:** Last 7 daily backups kept locally

## Backup Location
- Local: `C:\Users\User\backups\hostamar-YYYYMMDD-HHMMSS.sql`
- Offsite: Cloudflare R2 bucket `hostamar-backups` (if `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `CLOUDFLARE_ACCOUNT_ID` env vars are set)

## How to Schedule (Windows Task Scheduler)
```powershell
# Open Task Scheduler
taskschd.msc

# Create task:
#   Trigger: Daily at 02:00, 08:00, 14:00, 20:00
#   Action: Start a program
#   Program: powershell.exe
#   Arguments: -ExecutionPolicy Bypass -File C:\Users\User\backup-postgres.ps1
```

## What Gets Backed Up
- Full PostgreSQL database `hostamar` via `pg_dump`
- All tables: Customer, Video, Payment, Subscription, Referral, Lead, Campaign, etc.

## What Is NOT Backed Up (ephemeral)
- Uploaded video files (stored in MinIO/R2)
- BullMQ job queue state (Redis)
- Container volumes (ollama models, etc.)

## Restoration Procedure
```bash
# 1. Copy backup from R2 (if offsite)
aws s3 cp s3://hostamar-backups/hostamar-YYYYMMDD-HHMMSS.sql /tmp/
# OR from local:
cp C:\Users\User\backups\hostamar-YYYYMMDD-HHMMSS.sql /tmp/

# 2. Restore to hostamar-postgres container
docker exec -i hostamar-postgres psql -U hostamar -d hostamar < /tmp/hostamar-YYYYMMDD-HHMMSS.sql

# 3. Verify
docker exec hostamar-postgres psql -U hostamar -d hostamar -c "SELECT COUNT(*) FROM \"Customer\""
```

## Verification
After restore, run:
```bash
docker exec hostamar-postgres psql -U hostamar -d hostamar -c "\dt"  # should list 27 tables
docker exec hostamar-postgres psql -U hostamar -d hostamar -c "SELECT COUNT(*) FROM \"Customer\""  # should show customer count
```

## Manual Backup (Admin API)
```bash
# Trigger via API (requires admin auth)
curl -X POST https://hostamar.com/api/admin/backup \
  -H "Authorization: Bearer <admin-token>"

# List backups
curl https://hostamar.com/api/admin/backup \
  -H "Authorization: Bearer <admin-token>"
```