#!/usr/bin/env node
/**
 * Generate TV playlist data at build time from manifest
 * Creates lib/tv-playlist.ts with video list for playlist route
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const manifestPath = path.join(ROOT, ".next", "standalone", "public", "tv", "manifest.json");
const outputPath = path.join(ROOT, "lib", "tv-playlist.ts");

if (!fs.existsSync(manifestPath)) {
    console.error("[generate-tv-playlist] Manifest not found at", manifestPath);
    process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
const videos = manifest.videos || [];

const playlistData = videos.map((fn, idx) => ({
    id: String(idx + 1),
    title: fn.replace('.mp4', '').replace(/[_-]/g, ' '),
    url: `https://f005.hostamar.com/file/hostamar-prod/${fn}`,
    thumbnail: null,
    duration: null,
}));

const content = `// Auto-generated at build time - DO NOT EDIT MANUALLY
// Generated from .next/standalone/public/tv/manifest.json

export interface TVPlaylistVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
  duration: number | null;
}

export const TV_PLAYLIST: TVPlaylistVideo[] = ${JSON.stringify(playlistData, null, 2)};

export const TV_PLAYLIST_COUNT = ${playlistData.length};
`;

fs.writeFileSync(outputPath, content);
console.log(`[generate-tv-playlist] Generated ${outputPath} with ${playlistData.length} videos`);