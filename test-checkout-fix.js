//!/usr/bin/env node
// Test script for checkout fix verification
const https = require('https');
const http = require('http');

function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const lib = options.protocol === 'https:' ? https : http;
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function testCheckout() {
  console.log('Testing checkout fix...');
  
  // Test 1: Verify MEDUSA_PK is working
  const payload = {
    variant_id: 'variant_01M26X2BEEYEFA90GEWM0YHPVS',
    quantity: 1,
    email: 'test@example.com',
    name: 'Test User',
    address1: '123 Test St',
    city: 'Test City',
    postcode: '1207',
    phone: '01712345678'
  };

  const options = {
    hostname: 'localhost',
    port: 9002,
    path: '/api/store/checkout',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(payload))
    }
  };
  
  try {
    const response = await makeRequest(options, JSON.stringify(payload));
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log('\n✅ SUCCESS: Checkout API is working!');
      console.log('Order ID:', response.data.orderId);
      console.log('Status:', response.data.status);
      console.log('Amount BDT:', response.data.amountBdt);
      return true;
    } else {
      console.log('\n❌ FAILED: Checkout API returned error status:', response.status);
      console.log('Error details:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Error testing checkout:', error);
    return false;
  }
}

if (require.main === module) {
  testCheckout().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testCheckout };