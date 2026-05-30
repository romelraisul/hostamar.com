#!/usr/bin/env node
/**
 * Hostamar DNS Setup Script
 * Automated Cloudflare DNS configuration for hostamar.com
 */

const https = require('https');

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || 'YOUR_CLOUDFLARE_API_TOKEN_HERE';
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || '2aef176c6f2000da2af593f4890ec298';
const DOMAIN = 'hostamar.com';

const DNS_RECORDS = [
  { type: 'A', name: '@', content: '76.76.21.21', ttl: 300, proxied: true },
  { type: 'CNAME', name: 'www', content: 'cname.vercel-dns.com', ttl: 300, proxied: true },
  { type: 'TXT', name: '@', content: 'v=spf1 include:_spf.google.com ~all', ttl: 300 },
  { type: 'MX', name: '@', content: 'aspmx.l.google.com', priority: 10, ttl: 300 },
];

async function apiRequest(method, path, body) {
  const options = {
    hostname: 'api.cloudflare.com',
    path: `/client/v4/zones/${CLOUDFLARE_ZONE_ID}${path}`,
    method,
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Invalid JSON: ${data}`)); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function setupDNS() {
  console.log('🚀 Starting DNS setup for hostamar.com...');
  
  if (CLOUDFLARE_API_TOKEN === 'YOUR_CLOUDFLARE_API_TOKEN_HERE') {
    console.log('⚠️  WARNING: CLOUDFLARE_API_TOKEN not configured!');
    console.log('   Set it: export CLOUDFLARE_API_TOKEN="your_token"');
    process.exit(0);
  }

  for (const record of DNS_RECORDS) {
    try {
      // Check existing
      const existing = await apiRequest('GET', `/dns_records?type=${record.type}&name=${record.name === '@' ? DOMAIN : record.name}.${DOMAIN}`);
      
      if (existing.result && existing.result.length > 0) {
        // Update existing
        const existingRecord = existing.result[0];
        const needsUpdate = 
          existingRecord.content !== record.content || 
          existingRecord.proxied !== record.proxied;
        
        if (needsUpdate) {
          await apiRequest('PUT', `/dns_records/${existingRecord.id}`, record);
          console.log(`✅ Updated ${record.type} ${record.name === '@' ? DOMAIN : record.name}.${DOMAIN}`);
        } else {
          console.log(`👍 ${record.type} ${record.name === '@' ? DOMAIN : record.name}.${DOMAIN} already correct`);
        }
      } else {
        // Create new
        await apiRequest('POST', '/dns_records', record);
        console.log(`✅ Created ${record.type} ${record.name === '@' ? DOMAIN : record.name}.${DOMAIN}`);
      }
    } catch (err) {
      console.error(`❌ Failed ${record.type} ${record.name}: ${err.message}`);
    }
  }

  console.log('\n🎯 DNS setup complete!');
  console.log('⚡ DNS changes may take 5-60 minutes to propagate.');
  console.log('👉 Verify at: https://dash.cloudflare.com/ -> DNS Records');
}

setupDNS().catch(console.error);