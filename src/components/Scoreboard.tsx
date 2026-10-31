import { useLayoutEffect, useRef } from 'react'
import { sortedTeams } from '../engine/logic'
import type { Team } from '../engine/types'

export function Scoreboard({
  teams,
  title,
  reducedMotion,
  winners,
  variant = 'default',
}: {
  teams: Team[]
  title: string
  reducedMotion: boolean
  winners?: string[]
  /** Full-screen TV overlay when the host taps Show scores */
  variant?: 'default' | 'overlay'
}) {
  const ranked = sortedTeams(teams)
  const top = ranked[0]?.score ?? 0
  const refs = useRef(new Map<string, HTMLLIElement>())
  const previous = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    ranked.forEach((team, index) => {
      const element = refs.current.get(team.id)
      const from = previous.current.get(team.id)
      if (element && from !== undefined && from !== index && !reducedMotion) {
        const shift = (from - index) * element.offsetHeight
        element.animate(
          [{ transform: `translateY(${shift}px)` }, { transform: 'translateY(0)' }],
          { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' },
        )
      }
      previous.current.set(team.id, index)
    })
  }, [ranked, reducedMotion])

  const overlay = variant === 'overlay'

  return (
    <section className={`scoreboard${overlay ? ' overlay' : ''}`} aria-label="Scores">
      {overlay ? (
        <header className="scoreboard-header">
          <h2>Scores</h2>
          {title ? <p className="scoreboard-context">{title}</p> : null}
        </header>
      ) : (
        <>
          <p className="eyebrow">Scores</p>
          <h2>{title}</h2>
        </>
      )}
      <ol>
        {ranked.map((team, index) => (
          <li
            key={team.id}
            ref={(node) => {
              if (node) refs.current.set(team.id, node)
              else refs.current.delete(team.id)
            }}
            style={{ ['--team' as string]: team.color }}
          >
            <span className="bar" style={{ width: `${top > 0 ? Math.max(12, (team.score / top) * 100) : 12}%` }} />
            <span className="rank">{index + 1}</span>
            <span className="team-icon" aria-hidden="true">{team.icon}</span>
            <span className="team-name">{team.name}</span>
            <strong className="team-score">{team.score}</strong>
          </li>
        ))}
      </ol>
      {winners && winners.length > 0 && <p className="winner-line">Leading: {winners.join(', ')}</p>}
    </section>
  )
}

export function ScoreStrip({ teams, activeId }: { teams: Team[]; activeId: string | null }) {
  return (
    <div className="score-strip" aria-label="Current scores">
      {teams.map((team, index) => (
        <span key={team.id} className={team.id === activeId ? 'active' : ''} style={{ ['--team' as string]: team.color }}>
          <em>{index + 1}</em>
          <span className="strip-icon" aria-hidden="true">{team.icon}</span>
          <span className="strip-name">{team.name}</span>
          <strong>{team.score}</strong>
        </span>
      ))}
    </div>
  )
}
