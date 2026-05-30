
const https = require('https');
const zoneId = "2aef176c6f2000da2af593f4890ec298";
const apiToken = process.env.CLOUDFLARE_API_TOKEN || '';

const headers = {
    "Authorization": "Bearer " + apiToken,
    "Content-Type": "application/json"
};

const records = [
    { type: 'A', name: 'hostamar.com', content: '76.76.21.21', ttl: 1, proxied: false },
    { type: 'CNAME', name: 'www.hostamar.com', content: 'cname.vercel-dns.com', ttl: 1, proxied: false }
];

function makeRequest(method, url, body) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: headers
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({status: res.statusCode, data: JSON.parse(data)});
                } catch(e) {
                    resolve({status: res.statusCode, data: data});
                }
            });
        });
        
        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function setupDNS() {
    console.log("🚀 Configuring Cloudflare DNS for hostamar.com");
    console.log("");
    
    for (const record of records) {
        console.log(`Configuring ${record.type} record: ${record.name}`);
        
        try {
            // Check if exists
            const check = await makeRequest(
                'GET',
                `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=${record.type}&name=${record.name}`
            );
            
            if (check.data.success && check.data.result && check.data.result.length > 0) {
                // Update
                const id = check.data.result[0].id;
                const upd = await makeRequest(
                    'PUT',
                    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${id}`,
                    record
                );
                if (upd.data.success) {
                    console.log("   ✅ Updated");
                } else {
                    console.log("   ❌ Update failed: " + (upd.data.errors?.[0]?.message || "Unknown"));
                }
            } else {
                // Create
                const create = await makeRequest(
                    'POST',
                    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
                    record
                );
                if (create.data.success) {
                    console.log("   ✅ Created");
                } else {
                    console.log("   ❌ Create failed: " + (create.data.errors?.[0]?.message || "Unknown"));
                }
            }
        } catch (error) {
            console.log("   ❌ Error: " + error.message);
        }
    }
    
    console.log("");
    console.log("✅ DNS configuration complete!");
    console.log("");
    console.log("Next steps:");
    console.log("  1. Wait 5-10 minutes");
    console.log("  2. Go to: https://vercel.com/dashboard/projects/hostamar-local/domains");
    console.log("  3. Add: hostamar.com");
    console.log("  4. Click Verify");
}

setupDNS().catch(console.error);
