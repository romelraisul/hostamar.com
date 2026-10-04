import { createClient } from '@libsql/client';
const url = process.env.DB_URL, tok = process.env.DB_TOK;
const c = createClient({ url, authToken: tok });
async function q(sql){ try { return (await c.execute(sql)).rows } catch(e){ return [{ERR:String(e).slice(0,120)}] } }
const ch = await q(`SELECT id,name,isLive FROM TvChannel LIMIT 5`);
console.log('channels:', JSON.stringify(ch));
const chId = ch[0]?.id;
if (chId) {
  const tot = await q(`SELECT COUNT(*) n FROM TvPlaylistItem WHERE channelId='${chId}'`);
  const played = await q(`SELECT COUNT(*) n FROM TvPlaylistItem WHERE channelId='${chId}' AND played=1`);
  console.log('playlist total:', JSON.stringify(tot), 'played:', JSON.stringify(played));
  const unplayed = await q(`SELECT position,title,url FROM TvPlaylistItem WHERE channelId='${chId}' AND played=0 ORDER BY position LIMIT 5`);
  console.log('unplayed sample:', JSON.stringify(unplayed).slice(0,500));
}
const vids = await q(`SELECT COUNT(*) n FROM Video`);
console.log('video table:', JSON.stringify(vids));
