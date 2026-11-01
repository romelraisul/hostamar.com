import { PrismaClient } from '@prisma/client/wasm';
console.log('PrismaClient imported');
import { PrismaLibSQL } from '@prisma/adapter-libsql';
console.log('PrismaLibSQL imported');
import { createClient as createWebClient } from '@libsql/client/web';
console.log('createWebClient imported');
