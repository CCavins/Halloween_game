export type SfxName =
  | 'correct'
  | 'wrong'
  | 'reveal'
  | 'tick'
  | 'timer-end'
  | 'steal'
  | 'score'
  | 'win'
  | 'intro'
  | 'thunder'

type Motif = {
  description: string
  duration: number
  play: (ctx: AudioContext, destination: GainNode, from: number, to: number) => void
}

let context: AudioContext | null = null
let musicGain: GainNode | null = null
let sfxGain: GainNode | null = null
let mediaGain: GainNode | null = null
let ambienceNodes: AudioNode[] = []
let ambienceTimer = 0
const volumes = { music: 0.35, sfx: 0.8, media: 0.9 }

function ctx(): AudioContext {
  if (!context) {
    context = new AudioContext()
    musicGain = context.createGain()
    sfxGain = context.createGain()
    mediaGain = context.createGain()
    musicGain.connect(context.destination)
    sfxGain.connect(context.destination)
    mediaGain.connect(context.destination)
    applyVolumes()
  }
  return context
}

function applyVolumes() {
  if (!musicGain || !sfxGain || !mediaGain || !context) return
  musicGain.gain.value = volumes.music
  sfxGain.gain.value = volumes.sfx
  mediaGain.gain.value = volumes.media
}

export function setAudioVolumes(next: { music: number; sfx: number; media: number }) {
  volumes.music = next.music
  volumes.sfx = next.sfx
  volumes.media = next.media
  applyVolumes()
}

async function resume() {
  const audio = ctx()
  if (audio.state === 'suspended') await audio.resume()
}

function envGain(audio: AudioContext, destination: AudioNode, at: number, attack: number, duration: number, peak = 0.8) {
  const gain = audio.createGain()
  gain.connect(destination)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(peak, at + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  return gain
}

function tone(
  audio: AudioContext,
  destination: AudioNode,
  frequency: number,
  at: number,
  duration: number,
  type: OscillatorType = 'sine',
  peak = 0.4,
) {
  const oscillator = audio.createOscillator()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, at)
  const gain = envGain(audio, destination, at, 0.02, duration, peak)
  oscillator.connect(gain)
  oscillator.start(at)
  oscillator.stop(at + duration + 0.05)
}

function noiseBuffer(audio: AudioContext, seconds: number) {
  const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * seconds), audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

function playNoise(
  audio: AudioContext,
  destination: AudioNode,
  at: number,
  duration: number,
  filterFreq: number,
  peak = 0.5,
  type: BiquadFilterType = 'lowpass',
) {
  const source = audio.createBufferSource()
  source.buffer = noiseBuffer(audio, duration + 0.1)
  const filter = audio.createBiquadFilter()
  filter.type = type
  filter.frequency.setValueAtTime(filterFreq, at)
  const gain = envGain(audio, destination, at, 0.01, duration, peak)
  source.connect(filter)
  filter.connect(gain)
  source.start(at)
  source.stop(at + duration)
  return { source, filter }
}

