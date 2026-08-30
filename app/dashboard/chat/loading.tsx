export default function ChatLoading() {
  return (
    <div className="flex h-full">
      <div className="hidden w-72 shrink-0 space-y-2 border-r p-4 lg:block">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-xl bg-zinc-200/70" />
        ))}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0E7C3A] border-t-transparent" />
        <p className="text-sm text-zinc-500">চ্যাট লোড হচ্ছে…</p>
      </div>
    </div>
  )
}
