import os, requests, json

# Verify Cloudflare token
token = os.environ.get('CLOUDFLARE_API_TOKEN', '')
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

print("=== Verifying Cloudflare API Token ===")
r = requests.get("https://api.cloudflare.com/client/v4/user/tokens/verify", headers=headers)
data = r.json()
if data.get("success"):
    print(f"✅ Token valid! Status: {data.get('result', {}).get('status', 'unknown')}")
else:
    print(f"❌ Token invalid: {data.get('errors', [{}])[0].get('message', 'unknown error')}")
    print(f"Full response: {json.dumps(data, indent=2)}")

print()

# Check zone
print("=== Checking Zone ===")
zone_id = os.environ.get('CLOUDFLARE_ZONE_ID', '')
r = requests.get(f"https://api.cloudflare.com/client/v4/zones/{zone_id}", headers=headers)
data = r.json()
if data.get("success"):
    zone_name = data.get("result", {}).get("name", "")
    print(f"✅ Zone found: {zone_name}")
else:
    print(f"❌ Zone error: {data.get('errors', [{}])[0].get('message', 'unknown error')}")

print()

# Check Vercel token
print("=== Verifying Vercel API Token ===")
vercel_token = os.environ.get('VERCEL_TOKEN', '')
vh = {"Authorization": f"Bearer {vercel_token}"}
r = requests.get("https://api.vercel.com/v9/user", headers=vh)
data = r.json()
if "user" in data or "id" in data or "error" not in data:
    print(f"✅ Vercel token works! User: {data.get('user', {}).get('email', data.get('id', 'unknown'))}")
else:
    print(f"❌ Vercel token error: {data.get('error', {}).get('message', json.dumps(data)[:200])}")