export async function playSfx(name: SfxName) {
  await resume()
  const audio = ctx()
  const destination = sfxGain!
  const now = audio.currentTime + 0.02
  if (name === 'correct') {
    tone(audio, destination, 392, now, 0.12, 'triangle', 0.35)
    tone(audio, destination, 523.25, now + 0.1, 0.14, 'triangle', 0.4)
    tone(audio, destination, 659.25, now + 0.22, 0.28, 'triangle', 0.45)
  } else if (name === 'wrong') {
    tone(audio, destination, 196, now, 0.22, 'sawtooth', 0.18)
    tone(audio, destination, 155, now + 0.16, 0.32, 'square', 0.12)
  } else if (name === 'reveal') {
    playNoise(audio, destination, now, 0.45, 1800, 0.2, 'bandpass')
    tone(audio, destination, 220, now, 0.35, 'sine', 0.2)
  } else if (name === 'tick') {
    tone(audio, destination, 880, now, 0.05, 'square', 0.15)
  } else if (name === 'timer-end') {
    tone(audio, destination, 140, now, 0.4, 'sawtooth', 0.25)
    tone(audio, destination, 90, now + 0.18, 0.5, 'square', 0.18)
  } else if (name === 'steal') {
    tone(audio, destination, 311, now, 0.1, 'square', 0.2)
    tone(audio, destination, 466, now + 0.1, 0.18, 'square', 0.22)
  } else if (name === 'score') {
    tone(audio, destination, 523, now, 0.08, 'sine', 0.3)
    tone(audio, destination, 784, now + 0.08, 0.16, 'sine', 0.28)
  } else if (name === 'win') {
    ;[392, 523, 659, 784, 1046].forEach((frequency, index) => {
      tone(audio, destination, frequency, now + index * 0.12, 0.28, 'triangle', 0.35)
    })
  } else if (name === 'intro') {
    tone(audio, destination, 146, now, 0.6, 'sine', 0.25)
    tone(audio, destination, 220, now + 0.25, 0.7, 'triangle', 0.2)
  } else if (name === 'thunder') {
    playMotif('thunder', 0, 2)
  }
}

let ambienceActive = false

export function stopAmbience() {
  ambienceActive = false
  window.clearInterval(ambienceTimer)
  ambienceNodes.forEach((node) => {
    try {
      node.disconnect()
    } catch {
      /* already stopped */
    }
  })
  ambienceNodes = []
}

export async function startAmbience() {
  if (ambienceActive) return
  ambienceActive = true
  await resume()
  const audio = ctx()
  const destination = musicGain!
  const drone = audio.createOscillator()
  drone.type = 'sine'
  drone.frequency.value = 55
  const droneGain = audio.createGain()
  droneGain.gain.value = 0.18
  const filter = audio.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 240
  drone.connect(filter)
  filter.connect(droneGain)
  droneGain.connect(destination)
  drone.start()
  const wind = audio.createBufferSource()
  wind.buffer = noiseBuffer(audio, 4)
  wind.loop = true
  const windFilter = audio.createBiquadFilter()
  windFilter.type = 'bandpass'
  windFilter.frequency.value = 500
  windFilter.Q.value = 0.4
  const windGain = audio.createGain()
  windGain.gain.value = 0.04
  wind.connect(windFilter)
  windFilter.connect(windGain)
  windGain.connect(destination)
  wind.start()
  ambienceNodes = [drone, droneGain, filter, wind, windFilter, windGain]
  ambienceTimer = window.setInterval(() => {
    if (!context || !musicGain) return
    const burst = context.currentTime
    if (Math.random() < 0.35) {
      playNoise(context, musicGain, burst, 0.8 + Math.random(), 300 + Math.random() * 400, 0.08)
    }
  }, 7000)
}

function scheduleSlice(from: number, to: number, duration: number, playAt: (start: number, end: number) => void) {
  const start = Math.max(0, Math.min(from, duration))
  const end = Math.max(start, Math.min(to, duration))
  playAt(start, end)
}

