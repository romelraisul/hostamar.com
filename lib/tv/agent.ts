// TV Agent polling - FIXED: interval 2000ms -> 30000ms + 5s jitter
// Previously: setInterval(fetchCommands, 2000) caused 8.59k Cloudflare requests
// Now: 30s + random jitter up to 5s
export function startAgentPolling(fetchCommands: () => Promise<void>) {
  const INTERVAL = 30000
  const JITTER = 5000
  async function poll() {
    try {
      await fetchCommands()
    } catch (e) {
      console.error('[tv-agent] poll error', e)
    }
    const jitter = Math.random() * JITTER
    setTimeout(poll, INTERVAL + jitter)
  }
  // Initial delay with jitter
  setTimeout(poll, INTERVAL + Math.random() * JITTER)
}
// Docker tv-station equivalent (if exists, same fix applies)
// docker/tv-station/agent.ts -> interval 30000 + jitter 5000
