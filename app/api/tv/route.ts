import { NextResponse } from 'next/server';

export const revalidate = 60;

export async function GET() {
	const f005Url = process.env.F005_CDN_URL || "https://hostamar.com";

	// 1. Try f005 CDN Worker first (production - worker signs private B2 requests)
	try {
		const res = await fetch(`${f005Url}/api/tv`, {
			next: { revalidate: 60 },
			cache: 'no-store',
			headers: { 'X-f005-Source': 'nextjs-api' }
		});
		if (res.ok) {
			const data = await res.json();
			if (data.count && data.count >= 0) {
				return NextResponse.json({
					count: data.count,
					videos: data.videos?.slice(0, 20) || [],
					b2_only: true,
					source: data.source || 'f005-worker',
					total: data.count
				});
			}
		}
	} catch (e) {
		console.log(`[api/tv] f005 worker failed: ${e}`);
	}

	// 2. Fallback to local manifest (not hardcoded 353)
	try {
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
		const res = await fetch(`${baseUrl}/tv/manifest.json`, { next: { revalidate: 60 }, cache: 'no-store' });
		if (res.ok) {
			const data = await res.json();
			const count = data.count || data.videos?.length || 0;
			if (count >= 100) {
				return NextResponse.json({
					count,
					videos: data.videos?.slice(0, 20) || [],
					b2_only: true,
					source: 'local-manifest',
					total: count
				});
			}
		}
	} catch (e) {
		console.log(`[api/tv] local manifest failed: ${e}`);
	}

	// Last resort: return 0 count with error source (never hardcoded 353)
	return NextResponse.json({
		count: 0,
		videos: [],
		b2_only: true,
		source: 'fallback-zero',
		note: 'f005 CDN Worker not responding, no live manifest available'
	}, { status: 503 });
}