# Disk Emergency Permanent Fix — 0.5GB → 25.8GB + 7GB/day leak prevention
- Root causes: vhdx 675GB, provisioner 65 volumes 16GB/5min, tv-rtmp ffmpeg log every frame 2.8GB syslog, state.db 3.8GB + agents 5MB/min
- Fixes: fstrim 348 GiB + DiskPart compact 675→658GB, prune 65→9 volumes, tv-rtmp --log-driver none + -loglevel error + guard skip, provisioner disabled, caches cleaned, journal vacuum 3d, syslog truncate
- Permanent: weekly-trim-compact.service+timer weekly, handles podman prune + docker prune + pnpm prune + fstrim + journal vacuum
- Big levers remaining: ComfyUI 241GB, OneDrive 85GB Free up space, Pagefile 40.9GB cap 8-16GB, hostamar-build 34GB .hermes 27GB
- Current free 25.8GB ~3 days headroom before, now weekly task prevents regrowth
