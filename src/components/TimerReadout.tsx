import { timerRemaining } from '../engine/logic'
import type { TimerState } from '../engine/types'

export function TimerReadout({ timer, now }: { timer: TimerState; now: number }) {
  const seconds = Math.ceil(timerRemaining(timer, now) / 1000)
  const urgent = seconds <= 5 && (timer.running || seconds === 0)
  return (
    <div className={`timer ${timer.style} ${urgent ? 'urgent' : ''}`} role="timer" aria-live="polite">
      <span>{String(seconds).padStart(2, '0')}</span>
      <small>sec</small>
    </div>
  )
}
