export default function IdeLoading() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="h-8 w-56 animate-pulse rounded-xl bg-[#FBF4E4]" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl border bg-[#FBF4E4]" />
        ))}
      </div>
      <div className="mt-6 h-[50vh] animate-pulse rounded-2xl border bg-[#FFFDF6]/40" />
    </div>
  )
}
