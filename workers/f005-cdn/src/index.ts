export interface Env {
	B2_ENDPOINT: string;
	B2_BUCKET_NAME: string;
	B2_PUBLIC_URL: string;
	B2_REGION: string;
	B2_APPLICATION_KEY_ID: string;
	B2_APPLICATION_KEY: string;
	F005_CDN_URL: string;
}

interface TVManifest {
	count: number;
	videos: Array<{
		id: string;
		title: string;
		url: string;
		thumbnail?: string;
		duration?: number;
	}>;
	b2_only: boolean;
	source: string;
	lastUpdated: string;
}

interface ModelsManifest {
	version: number;
	models: {
		total: number;
		categories: string[];
		worker: string;
		ground: string;
		edge_tools: number;
		renders: number;
		b2_buckets?: string[];
	};
}

const CACHE_TTL = 300;
const FALLBACK_MODELS = { 
	version: 40, 
	models: { 
		total: 0, 
		categories: [], 
		worker: "", 
		ground: "", 
		edge_tools: 0, 
		renders: 0 
	} 
};

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

async function fetchFromB2<T>(env: Env, key: string, fallback: T, cache?: Cache): Promise<{ data: T; source: string; b2Status?: number }> {
	const cacheKey = new Request(`https://internal/b2/${key}`, { method: "GET" });
	if (cache) {
		const cached = await cache.match(cacheKey);
		if (cached) {
			const data = await cached.json() as T;
			return { data, source: "b2-cache" };
		}
	}

	// Private bucket ONLY — use AWS SDK S3 client with SigV4 signing
	const s3 = new S3Client({
		endpoint: env.B2_ENDPOINT,
		region: env.B2_REGION,
		credentials: {
			accessKeyId: env.B2_APPLICATION_KEY_ID,
			secretAccessKey: env.B2_APPLICATION_KEY,
		},
	});
	const cmd = new GetObjectCommand({ Bucket: env.B2_BUCKET_NAME, Key: key });
	const url = await getSignedUrl(s3, cmd, { expiresIn: 300 });

	try {
		const res = await fetch(url, { cf: { cacheTtl: CACHE_TTL } });
		if (res.ok) {
			const data = await res.json<T>();
			const response = new Response(JSON.stringify(data), {
				headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${CACHE_TTL}` }
			});
			if (cache) await cache.put(cacheKey, response.clone());
			return { data, source: "b2-live-private" };
		}
		console.warn(`[f005] B2 signed fetch returned ${res.status} for ${key}`);
	} catch (e) {
		console.warn(`[f005] B2 signed fetch failed for ${key}:`, e);
	}

	// Fallback to Next.js for /api/tv
	if (key === "tv.json" || key === "tv/manifest.json") {
		try {
			const nextjsUrl = new URL("/tv/manifest.json", env.F005_CDN_URL || "https://hostamar.com");
			const res = await fetch(nextjsUrl, { next: { revalidate: 60 }, cache: "no-store" });
			if (res.ok) {
				const data = await res.json();
				const count = data.count || data.videos?.length || 0;
				if (count >= 100) {
					return { data: { ...data, source: "nextjs-live" } as T, source: "nextjs-live" };
				}
			}
		} catch (e) {
			console.warn("[f005] Next.js fallback failed:", e);
		}
	}

	console.warn(`[f005] B2 miss for ${key}, using fallback`);
	return { data: fallback, source: "fallback-b2-miss" };
}

async function handleModelsRequest(env: Env, request: Request, cache?: Cache): Promise<Response> {
	const { data, source } = await fetchFromB2<ModelsManifest>(env, "models.json", FALLBACK_MODELS, cache);
	return new Response(JSON.stringify(data), {
		status: 200,
		headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${CACHE_TTL}`, "X-Source": source, "X-f005-Worker": "true" }
	});
}

async function handleTVRequest(env: Env, request: Request, cache?: Cache): Promise<Response> {
	const { data: manifest, source } = await fetchFromB2<TVManifest>(env, "tv.json", { count: 0, videos: [], b2_only: true, source: "fallback-empty", lastUpdated: new Date().toISOString() }, cache);

	if (source === "fallback-b2-miss" || manifest.count === 0) {
		try {
			const nextjsUrl = new URL("/tv/manifest.json", env.F005_CDN_URL || "https://hostamar.com");
			const res = await fetch(nextjsUrl, { next: { revalidate: 60 }, cache: "no-store" });
			if (res.ok) {
				const data = await res.json();
				const count = data.count || data.videos?.length || 0;
				if (count >= 100) {
					return new Response(JSON.stringify({ ...data, source: "nextjs-live" }), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60", "X-Source": "nextjs-live" } });
				}
			}
		} catch (e) {
			console.warn("[f005] Next.js fallback failed:", e);
		}
	}

	return new Response(JSON.stringify({ ...manifest, source }), {
		status: 200,
		headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${CACHE_TTL}`, "X-Source": source, "X-f005-Worker": "true" }
	});
}

async function handleTVManifestRequest(env: Env, request: Request, cache?: Cache): Promise<Response> {
	const { data: manifest, source } = await fetchFromB2<TVManifest>(env, "tv/manifest.json", { count: 0, videos: [], b2_only: true, source: "fallback-empty", lastUpdated: new Date().toISOString() }, cache);

	if (source === "fallback-b2-miss" || manifest.count === 0) {
		try {
			const nextjsUrl = new URL("/tv/manifest.json", env.F005_CDN_URL || "https://hostamar.com");
			const res = await fetch(nextjsUrl, { next: { revalidate: 60 }, cache: "no-store" });
			if (res.ok) {
				const data = await res.json();
				const count = data.count || data.videos?.length || 0;
				if (count >= 100) {
					return new Response(JSON.stringify({ ...data, source: "nextjs-live" }), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60", "X-Source": "nextjs-live" } });
				}
			}
		} catch (e) {
			console.warn("[f005] Next.js fallback failed:", e);
		}
	}

	return new Response(JSON.stringify({ ...manifest, source }), {
		status: 200,
		headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${CACHE_TTL}`, "X-Source": source, "X-f005-Worker": "true" }
	});
}

async function handleTVLiveRequest(env: Env, request: Request, cache?: Cache): Promise<Response> {
	const { data: manifest, source } = await fetchFromB2<TVManifest>(env, "live.json", { count: 0, videos: [], b2_only: true, source: "fallback-empty", lastUpdated: new Date().toISOString() }, cache);

	const liveVideo = manifest.videos.find(v => v.id === "live" || v.id === "hls");
	if (liveVideo?.url) {
		const res = await fetch(liveVideo.url, { cf: { cacheTtl: 5 } });
		return new Response(res.body, { status: res.status, headers: { "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "public, max-age=5", "X-Source": source } });
	}

	return new Response(JSON.stringify({ ...manifest, source, live: false }), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30", "X-Source": source } });
}

async function handleTVPageRequest(env: Env, request: Request, cache?: Cache): Promise<Response> {
	const nextjsUrl = new URL("/tv", env.F005_CDN_URL || "https://hostamar.com");
	const res = await fetch(nextjsUrl, { cf: { cacheTtl: 60 } });
	const html = await res.text();
	return new Response(html, { status: res.status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60", "X-Source": "nextjs-proxy" } });
}

async function handleTVManifestFileRequest(env: Env, request: Request, cache?: Cache): Promise<Response> {
	const nextjsUrl = new URL("/tv/manifest.json", env.F005_CDN_URL || "https://hostamar.com");
	const res = await fetch(nextjsUrl, { cf: { cacheTtl: 60 } });
	const data = await res.text();
	return new Response(data, { status: res.status, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60", "X-Source": "nextjs-proxy" } });
}

async function handleTVVideoRequest(env: Env, request: Request, cache?: Cache): Promise<Response> {
	const url = new URL(request.url);
	const pathname = url.pathname;
	// Match /tv/*.mp4
	const mp4Match = pathname.match(/^\/tv\/(.+\.mp4)$/);
	if (!mp4Match) {
		return new Response(JSON.stringify({ error: "Not found", path: pathname }), { status: 404, headers: { "Content-Type": "application/json", "X-f005-Worker": "true" } });
	}
	const key = `public/tv/${mp4Match[1]}`;

	const s3 = new S3Client({
		endpoint: env.B2_ENDPOINT,
		region: env.B2_REGION,
		credentials: {
			accessKeyId: env.B2_APPLICATION_KEY_ID,
			secretAccessKey: env.B2_APPLICATION_KEY,
		},
	});
	const cmd = new GetObjectCommand({ Bucket: env.B2_BUCKET_NAME, Key: key });
	const signedUrl = await getSignedUrl(s3, cmd, { expiresIn: 3600 });

	const cacheKey = new Request(`https://internal/b2/video/${key}`, { method: "GET" });
	if (cache) {
		const cached = await cache.match(cacheKey);
		if (cached) {
			const headers = new Headers(cached.headers);
			headers.set("X-Source", "b2-cache");
			headers.set("X-f005-Worker", "true");
			return new Response(cached.body, { status: cached.status, headers });
		}
	}

	const res = await fetch(signedUrl, { cf: { cacheTtl: 3600 } });
	if (!res.ok) {
		console.warn(`[f005] B2 video fetch returned ${res.status} for ${key}`);
		// Fallback to Next.js
		const nextjsUrl = new URL(pathname, env.F005_CDN_URL || "https://hostamar.com");
		const fallbackRes = await fetch(nextjsUrl, { cf: { cacheTtl: 60 } });
		if (fallbackRes.ok) {
			const headers = new Headers(fallbackRes.headers);
			headers.set("X-Source", "nextjs-fallback");
			headers.set("X-f005-Worker", "true");
			return new Response(fallbackRes.body, { status: fallbackRes.status, headers });
		}
		return new Response(JSON.stringify({ error: "Video not found", key }), { status: 404, headers: { "Content-Type": "application/json", "X-f005-Worker": "true" } });
	}

	const headers = new Headers(res.headers);
	headers.set("X-Source", "b2-live");
	headers.set("X-f005-Worker", "true");
	headers.set("Cache-Control", "public, max-age=31536000, immutable");

	const response = new Response(res.body, { status: res.status, headers });
	if (cache) await cache.put(cacheKey, response.clone());
	return response;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			const url = new URL(request.url);
			let cache: Cache | undefined;
			try { cache = (caches as any).default; } catch {}

			if (url.pathname === "/models.json") return handleModelsRequest(env, request, cache);
							if (url.pathname === "/api/tv") return handleTVRequest(env, request, cache);
							if (url.pathname === "/api/tv/manifest") return handleTVManifestRequest(env, request, cache);
							if (url.pathname === "/api/tv/live") return handleTVLiveRequest(env, request, cache);
							if (url.pathname === "/tv/manifest.json") return handleTVManifestFileRequest(env, request, cache);
							if (url.pathname === "/tv") return handleTVPageRequest(env, request, cache);
							if (url.pathname.endsWith(".mp4") && url.pathname.startsWith("/tv/")) return handleTVVideoRequest(env, request, cache);

							return new Response(JSON.stringify({ error: "Not found", path: url.pathname }), { status: 404, headers: { "Content-Type": "application/json", "X-f005-Worker": "true" } });
		} catch (e) {
			return new Response(JSON.stringify({ error: String(e), stack: (e as Error).stack }), { status: 500, headers: { "Content-Type": "application/json" } });
		}
	}
} satisfies ExportedHandler<Env>;