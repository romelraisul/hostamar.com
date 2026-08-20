export default function ShowcasePage({ params }: { params: { id: string } }){
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10">
      <h1 className="text-xl font-bold">Showcase {params.id}</h1>
      <p className="text-sm text-zinc-600">Public build — SEO indexed — <a className="text-[#0E7C3A] underline" href="/download">Download Hostamar Node</a></p>
    </div>
  )
}
