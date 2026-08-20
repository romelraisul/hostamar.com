export const dynamic = 'force-dynamic'
export default function MarketingAdmin(){
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10">
      <h1 className="text-2xl font-bold">Marketing — Downloads + Referrers</h1>
      <div className="mt-4 grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl border p-4"><div className="text-xs text-zinc-500">Downloads v0.1.8</div><div className="text-xl font-bold">7/7</div><div className="text-xs text-zinc-600">msi 3.7M exe 2.5M dmg 3.9M deb 5.5M AppImage 90M apk 50M ipa 40M</div></div>
        <div className="rounded-xl border p-4"><div className="text-xs text-zinc-500">Top referrers</div><div className="text-sm">Dev.to • Hashnode • Reddit r/SideProject</div></div>
        <div className="rounded-xl border p-4"><div className="text-xs text-zinc-500">Resend 100/day</div><div className="text-sm">Free tier — auto email to builders</div></div>
      </div>
      <p className="text-xs text-zinc-500 mt-4">Marketing cron: .github/workflows/marketing.yml daily 9am → Dev.to + Hashnode + Reddit</p>
    </div>
  )
}
