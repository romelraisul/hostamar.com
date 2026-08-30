export default function GameLoading() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="h-8 w-56 animate-pulse rounded-xl bg-zinc-200/70" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl border bg-zinc-100/60" />
        ))}
      </div>
    </div>
  )
}
