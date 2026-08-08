// Download Camoufox directly (skip npm package install)
const url = 'https://github.com/aihobbyist/camoufox/releases/download/v135.0.1-beta.24/camoufox-135.0.1-beta.24-lin-x86_64.zip';
const fs = require('fs');
const path = '/home/romel/.camoufox/camoufox-bin.zip';
fs.mkdirSync('/home/romel/.camoufox', { recursive: true });
const file = fs.createWriteStream(path);
require('https').get(url, (res) => {
  if (res.statusCode !== 200) { console.error('HTTP', res.statusCode); process.exit(1); }
  res.pipe(file);
  file.on('finish', () => { file.close(); console.log('Downloaded to', path); });
}).on('error', (e) => console.error(e));
