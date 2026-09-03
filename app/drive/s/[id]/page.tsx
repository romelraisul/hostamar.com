import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Hostamar Drive — shared file' }

/**
 * /drive/s/[id]?token= — public share landing (1h token minted by owner).
 * Renders the file inline via /api/drive/file/[id]?token= (owner-free path).
 * No session required — the token IS the (time-boxed) authorization.
 */
export default async function SharedDriveFile({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { id } = await params
  const { token } = await searchParams
  if (!token) {
    return <div className="p-8 text-center text-sm text-zinc-600">শেয়ার লিংক অবৈধ — টোকেন নেই।</div>
  }
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-lg font-bold">Hostamar Drive — শেয়ার করা ফাইল</h1>
      <div className="text-xs text-zinc-500">লিংক মেয়াদ ১ ঘণ্টা (মালিক পরিবর্তন করতে পারেন)</div>
      <video
        className="max-h-[70vh] w-full rounded-lg bg-black"
        src={`/api/drive/file/${id}?token=${encodeURIComponent(token)}`}
        controls
      />
      <a
        className="inline-block rounded-md bg-[#0E7C3A] px-4 py-2 text-sm font-semibold text-white"
        href={`/api/drive/file/${id}?token=${encodeURIComponent(token)}`}
        download
      >ডাউনলোড</a>
    </div>
  )
}
