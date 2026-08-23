# Start Hostamar TV on Windows PC (RTX 5060)
# Requires: Docker Desktop running, ffmpeg in PATH

Write-Host "=== Hostamar TV — Starting Local Station ===" -ForegroundColor Green

# 1. Start nginx-rtmp
Push-Location "$PSScriptRoot\..\docker\tv-station"
docker compose up -d
if ($LASTEXITCODE -ne 0) { Write-Host "docker compose failed" -ForegroundColor Red; exit 1 }
Write-Host "✓ nginx-rtmp up (rtmp://localhost:1935/live/tv, http://localhost:8080/hls/...)" -ForegroundColor Green
Pop-Location

# 2. Generate playlist from local videos + DB
$videosDir = "$PSScriptRoot\..\docker\tv-station\videos"
if (-not (Test-Path $videosDir)) { New-Item -ItemType Directory -Path $videosDir | Out-Null }
$playlist = Join-Path $videosDir "playlist.txt"
if (-not (Test-Path $playlist)) {
  "# Add your mp4s here — one per line: file '/videos/video1.mp4'" | Out-File $playlist -Encoding utf8
  Write-Host "Created $playlist — add your mp4s!" -ForegroundColor Yellow
}

# 3. Start ffmpeg (loops forever)
Write-Host "Starting FFmpeg — streaming to rtmp://localhost:1935/live/tv (Ctrl+C to stop)" -ForegroundColor Cyan
ffmpeg -re -stream_loop -1 -f concat -safe 0 -i $playlist -c:v libx264 -preset veryfast -b:v 2500k -maxrate 2500k -bufsize 5000k -pix_fmt yuv420p -g 50 -c:a aac -b:a 128k -ar 44100 -f flv rtmp://localhost:1935/live/tv
