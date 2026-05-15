#!/usr/bin/env python3
"""
Cloudflare Domain Setup Script for Hostamar
Fully automated DNS configuration for hostamar.com → Vercel

Usage:
  1. Set environment variables:
     export CLOUDFLARE_API_TOKEN='your_token'
     export CLOUDFLARE_ZONE_ID='your_zone_id'
  
  2. Run script:
     python3 scripts/cloudflare-setup.py
"""

import requests
import json
import sys
import time
from datetime import datetime

class CloudflareDNS:
    def __init__(self, token, zone_id):
        self.token = token
        self.zone_id = zone_id
        self.base_url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}"
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def get_dns_records(self):
        """Get all DNS records for the zone"""
        response = requests.get(
            f"{self.base_url}/dns_records",
            headers=self.headers
        )
        return response.json()
    
    def get_record(self, record_type, name):
        """Get specific DNS record"""
        response = requests.get(
            f"{self.base_url}/dns_records",
            headers=self.headers,
            params={"type": record_type, "name": name}
        )
        return response.json().get("result", [])
    
    def create_record(self, record_data):
        """Create new DNS record"""
        response = requests.post(
            f"{self.base_url}/dns_records",
            headers=self.headers,
            json=record_data
        )
        return response.json()
    
    def update_record(self, record_id, record_data):
        """Update existing DNS record"""
        response = requests.put(
            f"{self.base_url}/dns_records/{record_id}",
            headers=self.headers,
            json=record_data
        )
        return response.json()
    
    def delete_record(self, record_id):
        """Delete DNS record"""
        response = requests.delete(
            f"{self.base_url}/dns_records/{record_id}",
            headers=self.headers
        )
        return response.json()

def setup_hostamar_dns():
    """Setup hostamar.com DNS records"""
    import os
    
    token = os.environ.get('CLOUDFLARE_API_TOKEN')
    zone_id = os.environ.get('CLOUDFLARE_ZONE_ID')
    
    if not token or not zone_id:
        print("❌ Missing credentials!")
        print("Set environment variables:")
        print("  export CLOUDFLARE_API_TOKEN='your_token'")
        print("  export CLOUDFLARE_ZONE_ID='your_zone_id'")
        return False
    
    cf = CloudflareDNS(token, zone_id)
    
    # Required DNS records
    dns_records = [
        {"type": "A", "name": "hostamar.com", "content": "76.76.21.21", "ttl": 1, "proxied": False},
        {"type": "CNAME", "name": "www.hostamar.com", "content": "cname.vercel-dns.com", "ttl": 1, "proxied": False}
    ]
    
    print("=" * 70)
    print("  ☁️  CLOUDFLARE DNS SETUP - hostamar.com")
    print(f"  🕐 Started: {datetime.now().strftime('%H:%M:%S')}")
    print("=" * 70)
    print()
    
    for record in dns_records:
        print(f"🔧 Setting up {record['type']} record: {record['name']}")
        
        # Check if exists
        existing = cf.get_record(record['type'], record['name'])
        
        if existing:
            # Update
            record_id = existing[0]['id']
            result = cf.update_record(record_id, record)
            print(f"   ✅ Updated existing record")
        else:
            # Create
            result = cf.create_record(record)
            print(f"   ✅ Created new record")
        
        if not result.get('success'):
            print(f"   ❌ Error: {result}")
        
        time.sleep(0.5)
    
    print()
    print("=" * 70)
    print("  ✅ DNS CONFIGURATION COMPLETE!")
    print("=" * 70)
    print()
    print("Next steps:")
    print("  1. Wait 5-10 minutes for DNS propagation")
    print("  2. Go to Vercel Dashboard")
    print("  3. Add domain: hostamar.com")
    print("  4. Click 'Verify'")
    print()
    print("  🔗 Vercel Domains: https://vercel.com/dashboard/projects/hostamar-local/domains")
    
    return True

if __name__ == "__main__":
    setup_hostamar_dns()