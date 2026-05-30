"""
Set up Cloudflare DNS records for hostamar.com → Vercel
"""
import requests
import json
import sys

token = os.environ.get("CLOUDFLARE_API_TOKEN", "")
zone_id = "2aef176c6f2000da2af593f4890ec298"

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

records = [
    {"type": "A", "name": "hostamar.com", "content": "76.76.21.21", "ttl": 1, "proxied": False},
    {"type": "CNAME", "name": "www.hostamar.com", "content": "cname.vercel-dns.com", "ttl": 1, "proxied": False}
]

base_url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records"

print("=" * 60)
print("  CLOUDFLARE DNS CONFIGURATION")
print("=" * 60)
print()

all_ok = True

for record in records:
    print(f"Configuring: {record['type']} {record['name']} → {record['content']}")
    try:
        # Check if exists
        resp = requests.get(
            base_url,
            headers=headers,
            params={"type": record["type"], "name": record["name"]}
        )
        data = resp.json()
        
        if data.get("success") and data.get("result") and len(data["result"]) > 0:
            # Update existing
            record_id = data["result"][0]["id"]
            upd = requests.put(
                f"{base_url}/{record_id}",
                headers=headers,
                json=record
            )
            if upd.json().get("success"):
                print(f"  ✅ Updated (ID: {record_id[:12]}...)")
            else:
                print(f"  ❌ Update failed: {upd.text[:200]}")
                all_ok = False
        else:
            # Create new
            resp = requests.post(base_url, headers=headers, json=record)
            resp_data = resp.json()
            if resp_data.get("success"):
                new_id = resp_data.get("result", {}).get("id", "?")
                print(f"  ✅ Created (ID: {new_id[:12]}...)")
            else:
                print(f"  ❌ Create failed: {resp.text[:200]}")
                all_ok = False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        all_ok = False

print()
if all_ok:
    print("✅ Cloudflare DNS configuration complete!")
else:
    print("⚠️  Some DNS records failed. Check above.")
    sys.exit(1)

print()
print("Next steps:")
print("  1. Wait a moment for DNS propagation")
print("  2. Add hostamar.com as custom domain in Vercel")
print("  3. Verify the domain")
