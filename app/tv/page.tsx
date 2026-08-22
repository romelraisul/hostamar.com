import { Tv, Radio, PlayCircle } from 'lucide-react';
import { getStreamStatus } from '@/lib/tv/streamer';
import { getOrCreateDefaultChannel } from '@/lib/tv/generator';
import { prisma } from '@/lib/prisma';
import { ensureSchema } from '@/lib/ensure-schema';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Hostamar TV — Live 24/7 AI Television',
  description: 'Watch Hostamar TV live — 24/7 AI-generated news and entertainment in Bangla, streamed around the clock.',
};

/**
 * /tv — public live TV page.
 * Server component: reads status + playlist directly from the DB (no HTTP
 * self-fetch — avoids Vercel SSR deadlock) and renders a YouTube-TV-style
 * watch page.
 */
async function getTvData() {
  try {
    await ensureSchema();
    const status = await getStreamStatus();
    const channel = await getOrCreateDefaultChannel();
    const items = await prisma.tvPlaylistItem.findMany({
      where: { channelId: channel.id },
      orderBy: { position: 'asc' },
      take: 12,
    });
    return { status, items };
  } catch {
    return { status: null, items: [] as any[] };
  }
}

export default async function TvPage() {
  const { status, items } = await getTvData();
  const isLive = status?.isLive ?? false;
  const channelName = status?.channelName || 'Hostamar TV';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Tv className="w-7 h-7 text-emerald-400" /> {channelName}
          </h1>
          <div
            className={
              'flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ' +
              (isLive ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-zinc-700 bg-zinc-900 text-zinc-400')
            }
          >
            <Radio className={'w-4 h-4 ' + (isLive ? 'animate-pulse' : '')} />
            {isLive ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>

        {/* Player area */}
        <div className="rounded-2xl border border-zinc-800 bg-black aspect-video flex items-center justify-center mb-8 overflow-hidden">
          {isLive ? (
            <div className="text-center">
              <PlayCircle className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
              <p className="text-zinc-300 font-medium">Stream is live</p>
              <p className="text-zinc-500 text-sm mt-1">HLS player loads from the tv-station RTMP server.</p>
            </div>
          ) : (
            <div className="text-center">
              <Tv className="w-16 h-16 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 font-medium">We're currently offline</p>
              <p className="text-zinc-600 text-sm mt-1">Check back soon — AI content streams 24/7.</p>
            </div>
          )}
        </div>

        {/* Now playing / up next */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="font-semibold">{isLive ? 'Now Playing & Up Next' : 'Coming Up'}</h2>
          </div>
          {items.length === 0 ? (
            <div className="px-6 py-8 text-center text-zinc-500 text-sm">No videos scheduled yet.</div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {items.slice(0, 12).map((item: any, idx: number) => (
                <div key={item.id} className="px-6 py-3 flex items-center gap-4">
                  <span className="text-zinc-600 text-sm w-6">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white truncate">{item.title}</div>
                    <div className="text-xs text-zinc-500">{item.source}</div>
                  </div>
                  {idx === 0 && isLive && (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-300 shrink-0">playing</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-zinc-600 text-xs mt-8">
          Powered by Hostamar AI — content auto-generated from trending news. © {new Date().getFullYear()} Hostamar.
        </p>
      </main>
    </div>
  );
}
