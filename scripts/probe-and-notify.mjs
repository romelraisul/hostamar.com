#!/usr/bin/env node
const endpoints=[
  'https://hostamar.com/','https://hostamar.com/login','https://hostamar.com/pricing',
  'https://hostamar.com/api/v1/models','https://hostamar.com/api/store/products',
  'https://hostamar.com/tv','https://hostamar.com/tv/manifest.json','https://hostamar.com/api/tv',
  'https://hostamar.com/api/tv/playlist','https://hostamar.com/api/tv/stable-channels',
  'https://hostamar.com/api/tv/status','https://hostamar.com/api/tv/heartbeat',
  'https://hostamar.com/admin','https://hostamar.com/api/admin/stats','https://hostamar.com/models.json',
  'https://api.hostamar.com/v1/models','https://api-primary.hostamar.com/v1/models'
]
let fails=[]
for (const u of endpoints){
  try{
    const r=await fetch(u,{signal:AbortSignal.timeout(8000)})
    console.log(`${u}: ${r.status}`)
    if(r.status>=500) fails.push(`${u} ${r.status}`)
  }catch(e){ console.log(`${u}: FAIL ${e.message}`); fails.push(`${u} FAIL`) }
}
if(fails.length>0){
  const {execSync}=await import('child_process')
  try{ execSync(`node /home/romel/hostamar.com/scripts/notify-slack.mjs "PROBE FAIL: ${fails.join(', ')}"`,{timeout:10000}) }catch{}
  process.exit(1)
}else{
  console.log("All probes green")
}
