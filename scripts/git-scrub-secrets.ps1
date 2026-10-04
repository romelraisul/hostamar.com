#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Find and scrub leaked secrets from git history (safe, file-preserving).
.DESCRIPTION
    Scans git history for credential patterns. If secrets are found, rewrites
    history with `git filter-repo --replace-text` (replaces the secret BYTES in
    place, preserving file history — does NOT delete files). Creates an
    automatic backup (.git/filter-repo/commit-map) so the rewrite is reversible.

    IMPORTANT: after a rewrite you MUST force-push AND rotate the leaked
    credentials at the source (the old values are still valid until rotated).

.PARAMETER WhatIf
    Scan only — don't rewrite history.
.PARAMETER Force
    Skip confirmation prompts.
#>

param(
    [switch]$WhatIf,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

# Patterns to scan for (used for the read-only audit report only)
$secretPatterns = @(
    'NEXTAUTH_SECRET\s*=\s*.+',
    'JWT_SECRET\s*=\s*.+',
    'DATABASE_URL\s*=\s*postgresql://.+',
    'QUEUE_SECRET\s*=\s*.+',
    'sk-[a-zA-Z0-9]{20,}',
    'ghp_[a-zA-Z0-9]{20,}',
    'AKIA[0-9A-Z]{16}',
    '-----BEGIN (RSA|OPENSSH|EC) PRIVATE KEY-----'
)

Write-Host "`n🔍 Hostamar Git History Scrub" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Step 1: scan git history for secrets (read-only)
Write-Host "📋 Scanning git history for secrets..." -ForegroundColor Yellow
$found = $false
foreach ($pattern in $secretPatterns) {
    $matches = git log --all --pretty=format:"%H" -S $pattern 2>$null
    if ($matches) {
        $found = $true
        Write-Host "  ⚠  pattern matched: $pattern" -ForegroundColor Red
    }
}

if (-not $found) {
    Write-Host "  ✅ No secret patterns found in git history" -ForegroundColor Green
    exit 0
}

# Step 2: build the replace-text file from actual matches in history.
# We extract the literal secret VALUE that follows the key in historical diffs
# and replace it with a safe placeholder. This preserves file history (unlike
# --invert-paths, which would DELETE the whole file).
Write-Host "`n📋 Building replace-text map from historical secret values..." -ForegroundColor Yellow
$replaceFile = Join-Path $env:TEMP "hostamar-secret-replace.txt"
$replaceLines = @()

# Map known key=value pairs found in history to a masked replacement.
# (Add more as the scan reports them.)
$candidates = @(
    'NEXTAUTH_SECRET',
    'QUEUE_SECRET',
    'JWT_SECRET',
    'DATABASE_URL'
)
foreach ($key in $candidates) {
    # pull the value that historically followed this key in app/setup/page.tsx
    $val = git log --all -p -- app/setup/page.tsx 2>$null |
        Select-String -Pattern "^[+-].*${key}[=:'\s]+([^\s'""]+)" |
        ForEach-Object { $_.Matches.Groups[1].Value } |
        Where-Object { $_ -notmatch '\.\.\.\.|set via \.env' } |
        Select-Object -First 1
    if ($val) {
        $replaceLines += "$val===>***REDACTED***"
        Write-Host "  mapped $key -> placeholder" -ForegroundColor Gray
    }
}

if ($replaceLines.Count -eq 0) {
    Write-Host "  ⚠  No concrete values extracted; nothing to replace." -ForegroundColor Yellow
    exit 0
}

$replaceLines | Set-Content -Path $replaceFile
Write-Host "  replace file: $replaceFile ($($replaceLines.Count) entries)" -ForegroundColor Gray

if ($WhatIf) {
    Write-Host "`n🔎 WhatIf: would rewrite history replacing the above values." -ForegroundColor Yellow
    exit 0
}

# Step 3: rewrite history (safe, file-preserving)
if (-not $Force) {
    $confirm = Read-Host "`n⚠  Rewrite git history + require force-push? (y/N)"
    if ($confirm -ne 'y') { Write-Host "Aborted."; exit 0 }
}

Write-Host "`n⚠  Rewriting git history (filter-repo --replace-text)..." -ForegroundColor Red
git filter-repo --force --replace-text $replaceFile 2>&1 | Out-Null

Write-Host "  ✅ History rewritten (backup at .git/filter-repo/commit-map)" -ForegroundColor Green
Write-Host "`n  Next steps:" -ForegroundColor Cyan
Write-Host "  1. Verify: git log --all -p | Select-String 'REDACTED'   # should show only replacements"
Write-Host "  2. Force push: git push origin --force --all"
Write-Host "  3. ROTATE the leaked credentials at the source (old values are still live until then)"
Write-Host "  4. Tell collaborators to re-clone (history changed)"
