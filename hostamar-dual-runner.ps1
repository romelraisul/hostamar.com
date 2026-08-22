<# hostamar-dual-runner.ps1  — SURVIVES Docker corruption on Windows restart.
#
# Why this script:
#   Docker Desktop (Windows) stores WSL+Docker state in
#   C:\Users\User\AppData\Local\Docker\wsl\main\ext4.vhdx.
#   On unclean shutdown it can get NUL bytes -> Docker won't start, Ollama is down,
#   and you've had to manually `wsl --shutdown` twice this month. Podman stores
#   separately at C:\Users\User\.local\share\containers -> separate vhdx that
#   survives when Docker's corrupt. So failover keeps your model endpoint up.
#
# It owns THREE things:
#   1. Health-check Docker (run `docker ps`, verify ext4.vhdx size is sane)
#   2. Boot Ollama via whatever runtime is healthy (Docker preferred, Podman else)
#   3. Start the LiteLLM router on :4000 using a WORKING bind mount
#
# IMPORTANT: the router mount must be :ro and target /tmp/cfg.yaml, NOT /app/config.yaml.
#   Targeting /app/config.yaml inside the litellm image makes Docker create the
#   path as a directory when the WSL-Linux engine can't resolve the host file ->
#   router crash with IsADirectoryError. We hit that and fixed it; this script
#   uses the proven invocation.
# ########################################################################################### #>

$ErrorActionPreference = "SilentlyContinue"
$BuildDir = "$env:USERPROFILE\hostamar-build"
$Cfg      = "$BuildDir\litellm-config.final.yaml"
$Compose  = "$BuildDir\docker-compose.dev.yml"
$Log      = "$BuildDir\dual-runner.log"
$VhdxPath = "$env:LOCALAPPDATA\Docker\wsl\main\ext4.vhdx"

function Log($m) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $m" | Tee-Object -FilePath $Log -Append | Out-Null }

Log "=== BOOT CHECK ==="

# ---- 1. Health-check Docker ----
$dockerOK = $true
try {
    $probe = docker ps 2>&1
    if ($LASTEXITCODE -ne 0 -or $probe -match "NUL|cannot|error|not running") { $dockerOK = $false }
} catch { $dockerOK = $false }

# NUL-byte corruption signature: ext4.vhdx shrinks well below the Docker-driven min
# (Docker vhd is usually multi-GB; <50MB after a valid build = corruption).
if (Test-Path $VhdxPath) {
    $size = (Get-Item $VhdxPath).Length
    if ($size -lt 50MB) {
        Log "WARN ext4.vhdx corrupted ($size bytes < 50MB threshold) - deleting"
        wsl.exe --shutdown 2>&1 | Out-Null
        Start-Sleep -Seconds 3
        Remove-Item $VhdxPath -Force -ErrorAction SilentlyContinue
        $dockerOK = $false
    }
}

# ---- 2. Boot Ollama on whatever runtime is healthy ----
if ($dockerOK) {
    Log "Docker healthy -> docker compose up"
    docker compose -f $Compose up -d 2>&1 | Out-Null
    # keep Podman idle as standby
    if (Get-Command podman -ErrorAction SilentlyContinue) {
        podman machine start hostamar 2>&1 | Out-Null
    }
} else {
    Log "Docker corrupt/unavailable -> Podman failover"
    if (Get-Command podman -ErrorAction SilentlyContinue) {
        podman machine start hostamar 2>&1 | Out-Null
        podman-compose -f $Compose up -d 2>&1 | Out-Null
        Log "Ollama via Podman on :11434"
    } else {
        Log "CRITICAL: Podman not installed. Run: winget install -e --id RedHat.Podman ; podman machine init hostamar --cpus 6 --memory 10240 --disk-size 100"
        Log "Ollama is DOWN until it installs."
    }
}

Start-Sleep -Seconds 5

# ---- 3. Verify :11434 and bounce if needed ----
try {
    Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 5 | Out-Null
    Log "VERIFY Ollama :11434 UP"
} catch {
    Log "Ollama DOWN -> restart"
    docker restart ollama-dev 2>&1 | Out-Null
    podman restart ollama-dev 2>&1 | Out-Null
}

# ---- 4. Start LiteLLM router (WORKING mount path) ----
docker rm -f hostamar-router 2>&1 | Out-Null
podman rm -f hostamar-router 2>&1 | Out-Null
$runArgs = @(
    "run", "-d", "--name", "hostamar-router",
    "--network", "host",
    "-v", "${Cfg}:/tmp/cfg.yaml:ro",
    "-e", "NVIDIA_API_KEY=$env:NVIDIA_API_KEY",
    "-e", "KILOCODE_API_KEY=$env:KILOCODE_API_KEY",
    "ghcr.io/berriai/litellm:main-latest",
    "--config", "/tmp/cfg.yaml", "--port", "4000"
)
if (Get-Command podman -ErrorAction SilentlyContinue) {
    podman @runArgs 2>&1 | Out-Null
    Log "Router started (Podman)"
} else {
    docker @runArgs 2>&1 | Out-Null
    Log "Router started (Docker)"
}
Start-Sleep -Seconds 5
try {
    Invoke-RestMethod -Uri "http://localhost:4000/v1/models" -TimeoutSec 5 | Out-Null
    Log "VERIFY router :4000 UP"
} catch {
    Log "WARN router :4000 still booting or down - check docker logs hostamar-router"
}
Log "=== BOOT DONE ==="