export const MOTIFS: Record<string, Motif> = {
  howl: {
    description: 'Synthesized wolf howl. Original sound design, not a recording from a film.',
    duration: 2.4,
    play: (audio, destination, from, to) => {
      scheduleSlice(from, to, 2.4, (start, end) => {
        const oscillator = audio.createOscillator()
        oscillator.type = 'sawtooth'
        const now = audio.currentTime + 0.02
        oscillator.frequency.setValueAtTime(320 - start * 40, now)
        oscillator.frequency.linearRampToValueAtTime(640, now + Math.max(0.2, (end - start) * 0.6))
        oscillator.frequency.linearRampToValueAtTime(220, now + (end - start))
        const filter = audio.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.value = 900
        const gain = envGain(audio, destination, now, 0.08, Math.max(0.2, end - start), 0.35)
        oscillator.connect(filter)
        filter.connect(gain)
        oscillator.start(now)
        oscillator.stop(now + (end - start) + 0.05)
      })
    },
  },
  creak: {
    description: 'Synthesized wooden door creak.',
    duration: 1.8,
    play: (audio, destination, from, to) => {
      scheduleSlice(from, to, 1.8, (start, end) => {
        const now = audio.currentTime + 0.02
        const oscillator = audio.createOscillator()
        oscillator.type = 'triangle'
        oscillator.frequency.setValueAtTime(180 + start * 20, now)
        oscillator.frequency.linearRampToValueAtTime(90, now + (end - start))
        const gain = envGain(audio, destination, now, 0.05, Math.max(0.15, end - start), 0.3)
        oscillator.connect(gain)
        oscillator.start(now)
        oscillator.stop(now + (end - start))
      })
    },
  },
  thunder: {
    description: 'Synthesized thunder rumble.',
    duration: 2.2,
    play: (audio, destination, from, to) => {
      const now = audio.currentTime + 0.02
      const length = Math.max(0.2, Math.min(to, 2.2) - Math.max(0, from))
      playNoise(audio, destination, now, length, 180, 0.55, 'lowpass')
    },
  },
  cauldron: {
    description: 'Synthesized bubbling cauldron.',
    duration: 2.5,
    play: (audio, destination, from, to) => {
      const now = audio.currentTime + 0.02
      const length = Math.max(0.2, Math.min(to, 2.5) - from)
      for (let i = 0; i < 6; i++) {
        const at = now + (i / 6) * length
        tone(audio, destination, 140 + i * 30, at, 0.12, 'sine', 0.15)
      }
      playNoise(audio, destination, now, length, 700, 0.12, 'bandpass')
    },
  },
  wrapper: {
    description: 'Synthesized candy-wrapper crinkle.',
    duration: 1.4,
    play: (audio, destination, from, to) => {
      const now = audio.currentTime + 0.02
      const length = Math.max(0.15, Math.min(to, 1.4) - from)
      playNoise(audio, destination, now, length, 2500, 0.25, 'highpass')
    },
  },
  porchlight: {
    description: 'Original four-bar motif “Porchlight Procession,” written for Spooknight. Not a commercial song.',
    duration: 4,
    play: (audio, destination, from, to) => {
      const notes = [196, 233.08, 261.63, 311.13, 392, 311.13, 261.63, 233.08]
      const now = audio.currentTime + 0.02
      notes.forEach((frequency, index) => {
        const at = index * 0.5
        if (at + 0.45 < from || at > to) return
        tone(audio, destination, frequency, now + Math.max(0, at - from), 0.42, 'triangle', 0.28)
      })
    },
  },
  mice: {
    description: 'Original melody for the demo song “Porchlight, Porchlight.”',
    duration: 4,
    play: (audio, destination, from, to) => {
      const notes = [329.63, 349.23, 392, 349.23, 329.63, 293.66, 261.63, 293.66]
      const now = audio.currentTime + 0.02
      notes.forEach((frequency, index) => {
        const at = index * 0.5
        if (at + 0.45 < from || at > to) return
        tone(audio, destination, frequency, now + Math.max(0, at - from), 0.4, 'sine', 0.26)
      })
    },
  },
}

export async function playMotif(id: string, start: number, end: number) {
  await resume()
  const motif = MOTIFS[id]
  if (!motif || !mediaGain) return
  motif.play(ctx(), mediaGain, start, end)
}

export async function playFile(url: string, start: number, end: number) {
  await resume()
  const audio = ctx()
  const response = await fetch(url)
  const buffer = await audio.decodeAudioData(await response.arrayBuffer())
  const source = audio.createBufferSource()
  source.buffer = buffer
  source.connect(mediaGain!)
  const offset = Math.max(0, start)
  const duration = Math.max(0.1, Math.min(end, buffer.duration) - offset)
  source.start(audio.currentTime + 0.02, offset, duration)
}

export function motifDescription(mediaId: string): string | undefined {
  if (!mediaId.startsWith('motif:')) return undefined
  return MOTIFS[mediaId.slice(6)]?.description
}
