#!/bin/bash
# =====================================================
# HOSTAMAR AUTO-CRON SETUP
# One-command cron job installation for all automation
# 
# Usage:
#   bash scripts/setup-auto-cron.sh
#   sudo bash scripts/setup-auto-cron.sh  # If permission denied
#
# This sets up:
#   - Daily automation at 9:00 AM
#   - Hourly health checks
#   - Weekly marketing campaigns (Monday 10 AM)
#   - Nightly analytics & cleanup
# =====================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo "============================================================"
echo "  HOSTAMAR AUTO-CRON SETUP"
echo "============================================================"
echo ""

# Check if running in WSL
if grep -qEi "(Microsoft|WSL)" /proc/version 2>/dev/null; then
    echo -e "${GREEN}✓ Detected WSL environment${NC}"
    IS_WSL=true
else
    echo -e "${YELLOW}⚠ Not detected as WSL - assuming Linux${NC}"
    IS_WSL=false
fi

# Find Node.js path
if command -v node &> /dev/null; then
    NODE_PATH=$(which node)
    echo -e "${GREEN}✓ Node.js found: ${NODE_PATH}${NC}"
else
    # Try Windows Node.js from WSL
    if [ -f "/mnt/c/Program Files/nodejs/node.exe" ]; then
        NODE_PATH="/mnt/c/Program Files/nodejs/node.exe"
        echo -e "${GREEN}✓ Windows Node.js found: ${NODE_PATH}${NC}"
    else
        echo -e "${RED}✗ Node.js not found! Install Node.js first.${NC}"
        exit 1
    fi
fi

# Check npm
if command -v npm &> /dev/null; then
    echo -e "${GREEN}✓ npm found: $(which npm)${NC}"
elif [ -f "/mnt/c/Program Files/nodejs/npm.cmd" ]; then
    echo -e "${GREEN}✓ Windows npm available${NC}"
fi

# Ensure dependencies are installed
echo ""
echo "Checking dependencies..."
cd "$PROJECT_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
else
    echo -e "${GREEN}✓ node_modules exists${NC}"
fi

# Ensure Prisma client is generated
if [ ! -d "node_modules/.prisma" ]; then
    echo -e "${YELLOW}Generating Prisma client...${NC}"
    npx prisma generate
else
    echo -e "${GREEN}✓ Prisma client generated${NC}"
fi

# ============================================================
# Create the main automation entry point
# ============================================================
echo ""
echo "Creating automation entry point..."

cat > "${PROJECT_DIR}/scripts/run-daily-automation.js" << 'ENTRYPOINT'
/**
 * HOSTAMAR DAILY AUTOMATION — Main Entry Point
 * Runs all daily tasks sequentially
 */

const { execSync } = require('child_process');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');

function runScript(scriptName, description) {
  const scriptPath = path.join(PROJECT_DIR, 'scripts', scriptName);
  try {
    console.log(`\n▶ ${description}`);
    const result = execSync(`node "${scriptPath}"`, { 
      cwd: PROJECT_DIR, 
      encoding: 'utf-8', 
      timeout: 300000 
    });
    console.log(result);
    return true;
  } catch (error) {
    console.error(`⚠️ ${description} failed:`, error.message.substring(0, 200));
    return false;
  }
}

async function runAll() {
  const startTime = new Date().toISOString();
  console.log('');
  console.log('============================================================');
  console.log('  HOSTAMAR DAILY AUTOMATION');
  console.log('  Started: ' + startTime);
  console.log('============================================================');

  const results = {};

  // Phase 1: Daily scheduler (outreach + analytics)
  results.dailyScheduler = runScript('daily-scheduler.js', 'Daily Scheduler (Outreach + Analytics)');

  // Phase 2: Auto-scaler
  results.autoScaler = runScript('auto-scaler.js', 'Auto-Scaler (Acquisition + Engagement + Scale)');

  // Phase 3: Marketing
  results.marketing = runScript('auto-marketing.js', 'Marketing Engine');

  // Phase 4: Ops monitoring
  results.ops = runScript('auto-ops.js', 'Operations Monitor');

  // Summary
  console.log('\n============================================================');
  console.log('  DAILY AUTOMATION SUMMARY');
  console.log('============================================================');
  for (const [name, success] of Object.entries(results)) {
    console.log(`  ${success ? '✅' : '❌'} ${name}`);
  }
  console.log('============================================================');
  console.log('Completed: ' + new Date().toISOString());
}

