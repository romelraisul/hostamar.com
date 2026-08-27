// scripts/fetch-channels.mjs — run on YOUR PC (Podman host), not Vercel
// Fetches free-to-air channels from iptv-org, parses M3U, saves to Prisma TvChannel
//
// Usage:
//   node scripts/fetch-channels.mjs --all --limit=1200 --filter=free
//   node scripts/fetch-channels.mjs --country=bd --limit=200
//   node scripts/fetch-channels.mjs --all --limit=50 --dry-run  (just print, no DB)
//
// Flags:
//   --all       Pull from index.m3u (8000+ global)
//   --country=  Pull from countries/<code>.m3u (bd, us, in, etc.)
//   --limit=N   Max channels to save (default 1200)
//   --filter=free  Only keep free-to-air (skip adult/religion/politics)
//   --dry-run   Don't write to DB, just print results

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const getArg = (name) => {
  const a = args.find((x) => x.startsWith(`--${name}`));
  if (!a) return null;
  const [, v] = a.split('=');
  return v === undefined ? true : v;
};

const ALL = getArg('all');
const COUNTRY = getArg('country');
const LIMIT = parseInt(getArg('limit') || '1200', 10);
const FILTER_FREE = getArg('filter') === 'free';
const DRY_RUN = getArg('dry-run');

const WORLD_M3U = 'https://iptv-org.github.io/iptv/index.m3u';
const BD_M3U = 'https://iptv-org.github.io/iptv/countries/bd.m3u';
const COUNTRY_M3U = (code) => `https://iptv-org.github.io/iptv/countries/${code}.m3u`;

// Free-to-air categories only (legal-safe for monetization)
const FREE_CATEGORIES = [
  'news', 'entertainment', 'sports', 'kids', 'music', 'movie', 'documentary', 'education', 'business', 'lifestyle',
];
const SKIP_CATEGORIES = ['adult', 'religion', 'politics', 'xxx'];

function parseM3U(text) {
  const lines = text.split('\n');
  const channels = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXTINF:')) {
      const info = lines[i];
      const url = (lines[i + 1] || '').trim();
      if (!url || !url.startsWith('http')) continue;
      const name = (info.split(',').pop() || 'Unknown').trim();
      const tvg = info.match(/tvg-name="([^"]+)"/)?.[1] || name;
      const group = (info.match(/group-title="([^"]+)"/)?.[1] || 'General').toLowerCase();
      const logo = info.match(/tvg-logo="([^"]+)"/)?.[1] || '';
      channels.push({ name, tvg, group, logo, url });
    }
  }
  return channels;
}

async function headCheck(url, timeout = 5000) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const url = ALL ? WORLD_M3U : COUNTRY ? COUNTRY_M3U(COUNTRY) : BD_M3U;
  console.log(`Fetching ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const text = await res.text();
  const raw = parseM3U(text);
  console.log(`Found ${raw.length} raw channels`);

  // Filter
  let filtered = raw;
  if (FILTER_FREE) {
    filtered = raw.filter((c) => {
      const g = c.group.toLowerCase();
      return !SKIP_CATEGORIES.some((s) => g.includes(s));
    });
    console.log(`After free filter: ${filtered.length}`);
  }

  // Dedupe by URL
  const seen = new Set();
  filtered = filtered.filter((c) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });

  // Keep only m3u8 URLs (playable)
  filtered = filtered.filter((c) => c.url.includes('.m3u8'));
  console.log(`After m3u8 filter: ${filtered.length}`);

  // Limit
  const limited = filtered.slice(0, LIMIT);
  console.log(`Limited to ${limited.length}`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN (first 10) ---');
    limited.slice(0, 10).forEach((c) => console.log(`  ${c.name} | ${c.group} | ${c.url.slice(0, 60)}`));
    return;
  }

  // Save to JSON (always)
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/channels-fetched.json', JSON.stringify(limited, null, 2));
  console.log(`Saved data/channels-fetched.json`);

  // Save to Prisma TvChannel
  if (process.env.DATABASE_URL) {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      console.log('Seeding to DB ...');

      // Clear old iptv channels
      await prisma.tvIptvChannel.deleteMany({});

      let saved = 0;
      for (const c of limited) {
        try {
          await prisma.tvIptvChannel.create({
            data: {
              name: c.name,
              url: c.url,
              logo: c.logo || null,
              category: c.group.split('/')[0] || 'General',
              country: COUNTRY || (ALL ? 'global' : 'bd'),
              tvgId: c.tvg,
              isLive: false,
            },
          });
          saved++;
        } catch (e) {
          console.warn(`  skip ${c.name}: ${e.message?.slice(0, 60)}`);
        }
      }
      console.log(`DB seeded ${saved} channels`);
      await prisma.$disconnect();
    } catch (e) {
      console.warn('DB seed skipped:', e.message);
    }
  } else {
    console.log('No DATABASE_URL — skipping DB seed. Run with DATABASE_URL set to seed.');
  }

  console.log('\nDone. Categories:', [...new Set(limited.map((c) => c.group))].slice(0, 10).join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
