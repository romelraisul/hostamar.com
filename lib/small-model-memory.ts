// lib/small-model-memory.ts — V36.36: tier-aware memory recall.
// Qdrant 6 collections (profile, business, video history, tickets, billing,
// preferences) + BGE-M3 embeddings. Tier 3 keeps memory server-side (device
// holds nothing); Tier 1 caches recent summaries in IndexedDB.
// NOTE: /api/memory/search does not exist yet — getMemory() throws a clear
// error until that route lands. Nothing calls it today.

import { getDeviceTier } from './device-tier';

export type MemoryHit = { text: string; score: number; collection: string };

export async function getMemory(query: string, k = 3): Promise<MemoryHit[]> {
  const tier = getDeviceTier();
  const res = await fetch('/api/memory/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, tier: tier.tier, k }),
  });
  if (res.status === 404) {
    throw new Error('memory route not implemented yet (/api/memory/search)');
  }
  if (!res.ok) throw new Error(`memory search failed: ${res.status}`);
  const hits = (await res.json()) as MemoryHit[];
  return hits.slice(0, k);
}