runAll();
ENTRYPOINT

echo -e "${GREEN}✓ Created run-daily-automation.js${NC}"

# ============================================================
# Generate cron entries
# ============================================================
echo ""
echo "Setting up cron jobs..."

# Determine shell
if command -v bash &> /dev/null; then
    SHELL_PATH="/bin/bash"
else
    SHELL_PATH="/bin/sh"
fi

# Get the project directory with proper escaping for cron
CRON_PROJECT_DIR="${PROJECT_DIR//\//\\/}"

# Create cron entries
CRON_CONTENT="# ============================================================
# HOSTAMAR AUTOMATION CRON JOBS
# Installed: $(date)
# ============================================================

# Environment
SHELL=${SHELL_PATH}
PATH=/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games

# ============================================================
# JOB 1: Daily Full Automation — Every day at 9:00 AM
# ============================================================
0 9 * * * cd ${PROJECT_DIR} && /usr/bin/node scripts/run-daily-automation.js >> ${PROJECT_DIR}/logs/daily-automation.log 2>&1

# ============================================================
# JOB 2: Hourly Health Check — Every hour
# ============================================================
0 * * * * cd ${PROJECT_DIR} && /usr/bin/node scripts/auto-ops.js --health >> ${PROJECT_DIR}/logs/health-check.log 2>&1

# ============================================================
# JOB 3: Video Processing — Every 30 minutes
# ============================================================
*/30 * * * * cd ${PROJECT_DIR} && /usr/bin/node scripts/auto-ops.js --process-videos >> ${PROJECT_DIR}/logs/video-processing.log 2>&1

# ============================================================
# JOB 4: Payment Monitoring — Every 15 minutes
# ============================================================
*/15 * * * * cd ${PROJECT_DIR} && /usr/bin/node scripts/auto-ops.js --payments >> ${PROJECT_DIR}/logs/payments.log 2>&1

# ============================================================
# JOB 5: Follow-up Processing — Every 2 hours
# ============================================================
0 */2 * * * cd ${PROJECT_DIR} && /usr/bin/node scripts/auto-acquisition.js --follow-ups >> ${PROJECT_DIR}/logs/followups.log 2>&1

# ============================================================
# JOB 6: Weekly Marketing Blitz — Monday 10:00 AM
# ============================================================
0 10 * * 1 cd ${PROJECT_DIR} && /usr/bin/node scripts/auto-marketing.js >> ${PROJECT_DIR}/logs/marketing.log 2>&1

# ============================================================
# JOB 7: Newsletter — Friday 8:00 AM
# ============================================================
0 8 * * 5 cd ${PROJECT_DIR} && /usr/bin/node scripts/auto-marketing.js --newsletter >> ${PROJECT_DIR}/logs/newsletter.log 2>&1

# ============================================================
# JOB 8: Lead Scoring — Daily at midnight
# ============================================================
0 0 * * * cd ${PROJECT_DIR} && /usr/bin/node scripts/auto-acquisition.js --score-all >> ${PROJECT_DIR}/logs/lead-scoring.log 2>&1

# ============================================================
# JOB 9: Referral Program — Daily at 11 AM
# ============================================================
0 11 * * * cd ${PROJECT_DIR} && /usr/bin/node scripts/auto-marketing.js --referral >> ${PROJECT_DIR}/logs/referrals.log 2>&1

# ============================================================
# JOB 10: Database Optimization — Weekly Sunday 3 AM
# ============================================================
0 3 * * 0 cd ${PROJECT_DIR} && /usr/bin/node scripts/auto-ops.js --db-optimize >> ${PROJECT_DIR}/logs/db-optimize.log 2>&1
"

