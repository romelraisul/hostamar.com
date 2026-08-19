#!/bin/bash
# Check login page for SSO button
for url in "https://hostamar.com/login" "https://hostamar.com/signup"; do
  echo "=== $url ==="
  curl -s "$url" | grep -ioE "(sso|google|oauth|social|continue with)[^<]*" | head -5
  echo ""
done

# Check local file
echo "=== login page source ==="
head -50 /mnt/c/Users/User/hostamar.com/app/login/page.tsx 2>/dev/null || echo "not found"
echo "=== signup page source ==="
head -50 /mnt/c/Users/User/hostamar.com/app/signup/page.tsx 2>/dev/null || echo "not found"
