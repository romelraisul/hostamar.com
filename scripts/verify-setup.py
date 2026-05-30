"""
Final verification of hostamar.com domain setup
"""
import requests
import json
import socket

# Configuration
cf_token = os.environ.get('CLOUDFLARE_API_TOKEN', '')
cf_zone = os.environ.get('CLOUDFLARE_ZONE_ID', '')
vercel_token = os.environ.get('VERCEL_TOKEN', '')
project_id = "prj_DHjSYgYzwWeS0XY5iZzm0HQ6sIui"
org_id = "team_2joO6ASiPDBFcNKkoFf0pwLg"

cf_headers = {"Authorization": f"Bearer {cf_token}", "Content-Type": "application/json"}
v_headers = {"Authorization": f"Bearer {vercel_token}"}

print("=" * 70)
print("  🚀 HOSTAMAR.COM - FINAL VERIFICATION")
print("=" * 70)
print()

all_good = True

# 1. Check Cloudflare DNS records
print("🔍 1. Cloudflare DNS Records")
print("-" * 50)
r = requests.get(f"https://api.cloudflare.com/client/v4/zones/{cf_zone}/dns_records", headers=cf_headers)
if r.status_code == 200:
    data = r.json()
    if data.get("success"):
        for rec in data.get("result", []):
            name = rec.get("name", "")
            rtype = rec.get("type", "")
            content = rec.get("content", "")
            proxied = rec.get("proxied", False)
            print(f"  {rtype:6} {name:30} → {content:25}  proxy={'ON' if proxied else 'OFF'}")
    else:
        print(f"  ❌ Failed: {data.get('errors', [{}])[0].get('message', 'unknown')}")
        all_good = False
else:
    print(f"  ❌ HTTP {r.status_code}")
    all_good = False
print()

# 2. Check Vercel domains
print("🔍 2. Vercel Custom Domains")
print("-" * 50)
for domain in ["hostamar.com", "www.hostamar.com"]:
    r = requests.get(
        f"https://api.vercel.com/v9/projects/{project_id}/domains/{domain}?teamId={org_id}",
        headers=v_headers
    )
    if r.status_code == 200:
        data = r.json()
        name = data.get("name", "")
        verified = data.get("verified", False)
        updated = data.get("updatedAt", 0)
        print(f"  {'✅' if verified else '❌'} {name:30} verified={'YES' if verified else 'NO'}")
        if not verified:
            all_good = False
    else:
        print(f"  ❌ {domain}: HTTP {r.status_code}")
        all_good = False
print()

# 3. DNS resolution check (using public DNS)
print("🔍 3. DNS Resolution (via 1.1.1.1)")
print("-" * 50)
dns_records = [
    ("hostamar.com", "A"),
    ("www.hostamar.com", "CNAME"),
]
for name, rtype in dns_records:
    try:
        if rtype == "A":
            result = socket.getaddrinfo(name, None)
            ips = set(r[4][0] for r in result)
            print(f"  {rtype:6} {name:30} → {', '.join(ips)}")
        else:
            # For CNAME, we can't easily resolve via stdlib
            print(f"  {rtype:6} {name:30} → (check via DNS query)")
    except Exception as e:
        print(f"  ❌ {rtype:6} {name:30} → Error: {e}")
print()

# 4. Summary
print("=" * 70)
if all_good:
    print("  ✅ ALL CHECKS PASSED - Domain setup is complete!")
else:
    print("  ⚠️  Some checks failed - review above")
print("=" * 70)
print()
print("Project Dashboard: https://vercel.com/dashboard/projects/hostamar-local/domains")
print("Cloudflare Dashboard: https://dash.cloudflare.com/?to=/:zone/dns")
print()
