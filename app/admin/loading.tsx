export default function AdminLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6EBD2]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0E7C3A] border-t-transparent" />
        <p className="text-sm text-[#78716C]">Loading admin panel...</p>
      </div>
    </div>
  )
}
