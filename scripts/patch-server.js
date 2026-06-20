/**
 * Patches the Next.js standalone server.js to start the video proxy
 * after the main server is running.
 *
 * Used in Dockerfile build step.
 */
const fs = require('fs');

const srv = fs.readFileSync('server.js', 'utf8');

// Insert require('./video-server.js') after startServer().then(...)
// The server.js has pattern: startServer({...}).catch((err) => {...});
const patched = srv.replace(
  /}\)\.catch\(/,
  '}).then(() => { require(\'./video-server.js\'); }).catch('
);

fs.writeFileSync('server.js', patched);
console.log('Patched server.js to start video-server.js');