# Create logs directory
mkdir -p "${PROJECT_DIR}/logs"

# Determine if we're in WSL and install cron appropriately
if [ "$IS_WSL" = true ]; then
    echo -e "${YELLOW}WSL detected — using Windows Task Scheduler alternative${NC}"
    echo -e "${YELLOW}Creating Windows-compatible scheduled tasks...${NC}"
    
    # For WSL, we'll create a PowerShell script for Windows Task Scheduler
    cat > "${PROJECT_DIR}/scripts/setup-windows-tasks.ps1" << 'PSEOF'
# Windows Task Scheduler Setup for Hostamar
# Run as Administrator in PowerShell on Windows

$ProjectDir = "C:\Users\$env:USERNAME\hostamar-local"
$NodePath = "C:\Program Files\nodejs\node.exe"

# Create tasks directory
New-Item -ItemType Directory -Force -Path "$ProjectDir\logs" | Out-Null

# Helper: Create a scheduled task
function New-HostamarTask {
    param(
        [string]$Name,
        [string]$Script,
        [string]$Trigger,
        [string]$LogFile
    )
    
    $Action = New-ScheduledTaskAction `
        -Execute $NodePath `
        -Argument "`"$ProjectDir\scripts\$Script`"" `
        -WorkingDirectory $ProjectDir
    
    $Triggers = switch ($Trigger) {
        'daily-9am' { New-ScheduledTaskTrigger -Daily -At "9:00AM" }
        'hourly' { New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 365) }
        'every30min' { New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration (New-TimeSpan -Days 365) }
        'every15min' { New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 365) }
        'every2hours' { New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Hours 2) -RepetitionDuration (New-TimeSpan -Days 365) }
        'monday-10am' { New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At "10:00AM" }
        'friday-8am' { New-ScheduledTaskTrigger -Weekly -DaysOfWeek Friday -At "8:00AM" }
        'midnight' { New-ScheduledTaskTrigger -Daily -At "12:00AM" }
        'sunday-3am' { New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "3:00AM" }
        Default { New-ScheduledTaskTrigger -Daily -At "9:00AM" }
    }
    
    $Settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RestartCount 3 `
        -RestartInterval (New-TimeSpan -Minutes 5)
    
    Register-ScheduledTask `
        -TaskName "Hostamar-$Name" `
        -Action $Action `
        -Trigger $Triggers `
        -Settings $Settings `
        -Description "Hostamar automation: $Name" `
        -User $env:USERNAME `
        -RunLevel Highest | Out-Null
    
    Write-Host "✅ Created task: Hostamar-$Name"
}

# Install all tasks
Write-Host "
============================================================" -ForegroundColor Cyan
Write-Host "  INSTALLING HOSTAMAR SCHEDULED TASKS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

New-HostamarTask -Name "DailyAutomation"     -Script "run-daily-automation.js" -Trigger "daily-9am"
New-HostamarTask -Name "HealthCheck"         -Script "auto-ops.js --health"   -Trigger "hourly"
New-HostamarTask -Name "ProcessVideos"       -Script "auto-ops.js --process-videos" -Trigger "every30min"
New-HostamarTask -Name "PaymentMonitor"      -Script "auto-ops.js --payments" -Trigger "every15min"
New-HostamarTask -Name "FollowUps"           -Script "auto-acquisition.js --follow-ups" -Trigger "every2hours"
New-HostamarTask -Name "Marketing"           -Script "auto-marketing.js"       -Trigger "monday-10am"
New-HostamarTask -Name "Newsletter"          -Script "auto-marketing.js --newsletter" -Trigger "friday-8am"
New-HostamarTask -Name "LeadScoring"         -Script "auto-acquisition.js --score-all" -Trigger "midnight"
New-HostamarTask -Name "Referrals"           -Script "auto-marketing.js --referral" -Trigger "daily-9am"
New-HostamarTask -Name "DatabaseOptimize"    -Script "auto-ops.js --db-optimize" -Trigger "sunday-3am"

