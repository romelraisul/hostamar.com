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
