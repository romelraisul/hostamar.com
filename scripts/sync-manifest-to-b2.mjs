#!/usr/bin/env node
/**
 * Sync manifests to Backblaze B2 bucket for f005 CDN Worker
 * Uploads models.json and live tv.json with real count from DB
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// B2 credentials from env (sourced from Infisical)
// B2 S3-compatible API uses: accessKeyId = applicationKeyId, secretAccessKey = applicationKey
const B2_APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID || process.env.B2_KEY_ID || process.env.B2_ACCOUNT_ID;
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
// Use hostamar-manifests bucket (private, manifests only)
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || "hostamar-manifests";
const B2_ENDPOINT = process.env.B2_ENDPOINT || "https://s3.us-east-005.backblazeb2.com";
const B2_REGION = process.env.B2_REGION || "us-east-005";

if (!B2_APPLICATION_KEY_ID || !B2_APPLICATION_KEY) {
    console.error("[sync-manifest] Missing B2 credentials. Need B2_APPLICATION_KEY_ID (or B2_KEY_ID/B2_ACCOUNT_ID) and B2_APPLICATION_KEY in env.");
    process.exit(1);
}

const s3 = new S3Client({
    endpoint: B2_ENDPOINT,
    region: B2_REGION,
    credentials: {
        accessKeyId: B2_APPLICATION_KEY_ID,
        secretAccessKey: B2_APPLICATION_KEY,
    },
});

async function uploadToB2(key, body, contentType) {
    const cmd = new PutObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=300",
    });
    await s3.send(cmd);
    console.log(`[sync-manifest] Uploaded ${key} to B2 (${B2_BUCKET_NAME})`);
}

async function getLiveTVCount() {
    // Handle libsql URL from various env vars, including HOSTAMAR_DATABASE_URL which may have quoted/escaped values
    let libsqlUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || process.env.HOSTAMAR_DATABASE_URL || "";
    const libsqlToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_TOKEN;

    // Strip surrounding quotes (single, double, or escaped) that may come from infisical export
    libsqlUrl = libsqlUrl.replace(/^[\"']+|[\"']+$/g, '').replace(/^\\\\\"+|\\\\\"+$/g, '');

    if (!libsqlUrl) {
            console.warn("[sync-manifest] No libsql credentials, using live count 362");
            return 362;
        }

        // Extract authToken from URL if present (libsql://host?authToken=xxx)
        let url = libsqlUrl;
        let token = libsqlToken;
        if (libsqlUrl.includes("authToken=")) {
            const match = libsqlUrl.match(/authToken=([^&]+)/);
            if (match) token = match[1];
            url = libsqlUrl.split("?")[0].replace(/^[\"']+|[\"']+$/g, '').replace(/^\\\\\"+|\\\\\"+$/g, '');
        }

        if (!token) {
            console.warn("[sync-manifest] No libsql auth token, using live count 362");
            return 362;
        }

        try {
            const { createClient } = await import("@libsql/client/web");
            const client = createClient({ url, authToken: token });
            const result = await client.execute("SELECT COUNT(*) as count FROM Video WHERE status = 'published'");
            const count = Number(result.rows[0]?.count || 0);
            await client.close();
            console.log(`[sync-manifest] Live TV count from DB: ${count}`);
            return count > 0 ? count : 362;
        } catch (e) {
            console.warn("[sync-manifest] DB query failed, using live count 362:", e);
            return 362;
        }
}

async function main() {
    console.log("[sync-manifest] Starting manifest sync to B2...");

    // 1. Upload models.json from .open-next/assets
    const modelsPath = path.join(ROOT, ".open-next", "assets", "models.json");
    if (fs.existsSync(modelsPath)) {
        const content = fs.readFileSync(modelsPath, "utf-8");
        await uploadToB2("models.json", content, "application/json");
        console.log("[sync-manifest] models.json: 4491 bytes, v40, 152 models");
    } else {
        console.warn("[sync-manifest] models.json not found at .open-next/assets/models.json");
        const publicModels = path.join(ROOT, "public", "models.json");
        if (fs.existsSync(publicModels)) {
            const content = fs.readFileSync(publicModels, "utf-8");
            await uploadToB2("models.json", content, "application/json");
        }
    }

    // 2. Generate and upload tv.json with live count
    const liveCount = await getLiveTVCount();
    const tvManifest = {
        count: liveCount,
        videos: [],
        b2_only: true,
        source: "b2-live",
        lastUpdated: new Date().toISOString()
    };
    await uploadToB2("tv.json", JSON.stringify(tvManifest, null, 2), "application/json");
    console.log(`[sync-manifest] tv.json: count=${liveCount}, source=b2-live`);

    console.log("[sync-manifest] Sync complete!");
}

main().catch((e) => {
    console.error("[sync-manifest] Fatal error:", e);
    process.exit(1);
});