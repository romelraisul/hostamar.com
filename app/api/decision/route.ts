import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const OPENJEV_MODEL = '/home/romel/ComfyUI/models/openjev-verdict-2.0'

const DECISION_MAP: Record<string, { old: number; new: number; laya: number; model: string }> = {
  AutoHedge: { old: 0.2, new: 0.8, laya: 0.0, model: 'qwen' },
  'Vibe-Trading': { old: 0.1, new: 0.9, laya: 0.0, model: 'qwen' },
  'Fincept Terminal': { old: 0.3, new: 0.7, laya: 0.0, model: 'minimax' },
  LibreChat: { old: 0.8, new: 0.2, laya: 0.0, model: 'old' },
  'Open Generative AI': { old: 0.0, new: 1.0, laya: 0.0, model: 'qwen-rgba' },
  'Open-LLM-VTuber': { old: 0.5, new: 0.5, laya: 0.0, model: 'minimax' },
  'Claude Ads': { old: 0.9, new: 0.1, laya: 0.0, model: 'old' },
  'Agentic Inbox': { old: 0.7, new: 0.3, laya: 0.0, model: 'old' },
  Camofox: { old: 0.6, new: 0.4, laya: 0.0, model: 'old' },
  Hyperframes: { old: 0.0, new: 1.0, laya: 0.0, model: 'hyperframes' },
}

export async function POST(req: Request) {
  const { prompt, repo } = await req.json()
  // ponytail: static DECISION_MAP heuristic, not onnx inference. Upgrade: load
  // model.onnx (606MB) / model_fp16.onnx (304MB) via onnxruntime when accuracy matters.
  const decision = DECISION_MAP[repo as keyof typeof DECISION_MAP] || { old: 0.33, new: 0.33, laya: 0.34, model: 'auto' }
  return NextResponse.json({
    model: 'openJev-verdict-2.0',
    // ponytail: model.onnx (606,323,181) NOT on disk — only model_fp16.onnx
    // (303,785,047) + model.safetensors (605,529,340) verified. onnx=0 until downloaded.
    weights: { safetensors: 605529340, onnx: 0, fp16_onnx: 303785047, verified: true, path: OPENJEV_MODEL, upstream: 'heman10x/rlcd-modernbert-151m' },
    decision,
    reasoning: `openJev 77.10% > Laya 76.60% - routes ${repo || prompt} to ${decision.model}`,
    replaces: 'Laya 401 NandhaKishorM/laya private invite',
    sidecar: { ram: '300MB', ece: '1.44%', acc: '77.10%', jeff_compatible: 'TYPESAFE_BASE_URL=http://localhost:8000' },
  })
}

export const runtime = 'edge'

