"""
Add hostamar.com as a custom domain in Vercel
"""
import requests
import json

vercel_token = os.environ.get('VERCEL_TOKEN', '')
project_id = "prj_DHjSYgYzwWeS0XY5iZzm0HQ6sIui"
org_id = "team_2joO6ASiPDBFcNKkoFf0pwLg"

headers = {
    "Authorization": f"Bearer {vercel_token}",
    "Content-Type": "application/json"
}

base_url = f"https://api.vercel.com/v9/projects/{project_id}/domains"

print("=" * 60)
print("  VERCEL CUSTOM DOMAIN SETUP")
print("=" * 60)
print()

# List current domains first
print("🔍 Checking current domains...")
r = requests.get(f"{base_url}?teamId={org_id}", headers=headers)
if r.status_code == 200:
    data = r.json()
    if isinstance(data, dict) and "domains" in data:
        existing = [d.get("name") for d in data["domains"]]
        print(f"  Current domains: {existing if existing else 'None'}")
    else:
        print(f"  Response: {json.dumps(data, indent=2)[:500]}")
else:
    print(f"  Status: {r.status_code}, Response: {r.text[:200]}")

print()

# Add hostamar.com
print("📝 Adding hostamar.com...")
payload = {"name": "hostamar.com"}
r = requests.post(f"{base_url}?teamId={org_id}", headers=headers, json=payload)
if r.status_code in (200, 201):
    data = r.json()
    print(f"  ✅ hostamar.com added!")
    if isinstance(data, dict):
        print(f"  Verification: {json.dumps(data, indent=2)[:500]}")
else:
    print(f"  Response: {r.status_code}")
    try:
        data = r.json()
        if "error" in data:
            print(f"  ❌ {data['error'].get('message', data['error'])}")
        elif "message" in data:
            print(f"  ❌ {data['message']}")
        else:
            print(f"  {json.dumps(data, indent=2)[:500]}")
    except:
        print(f"  {r.text[:300]}")

print()

# Add www.hostamar.com
print("📝 Adding www.hostamar.com...")
payload = {"name": "www.hostamar.com", "redirect": None}
r = requests.post(f"{base_url}?teamId={org_id}", headers=headers, json=payload)
if r.status_code in (200, 201):
    data = r.json()
    print(f"  ✅ www.hostamar.com added!")
    if isinstance(data, dict):
        print(f"  {json.dumps(data, indent=2)[:500]}")
else:
    print(f"  Response: {r.status_code}")
    try:
        data = r.json()
        if "error" in data:
            print(f"  ❌ {data['error'].get('message', data['error'])}")
        elif "message" in data:
            print(f"  ❌ {data['message']}")
        else:
            print(f"  {json.dumps(data, indent=2)[:500]}")
    except:
        print(f"  {r.text[:300]}")

print()

# Verify domain status
print("🔍 Verifying domain status...")
r = requests.get(f"https://api.vercel.com/v9/projects/{project_id}/domains/hostamar.com?teamId={org_id}", headers=headers)
if r.status_code == 200:
    data = r.json()
    print(f"  Status: {json.dumps(data, indent=2)[:500]}")
else:
    print(f"  Response: {r.status_code}, {r.text[:200]}")

print()
print("✅ Vercel domain setup complete!")
