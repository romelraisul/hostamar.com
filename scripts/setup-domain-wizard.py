#!/usr/bin/env python3
"""
Hostamar.com - One-Click Cloudflare Domain Connection
Interactive setup wizard that walks you through connecting your domain

Run: python3 scripts/setup-domain-wizard.py
"""

import json
import os
from pathlib import Path
import subprocess

def print_brand():
    print("=" * 70)
    print("  🚀 HOSTAMAR.COM - DOMAIN SETUP WIZARD")
    print("=" * 70)
    print()

def check_credentials():
    """Check if Cloudflare credentials exist"""
    token = os.environ.get('CLOUDFLARE_API_TOKEN')
    zone_id = os.environ.get('CLOUDFLARE_ZONE_ID')
    return token, zone_id

def wizard_intro():
    print_brand()
    print("This wizard will help you connect hostamar.com to Vercel via Cloudflare")
    print()
    print("What you'll need:")
    print("  ✅ Cloudflare account")
    print("  ✅ Domain hostamar.com managed by Cloudflare")
    print("  ✅ API token with DNS edit permissions")
    print("  ✅ Zone ID for hostamar.com")
    print()
    print("Time required: ~5 minutes")
    print()

def main():
    wizard_intro()
    
    # Detect platform
    print("🔍 Detecting environment...")
    is_windows = os.name == 'nt'
    is_wsl = 'microsoft' in os.uname().release.lower() if hasattr(os, 'uname') else False
    
    if is_wsl:
        print("   Platform: WSL (Windows Subsystem for Linux)")
    elif is_windows:
        print("   Platform: Windows")
    else:
        print("   Platform: Linux/Mac")
    print()
    
    # Check credentials
    token, zone_id = check_credentials()
    
    if token and zone_id:
        print("✅ Cloudflare credentials detected!")
        print()
        run_now = input("Run automated setup now? (y/n): ").lower().strip()
        if run_now == 'y':
            run_automation(token, zone_id)
            return
    else:
        print("⚠️  Cloudflare credentials not found in environment")
        print()
        choice = input("Would you like to: (1) Get credentials, (2) Set credentials, or (3) See instructions? [1/2/3]: ").strip()
        
        if choice == '1':
            show_get_credentials()
        elif choice == '2':
            guide_set_credentials()
        elif choice == '3':
            show_full_instructions()
        else:
            print("Invalid choice. Showing full instructions...")
            show_full_instructions()

def show_get_credentials():
    print()
    print("=" * 70)
    print("  🔑 GETTING CLOUDFLARE CREDENTIALS")
    print("=" * 70)
    print()
    print("Step 1: Get API Token")
    print("   1. Go to: https://dash.cloudflare.com/profile/api-tokens")
    print("   2. Click 'Create Token'")
    print("   3. Select template: 'Edit zone DNS'")
    print("   4. Permissions: Zone - DNS - Edit")
    print("   5. Zone Resources: hostamar.com")
    print("   6. Click 'Create Token'")
    print("   7. COPY THE TOKEN (starts with: eyJ...)")
    print()
    print("Step 2: Get Zone ID")
    print("   1. Cloudflare Dashboard → hostamar.com")
    print("   2. Overview page")
    print("   3. Find 'Zone ID' in right sidebar")
    print("   4. COPY ZONE ID (e.g., abc123def456...)")
    print()

