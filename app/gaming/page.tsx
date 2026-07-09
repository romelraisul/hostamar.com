'use client'
import { useEffect, useState } from "react";

const GAMES = [
  { id: "chess", name: "দাবা", en: "Chess", icon: "♟️", cat: "বোর্ড", players: 342, prize: "৳10K", color: "from-zinc-800 to-zinc-900", online: true },
  { id: "ludo", name: "লুডু", en: "Ludo", icon: "🎲", cat: "বোর্ড", players: 812, prize: "৳5K", color: "from-[#0E7C3A] to-[#0a5e2c]", online: true },
  { id: "carrom", name: "ক্যারাম", en: "Carrom", icon: "🎯", cat: "বোর্ড", players: 214, prize: "", color: "from-amber-700 to-orange-800", online: true },
  { id: "snake", name: "স্নেক", en: "Snake", icon: "🐍", cat: "আর্কেড", players: 523, prize: "", color: "from-emerald-700 to-teal-800", online: false },
  { id: "tetris", name: "টেট্রিস", en: "Tetris", icon: "🧩", cat: "আর্কেড", players: 189, prize: "৳2K", color: "from-violet-700 to-indigo-800", online: true },
  { id: "football", name: "পেনাল্টি", en: "Penalty", icon: "⚽", cat: "আর্কেড", players: 401, prize: "", color: "from-sky-700 to-blue-800", online: false },
  { id: "card29", name: "কল ব্রিজ 29", en: "Card 29", icon: "🃏", cat: "টুর্নামেন্ট", players: 298, prize: "৳8K", color: "from-red-800 to-zinc-900", online: true },
  { id: "domino", name: "ডমিনো", en: "Domino", icon: "🀄", cat: "বোর্ড", players: 112, prize: "", color: "from-zinc-700 to-zinc-800", online: false },
  { id: "quiz", name: "কুইজ", en: "Quiz", icon: "🧠", cat: "টুর্নামেন্ট", players: 632, prize: "৳3K", color: "from-[#E4312B] to-[#a51f19]", online: true },
  { id: "racing", name: "রেসিং", en: "Racing", icon: "🏁", cat: "আর্কেড", players: 274, prize: "৳4K", color: "from-slate-700 to-slate-900", online: true },
];

const FILTERS = ["সব", "বোর্ড", "আর্কেড", "টুর্নামেন্ট"] as const;

function Countdown({ targetHour }: { targetHour: number }) {
  const [time, setTime] = useState("00:00:00");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(targetHour, 0, 0, 0);
      if (target < now) target.setDate(target.getDate() + 1);
      const diff = target.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTime(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetHour]);
  return <span className="font-mono text-[12px] tracking-wider">{time}</span>;
}

