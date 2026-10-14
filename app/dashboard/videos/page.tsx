import type { Metadata } from 'next'
import { Video, ExternalLink } from 'lucide-react'

export const metadata: Metadata = {
  title: 'ভিডিও OS — ComfyUI | Hostamar',
  description:
    'Hostamar ভিডিও OS এখন comfy.hostamar.com এ — Minimax Design এর ৪টা pillar (Agent, Multi-model, Voice/Music, Timeline) ComfyUI তে 90% rebuild করার গাইড।',
  robots: { index: false, follow: false },
}

const COMFY = 'https://comfy.hostamar.com/'

export default function VideosMovedPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Moved notice */}
      <div className="rounded-2xl border border-[#0E7C3A]/20 bg-[#ECFDF5] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0E7C3A] text-white">
              <Video className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-bold text-[#0F172A]">ভিডিও OS moved</h1>
              <p className="text-sm text-[#475569]">তোমার ভিডিও ওয়ার্কস্পেস এখন comfy.hostamar.com এ — সেখানেই ComfyUI চলছে।</p>
            </div>
          </div>
          <a
            href={COMFY}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#0E7C3A] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0c6a32]"
          >
            comfy.hostamar.com খুলুন <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Minimax Design vs ComfyUI — 90% rebuild guide */}
      <article className="rounded-2xl border bg-white p-6 leading-relaxed text-[#334155]">
        <p>
          হ্যাঁ পারবে, 90% পর্যন্ত। বরং উল্টোটা সত্য - Minimax Design এর ভেতরেই ComfyUI আছে, তুমি ComfyUI তে Minimax Design এর সব pillar
          rebuild করতে পারবে। শুধু Cloud আর Agent এর polish টা নিজে বানাতে হবে।
        </p>

        <h2 className="mt-6 text-lg font-bold text-[#0F172A]">Minimax Design আসলে ৪টা জিনিসের combo</h2>
        <p className="mt-1">Agent + Multi-model + Voice/Music + Timeline। ComfyUI তে ৪টাই এখন node আছে।</p>

        <h3 className="mt-6 font-bold text-[#0F172A]">১. Agent বানাও - যেটা Minimax এর main brain</h3>
        <p className="mt-1">
          Minimax এ তুমি লিখো "sneaker এর ad বানাও" আর agent নিজে workflow সাজায়। ComfyUI তেও এখন সেটা আছে।
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            ComfyUI Agent Panel install করো - এটা sidebar এ বসে থাকা autonomous agent যেটা Claude, ChatGPT, Gemini বা local Ollama দিয়ে
            তোমার live graph drive করে, edit করে, layout ঠিক করে।
          </li>
          <li>
            আরেকটা আছে EzeAi Comfy Agent - এটা Autonomous mode এ build → run → review → improve করে। Model নিজে node invent করতে পারে না,
            type ভুল wire করতে পারে না।
          </li>
        </ul>
        <p className="mt-2">মানে তুমি বলবে "H3 দিয়ে 3টা shot এর story বানাও", ও নিজে node বসিয়ে দেবে।</p>

        <h3 className="mt-6 font-bold text-[#0F172A]">২. H3 + Veo + Kling এক canvas এ আনো</h3>
        <p className="mt-1">Minimax Design এর USP হলো এক window তে H3, Veo, Kling, Wan। ComfyUI তে:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            ComfyUI 0.37+ এ MiniMax H3 native support চলে এসেছে। Text-to-Video, Image-to-Video, Reference-to-Video সবই 2K তে হয় with
            synced audio।
          </li>
          <li>
            Long video এর জন্য H3-LongVideos node আছে। H3 একবারে 15s বানায়, এই node একটা written scene কে chain of shots এ ভেঙে একটা
            continuous video জোড়া লাগিয়ে দেয়।
          </li>
          <li>
            Motion Director Timeline এর মতো node ও আছে - একটা shot add করো, prompt লেখো, আরেকটা shot add করো, ও motion + audio carry করে
            next shot এ নিয়ে যায়।
          </li>
        </ul>

        <h3 className="mt-6 font-bold text-[#0F172A]">৩. Voice + Music add করো</h3>
        <p className="mt-1">Minimax এ Speech 2.8 আর Music 3.0 built-in। ComfyUI তে সেটা করবে Genesis nodes দিয়ে।</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            Genesis / KIE Nodes: এক pack এ 70টা video node - Wan 2.2, Kling 2.5, Sora 2, Veo 3.1 আর 20টা Music/Audio node - Suno V5,
            ElevenLabs TTS + Stem Separation সব আছে।
          </li>
          <li>চাইলে ElevenLabs-Pro আলাদা install করলে 15টা node পাবে TTS, voice cloning, music generation, sound effect সহ।</li>
        </ul>
        <p className="mt-2">মানে একই canvas এ video render {'>'} ElevenLabs voiceover {'>'} Suno background music {'>'} lip-sync - সব chain করা যায়।</p>

        <h3 className="mt-6 font-bold text-[#0F172A]">৪. Final Setup টা কেমন হবে</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>ComfyUI Manager install</li>
          <li>comfyui-agent-panel (MCP) install - এটাই তোমার Minimax এর মতো chat agent হবে</li>
          <li>minimax-h3-longvideos_optimized + native H3 nodes</li>
          <li>genesis-kie-nodes বা comfyui-kie-nodes-next - এতে Veo, Kling, Suno, ElevenLabs একসাথে পাবে</li>
          <li>ComfyUI-VideoHelperSuite - timeline assembly এর জন্য</li>
        </ol>
        <p className="mt-2">
          এরপর তুমি একটা master workflow বানাবে: LLM Agent (brief break) {'>'} H3 Text2Video {'>'} H3 Reference Video {'>'} ElevenLabs TTS {'>'}
          Suno Music {'>'} Video Combine
        </p>

        <h3 className="mt-6 font-bold text-[#0F172A]">কোথায় আটকাবে?</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>
            VRAM: Minimax Design cloud এ render করে। H3 এর একটা model ই 21GB। 12GB card এ চালাতে হলে mode switch করে lazy loading করতে হয়।
          </li>
          <li>
            3D Director Stage: Minimax এর মতো 3D workspace এ camera trajectory আঁকা ComfyUI তে এখনো নাই। তোমাকে ControlNet + camera LoRA
            দিয়ে manually করতে হবে।
          </li>
          <li>
            Skill Reuse: Minimax এ "ad template" save করে reuse করা এক ক্লিকে হয়। ComfyUI তে workflow JSON save করে reuse করতে
            হয়, অত polished না।
          </li>
        </ol>
      </article>
    </div>
  )
}
