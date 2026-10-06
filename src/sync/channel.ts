import type { PublicState } from '../engine/types'

export const CHANNEL_NAME = 'spooknight-v1'
const PUBLIC_KEY = 'spooknight-public'

type Listener = (state: PublicState) => void
type PreloadListener = (urls: string[]) => void

let channel: BroadcastChannel | null = null
const listeners = new Set<Listener>()
const preloadListeners = new Set<PreloadListener>()
let latest: PublicState | null = null
let displaySeenAt = 0

export function noteDisplayAlive() {
  displaySeenAt = Date.now()
}

export function displayLastSeen() {
  return displaySeenAt
}

function ensureChannel() {
  if (channel || typeof BroadcastChannel === 'undefined') return channel
  channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (event: MessageEvent<{ type: string; state?: PublicState; urls?: string[] }>) => {
    if (event.data?.type === 'snapshot' && event.data.state) deliver(event.data.state)
    if (event.data?.type === 'preload' && event.data.urls) preloadListeners.forEach((listener) => listener(event.data.urls!))
  }
  return channel
}

function deliver(state: PublicState) {
  if (latest && state.revision < latest.revision) return
  latest = state
  listeners.forEach((listener) => listener(state))
}

export function readCachedPublic(): PublicState | null {
  try {
    const raw = localStorage.getItem(PUBLIC_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PublicState
  } catch {
    return null
  }
}

export function publishPreload(urls: string[]) {
  ensureChannel()?.postMessage({ type: 'preload', urls })
}

export function subscribePreload(listener: PreloadListener) {
  preloadListeners.add(listener)
  return () => preloadListeners.delete(listener)
}

export function publishPublic(state: PublicState) {
  latest = state
  try {
    localStorage.setItem(PUBLIC_KEY, JSON.stringify(state))
  } catch {
    /* quota */
  }
  ensureChannel()?.postMessage({ type: 'snapshot', state })
}

export function requestSnapshot() {
  ensureChannel()?.postMessage({ type: 'request-snapshot' })
}

export function pingDisplay() {
  ensureChannel()?.postMessage({ type: 'display-alive' })
}

export function subscribePublic(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getLatestPublic() {
  return latest
}

export function listenForDisplay(onRequest: () => void, onAlive: () => void) {
  const bus = ensureChannel()
  if (!bus) return () => undefined
  const previous = bus.onmessage
  bus.onmessage = (event: MessageEvent<{ type: string; state?: PublicState }>) => {
    if (event.data?.type === 'request-snapshot') onRequest()
    else if (event.data?.type === 'display-alive') onAlive()
    else previous?.call(bus, event)
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === PUBLIC_KEY && event.newValue) {
      try {
        deliver(JSON.parse(event.newValue) as PublicState)
      } catch {
        /* ignore */
      }
    }
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}

export function listenForHostSnapshots() {
  ensureChannel()
  const onStorage = (event: StorageEvent) => {
    if (event.key === PUBLIC_KEY && event.newValue) {
      try {
        deliver(JSON.parse(event.newValue) as PublicState)
      } catch {
        /* ignore */
      }
    }
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}
