import { useEffect, useRef } from 'react'
import { playFile, playMotif, playSfx, setAudioVolumes, startAmbience, stopAmbience, type SfxName } from './engine'
import type { Celebration, MediaCue, TimerState } from '../engine/types'
import { timerRemaining } from '../engine/logic'
import { blobUrlFor } from '../media/library'
import { displayLastSeen } from '../sync/channel'

export function usePlayback(
  role: 'host' | 'display',
  room: {
    volumes: { music: number; sfx: number; media: number }
    ambienceOn: boolean
    mediaCue: MediaCue | null
    celebration: Celebration | null
    timer: TimerState
  } | null,
) {
  const cueId = useRef(0)
  const celebrationId = useRef(0)
  const lastTick = useRef<number | null>(null)

  const audible = () => (role === 'display' ? true : Date.now() - displayLastSeen() > 4000)

  useEffect(() => {
    if (!room) return
    setAudioVolumes(room.volumes)
    const sync = () => {
      const seen = displayLastSeen()
      const hostFallback = role === 'host' && (seen === 0 ? performance.now() > 3000 : Date.now() - seen > 4000)
      const mine = role === 'display' || hostFallback
      if (room.ambienceOn && mine) void startAmbience()
      else if (role === 'host' || !room.ambienceOn) stopAmbience()
    }
    sync()
    const id = window.setInterval(sync, 1500)
    return () => window.clearInterval(id)
  }, [room, role])

  useEffect(() => {
    if (!room?.mediaCue || !audible()) return
    if (room.mediaCue.id === cueId.current) return
    if (Date.now() - room.mediaCue.at > 4000) return
    cueId.current = room.mediaCue.id
    const cue = room.mediaCue
    if (cue.mediaId.startsWith('motif:')) {
      void playMotif(cue.mediaId.slice('motif:'.length), cue.start, cue.end)
      return
    }
    if (cue.mediaId.startsWith('story:')) return
    const url = blobUrlFor(cue.mediaId) || (cue.url && !cue.url.startsWith('blob:') ? cue.url : '')
    if (url) void playFile(url, cue.start, cue.end)
  }, [room?.mediaCue?.id])

  useEffect(() => {
    if (!room?.celebration || !audible()) return
    if (room.celebration.id === celebrationId.current) return
    if (Date.now() - room.celebration.at > 4000) return
    celebrationId.current = room.celebration.id
    const name: SfxName = room.celebration.points >= 0 ? 'correct' : 'wrong'
    void playSfx(name)
    void playSfx('score')
  }, [room?.celebration?.id])

  useEffect(() => {
    if (!room?.timer.running || !room.timer.tickSound || !audible()) return
    const id = window.setInterval(() => {
      const left = Math.ceil(timerRemaining(room.timer) / 1000)
      if (left <= 5 && left > 0 && left !== lastTick.current) {
        lastTick.current = left
        void playSfx(left === 1 ? 'timer-end' : 'tick')
      }
    }, 200)
    return () => window.clearInterval(id)
  }, [room?.timer.running, room?.timer.startedAt, room?.timer.tickSound])
}
