const https = require('https');

const SITES = [
  { url: 'https://hostamar.com', name: 'Hostamar Main' },
  { url: 'https://hostamar.com/ossu', name: 'OSSU Home' },
  { url: 'https://hostamar.com/ossu/curriculum', name: 'OSSU Curriculum' },
];

function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({ url, status: res.statusCode, success: res.statusCode === 200 });
    }).on('error', (err) => {
      resolve({ url, success: false, error: err.message });
    });
  });
}

async function checkAll() {
  console.log('\n=== OSSU Academy Site Health Check ===\n');
  
  for (const site of SITES) {
    const result = await checkUrl(site.url);
    console.log(`${result.success ? '✅' : '❌'} ${site.name}`);
    console.log(`   URL: ${result.url}`);
    if (result.status) console.log(`   Status: ${result.status}`);
    if (result.error) console.log(`   Error: ${result.error}`);
    console.log('');
  }
}

checkAll();