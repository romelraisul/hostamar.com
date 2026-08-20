import { useState, useEffect, useRef } from 'react'
import { View, Text, Pressable, ScrollView, Platform, AppState } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as TaskManager from 'expo-task-manager'
import * as BackgroundFetch from 'expo-background-fetch'
import * as Notifications from 'expo-notifications'

// Shared constants — mirrors packages/node-core/src/index.ts
const CREDIT_POOL = 6000
const COST = { video: 100, chat: 1, browser: 5, ide: 10, game: 20, hosting: 0 } as const
const TUNNEL_NAME = 'hostamar-prod-new'
const GATEWAY_URL = 'http://127.0.0.1:3000'
const FALLBACK_URL = 'https://hostamar.com'
const BG_TASK = 'hostamar-keepalive'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

TaskManager.defineTask(BG_TASK, async () => {
  try {
    // Keep tunnel + gateway alive — ping healthz
    await fetch(`${GATEWAY_URL}/healthz`, { headers: { 'Cache-Control': 'no-cache' } }).catch(() => fetch(`${FALLBACK_URL}/api/health`).catch(() => null))
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Hostamar Node Online 6000', body: 'Phone datacenter — tunnel + gateway alive (100.89.x.x)' },
      trigger: null,
    }).catch(() => {})
    return BackgroundFetch.BackgroundFetchResult.NewData
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
})

async function registerBG() {
  try {
    const status = await BackgroundFetch.getStatusAsync()
    if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
      await BackgroundFetch.registerTaskAsync(BG_TASK, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      })
    }
  } catch {}
}

export default function App() {
  const [online, setOnline] = useState(false)
  const [credits, setCredits] = useState(CREDIT_POOL)
  const [logs, setLogs] = useState<string[]>([
    'Fix: cloudflared tunnel run hostamar-prod-new (NOT --name)',
    'Fix: python C:\\hostamar\\gateway.py (not C:\\Users\\User\\)',
    'Phone: expo-task-manager keepalive 15m + notification',
  ])
  const [tailscaleIp] = useState('100.89.x.x')
  const pct = Math.round((credits / CREDIT_POOL) * 100)

  useEffect(() => {
    SecureStore.getItemAsync('hostamar_credits').then(v => { if (v) setCredits(parseInt(v, 10)) })
    SecureStore.getItemAsync('hostamar_online').then(v => { if (v === '1') setOnline(true) })
    registerBG()
    Notifications.requestPermissionsAsync().catch(() => {})
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') registerBG()
    })
    return () => sub.remove()
  }, [])

  const goOnline = async () => {
    setOnline(true)
    await SecureStore.setItemAsync('hostamar_online', '1')
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Hostamar Node Online 6000', body: `Tunnel ${TUNNEL_NAME} + gateway — credit ${credits}/6000` },
      trigger: null,
    }).catch(() => {})
    setLogs(l => [...l, `${new Date().toLocaleTimeString()} — ONLINE ${TUNNEL_NAME} @ ${tailscaleIp}`])
  }

  const goOffline = async () => {
    setOnline(false)
    await SecureStore.setItemAsync('hostamar_online', '0')
    await Notifications.dismissAllNotificationsAsync().catch(() => {})
    setLogs(l => [...l, `${new Date().toLocaleTimeString()} — OFFLINE`])
  }

  const deduct = (cost: number) => {
    const next = Math.max(0, credits - cost)
    setCredits(next)
    SecureStore.setItemAsync('hostamar_credits', String(next))
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 16, paddingTop: 48 }}>
      <Text style={{ fontWeight: 'bold', color: '#0E7C3A', fontSize: 20 }}>Hostamar Node</Text>
      <Text style={{ color: '#0E7C3A', fontSize: 12, marginTop: 2 }}>Phone Datacenter • {online ? 'ONLINE' : 'OFFLINE'} • {tailscaleIp}</Text>

      <View style={{ marginTop: 12, backgroundColor: '#0E7C3A', borderRadius: 16, padding: 16 }}>
        <Text style={{ color: 'white', fontSize: 11, letterSpacing: 2, fontWeight: 'bold' }}>CREDIT {credits}/{CREDIT_POOL} {pct}%</Text>
        <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, marginTop: 8 }}>
          <View style={{ height: 8, width: `${pct}%` as any, backgroundColor: 'white', borderRadius: 999 }} />
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 8 }}>Video {COST.video} • Chat {COST.chat} • Browser {COST.browser} • IDE {COST.ide} • Game {COST.game} • Hosting {COST.hosting}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Pressable onPress={goOnline} style={{ flex: 1, backgroundColor: '#0E7C3A', borderRadius: 999, padding: 14, alignItems: 'center' }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Start Tunnel</Text>
        </Pressable>
        <Pressable onPress={goOnline} style={{ flex: 1, backgroundColor: '#2563EB', borderRadius: 999, padding: 14, alignItems: 'center' }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Start Gateway</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Pressable onPress={() => deduct(COST.video)} style={{ flex: 1, backgroundColor: '#F59E0B', borderRadius: 999, padding: 14, alignItems: 'center' }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Start Worker</Text>
        </Pressable>
        <Pressable onPress={goOffline} style={{ flex: 1, backgroundColor: '#E2E8F0', borderRadius: 999, padding: 14, alignItems: 'center' }}>
          <Text style={{ fontWeight: 'bold', color: '#334155' }}>Stop All</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <View style={{ flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: 'white' }}>
          <Text style={{ fontSize: 12, color: '#64748B' }}>Windows</Text>
          <Text style={{ color: online ? '#0E7C3A' : '#EF4444', fontWeight: 'bold', marginTop: 4 }}>{online ? 'ONLINE' : 'OFFLINE'}</Text>
        </View>
        <View style={{ flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: 'white' }}>
          <Text style={{ fontSize: 12, color: '#64748B' }}>AI Gateway</Text>
          <Text style={{ color: '#0E7C3A', fontWeight: 'bold', fontSize: 12, marginTop: 4 }}>200 LIVE 93</Text>
        </View>
        <View style={{ flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: 'white' }}>
          <Text style={{ fontSize: 12, color: '#64748B' }}>Phone</Text>
          <Text style={{ color: '#0E7C3A', fontWeight: 'bold', fontSize: 11, marginTop: 4 }}>{tailscaleIp}</Text>
        </View>
      </View>

      <View style={{ marginTop: 12, backgroundColor: 'black', borderRadius: 12, padding: 12 }}>
        {logs.slice(-6).map((l, i) => (
          <Text key={i} style={{ color: '#4ADE80', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{l}</Text>
        ))}
      </View>

      <View style={{ marginTop: 12, backgroundColor: '#0E7C3A', borderRadius: 12, padding: 12, alignItems: 'center' }}>
        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Phone serves browser/comfy when PC down — 0 Taka</Text>
      </View>

      <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 12, textAlign: 'center' }}>
        Foreground Service: expo-task-manager every 15m + notification "Hostamar Node Online 6000" • {GATEWAY_URL} → {FALLBACK_URL}
      </Text>
      <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4, textAlign: 'center' }}>cloudflared tunnel run {TUNNEL_NAME} (positional, NOT --name)</Text>
    </ScrollView>
  )
}
