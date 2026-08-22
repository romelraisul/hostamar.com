# perf-guard.ps1 - Windows Task Manager watchdog (permanent)
# Watches CPU/RAM/Disk/% and C: free space every 60s, logs to perf-history.jsonl.
# SAFE: never deletes locked models; only clears TEMP + docker prune + tops 1 heavy proc.
$History = "C:\Users\User\hostamar-build\state\perf-history.jsonl"
$Log = "C:\Users\User\hostamar-build\logs\perf-guard.log"
mkdir -Force "C:\Users\User\hostamar-build\state", "C:\Users\User\hostamar-build\logs" | Out-Null

# Locked-model paths NEVER touched (mirror of perma-locked.json never_touch)
$Locked = @(
  "C:\Users\User\.ollama",
  "C:\Users\User\hostamar-build\guard",
  "C:\Users\User\hostamar-build\state"
)

while($true){
  try {
    $cpu = (Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples.CookedValue
    $ram = (Get-Counter '\Memory\% Committed Bytes In Use').CounterSamples.CookedValue
    $disk = (Get-Counter '\PhysicalDisk(_Total)\% Disk Time').CounterSamples.CookedValue
    $cFree = (Get-PSDrive C).Free / 1GB
    $ts = Get-Date -Format o
    $obj = @{ts=$ts; cpu=[math]::Round($cpu,1); ram=[math]::Round($ram,1); disk=[math]::Round($disk,1); cFree=[math]::Round($cFree,1)}
    $obj | ConvertTo-Json -Compress | Add-Content $History
    if($disk -gt 90 -or $cpu -gt 90 -or $ram -gt 90 -or $cFree -lt 10){
      "$ts HIGH cpu=$cpu ram=$ram disk=$disk cFree=$cFree GB - cleaning" | Add-Content $Log
      # Safe actions only - never delete locked models
      Remove-Item $env:TEMP\* -Recurse -Force -ErrorAction SilentlyContinue
      docker system prune -f --filter until=24h 2>$null
      # Kill heaviest non-system process (never System/Registry/Defender)
      Get-Process | Sort-Object CPU -Descending | Select-Object -First 1 | Where-Object {$_.ProcessName -notin @("System","Registry","MsMpEng","Idle")} | Stop-Process -Force -ErrorAction SilentlyContinue
    }
  } catch {
    "$ts ERROR: $_" | Add-Content $Log
  }
  Start-Sleep 60
}
