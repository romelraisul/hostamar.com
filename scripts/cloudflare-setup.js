/**
 * Cloudflare Automated Domain Setup for Hostamar
 * 
 * Usage:
 * 1. Set environment variables:
 *    CLOUDFLARE_API_TOKEN=your_token
 *    CLOUDFLARE_ZONE_ID=your_zone_id
 * 
 * 2. Run: node scripts/cloudflare-setup.js
 * 
 * Required permissions: Zone - DNS - Edit
 */

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setupCloudflare() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!token || !zoneId) {
    console.error('❌ Missing Cloudflare credentials!');
    console.log('\nGet your credentials:');
    console.log('  Token: https://dash.cloudflare.com/profile/api-tokens');
    console.log('  Zone ID: Cloudflare Dashboard → hostamar.com → Overview');
    console.log('\nSet environment variables:');
    console.log('  export CLOUDFLARE_API_TOKEN="your_token"');
    console.log('  export CLOUDFLARE_ZONE_ID="your_zone_id"');
    process.exit(1);
  }

  const api = axios.create({
    baseURL: `https://api.cloudflare.com/client/v4/zones/${zoneId}`,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const records = [
    { type: 'A', name: 'hostamar.com', content: '76.76.21.21', ttl: 1, proxied: false },
    { type: 'CNAME', name: 'www.hostamar.com', content: 'cname.vercel-dns.com', ttl: 1, proxied: false }
  ];

  console.log('=' .repeat(70));
  console.log('  ☁️  CLOUDFLARE DNS SETUP - hostamar.com');
  console.log('=' .repeat(70));
  console.log();

  for (const record of records) {
    console.log(`🔧 Setting up ${record.type} record: ${record.name}`);
    
    try {
      // Check if exists
      const check = await api.get('/dns_records', {
        params: { type: record.type, name: record.name }
      });

      let result;
      if (check.data.result && check.data.result.length > 0) {
        // Update existing
        const id = check.data.result[0].id;
        result = await api.put(`/dns_records/${id}`, record);
        console.log(`   ✅ Updated existing record`);
      } else {
        // Create new
        result = await api.post('/dns_records', record);
        console.log(`   ✅ Created new record`);
      }

      if (!result.data.success) {
        console.log(`   ❌ Error: ${JSON.stringify(result.data)}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log();
  console.log('=' .repeat(70));
  console.log('  ✅ DNS CONFIGURATION COMPLETE!');
  console.log('=' .repeat(70));
  console.log();
  console.log('Next steps:');
  console.log('  1. Wait 5-10 minutes for DNS propagation');
  console.log('  2. Go to Vercel Dashboard');
  console.log('  3. Add domain: hostamar.com');
  console.log('  4. Click "Verify"');
  console.log();
  console.log('  🔗 Vercel Domains: https://vercel.com/dashboard/projects/hostamar-local/domains');
}

setupCloudflare();