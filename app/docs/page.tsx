import Link from 'next/link'

export const metadata = {
  title: 'Docs & Guides — Hostamar',
  description: 'Documentation, guides and API references for Hostamar AI products.',
}

const SECTIONS = [
  {
    title: 'Getting Started',
    items: [
      { name: 'Create your account', href: '/signup', desc: 'Sign up and get 6000 free credits — no card needed.' },
      { name: 'Dashboard tour', href: '/dashboard', desc: 'AI Video, Hosting, Chat, Browser, IDE, Game — all in one shell.' },
      { name: 'Pricing', href: '/pricing', desc: '1 credit = 1 Taka. Pay with bKash/Nagad/Rocket later.' },
    ],
  },
  {
    title: 'Products',
    items: [
      { name: 'AI Video', href: '/dashboard/videos', desc: 'Generate Bangla videos from a prompt.' },
      { name: 'Cloud Hosting', href: '/dashboard/hosting', desc: 'Spin up servers, billed in credits.' },
      { name: 'AI Browser', href: '/dashboard/browser', desc: 'Browse any site inside the dashboard with AI summaries.' },
      { name: 'Dev IDE', href: '/dashboard/ide', desc: 'Write, run and save code in the browser.' },
    ],
  },
  {
    title: 'Developers',
    items: [
      { name: 'API reference', href: '/developers', desc: 'OpenAI-compatible API — 95 models via hostamar.com/v1.' },
      { name: 'Support SOPs (internal)', href: '/docs/sops', desc: 'Support runbooks and incident procedures.' },
    ],
  },
]

export default function DocsIndexPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-[#0E7C3A]">Docs & Guides</h1>
      <p className="mb-8 text-slate-600">Everything you need to build with Hostamar.</p>
      <div className="space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="mb-3 text-xl font-semibold">{s.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {s.items.map((it) => (
                <Link key={it.name} href={it.href}
                  className="rounded-xl border bg-white p-4 transition hover:border-[#0E7C3A]/40 hover:shadow-sm">
                  <p className="font-semibold text-[#0F172A]">{it.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{it.desc}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
