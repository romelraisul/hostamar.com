import fs from 'fs';
import path from 'path';

const handlerPath = '/home/romel/hostamar.com/.open-next/server-functions/default/handler.mjs';
let content = fs.readFileSync(handlerPath, 'utf-8');

// Replace ALL occurrences of require("node:sqlite") with a stub
const before = content.match(/require\("node:sqlite"\)/g)?.length || 0;
content = content.replace(/require\("node:sqlite"\)/g, '({})');
const after = content.match(/require\("node:sqlite"\)/g)?.length || 0;

fs.writeFileSync(handlerPath, content);
console.log(`Patched handler.mjs: replaced ${before} occurrences of require("node:sqlite") with ({})`);

// Also copy @libsql/isomorphic-ws to the correct location in .open-next
const srcDir = '/home/romel/hostamar.com/node_modules/@libsql/isomorphic-ws';
const destDir = '/home/romel/hostamar.com/.open-next/server-functions/default/node_modules/@libsql/client/node_modules/@libsql/isomorphic-ws';

if (fs.existsSync(srcDir)) {
  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log(`Copied @libsql/isomorphic-ws to ${destDir}`);
} else {
  console.warn(`Source directory not found: ${srcDir}`);
}