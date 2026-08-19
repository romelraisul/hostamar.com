# Docker Desktop VHDX Compaction — Reclaim C: Drive Space

Docker Desktop stores WSL disk data in a VHDX file on C: drive.
Even after pruning images inside Docker, the VHDX file stays large
until compacted.

## How to compact (one-time)

1. **WSL shutdown from cmd** (as Administrator):
   ```
   wsl --shutdown
   ```

2. **Compact each VHDX with diskpart**:
   Open **PowerShell as Administrator**:
   ```
   diskpart
   select vdisk file="%LOCALAPPDATA%\Docker\wsl\data\ext4.vhdx"
   attach vdisk readonly
   compact vdisk
   detach vdisk
   exit
   ```
   Repeat for `docker-desktop-data.isolated.vhdx` if it exists.

3. **Restart** Docker Desktop.

## Automatic prevention
- Set Docker Desktop → Resources → Advanced → Disk image size lower (16GB)
- Or move Docker data to a different drive:
  Settings → Resources → WSL Integration → "Use WSL 2 based engine"
  Then Settings → Docker Engine → add `"data-root": "D:\\docker-data"`

## What we just freed
- Build cache: 20.24GB (removed by `docker buildx prune`)
- Unused images: 4.38GB (removed by `docker image prune -a`)
- Inside VHDX: ~25GB vacancy → compact will reclaim from C:
