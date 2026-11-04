#!/usr/bin/env node
/**
 * Generate TV playlist KEYS at build time from manifest
 * Creates lib/tv-playlist.ts with video keys for playlist route
 * Runtime route signs URLs via f005 worker /tv/key.mp4
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

// Emit keys only (relative paths like "public/tv/video.mp4")
// Runtime route prepends /tv/ and worker signs
const keys = videos.map((fn) => fn.replace(/^public\/tv\//, ''));

const content = `// Auto-generated at build time - DO NOT EDIT MANUALLY
// Generated from .next/standalone/public/tv/manifest.json
// Runtime route signs URLs via f005 worker /tv/key.mp4

export const TV_PLAYLIST_KEYS: string[] = ${JSON.stringify(keys, null, 2)};

export const TV_PLAYLIST_COUNT = ${keys.length};
`;

fs.writeFileSync(outputPath, content);
console.log(`[generate-tv-playlist] Generated ${outputPath} with ${keys.length} keys`);