export default function App() {
  const [filter, setFilter] = useState("বোর্ড");
  const [filterTick, setFilterTick] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [dice, setDice] = useState<number | null>(null);
  const filtered = filter === "সব" ? GAMES : GAMES.filter(g => g.cat === filter);

  const handleFilter = (f: string) => {
    setFilter(f);
    setFilterTick(v => v + 1);
  };
  const rollDice = () => setDice(Math.floor(Math.random()*6)+1);

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 selection:bg-[#0E7C3A]/20 overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
        h1,h2,h3,.bangla { font-family: "Hind Siliguri", system-ui, sans-serif; }
        body, p, span, button, a, div { font-family: "Inter", system-ui, sans-serif; }
        .mono { font-family: "JetBrains Mono", monospace; }
      `}</style>

      {/* Trust bar */}
      <div className="w-full bg-[#0F1115] text-[#FCFCF9] text-[11px] sm:text-[12px] tracking-wide">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 h-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto scrollbar-none">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="h-1.5 w-1.5 rounded-full bg-[#0E7C3A] animate-pulse" /> 500+ প্লেয়ার অনলাইন</span>
            <span className="opacity-60 hidden sm:inline">•</span>
            <span className="whitespace-nowrap opacity-80">Tournaments daily 7PM & 9PM</span>
            <span className="opacity-60 hidden sm:inline">•</span>
            <span className="whitespace-nowrap">bKash payout ⚡ Instant</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 whitespace-nowrap opacity-80">
            <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10">BD Servers 20ms ping</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#FCFCF9]/80 border-b border-zinc-200/60">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="#" className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-[#0F1115] text-white grid place-items-center font-black text-[14px]">H</div>
              <div className="leading-none">
                <div className="font-bold tracking-tight text-[16px]">hostamar</div>
                <div className="text-[10px] tracking-[0.18em] uppercase opacity-60 -mt-0.5">/gaming</div>
              </div>
            </a>
            <nav className="hidden md:flex items-center gap-6 text-[14px] font-medium">
              <a href="#games" className="opacity-70 hover:opacity-100 transition">Games</a>
              <a href="#tournaments" className="opacity-70 hover:opacity-100 transition">Tournaments</a>
              <a href="#prizes" className="opacity-70 hover:opacity-100 transition">Prizes</a>
              <a href="#pricing" className="opacity-70 hover:opacity-100 transition">Pricing</a>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <a href="/gaming/play" className="hidden sm:inline-flex h-9 px-4 rounded-full bg-white border border-zinc-200 text-[13px] font-semibold hover:bg-zinc-50 transition">লগইন</a>
            <a href="/gaming/play" className="inline-flex h-9 sm:h-10 px-4 sm:px-5 rounded-full bg-[#0E7C3A] text-white text-[13px] sm:text-[14px] font-semibold items-center justify-center hover:bg-[#0c6a32] transition shadow-[0_8px_20px_-10px_#0E7C3A]">ফ্রি খেলুন</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[1200px] px-4 sm:px-6 pt-8 sm:pt-14 pb-10 sm:pb-16">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-start">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E7C3A]/10 border border-[#0E7C3A]/15 text-[#0E7C3A] text-[12px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0E7C3A]" /> নতুন • BD সার্ভারে লাইভ
            </div>
            <h1 className="bangla mt-5 text-[32px] sm:text-[48px] leading-[1.05] font-bold tracking-tight">
              ব্রাউজারে গেম, <span className="text-[#0E7C3A]">AI এর সাথে</span>,<br />
              টুর্নামেন্টে টাকা জিতুন
            </h1>
            <p className="mt-4 text-[15px] sm:text-[17px] leading-7 text-zinc-600 max-w-[560px]">
              ডাউনলোড নেই, Steam নেই, <b className="text-zinc-900 font-semibold">4GB RAM এ চলবে।</b> দাবা, লুডু, ক্যারাম, HTML5 গেমস — BD সার্ভারে 20ms ping, bKash এ এন্ট্রি ফি <b className="font-semibold text-zinc-900">৳50-500</b>, জিতলে bKash এ পেমেন্ট।
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/gaming/play" className="inline-flex h-12 px-6 rounded-full bg-[#0F1115] text-white font-semibold text-[14px] items-center justify-center hover:bg-black transition">এখনই খেলুন — ফ্রি</a>
              <a href="#tournaments" className="inline-flex h-12 px-6 rounded-full bg-white border border-zinc-200 font-semibold text-[14px] items-center justify-center hover:bg-zinc-50 transition">টুর্নামেন্ট দেখুন</a>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {[
                "No Download • Cloud HTML5",
                "BD Server 20ms",
                "bKash Payout",
              ].map(b => (
                <span key={b} className="px-3 py-1.5 rounded-full bg-white border border-zinc-200 text-[12px] font-medium text-zinc-700">{b}</span>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-3 max-w-[420px] border border-zinc-200 rounded-2xl overflow-hidden bg-white">
              {[
                { k: "47K+", v: "ম্যাচ আজ" },
                { k: "৳2.1L", v: "গতকাল পেমেন্ট" },
                { k: "4.8/5", v: "রেটিং" },
              ].map(s => (
                <div key={s.k} className="px-4 py-3 text-center border-r last:border-0 border-zinc-200">
                  <div className="font-bold text-[16px]">{s.k}</div>
                  <div className="text-[11px] opacity-60 mt-0.5">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right mock */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 bg-gradient-to-b from-[#0E7C3A]/10 via-transparent to-transparent blur-2xl rounded-[32px]" />
            <div className="rounded-[24px] bg-[#0F1115] border border-white/10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] overflow-hidden">
              {/* browser chrome */}
              <div className="h-11 flex items-center justify-between px-4 bg-[#15181e] border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#E4312B]" /><span className="h-3 w-3 rounded-full bg-amber-400" /><span className="h-3 w-3 rounded-full bg-[#0E7C3A]" />
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[11px] text-white/60">
                  <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10">Prize pool ৳5,000</span>
                  <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10">Entry ৳50</span>
                  <span className="px-2.5 py-1 rounded-full bg-[#0E7C3A] text-white border border-[#0E7C3A]">Players 47/100</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[11px] text-white/70">LIVE</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_190px] lg:grid-cols-[1fr_220px]">
                {/* board */}
                <div className="p-3 sm:p-4 bg-[#101319] min-w-0">
                  <div className="rounded-2xl bg-[#FCFCF9] border border-black/5 p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-zinc-900 text-white grid place-items-center text-[11px] font-bold">AI</div>
                        <div>
                          <div className="text-[12px] font-semibold leading-none">AI - Hard</div>
                          <div className="text-[10px] opacity-60">Grandmaster level</div>
                        </div>
                      </div>
                      <div className="text-[11px] px-2 py-1 rounded-full bg-[#0E7C3A]/10 text-[#0E7C3A] font-semibold">তোমার চাল</div>
                    </div>

                    {/* Ludo board mock */}
                    <div className="aspect-square rounded-xl bg-white border border-zinc-200 grid grid-cols-15 grid-rows-15 overflow-hidden p-1.5 gap-[2px]">
                      {Array.from({ length: 225 }).map((_, i) => {
                        const isRed = [0,1,2,3,4,5,15,16,17,18,19,20,30,31,32,33,34,35,45,46,47,48,49,50,60,61,62,63,64,65].includes(i) || i%15<6 && Math.floor(i/15)<6;
                        const isGreen = i%15>=9 && Math.floor(i/15)<6;
                        const isBlue = i%15<6 && Math.floor(i/15)>=9;
                        const isYellow = i%15>=9 && Math.floor(i/15)>=9;
                        const isPath = !isRed && !isGreen && !isBlue && !isYellow;
                        return (
                          <div key={i} className={`rounded-[2px] ${isRed ? "bg-[#E4312B]/85" : isGreen ? "bg-[#0E7C3A]/85" : isBlue ? "bg-sky-600/85" : isYellow ? "bg-amber-400/90" : isPath ? "bg-zinc-100" : "bg-zinc-100" } ${[112].includes(i) ? "!bg-zinc-900" : ""} relative`}>
                            {i===67 && <span className="absolute inset-0 grid place-items-center text-[10px]">🔴</span>}
                            {i===82 && <span className="absolute inset-0 grid place-items-center text-[10px]">🟢</span>}
                            {i===142 && <span className="absolute inset-0 grid place-items-center text-[10px]">🔵</span>}
                            {i===157 && <span className="absolute inset-0 grid place-items-center text-[10px]">🟡</span>}
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={rollDice} className="h-9 flex-1 rounded-full bg-[#0F1115] text-white text-[12px] font-semibold hover:bg-black transition active:scale-[0.98]">
                        {dice ? `🎲 ${dice} — চাল দাও!` : "🎲 চাল দাও"}
                      </button>
                      <div className="px-3 h-9 rounded-full bg-zinc-100 border border-zinc-200 text-[12px] grid place-items-center font-medium min-w-[72px]">
                        {dice ? `${dice} পড়েছে!` : "চাল দাও!"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[11px] text-white/60">
                    <span className="px-2 py-1 rounded-full bg-white/10 border border-white/10">No download</span>
                    <span className="px-2 py-1 rounded-full bg-white/10 border border-white/10">4GB RAM OK</span>
                  </div>
                </div>

                {/* sidebar leaderboard */}
                <div className="border-t sm:border-t-0 sm:border-l border-white/10 bg-[#0F1115] p-3 flex flex-col">
                  <div className="text-[11px] uppercase tracking-widest text-white/40">Live Leaderboard</div>
                  <div className="mt-3 space-y-2">
                    {[
                      { n: "Rafi", s: "৳1,200", me: false },
                      { n: "You", s: "৳950", me: true },
                      { n: "Mim", s: "৳880", me: false },
                      { n: "AI • Hard", s: "৳860", me: false },
                      { n: "Sakib", s: "৳720", me: false },
                    ].map(r => (
                      <div key={r.n} className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-[12px] ${r.me ? "bg-white text-zinc-900 border-white" : "bg-white/5 text-white/80 border-white/10"}`}>
                        <span className="font-medium">{r.n}</span><span className="mono text-[11px]">{r.s}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-4">
                    <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
                      <div className="text-[11px] text-white/60">Chat</div>
                      <div className="mt-2 space-y-1.5 text-[11px]">
                        <div className="text-white/70"><b className="text-white">Mim:</b> চাল দাও!</div>
                        <div className="text-white/70"><b className="text-white">Rafi:</b> GG 😅</div>
                        <div className="inline-flex px-2 py-1 rounded-full bg-[#0E7C3A] text-white text-[10px]">You: Done ✔️</div>
                      </div>
                    </div>
                    <div className="mt-2 h-9 rounded-full bg-[#E4312B] grid place-items-center text-white text-[12px] font-semibold">bKash দিয়ে Join ৳50</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
              <span className="h-1 w-1 rounded-full bg-zinc-300" /> প্রিভিউ — আসল গেম ব্রাউজারে 60fps চলে
            </div>
          </div>
        </div>
      </section>

      {/* Games */}
      <section id="games" className="mx-auto max-w-[1200px] px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4 w-full max-w-full">
          <div className="min-w-0">
            <h2 className="bangla text-[26px] sm:text-[32px] font-bold tracking-tight leading-tight">১০ টা গেম, এক ব্রাউজারে</h2>
            <p className="mt-2 text-[14px] text-zinc-600">বোর্ড থেকে আর্কেড — সব 60fps, মোবাইলেও, ডাউনলোড ছাড়া। <span className="inline-flex ml-1 px-2 py-0.5 rounded-full bg-zinc-900 text-white text-[11px]">{filtered.length} দেখাচ্ছে • ক্লিক {filterTick}</span></p>
          </div>
          <div className="flex gap-1.5 p-1 rounded-full bg-white border border-zinc-200 overflow-x-auto max-w-full scrollbar-none">
            {FILTERS.map(f => (
              <button key={f} onClick={() => handleFilter(f)} data-filter={f} className={`h-8 px-3.5 rounded-full text-[13px] font-medium transition whitespace-nowrap shrink-0 ${filter===f ? "bg-[#0F1115] text-white shadow-sm" : "text-zinc-600 hover:bg-zinc-100"}`}>{f}</button>
            ))}
          </div>
        </div>

        <div key={filterTick} className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {filtered.map(g => (
            <div key={g.id} className="group rounded-[20px] bg-white border border-zinc-200 overflow-hidden hover:border-zinc-300 transition">
              <div className={`h-[108px] sm:h-[124px] bg-gradient-to-br ${g.color} relative p-3 flex flex-col justify-between`}>
                <div className="flex justify-between items-start">
                  <span className="text-[28px] drop-shadow">{g.icon}</span>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-medium border ${g.online ? "bg-white/15 text-white border-white/20 backdrop-blur" : "bg-black/25 text-white/70 border-white/10"}`}>{g.online ? "● Live" : "Practice"}</span>
                </div>
                <div className="text-white">
                  <div className="bangla font-semibold text-[15px] leading-none">{g.name}</div>
                  <div className="text-[11px] opacity-70 mt-0.5">{g.en} • {g.cat}</div>
                </div>
              </div>
              <div className="p-3 flex items-center justify-between">
                <div className="text-[11px] leading-tight">
                  <div className="font-semibold">{g.players} online</div>
                  <div className="opacity-60">{g.prize ? `Prize ${g.prize}` : "Free play"}</div>
                </div>
                <a href="/gaming/play" className="h-7 px-3 rounded-full bg-[#FCFCF9] border border-zinc-200 text-[11px] font-semibold grid place-items-center group-hover:bg-[#0F1115] group-hover:text-white group-hover:border-[#0F1115] transition">খেলুন</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tournaments dark */}
      <section id="tournaments" className="bg-[#0F1115] text-[#FCFCF9] mt-2 overflow-hidden">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="inline-flex px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-[11px] tracking-wide">TODAY • 30 JUNE • DHAKA TIME</div>
              <h2 className="bangla mt-4 text-[28px] sm:text-[36px] font-bold leading-[1.05]">আজকের টুর্নামেন্ট</h2>
              <p className="mt-2 text-[14px] text-white/60 max-w-[520px]">bKash দিয়ে Join, ব্রাউজারে খেলো, জিতলে 10 মিনিটে পেমেন্ট। 10% ফি স্বচ্ছ, বাকি সব প্রাইজপুলে।</p>
            </div>
            <div className="flex gap-2 text-[12px]">
              <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/10">Anti-cheat ON • AI referee</div>
              <div className="px-3 py-2 rounded-xl bg-[#0E7C3A]">BD Server • 18ms avg</div>
            </div>
          </div>

          <div className="mt-8 grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
            {/* table */}
            <div className="rounded-[20px] overflow-hidden border border-white/10 bg-white/[0.04]">
              <div className="hidden sm:grid grid-cols-[88px_1fr_88px_110px_110px_120px] text-[11px] uppercase tracking-widest text-white/40 px-4 h-10 items-center border-b border-white/10">
                <span>Time</span><span>Game</span><span>Entry</span><span>Prize</span><span>Players</span><span>Action</span>
              </div>

              {[
                { time: "7:00 PM", name: "লুডু ক্লাসিক", entry: "৳50", prize: "৳5,000", joined: 32, cap: 100, hour: 19, hot: true },
                { time: "9:00 PM", name: "দাবা Blitz", entry: "৳100", prize: "৳10,000", joined: 18, cap: 64, hour: 21, hot: false },
                { time: "10:30 PM", name: "কল ব্রিজ 29", entry: "৳75", prize: "৳8,000", joined: 41, cap: 80, hour: 22, hot: false },
              ].map(row => (
                <div key={row.time} className="px-4 py-4 sm:py-3 grid sm:grid-cols-[88px_1fr_88px_110px_110px_120px] gap-2 sm:gap-0 items-center border-b last:border-0 border-white/10 bg-transparent hover:bg-white/[0.03] transition">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold mono">{row.time}</span>
                    {row.hot && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E4312B] text-white">HOT</span>}
                    <span className="sm:hidden ml-auto text-[11px] text-white/50 mono"><Countdown targetHour={row.hour} /></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-white/10 grid place-items-center">🎲</div>
                    <div>
                      <div className="bangla font-medium text-[14px] leading-none">{row.name}</div>
                      <div className="hidden sm:block text-[11px] text-white/50 mono mt-0.5"><Countdown targetHour={row.hour} /> left</div>
                    </div>
                  </div>
                  <div className="text-[13px]"><span className="sm:hidden opacity-50">Entry </span>{row.entry}</div>
                  <div className="text-[13px] font-semibold text-emerald-300">{row.prize}</div>
                  <div>
                    <div className="text-[12px]">{row.joined}/{row.cap}</div>
                    <div className="mt-1 h-1.5 w-[92px] rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-white" style={{ width: `${(row.joined/row.cap)*100}%` }} /></div>
                  </div>
                  <a href="/gaming/play" className="h-9 rounded-full bg-white text-zinc-900 text-[12px] font-semibold grid place-items-center hover:bg-zinc-100 transition">bKash দিয়ে Join</a>
                </div>
              ))}

              <div className="px-4 py-3 flex flex-wrap items-center gap-2 text-[11px] text-white/50">
                <span>⚡ Instant bKash payout • 10% platform fee • বাকি 90% বিজয়ীদের</span>
              </div>
            </div>

            {/* How it works */}
            <div className="rounded-[20px] bg-[#15181e] border border-white/10 p-5 sm:p-6">
              <h3 className="bangla text-[18px] font-semibold">কিভাবে কাজ করে?</h3>
              <div className="mt-5 grid gap-4">
                {[
                  { n: "১", t: "bKash দিয়ে Join", d: "Entry ফি ৳50-500। Nagad / bKash QR • 5 সেকেন্ডে confirm।", c: "bg-[#E4312B]" },
                  { n: "২", t: "ব্রাউজারে খেলো", d: "কোনো ডাউনলোড না। 4GB RAM, মোবাইলেও। AI বা মানুষের বিপক্ষে।", c: "bg-[#0E7C3A]" },
                  { n: "৩", t: "জিতলে bKash এ টাকা", d: "ম্যাচ শেষে 10 মিনিটে payout। লাইভ leaderboard + replay।", c: "bg-white text-zinc-900" },
                ].map(s => (
                  <div key={s.n} className="flex gap-3">
                    <div className={`h-9 w-9 shrink-0 rounded-full ${s.c} grid place-items-center font-bold text-[14px]`}>{s.n}</div>
                    <div>
                      <div className="bangla font-semibold text-[14px]">{s.t}</div>
                      <div className="text-[13px] leading-6 text-white/60 mt-1">{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl bg-white text-zinc-900 p-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-zinc-900 text-white grid place-items-center text-[13px]">✓</div>
                <div className="text-[12px] leading-5">
                  <b>Fair play guaranteed</b> — Anti-cheat, move timer, AI referee। Disconnect হলে 60s reconnect window।
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features bento */}
      <section className="mx-auto max-w-[1200px] w-full px-4 sm:px-6 py-12 sm:py-16 overflow-hidden">
        <h2 className="bangla text-[26px] sm:text-[30px] font-bold tracking-tight">কেন Hostamar Gaming আলাদা?</h2>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[
            { title: "No Download — Cloud HTML5", desc: "Chrome এ ওপেন করো, খেলো। 4GB RAM, low-end Android ও OK।", icon: "☁️", accent: "from-zinc-900 to-zinc-700" },
            { title: "BD Server — 20ms Low Ping", desc: "Singapore না, ঢাকা-তে হোস্ট। কম lag, fair match।", icon: "⚡", accent: "from-emerald-800 to-[#0E7C3A]" },
            { title: "bKash / Nagad Instant", desc: "Entry ও payout দুটোই bKash। 10 মিনিটে টাকা।", icon: "💸", accent: "from-[#E4312B] to-red-700" },
            { title: "AI Opponent — Easy to GM", desc: "একা practice? Easy থেকে Grandmaster AI — সব গেমে।", icon: "🤖", accent: "from-violet-800 to-indigo-700" },
            { title: "Anti-Cheat + Replay", desc: "Move validation, timer check, full game replay।", icon: "🛡️", accent: "from-zinc-800 to-zinc-900" },
            { title: "Live Stream to Facebook", desc: "এক ক্লিকে FB Live। Chat overlay + prize ticker সহ।", icon: "📡", accent: "from-sky-800 to-blue-700" },
          ].map(f => (
            <div key={f.title} className="rounded-[20px] border border-zinc-200 bg-white p-5 hover:border-zinc-300 transition">
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${f.accent} grid place-items-center text-white text-[18px]`}>{f.icon}</div>
              <div className="mt-4 font-semibold text-[15px] leading-tight">{f.title}</div>
              <div className="mt-1.5 text-[13px] leading-6 text-zinc-600">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Monetization strip */}
        <div id="prizes" className="mt-6 rounded-[20px] border border-zinc-200 bg-white p-4 sm:p-5 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-widest opacity-50">Free Play</div>
              <div className="font-semibold mt-1">Unlimited • Practice vs AI • No prize</div>
              <div className="text-[12px] opacity-60">কোনো টাকা লাগবে না, শুধু মজা।</div>
            </div>
            <div className="hidden sm:block w-px bg-zinc-200" />
            <div>
              <div className="text-[11px] uppercase tracking-widest opacity-50">Tournament</div>
              <div className="font-semibold mt-1">Entry ৳50-500 • 90% prize pool • 10% platform fee</div>
              <div className="text-[12px] opacity-60">স্বচ্ছ ফি, বাকি সব বিজয়ীদের মাঝে ভাগ।</div>
            </div>
          </div>
          <div className="px-3 py-2 rounded-full bg-[#FCFCF9] border border-zinc-200 text-[12px]">উদাহরণ: 100 জন × ৳50 = ৳5,000 pool → বিজয়ী পায় ৳4,500</div>
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-[1200px] w-full px-4 sm:px-6 pb-10 overflow-hidden">
        <div className="rounded-[24px] overflow-hidden border border-zinc-200 bg-white grid lg:grid-cols-2">
          <div className="p-6 sm:p-8 bg-zinc-50 border-b lg:border-b-0 lg:border-r border-zinc-200">
            <div className="text-[12px] uppercase tracking-widest opacity-50">Steam / Epic • Traditional</div>
            <h3 className="mt-3 font-bold text-[20px]">ডাউনলোড + High PC + Dollar</h3>
            <ul className="mt-4 space-y-2.5 text-[13px] text-zinc-600">
              <li className="flex gap-2"><span>✕</span> 30-80GB download, 8-16GB RAM লাগে</li>
              <li className="flex gap-2"><span>✕</span> Dollar কার্ড, PayPal — বাংলাদেশে ঝামেলা</li>
              <li className="flex gap-2"><span>✕</span> ইংরেজি UI, BD পেমেন্ট নেই</li>
              <li className="flex gap-2"><span>✕</span> Server EU/US — 120ms+ ping</li>
            </ul>
          </div>
          <div className="p-6 sm:p-8 bg-[#0F1115] text-white relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-[260px] w-[260px] rounded-full bg-[#0E7C3A]/30 blur-3xl hidden sm:block" />
            <div className="text-[12px] uppercase tracking-widest text-white/50">Hostamar Gaming • BD Native</div>
            <h3 className="mt-3 font-bold text-[20px]">4GB RAM, ব্রাউজার, bKash ৳50, বাংলা UI</h3>
            <ul className="mt-4 space-y-2.5 text-[13px] text-white/75">
              <li className="flex gap-2"><span className="text-emerald-400">✓</span> কোনো ডাউনলোড না — Chrome এ 3 সেকেন্ডে শুরু</li>
              <li className="flex gap-2"><span className="text-emerald-400">✓</span> bKash / Nagad ৳50 entry, জিতলে bKash payout</li>
              <li className="flex gap-2"><span className="text-emerald-400">✓</span> বাংলা UI, BD লিডারবোর্ড, FB Live</li>
              <li className="flex gap-2"><span className="text-emerald-400">✓</span> BD server 20ms ping, anti-cheat, AI referee</li>
            </ul>
            <a href="/gaming/play" className="mt-6 inline-flex h-10 px-5 rounded-full bg-white text-zinc-900 font-semibold text-[13px] items-center">ফ্রি ট্রাই করুন</a>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-[#F6F5EF] border-y border-zinc-200">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="bangla text-[28px] sm:text-[32px] font-bold tracking-tight">Pricing — এক প্যাকেজে সব</h2>
              <p className="mt-2 text-[14px] text-zinc-600 max-w-[560px]">Gaming আলাদা প্রোডাক্ট না — Hostamar এর ভেতরেই। Video, Hosting, Chat, Browser, IDE সহ এক সাবস্ক্রিপশন।</p>
            </div>
            <div className="text-[12px] px-3 py-1.5 rounded-full bg-white border border-zinc-200">bKash • Nagad • Monthly • Cancel anytime</div>
          </div>

          <div className="mt-8 grid lg:grid-cols-3 gap-4">
            {/* Free */}
            <div className="rounded-[20px] bg-white border border-zinc-200 p-6 flex flex-col">
              <div className="text-[12px] uppercase tracking-widest opacity-50">Free</div>
              <div className="mt-2 flex items-baseline gap-2"><span className="text-[32px] font-bold">৳0</span><span className="opacity-60 text-[13px]">/ forever</span></div>
              <ul className="mt-5 space-y-2.5 text-[13px]">
                <li>✓ Unlimited free games, practice vs AI</li>
                <li>✓ No prize, no entry fee</li>
                <li>✓ Leaderboard (weekly)</li>
                <li className="opacity-50">✕ Tournament entry</li>
              </ul>
              <a href="/gaming/play" className="mt-auto pt-6 inline-flex h-11 rounded-full border border-zinc-200 bg-[#FCFCF9] font-semibold text-[13px] items-center justify-center">ফ্রি খেলুন</a>
            </div>

            {/* Starter Highlight */}
            <div className="rounded-[20px] bg-[#0F1115] text-white border border-white/10 p-6 flex flex-col relative overflow-hidden shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
              <div className="absolute -right-16 -top-16 h-[200px] w-[200px] rounded-full bg-[#0E7C3A]/40 blur-2xl" />
              <div className="flex items-center justify-between">
                <div className="text-[12px] uppercase tracking-widest text-white/50">Most Popular</div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#0E7C3A] font-semibold">Starter — ৳2000/mo</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2"><span className="text-[34px] font-bold">৳2,000</span><span className="text-white/60 text-[13px]">/ month</span></div>
              <div className="mt-1 text-[12px] text-white/60">Tournament discount 10%, priority BD server, custom avatar</div>
              <ul className="mt-5 space-y-2.5 text-[13px] text-white/85">
                <li className="flex gap-2"><span className="text-emerald-400">✓</span> Video 10 credits + Hosting 5GB included</li>
                <li className="flex gap-2"><span className="text-emerald-400">✓</span> Chat + Browser + IDE + Gaming — all access</li>
                <li className="flex gap-2"><span className="text-emerald-400">✓</span> Tournament entry & bKash payout</li>
                <li className="flex gap-2"><span className="text-emerald-400">✓</span> Private lobby, no ads</li>
              </ul>
              <a href="/gaming/play" className="mt-6 inline-flex h-11 rounded-full bg-white text-zinc-900 font-semibold text-[13px] items-center justify-center hover:bg-zinc-100 transition">Starter নিন — bKash দিয়ে</a>
              <div className="mt-3 text-[11px] text-white/45 text-center">10% ফি থেকে 10% ছাড় • Cancel anytime</div>
            </div>

            {/* Business */}
            <div className="rounded-[20px] bg-white border border-zinc-200 p-6 flex flex-col">
              <div className="text-[12px] uppercase tracking-widest opacity-50">Business</div>
              <div className="mt-2 flex items-baseline gap-2"><span className="text-[32px] font-bold">৳3,500</span><span className="opacity-60 text-[13px]">/ month</span></div>
              <div className="mt-1 text-[12px] opacity-60">Create private tournament, invite friends, bKash split</div>
              <ul className="mt-5 space-y-2.5 text-[13px]">
                <li>✓ সব Starter ফিচার +</li>
                <li>✓ Private tournament builder</li>
                <li>✓ bKash auto-split বিজয়ীদের মাঝে</li>
                <li>✓ Brand logo, custom rules, FB Live co-host</li>
              </ul>
              <a href="/gaming/play" className="mt-auto pt-6 inline-flex h-11 rounded-full bg-zinc-900 text-white font-semibold text-[13px] items-center justify-center hover:bg-black transition">Business শুরু করুন</a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[900px] px-4 sm:px-6 py-12 sm:py-16">
        <h2 className="bangla text-[24px] sm:text-[28px] font-bold text-center">প্রশ্নোত্তর</h2>
        <div className="mt-6 rounded-[20px] border border-zinc-200 bg-white overflow-hidden divide-y divide-zinc-200">
          {[
            { q: "bKash payout কি instant?", a: "হ্যাঁ। ম্যাচ শেষে AI referee result verify করে 5-10 মিনিটের মধ্যে bKash এ পাঠায়। রাত 11টার পর হলে সকাল 9টায়। Transaction ID dashboard এ দেখতে পাবেন।" },
            { q: "AI কি cheating করে?", a: "না। AI server-side চলে, সব move log হয়। Grandmaster level কঠিন, কিন্তু fair। Anti-cheat + replay সবাই দেখতে পারে।" },
            { q: "মোবাইলে খেলা যাবে?", a: "হ্যাঁ। Chrome / Facebook browser এ 100% চলে। 4GB RAM, Android 8+ হলেই হবে। কোনো APK লাগবে না।" },
            { q: "Disconnect হলে refund?", a: "60 সেকেন্ড reconnect window। ফিরে না এলে: Free গেম হলে কিছু না, Tournament হলে যদি 50% এর কম খেলা হয় তবে entry auto-refund bKash এ।" },
          ].map((f, i) => (
            <button key={f.q} onClick={() => setOpenFaq(openFaq===i?null:i)} className="w-full text-left p-5 sm:p-6 flex gap-4 items-start hover:bg-zinc-50/70 transition">
              <span className={`mt-0.5 h-7 w-7 shrink-0 rounded-full grid place-items-center border text-[13px] ${openFaq===i ? "bg-[#0F1115] text-white border-[#0F1115]" : "bg-white border-zinc-200"}`}>{openFaq===i ? "−" : "+"}</span>
              <div className="flex-1">
                <div className="bangla font-semibold text-[15px]">{f.q}</div>
                {openFaq===i && <div className="mt-2 text-[13px] leading-6 text-zinc-600">{f.a}</div>}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#0F1115] text-white overflow-hidden">
        <div className="mx-auto max-w-[1200px] w-full px-4 sm:px-6 py-12 sm:py-16">
          <div className="rounded-[28px] bg-gradient-to-br from-[#15181e] to-[#0F1115] border border-white/10 p-6 sm:p-10 relative overflow-hidden max-w-full">
            <div className="absolute -right-24 -top-24 h-[380px] w-[380px] rounded-full bg-[#0E7C3A]/25 blur-[80px] hidden sm:block" />
            <div className="absolute -left-24 -bottom-24 h-[320px] w-[320px] rounded-full bg-[#E4312B]/20 blur-[80px] hidden sm:block" />
            <div className="relative grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
              <div>
                <h2 className="bangla text-[30px] sm:text-[40px] font-bold leading-[1.05]">গেম খেলুন, টাকা জিতুন,<br/> bKash এ নিন</h2>
                <p className="mt-3 text-[14px] leading-6 text-white/60 max-w-[480px]">ডাউনলোড নেই, Steam নেই। ব্রাউজার খুলুন, 3 সেকেন্ডে শুরু। আজ রাত 7টায় লুডু টুর্নামেন্ট — ৳5,000 প্রাইজপুল।</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href="/gaming/play" className="inline-flex h-12 px-7 rounded-full bg-white text-zinc-900 font-semibold text-[14px] items-center justify-center hover:bg-zinc-100 transition">ফ্রি খেলুন</a>
                  <a href="/gaming/play" className="inline-flex h-12 px-7 rounded-full bg-[#E4312B] text-white font-semibold text-[14px] items-center justify-center hover:bg-[#c92a24] transition">টুর্নামেন্টে Join করুন</a>
                </div>
                <div className="mt-4 flex gap-2 text-[11px] text-white/50">
                  <span>✓ No card needed</span><span>•</span><span>✓ bKash payout</span><span>•</span><span>✓ 20ms BD ping</span>
                </div>
              </div>

              <div className="grid gap-3">
                <a href="/generate" className="group rounded-2xl bg-white text-zinc-900 p-4 sm:p-5 border border-white/10 flex gap-3 items-center hover:bg-zinc-50 transition">
                  <div className="h-11 w-11 rounded-xl bg-zinc-900 text-white grid place-items-center text-[18px]">🎬</div>
                  <div className="flex-1">
                    <div className="bangla font-semibold text-[14px] leading-tight">টুর্নামেন্ট জয়ের ভিডিও বানান?</div>
                    <div className="text-[12px] opacity-60 mt-0.5">Studio তে হাইলাইট ভিডিও বানান — auto cut, Bangla caption</div>
                  </div>
                  <span className="text-[18px] group-hover:translate-x-0.5 transition">→</span>
                </a>
                <a href="/chat" className="group rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5 flex gap-3 items-center hover:bg-white/10 transition">
                  <div className="h-11 w-11 rounded-xl bg-[#0E7C3A] text-white grid place-items-center text-[18px]">💬</div>
                  <div className="flex-1">
                    <div className="bangla font-semibold text-[14px] leading-tight">গেম স্ট্রিমের টাইটেল লিখতে Chat ব্যবহার করুন</div>
                    <div className="text-[12px] text-white/50 mt-0.5">ভাইরাল FB caption, thumbnail text — এক ক্লিকে</div>
                  </div>
                  <span className="text-[18px] group-hover:translate-x-0.5 transition">→</span>
                </a>
                <div className="rounded-2xl bg-[#0E7C3A]/15 border border-[#0E7C3A]/20 p-3.5 text-[12px] leading-5 text-emerald-100/80">
                  <b className="text-white">Pro tip:</b> রাত 9টার দাবা টুর্নামেন্টে গড়ে 18 জন — জেতার চান্স বেশি। এখনই practice শুরু করো vs AI Hard।
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#FCFCF9] border-t border-zinc-200">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row justify-between gap-8">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-[#0F1115] text-white grid place-items-center font-bold text-[12px]">H</div>
                <span className="font-bold">hostamar</span><span className="opacity-50 text-[12px]">/gaming</span>
              </div>
              <div className="mt-3 text-[13px] leading-6 text-zinc-600 max-w-[320px]">বাংলাদেশের প্রথম browser cloud gaming + tournament platform। No download, bKash payout, BD server।</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-[13px]">
              <div>
                <div className="font-semibold">Product</div>
                <div className="mt-2 space-y-1.5 opacity-70">
                  <div><a href="#games" className="hover:opacity-100">Games</a></div>
                  <div><a href="#tournaments" className="hover:opacity-100">Tournaments</a></div>
                  <div><a href="#pricing" className="hover:opacity-100">Pricing</a></div>
                </div>
              </div>
              <div>
                <div className="font-semibold">Support</div>
                <div className="mt-2 space-y-1.5 opacity-70">
                  <div>Anti-cheat policy</div>
                  <div>bKash refund</div>
                  <div>Contact: fb.com/hostamar</div>
                </div>
              </div>
              <div className="hidden sm:block">
                <div className="font-semibold">Legal</div>
                <div className="mt-2 space-y-1.5 opacity-70">
                  <div>18+ • Skill based • No gambling</div>
                  <div>© 2025 Hostamar</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-zinc-200 flex flex-wrap gap-2 text-[11px] text-zinc-500">
            <span>⚠️ Skill-based gaming only. This is not gambling. Tournament fee = platform service + prize pool. 10% fee transparent.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
