
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

for record in records:
    print(f"Configuring: {record['type']} {record['name']}")
    try:
        # Check if exists
        resp = requests.get(
            base_url,
            headers=headers,
            params={"type": record["type"], "name": record["name"]}
        )
        data = resp.json()
        
        if data.get("success") and data.get("result") and len(data["result"]) > 0:
            # Update
            record_id = data["result"][0]["id"]
            upd = requests.put(
                f"{base_url}/{record_id}",
                headers=headers,
                json=record
            )
            if upd.json().get("success"):
                print("  ✅ Updated")
            else:
                print(f"  ❌ Update failed: {upd.text[:100]}")
        else:
            # Create
            resp = requests.post(base_url, headers=headers, json=record)
            if resp.json().get("success"):
                print("  ✅ Created")
            else:
                print(f"  ❌ Create failed: {resp.text[:100]}")
    except Exception as e:
        print(f"  ❌ Error: {e}")

print()
print("✅ Configuration complete!")
print()
print("Next steps:")
print("  1. Wait 5-10 minutes for DNS propagation")
print("  2. Go to: https://vercel.com/dashboard/projects/hostamar-local/domains")
print("  3. Add domain: hostamar.com")
print("  4. Click Verify")
