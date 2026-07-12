'use client'
// ============================================================================
// VoiceAgentClient — browser-side WebRTC client for the Voice Agent (7th
// product). Used by /chat (voice mode) and /video (Preview with Voice).
//
// Safety boundary (article layer 3/6): the AGENT only SUGGESTS; the APP
// EXECUTES via allowlisted `client_action` messages over the LiveKit data
// channel. Nothing the agent says can reach an un-allowlisted side effect.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  ConnectionState,
} from 'livekit-client'

const ALLOWED_ACTIONS = new Set([
  'open_url',
  'request_confirm',
  'create_video',
  'publish_to_hosting',
  'show_bkash_checkout',
])
const ALLOWED_HOSTS = new Set(['hostamar.com', 'api.hostamar.com'])
const EXECUTED_IDS = new Set<string>() // idempotency for client actions
const RECONNECT_BACKOFF = [250, 500, 1000, 2000]

export interface VoiceAgentClientProps {
  /** product context this client is embedded in: 'chat' | 'video' */
  mode?: 'chat' | 'video'
  className?: string
}

type Phase = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'

export default function VoiceAgentClient({ mode = 'chat', className = '' }: VoiceAgentClientProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [statusLine, setStatusLine] = useState<string>('প্রস্তুত')
  const roomRef = useRef<Room | null>(null)
  const audioEls = useRef<HTMLAudioElement[]>([])
  const reconnectAttempt = useRef(0)
  const callStart = useRef<number>(0)
  const MAX_CALL_MS = 10 * 60 * 1000 // 10-min cap (cost control)

  const setState = (s: string) => setStatusLine(s) // listening/thinking/speaking/ended

  const detachAllAudio = useCallback(() => {
    audioEls.current.forEach((el) => {
      try {
        el.pause()
        el.srcObject = null
        el.remove()
      } catch {}
    })
    audioEls.current = []
  }, [])

  const attachAudio = useCallback((track: RemoteTrack) => {
    const el = document.createElement('audio')
    el.autoplay = true
    el.style.display = 'none'
    document.body.appendChild(el)
    track.attach(el)
    audioEls.current.push(el)
    // autoplay fallback
    el.play().catch(() => {
      const resume = () => el.play().catch(() => {})
      window.addEventListener('click', resume, { once: true })
    })
  }, [])

  const handleClientAction = useCallback(async (action: any) => {
    const { id, action: type, payload } = action
    if (!id || typeof id !== 'string' || !type || !ALLOWED_ACTIONS.has(type)) return
    if (EXECUTED_IDS.has(id)) return // idempotent
    EXECUTED_IDS.add(id)

    try {
      switch (type) {
        case 'open_url': {
          const url = new URL(String(payload?.url || ''))
          if (!ALLOWED_HOSTS.has(url.hostname)) return
          window.open(url.toString(), '_blank', 'noopener,noreferrer')
          break
        }
        case 'create_video': {
          // Reuse shared subscription check (server enforces); client posts the
          // agent's prompt to the existing video generator.
          await fetch('/api/tools/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: 'create_video', payload: { prompt: payload?.prompt } }),
          })
          break
        }
        case 'publish_to_hosting': {
          await fetch('/api/tools/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: 'get_hosting_status' }),
          })
          break
        }
        case 'show_bkash_checkout': {
          // route to checkout — interop with the 6-product subscription
          window.open('https://hostamar.com/payment', '_blank', 'noopener,noreferrer')
          break
        }
        case 'request_confirm': {
          const ok = window.confirm(String(payload?.prompt || 'Confirm action?'))
          const room = roomRef.current
          if (room) {
            await room.localParticipant.publishData(
              new TextEncoder().encode(JSON.stringify({ type: 'user_confirmed', id, ok })),
              { reliable: true, topic: 'client_events' }
            )
          }
          break
        }
      }
    } catch (e) {
      console.warn('[voice] client_action failed', type, e)
    }
  }, [])

  const connectOnce = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/voice-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `token ${res.status}`)
      }
      const { rtc_url, token } = await res.json()
      const room = new Room({ adaptiveStream: true, dynacast: true })
      roomRef.current = room

      room.on(RoomEvent.TrackSubscribed, (_t: RemoteTrack, _p: RemoteTrackPublication, participant: any) => {
        void participant
        const track = _t as RemoteTrack
        if (track.kind === Track.Kind.Audio) {
          attachAudio(track)
          setState('speaking')
        }
      })
      room.on(RoomEvent.TrackUnsubscribed, (t: RemoteTrack) => {
        if (t.kind === Track.Kind.Audio) detachAllAudio()
      })
      room.on(RoomEvent.DataReceived, (payload: Uint8Array, _p: any, _kind?: any, topic?: string) => {
        void _p; void _kind
        if (topic && topic !== 'client_actions') return
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload))
          if (msg?.type === 'client_action') handleClientAction(msg)
        } catch {}
      })
      room.on(RoomEvent.ConnectionStateChanged, (s: ConnectionState) => {
        if (s === ConnectionState.Connected) {
          reconnectAttempt.current = 0
          setPhase('connected')
          setState('listening')
          callStart.current = Date.now()
        } else if (s === ConnectionState.Disconnected) {
          setState('ended')
          scheduleReconnect()
        } else if (s === ConnectionState.Reconnecting) {
          setPhase('reconnecting')
        }
      })

      await room.connect(rtc_url, token)
      await room.localParticipant.setMicrophoneEnabled(true) // explicit denial handled below
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: 'session.start', mode })),
        { reliable: true, topic: 'client_events' }
      )
      setState('listening')
    } catch (e: any) {
      setError(e?.message || 'connection failed')
      setPhase('error')
      scheduleReconnect()
    }
  }, [attachAudio, detachAllAudio, handleClientAction, mode])

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempt.current >= RECONNECT_BACKOFF.length) return
    const delay = RECONNECT_BACKOFF[reconnectAttempt.current++]
    setTimeout(() => connectOnce(), delay)
  }, [connectOnce])

  const disconnect = useCallback(() => {
    try {
      roomRef.current?.disconnect()
    } catch {}
    roomRef.current = null
    detachAllAudio()
    setPhase('idle')
    setState('ended')
  }, [detachAllAudio])

  // 10-min cost cap
  useEffect(() => {
    if (phase !== 'connected') return
    const t = setInterval(() => {
      if (callStart.current && Date.now() - callStart.current > MAX_CALL_MS) disconnect()
    }, 30_000)
    return () => clearInterval(t)
  }, [phase, disconnect])

  useEffect(() => () => disconnect(), [disconnect])

  const onStart = () => {
    setPhase('connecting')
    connectOnce()
  }

  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              phase === 'connected' ? 'bg-[#0E7C3A] animate-pulse' : phase === 'error' ? 'bg-[#E4312B]' : 'bg-zinc-300'
            }`}
          />
          <span className="text-[13px] font-bn text-zinc-700">
            {mode === 'video' ? 'বাংলা ভয়েসওভার' : 'ভয়েস মোড'} · {statusLine}
          </span>
        </div>
        <span className="text-[11px] text-zinc-400">{phase}</span>
      </div>

      <div className="mt-3 flex gap-2">
        {phase === 'idle' || phase === 'error' ? (
          <button
            onClick={onStart}
            className="inline-flex h-10 items-center rounded-full bg-[#0E7C3A] px-5 text-[14px] font-semibold text-white"
          >
            কল শুরু করুন
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="inline-flex h-10 items-center rounded-full border border-zinc-300 px-5 text-[14px] font-medium text-zinc-700"
          >
            কল শেষ করুন
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-[12px] text-[#E4312B]">{error}</p>}
      <p className="mt-2 text-[11px] text-zinc-400">
        এজেন্ট শুধু পরামর্শ দেয় — অ্যাপ নিরাপদ allowlist এ করে চালায়।
      </p>
    </div>
  )
}
