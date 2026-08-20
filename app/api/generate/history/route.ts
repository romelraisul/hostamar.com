import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* Public generate history — last 10 mock jobs.
   Client fallback reads from localStorage (see localStorageKey hint).
   Server holds an in-memory array so the route is useful without a DB.
   Brand: #2563EB
*/

const localStorageKey = "hostamar_generate_history";

type Job = {
  id: string;
  prompt: string;
  status: "completed" | "queued" | "processing" | "failed";
  model: string;
  createdAt: string;
  imageUrl?: string;
  thumbUrl?: string;
  brand: string;
};

const MOCK_JOBS: Job[] = [
  {
    id: "job_10",
    prompt: "Cyberpunk Dhaka rickshaw, neon rain, ultra detailed",
    status: "completed",
    model: "flux-1-dev",
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    imageUrl: "https://picsum.photos/seed/hostamar10/768/768",
    thumbUrl: "https://picsum.photos/seed/hostamar10/256/256",
    brand: "#2563EB",
  },
  {
    id: "job_9",
    prompt: "Sundarbans at golden hour, cinematic, 8k",
    status: "completed",
    model: "flux-1-dev",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    imageUrl: "https://picsum.photos/seed/hostamar9/768/768",
    thumbUrl: "https://picsum.photos/seed/hostamar9/256/256",
    brand: "#2563EB",
  },
  {
    id: "job_8",
    prompt: "Minimalist logo for Hostamar, blue #2563EB, vector",
    status: "completed",
    model: "flux-1-schnell",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    imageUrl: "https://picsum.photos/seed/hostamar8/768/768",
    thumbUrl: "https://picsum.photos/seed/hostamar8/256/256",
    brand: "#2563EB",
  },
  {
    id: "job_7",
    prompt: "Cox's Bazar beach aerial, turquoise water, drone shot",
    status: "completed",
    model: "flux-1-dev",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    imageUrl: "https://picsum.photos/seed/hostamar7/768/768",
    thumbUrl: "https://picsum.photos/seed/hostamar7/256/256",
    brand: "#2563EB",
  },
  {
    id: "job_6",
    prompt: "Bangladeshi bride, red saree, studio portrait, soft light",
    status: "completed",
    model: "flux-1-dev",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
    imageUrl: "https://picsum.photos/seed/hostamar6/768/768",
    thumbUrl: "https://picsum.photos/seed/hostamar6/256/256",
    brand: "#2563EB",
  },
  {
    id: "job_5",
    prompt: "Paharpur Buddhist monastery, ancient ruins, misty morning",
    status: "completed",
    model: "flux-1-schnell",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    imageUrl: "https://picsum.photos/seed/hostamar5/768/768",
    thumbUrl: "https://picsum.photos/seed/hostamar5/256/256",
    brand: "#2563EB",
  },
  {
    id: "job_4",
    prompt: "Futuristic Dhaka skyline 2050, flying vehicles, BDIX datacenter",
    status: "completed",
    model: "flux-1-dev",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    imageUrl: "https://picsum.photos/seed/hostamar4/768/768",
    thumbUrl: "https://picsum.photos/seed/hostamar4/256/256",
    brand: "#2563EB",
  },
  {
    id: "job_3",
    prompt: "Tea garden Srimangal, rolling hills, morning fog",
    status: "completed",
    model: "flux-1-dev",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
    imageUrl: "https://picsum.photos/seed/hostamar3/768/768",
    thumbUrl: "https://picsum.photos/seed/hostamar3/256/256",
    brand: "#2563EB",
  },
  {
    id: "job_2",
    prompt: "Bengali calligraphy 'Hostamar' neon sign, dark wall",
    status: "completed",
    model: "flux-1-schnell",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
    imageUrl: "https://picsum.photos/seed/hostamar2/768/768",
    thumbUrl: "https://picsum.photos/seed/hostamar2/256/256",
    brand: "#2563EB",
  },
  {
    id: "job_1",
    prompt: "Isometric BDIX data center, blue #2563EB accent, 3D render",
    status: "completed",
    model: "flux-1-dev",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    imageUrl: "https://picsum.photos/seed/hostamar1/768/768",
    thumbUrl: "https://picsum.photos/seed/hostamar1/256/256",
    brand: "#2563EB",
  },
];

// also exposed as mutable in-memory store so POST /api/generate could push (if added)
const jobsStore: Job[] = [...MOCK_JOBS];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitRaw = searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitRaw || "10", 10) || 10, 1), 50);

  const jobs = jobsStore.slice(0, limit);

  return NextResponse.json(
    {
      jobs,
      total: jobsStore.length,
      limit,
      localStorageKey,
      localStorageFallback:
        "Client can persist history at localStorage.getItem('hostamar_generate_history') — server returns mock when empty.",
      brand: "#2563EB",
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
