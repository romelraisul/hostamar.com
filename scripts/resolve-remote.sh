#!/bin/bash
# resolve-remote.sh — Resolve DESKTOP-9KA03CQ to current LAN IPv4
# Returns IP on stdout, exits 1 if not found.
# Uses Windows PowerShell LLMNR/mDNS resolution (works regardless of DHCP).
# Called by cron-tunnel.sh and other scripts that need the remote IP.

REMOTE_HOST="DESKTOP-9KA03CQ"
KNOWN_MAC="60-cf-84-8a-58-ab"

# Method 1: PowerShell DNS/LLMNR resolution (fastest, most reliable)
IP=$('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe' -NoProfile -Command "
  try {
    \$entry = [System.Net.Dns]::GetHostEntry('$REMOTE_HOST')
    \$ip = \$entry.AddressList | Where-Object { \$_ -match '^\d+\.\d+\.\d+\.\d+' } | Select-Object -First 1
    if (\$ip) { Write-Output \$ip.IPAddressToString; exit 0 }
  } catch {}
  exit 1
" 2>/dev/null | tr -d '\r')

if [ -n "$IP" ]; then
  echo "$IP"
  exit 0
fi

# Method 2: Ping sweep + MAC match (fallback)
CURRENT_IP=$(/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -Command "
  \$mac = '$KNOWN_MAC'
  \$current = ''
  # Quick ARP check first
  \$arp = arp -a 2>&1 | Select-String -Pattern '\$mac'
  if (\$arp) {
    \$current = (\$arp -split '\s+')[0]
    if (\$current -match '^\d+\.\d+\.\d+\.\d+') { Write-Output \$current.Trim(); exit 0 }
  }
  # Ping sweep /24
  1..254 | ForEach-Object {
    \$ip = '192.168.1.' + \$_
    \$ping = ping -n 1 -w 100 \$ip 2>&1
    if (\$LASTEXITCODE -eq 0) {
      \$arp2 = arp -a 2>&1 | Select-String -Pattern '\$mac'
      if (\$arp2) {
        \$current = (\$arp2 -split '\s+')[0]
        if (\$current -match '^\d+\.\d+\.\d+\.\d+') { Write-Output \$current.Trim(); exit 0 }
      }
    }
  }
  exit 1
" 2>/dev/null | tr -d '\r')

if [ -n "$CURRENT_IP" ]; then
  echo "$CURRENT_IP"
  exit 0
fi

echo "RESOLVE_FAILED"
exit 1
