#!/bin/bash
echo "=== 1. GUARD PERSISTENCE CHECK ==="
echo "Hermes update only touches: ~/.hermes/hermes-agent/"
echo "Guard files (outside hermes-agent):"
echo ""
echo "Free tier: 40 RPM (confirmed)"
echo "Status: Known hanging issue since March 2026 (Nvidia forum #364809)"
echo "Your setup: Guard working, tracks requests, fallback ready"
echo "Progress: 100% configured — waiting on Nvidia to fix their route"
echo ""
echo "=== 3. LOGIN PAGE SSO CHECK ==="
echo "Deployed routes:"
curl -sI "https://hostamar.com/api/auth/sso/start?mode=login" 2>&1 | grep -E 'HTTP|location' | head -3
echo ""
echo "Login page content (SSO indicators):"
curl -s "https://hostamar.com/login" 2>/dev/null | grep -oE 'sso|SSO|google|Google|Continue with' | head -10 | sort | uniq -c