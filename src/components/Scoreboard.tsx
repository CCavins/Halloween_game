import { useLayoutEffect, useRef } from 'react'
import { sortedTeams } from '../engine/logic'
import type { Team } from '../engine/types'

export function Scoreboard({
  teams,
  title,
  reducedMotion,
  winners,
}: {
  teams: Team[]
  title: string
  reducedMotion: boolean
  winners?: string[]
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

  return (
    <section className="scoreboard" aria-label="Scores">
      <p className="eyebrow">Scores</p>
      <h2>{title}</h2>
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
            <span className="rank">{index + 1}</span>
            <span className="team-icon" aria-hidden="true">{team.icon}</span>
            <span className="team-name">{team.name}</span>
            <span className="bar" style={{ width: `${top > 0 ? Math.max(8, (team.score / top) * 100) : 8}%` }} />
            <strong>{team.score}</strong>
          </li>
        ))}
      </ol>
      {winners && winners.length > 0 && <p className="winner-line">Leading: {winners.join(', ')}</p>}
    </section>
  )
}

export function ScoreStrip({ teams, activeId }: { teams: Team[]; activeId: string | null }) {
  const ranked = sortedTeams(teams)
  return (
    <div className="score-strip" aria-label="Current scores">
      {ranked.map((team, index) => (
        <span key={team.id} className={team.id === activeId ? 'active' : ''} style={{ ['--team' as string]: team.color }}>
          {index + 1}. {team.icon} {team.name} <strong>{team.score}</strong>
        </span>
      ))}
    </div>
  )
}
