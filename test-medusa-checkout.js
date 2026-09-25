//!usr/bin/env node
// Test script to directly test Medusa's checkout endpoint
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

async function testMedusaCheckout() {
  console.log('Testing Medusa checkout directly...');
  
  // First test: get products with PK
  console.log('\n1. Testing /store/products with Medusa PK...');
  const productOptions = {
    hostname: 'localhost',
    port: 9002,
    path: '/store/products?limit=5&region_id=reg_01M27QBX4C3XKZFWCQD47CM2EJ&fields=id,title,variants.id,variants.calculated_price.calculated_amount',
    protocol: 'http:',
    headers: {
      'x-publishable-api-key': 'pk_8aab3cc7de63feb0ce7315d1f679f86494bb5776bae47b25070f4b732349a6ad'
    }
  };
  
  try {
    const response = await makeRequest(productOptions);
    console.log('Products Response Status:', response.status);
    console.log('Products Response Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error testing products:', error);
  }
  
  // Second test: create a cart
  console.log('\n2. Testing /store/carts creation...');
  const cartOptions = {
    hostname: 'localhost',
    port: 9002,
    path: '/store/carts',
    protocol: 'http:',
    headers: {
      'x-publishable-api-key': 'pk_8aab3cc7de63feb0ce7315d1f679f86494bb5776bae47b25070f4b732349a6ad',
      'Content-Type': 'application/json'
    }
  };
  
  const cartPayload = {
    region_id: 'reg_01M27QBX4C3XKZFWCQD47CM2EJ',
    items: [{ variant_id: 'variant_01M26X2BEEYEFA90GEWM0YHPVS', quantity: 1 }],
    email: 'test@example.com'
  };
  
  try {
    const response = await makeRequest(cartOptions, JSON.stringify(cartPayload));
    console.log('Cart Creation Response Status:', response.status);
    console.log('Cart Creation Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log('\n✅ SUCCESS: Medusa cart creation works!');
      return true;
    } else {
      console.log('\n❌ FAILED: Medusa cart creation returned error:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error testing cart creation:', error);
    return false;
  }
}

if (require.main === module) {
  testMedusaCheckout().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testMedusaCheckout };