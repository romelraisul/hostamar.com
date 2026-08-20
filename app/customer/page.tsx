export const dynamic = 'force-dynamic'
export default function CustomerPage(){
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10">
      <h1 className="text-2xl font-bold">Customer — Your Builds</h1>
      <div className="mt-4 rounded-2xl bg-[#0E7C3A] text-white p-4 flex items-center justify-between">
        <span className="text-sm font-bold">CREDIT 6000/6000 100%</span>
        <span className="text-xs">Video 100 • Chat 1 • Browser 5 • IDE 10 • Game 20 • Android 100</span>
      </div>
      <div className="mt-4 h-1.5 bg-zinc-200 rounded-full overflow-hidden"><div className="h-full bg-[#0E7C3A]" style={{width:'100%'}}/></div>
      <div className="mt-6">
        <h2 className="font-semibold">My Builds</h2>
        <p className="text-sm text-zinc-600 mt-2">No builds yet — go to <a className="text-[#0E7C3A] underline" href="/dev">/dev</a> → Build APK (credit 100) → Share on Twitter?</p>
        <a href="/dev/android" className="mt-3 inline-flex rounded-full bg-[#0E7C3A] text-white px-5 py-2 text-sm font-bold">Build Android App →</a>
      </div>
      <div className="mt-6">
        <h2 className="font-semibold">Built by Customer wall</h2>
        <p className="text-sm text-zinc-600">After you build .apk, click Share → creates <code className="bg-zinc-100 px-1 rounded">/showcase/&#123;id&#125;</code> + SEO</p>
      </div>
    </div>
  )
}