def guide_set_credentials():
    print()
    print("=" * 70)
    print("  🔐 SETTING CREDENTIALS IN WINDOWS")
    print("=" * 70)
    print()
    print("Method 1: Command Prompt (Admin) - Permanent")
    print()
    print("  Open Command Prompt AS ADMINISTRATOR")
    print("  Then run:")
    print()
    print('    setx CLOUDFLARE_API_TOKEN "YOUR_TOKEN_HERE"')
    print('    setx CLOUDFLARE_ZONE_ID "YOUR_ZONE_ID_HERE"')
    print()
    print("  ⚠️  Close and reopen terminal after running setx")
    print()
    print("Method 2: Current Session - Temporary")
    print()
    print('    set CLOUDFLARE_API_TOKEN=YOUR_TOKEN')
    print('    set CLOUDFLARE_ZONE_ID=YOUR_ZONE_ID')
    print()
    print("Method 3: PowerShell")
    print()
    print('    $env:CLOUDFLARE_API_TOKEN = "YOUR_TOKEN"')
    print('    $env:CLOUDFLARE_ZONE_ID = "YOUR_ZONE_ID"')
    print()
    
    # Interactive input
    print("OR enter credentials now (will NOT be saved):")
    token = input("  Token: ").strip()
    zone = input("  Zone ID: ").strip()
    
    if token and zone:
        os.environ['CLOUDFLARE_API_TOKEN'] = token
        os.environ['CLOUDFLARE_ZONE_ID'] = zone
        print()
        print("✅ Credentials set for this session")
        print()
        run_now = input("Run automated setup now? (y/n): ").lower().strip()
        if run_now == 'y':
            run_automation(token, zone)
    else:
        print("Credentials incomplete. Please set them and re-run wizard.")

def show_full_instructions():
    print()
    print("=" * 70)
    print("  📋 COMPLETE SETUP INSTRUCTIONS")
    print("=" * 70)
    print()
    print("Step 1: Get Cloudflare API Token")
    print("  → https://dash.cloudflare.com/profile/api-tokens")
    print("  → Create token: 'Edit zone DNS'")
    print("  → Copy token (starts with 'eyJ')")
    print()
    print("Step 2: Get Zone ID")
    print("  → Cloudflare Dashboard → hostamar.com")
    print("  → Overview → Zone ID (sidebar)")
    print("  → Copy Zone ID")
    print()
    print("Step 3: Set Credentials (Windows CMD as Admin)")
    print('  → setx CLOUDFLARE_API_TOKEN "YOUR_TOKEN"')
    print('  → setx CLOUDFLARE_ZONE_ID "YOUR_ZONE_ID"')
    print()
    print("Step 4: Run Automation")
    print("  → Open new terminal (credentials loaded)")
    print("  → cd /mnt/c/Users/romel/hostamar-local")
    print("  → node scripts/cloudflare-setup.js")
    print()
    print("Step 5: Wait")
    print("  → 5-10 minutes DNS propagation")
    print()
    print("Step 6: Verify in Vercel")
    print("  → https://vercel.com/dashboard/projects/hostamar-local/domains")
    print("  → Add hostamar.com")
    print("  → Click Verify")
    print()

def run_automation(token, zone_id):
    print()
    print("=" * 70)
    print("  🚀 RUNNING AUTOMATED DNS CONFIGURATION")
    print("=" * 70)
    print()
    
    # Run the Node.js script
    script_path = Path("/mnt/c/Users/romel/hostamar-local/scripts/cloudflare-setup.js")
    
    if not script_path.exists():
        print(f"❌ Script not found: {script_path}")
        return
    
    print(f"📜 Executing: {script_path}")
    print()
    
    env = os.environ.copy()
    env['CLOUDFLARE_API_TOKEN'] = token
    env['CLOUDFLARE_ZONE_ID'] = zone_id
    
    try:
        result = subprocess.run(
            ['/mnt/c/Program Files/nodejs/node.exe', str(script_path)],
            env=env,
            capture_output=True,
            text=True,
            timeout=30,
            cwd="/mnt/c/Users/romel/hostamar-local"
        )
        
        print(result.stdout)
        
        if result.stderr:
            print("ℹ️  Info:", result.stderr[:200])
        
        if result.returncode == 0:
            print()
            print("✅ DNS setup completed successfully!")
            print()
            print("🎯 NEXT: Verify in Vercel")
            print("   1. Wait 5-10 min")
            print("   2. Go to: https://vercel.com/dashboard/projects/hostamar-local/domains")
            print("   3. Add: hostamar.com")
            print("   4. Click: Verify")
        else:
            print()
            print(f"❌ Script failed with exit code: {result.returncode}")
            
    except subprocess.TimeoutExpired:
        print("⏰ Script timeout - DNS propagation may be slow")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
