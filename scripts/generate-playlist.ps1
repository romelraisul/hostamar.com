# Generate playlist.txt from hostamar.com API + local videos folder
$api = $env:HOSTAMAR_API; if (-not $api) { $api = "https://hostamar.com" }
$videosDir = "$PSScriptRoot\..\docker\tv-station\videos"
$playlist = Join-Path $videosDir "playlist.txt"

Write-Host "Fetching playlist from $api/api/tv/playlist ..." -ForegroundColor Cyan
try {
  $res = Invoke-RestMethod -Uri "$api/api/tv/playlist" -Method Get
  $items = $res.items
  if ($items.Count -eq 0) { Write-Host "Playlist empty on server — using local files only" -ForegroundColor Yellow }
  $lines = foreach ($it in $items) { if ($it.url) { "file '$($it.url)'" } }
  # Also include local mp4s
  Get-ChildItem $videosDir -Filter *.mp4 | ForEach-Object { $lines += "file '/videos/$($_.Name)'" }
  $lines | Out-File $playlist -Encoding utf8
  Write-Host "✓ Wrote $($lines.Count) entries to $playlist" -ForegroundColor Green
} catch {
  Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
}
