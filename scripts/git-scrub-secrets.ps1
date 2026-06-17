@'
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Find, scrub, and rotate secrets from git history.
.DESCRIPTION
    Scans git history for patterns matching credentials/secrets,
    rewrites history to remove them, and generates a rotation report.
    Must be run from the repo root.
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

# Patterns to scan for
$secretPatterns = @(
    'password\s*=\s*.+',
    'secret\s*=\s*.+',
    'NEXTAUTH_SECRET\s*=\s*.+',
    'JWT_SECRET\s*=\s*.+',
    'DATABASE_URL\s*=\s*postgresql://.+',
    'api[_-]?key\s*[:=]\s*.+',
    'token\s*[:=]\s*.+',
    'sk-[a-zA-Z0-9]{20,}',
    'ghp_[a-zA-Z0-9]{36}',
    'AKIA[0-9A-Z]{16}',
    '-----BEGIN (RSA|OPENSSH|EC) PRIVATE KEY-----'
)

Write-Host "`n🔍 Hostamar Git History Scrub" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Step 1: Scan git history for secrets
Write-Host "📋 Scanning git history for secrets..." -ForegroundColor Yellow
$foundFiles = @{}

foreach ($pattern in $secretPatterns) {
    $matches = git log --all --diff-filter=AM --pretty=format:"%H %ai" -S $pattern -- "*.env" "*.json" "*.yaml" "*.yml" "*.ts" "*.js" "*.md" 2>$null
    foreach ($match in $matches) {
        if ($match -match "^([a-f0-9]+)\s+(\d{4}-\d{2}-\d{2})") {
            $commit = $matches[1]
            $date = $matches[2]
            $files = git diff-tree --no-commit-id --name-only -r $commit 2>$null
            foreach ($file in $files) {
                $foundFiles[$file] = @{ commit = $commit; date = $date }
                Write-Host "  ⚠  $date — $commit.substring(0,8) — $file" -ForegroundColor Red
            }
        }
    }
}

if ($foundFiles.Count -eq 0) {
    Write-Host "  ✅ No secrets found in git history" -ForegroundColor Green
} else {
    Write-Host "`n  Found $($foundFiles.Count) files with potential secrets" -ForegroundColor Red
}

# Step 2: Scan current .env (if exists)
$envFile = Join-Path $rootDir ".env"
if (Test-Path $envFile) {
    Write-Host "`n📋 Scanning current .env..." -ForegroundColor Yellow
    $envContent = Get-Content $envFile -Raw
    $sensitiveKeys = @()
    
    if ($envContent -match '(?<=PASSWORD|SECRET|KEY|TOKEN)=.+') {
        Write-Host "  ⚠  .env contains live credentials — ensure it's in .gitignore" -ForegroundColor Red
        Write-Host "  Checking .gitignore..." -ForegroundColor Yellow
        
        $gitignore = Get-Content ".gitignore" -ErrorAction SilentlyContinue
        if ($gitignore -notcontains ".env") {
            Write-Host "  ❌ .env NOT in .gitignore — adding now" -ForegroundColor Red
            if (-not $WhatIf) {
                Add-Content ".gitignore" "`n.env"
                Write-Host "  ✅ Added .env to .gitignore" -ForegroundColor Green
            }
        } else {
            Write-Host "  ✅ .env is in .gitignore" -ForegroundColor Green
        }
    }
}

# Step 3: Rewrite history (if not WhatIf and secrets found)
if ($foundFiles.Count -gt 0 -and -not $WhatIf) {
    Write-Host "`n⚠  READY TO REWRITE GIT HISTORY" -ForegroundColor Red
    Write-Host "  $($foundFiles.Count) files contain potential secrets."
    Write-Host "  This will rewrite git history and require force push." -ForegroundColor Yellow
    
    if (-not $Force) {
        $confirm = Read-Host "  Continue? (y/N)"
        if ($confirm -ne "y") {
            Write-Host "  Aborted." -ForegroundColor Yellow
            exit 0
        }
    }

    # Remove sensitive files from history
    $uniqueFiles = $foundFiles.Keys | Select-Object -Unique
    foreach ($file in $uniqueFiles) {
        Write-Host "  Removing $file from history..." -ForegroundColor Yellow
        git filter-repo --path "$file" --invert-paths --force 2>$null
    }

    # Alternatively, use BFG for .env specifically
    Write-Host "`n  Running BFG to remove .env references..." -ForegroundColor Yellow
    java -jar bfg.jar --delete-files .env --no-blob-protection 2>$null

    # Cleanup
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive

    Write-Host "  ✅ History rewritten" -ForegroundColor Green
    Write-Host "`n  Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Verify: git log --oneline --all | head -5"
    Write-Host "  2. Force push: git push origin --force --all"
    Write-Host "  3. Rotate all credentials that were in history"
    Write-Host "  4. Notify team to re-clone the repo"
}

# Step 4: Rotation report
Write-Host "`n📋 Rotation Report" -ForegroundColor Cyan
Write-Host "  Credentials that MUST be rotated:" -ForegroundColor Yellow
Write-Host "  • NEXTAUTH_SECRET — stored in .env + CI secrets"
Write-Host "  • JWT_SECRET — stored in .env"
Write-Host "  • DATABASE_URL password — stored in .env"
Write-Host "  • Admin password — stored in DB + CI secrets"
Write-Host ""
Write-Host "  Regenerate with:" -ForegroundColor Gray
Write-Host "  powershell -c `"`$s = -join ((65..90)+(97..122)+(48..57) | Get-Random -Count 64 | %% { [char]`$_ }); Write-Host `$s`""

Write-Host "`n✅ Done" -ForegroundColor Green
'@