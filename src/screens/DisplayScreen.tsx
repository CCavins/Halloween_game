import { useEffect, useState } from 'react'
import { usePlayback } from '../audio/usePlayback'
import { playSfx } from '../audio/engine'
import { Atmosphere, Celebration } from '../components/Atmosphere'
import { Scoreboard, ScoreStrip } from '../components/Scoreboard'
import { TimerReadout } from '../components/TimerReadout'
import { StageView, useClock } from '../challenges/StageView'
import type { PublicState } from '../engine/types'
import { hydrateMediaLibrary } from '../media/library'
import { listenForHostSnapshots, pingDisplay, readCachedPublic, requestSnapshot, subscribePreload, subscribePublic } from '../sync/channel'

export function DisplayScreen() {
  const [state, setState] = useState<PublicState | null>(() => readCachedPublic())
  useEffect(() => {
    void hydrateMediaLibrary()
    const unsub = subscribePublic((next) => setState(next))
    const unstorage = listenForHostSnapshots()
    const unpreload = subscribePreload((urls) => {
      urls.forEach((url) => {
        const image = new Image()
        image.src = url
      })
    })
    requestSnapshot()
    const ping = window.setInterval(() => {
      pingDisplay()
      requestSnapshot()
    }, 2000)
    return () => {
      unsub()
      unstorage()
      unpreload()
      window.clearInterval(ping)
    }
  }, [])

  usePlayback('display', state)
  const now = useClock(Boolean(state?.timer.running))
  useEffect(() => installDisplayKeys(), [])

  useEffect(() => {
    if (!state) return
    document.documentElement.dataset.theme = state.theme
    document.documentElement.classList.toggle('reduce-motion', state.reducedMotion)
  }, [state?.theme, state?.reducedMotion])

  useEffect(() => {
    if (state?.phase === 'victory') void playSfx('win')
    if (state?.phase === 'intro') void playSfx('intro')
  }, [state?.phase])

  if (!state) {
    return (
      <main className="display waiting">
        <Atmosphere theme="cinematic" />
        <div className="waiting-card">
          <p className="eyebrow">Spooknight</p>
          <h1>The house is listening</h1>
          <p>Open the host controls on this computer. This window is the television.</p>
          <button type="button" onClick={() => document.documentElement.requestFullscreen?.()}>Fullscreen</button>
        </div>
      </main>
    )
  }

  const team = state.teams.find((item) => item.id === state.celebration?.teamId)
  const showScores = state.showScoreboard
  const winners = [...state.teams].sort((a, b) => b.score - a.score)
  const winningScore = winners[0]?.score ?? 0
  const winnerNames = winners.filter((item) => item.score === winningScore).map((item) => item.name)

  return (
    <main className={`display theme-${state.theme}`}>
      <Atmosphere theme={state.theme} />
      <button type="button" className="fullscreen-button" onClick={toggleFullscreen}>Fullscreen</button>
      {state.phase === 'lobby' && <Lobby state={state} />}
      {state.phase === 'intro' && !showScores && <Intro state={state} />}
      {state.phase === 'final-wager' && !showScores && <WagerCard state={state} />}
      {state.phase === 'final-reveal' && state.finalReveal && !showScores && <FinalCard state={state} />}
      {state.phase === 'victory' && <Victory names={winnerNames} teams={state.teams} />}
      {showScores && state.phase !== 'victory' && (
        <Scoreboard teams={state.teams} title={state.roundTitle} reducedMotion={state.reducedMotion} />
      )}
      {!showScores && (state.phase === 'question' || state.phase === 'answer' || state.phase === 'final-question') && (
        <QuestionBoard state={state} now={now} />
      )}
      {state.phase === 'round-end' && !showScores && <Intro state={state} complete />}
      {state.showScoreStrip && !showScores && state.phase !== 'victory' && state.phase !== 'lobby' && (
        <ScoreStrip teams={state.teams} activeId={state.activeTeamId} />
      )}
      {state.celebration && team && Date.now() - state.celebration.at < 2400 && (
        <Celebration name={team.name} points={state.celebration.points} color={team.color} icon={team.icon} />
      )}
    </main>
  )
}

function QuestionBoard({ state, now }: { state: PublicState; now: number }) {
  const pips = { easy: 1, medium: 2, hard: 3, expert: 4 }[state.difficulty ?? 'easy']
  return (
    <section className="question-board">
      <header className="board-top">
        <div>
          <p className="eyebrow">{state.roundTitle}</p>
          <h2>{state.category}</h2>
        </div>
        <TimerReadout timer={state.timer} now={now} />
        <div className="points-block">
          <span className="pips" aria-label={state.difficulty}>
            {Array.from({ length: 4 }, (_, index) => <i key={index} className={index < pips ? 'on' : ''} />)}
          </span>
          <strong>{state.points}</strong>
          <span>points</span>
        </div>
      </header>
      {state.questionRevealed ? <StageView state={state} /> : <SuspenseCard />}
      {state.stageCount > 1 && state.questionRevealed && (
        <p className="clue-count">Clue {Math.min(state.stageIndex + 1, state.stageCount)} of {state.stageCount}</p>
      )}
    </section>
  )
}

function SuspenseCard() {
  return (
    <div className="suspense">
      <p className="eyebrow">Listen</p>
      <h2>The next clue is in the dark</h2>
    </div>
  )
}

function Lobby({ state }: { state: PublicState }) {
  return (
    <section className="title-card">
      <p className="eyebrow">A Halloween game show</p>
      <h1>Spooknight</h1>
      <ul className="lobby-teams">
        {state.teams.map((team) => (
          <li key={team.id} style={{ ['--team' as string]: team.color }}>{team.icon} {team.name}</li>
        ))}
      </ul>
    </section>
  )
}

function Intro({ state, complete }: { state: PublicState; complete?: boolean }) {
  return (
    <section className="title-card">
      <p className="eyebrow">{complete ? 'Round complete' : 'Now entering'}</p>
      <h1>{state.roundTitle}</h1>
      {state.roundIntro && <p className="intro-copy">{state.roundIntro}</p>}
    </section>
  )
}

function WagerCard({ state }: { state: PublicState }) {
  return (
    <section className="title-card">
      <p className="eyebrow">Final round</p>
      <h1>Place your wagers</h1>
      <p className="intro-copy">{state.category}</p>
    </section>
  )
}

function FinalCard({ state }: { state: PublicState }) {
  const card = state.finalReveal
  if (!card) return null
  return (
    <section className="final-card" style={{ ['--team' as string]: card.color }}>
      <p className="eyebrow">{card.icon} {card.teamName}</p>
      <h2>{card.answer}</h2>
      <p>Wager {card.wager}</p>
      {!card.pending && <p className={`verdict ${card.correct ? 'good' : 'bad'}`}>{card.correct ? `+${card.delta}` : card.delta}</p>}
    </section>
  )
}

function Victory({ names, teams }: { names: string[]; teams: PublicState['teams'] }) {
  return (
    <section className="title-card victory">
      <p className="eyebrow">The night belongs to</p>
      <h1>{names.join(' & ') || 'Everyone'}</h1>
      <Scoreboard teams={teams} title="Final scores" reducedMotion={false} winners={names} />
    </section>
  )
}

function toggleFullscreen() {
  if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.()
  else void document.exitFullscreen?.()
}

export function installDisplayKeys() {
  const onKey = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() === 'f') {
      event.preventDefault()
      toggleFullscreen()
    }
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}