Write-Host "
============================================================" -ForegroundColor Green
Write-Host "  ALL TASKS INSTALLED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "  Open Task Scheduler to verify: taskschd.msc" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
PSEOF

    echo -e "${GREEN}✓ Created setup-windows-tasks.ps1 for Windows Task Scheduler${NC}"
    echo -e "${GREEN}  Run PowerShell as Admin: powershell -ExecutionPolicy Bypass -File scripts/setup-windows-tasks.ps1${NC}"

else
    # Native Linux cron installation
    CRON_FILE="${PROJECT_DIR}/logs/hostamar-crontab"
    echo "${CRON_CONTENT}" > "${CRON_FILE}"

    # Install crontab
    if crontab "${CRON_FILE}" 2>/dev/null; then
        echo -e "${GREEN}✓ Crontab installed successfully!${NC}"
    else
        # Try with sudo
        if sudo crontab "${CRON_FILE}" 2>/dev/null; then
            echo -e "${GREEN}✓ Crontab installed with sudo!${NC}"
        else
            echo -e "${RED}✗ Failed to install crontab. Try: sudo crontab ${CRON_FILE}${NC}"
        fi
    fi

    # Verify
    echo ""
    echo "Verifying crontab..."
    crontab -l 2>/dev/null | grep "hostamar" | head -5 || echo -e "${YELLOW}Crontab may need manual verification${NC}"
fi

# ============================================================
# Create launch wrapper script
# ============================================================
echo ""
echo "Creating convenience scripts..."

cat > "${PROJECT_DIR}/scripts/start-automation.sh" << 'LAUNCHER'
#!/bin/bash
# Hostamar Auto-Start Script
# Start all automation services
echo "Starting Hostamar Automation..."
cd "$(dirname "$0")/.."

# Start the main automation in background
nohup node scripts/run-daily-automation.js > logs/automation-output.log 2>&1 &
echo "Automation started (PID: $!)"

# Keep running for monitoring
node scripts/auto-ops.js --monitor
LAUNCHER

chmod +x "${PROJECT_DIR}/scripts/start-automation.sh"
chmod +x "${PROJECT_DIR}/scripts/setup-auto-cron.sh"

echo -e "${GREEN}✓ Created startup script: scripts/start-automation.sh${NC}"

# ============================================================
# Summary
# ============================================================
echo ""
echo "============================================================"
echo -e "  ${GREEN}HOSTAMAR AUTO-CRON SETUP COMPLETE!${NC}"
echo "============================================================"
echo ""
echo "  Files created:"
echo "    • scripts/run-daily-automation.js  (main entry point)"
echo "    • scripts/start-automation.sh      (quick start)"
echo "    • logs/hostamar-crontab            (cron definitions)"
if [ "$IS_WSL" = true ]; then
    echo "    • scripts/setup-windows-tasks.ps1  (Windows scheduler)"
fi
echo ""
echo "  Cron jobs installed:"
echo "    ⏰ 09:00 Daily — Full automation"
echo "    ⏰ Hourly — Health check"
echo "    ⏰ Every 30 min — Video processing"
echo "    ⏰ Every 15 min — Payment monitoring"
echo "    ⏰ Every 2 hours — Follow-ups"
echo "    ⏰ Monday 10 AM — Marketing blitz"
echo "    ⏰ Friday 8 AM — Newsletter"
echo "    ⏰ Midnight — Lead scoring"
echo "    ⏰ Daily 11 AM — Referral program"
echo "    ⏰ Sunday 3 AM — DB optimization"
echo ""
echo "  Next steps:"
echo "    1. Test: node scripts/run-daily-automation.js"
if [ "$IS_WSL" = true ]; then
    echo "    2. Windows: Open PowerShell as Admin and run:"
    echo "       powershell -ExecutionPolicy Bypass -File scripts/setup-windows-tasks.ps1"
else
    echo "    2. Verify: crontab -l"
fi
echo "    3. Monitor: tail -f logs/daily-automation.log"
echo ""
echo "============================================================"
echo ""