import { useEffect, useState } from 'react'
import { usePlayback } from '../audio/usePlayback'
import { ClueImage, useClock } from '../challenges/StageView'
import { TimerReadout } from '../components/TimerReadout'
import {
  currentChallenge,
  currentRound,
  hostAudioDescription,
  mediaAsset,
  pointsAvailable,
  questionsForRound,
  timerRemaining,
  upcomingChallenge,
} from '../engine/logic'
import { THEMES, type AnswerMode, type PlayMode } from '../engine/types'
import { bundledUrl } from '../media/library'
import { displayLastSeen } from '../sync/channel'
import {
  addTeam,
  adjustScore,
  advanceLightning,
  awardBonus,
  beginRound,
  buzz,
  createRound,
  crownWinner,
  duplicateRound,
  endRound,
  expireTimer,
  initHost,
  jumpTo,
  lockFinalAnswers,
  lockWagers,
  markCorrect,
  markIncorrect,
  moveQuestion,
  moveRound,
  moveTeam,
  nextQuestion,
  nextRound,
  passTurn,
  patchTimer,
  pauseTimer,
  prevQuestion,
  removeTeam,
  replayMedia,
  resetTimer,
  revealAnswer,
  revealNextClue,
  revealQuestion,
  setActiveTeam,
  setAmbience,
  setAnswerMode,
  setFamilyMode,
  setFinalAnswer,
  setPlayMode,
  setReducedMotion,
  setScore,
  setShowScoreStrip,
  setTheme,
  setVolumes,
  setWager,
  startGame,
  startTimer,
  stepFinalReveal,
  toggleScoreboard,
  undoScore,
  updateRound,
  updateTeam,
  useGame,
} from '../state/store'
import { CreatorPanel, HistoryPanel, MediaPanel, RandomPanel } from './Panels'

type Panel = 'play' | 'create' | 'media' | 'random' | 'history'

export function HostScreen() {
  const state = useGame()
  const [panel, setPanel] = useState<Panel>('play')
  const [linked, setLinked] = useState(false)
  const [customPoints, setCustomPoints] = useState('')
  const now = useClock(state.timer.running)
  const challenge = currentChallenge(state)
  const round = currentRound(state)
  const available = pointsAvailable(state)
  const upcoming = upcomingChallenge(state)
  const nextStage = challenge?.stages[state.stageIndex + 1]
  const hearing = hostAudioDescription(challenge, state.stageIndex)

  useEffect(() => initHost(), [])
  usePlayback('host', state)
  useEffect(() => {
    const id = window.setInterval(() => setLinked(Date.now() - displayLastSeen() < 4500), 1000)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
    document.documentElement.classList.toggle('reduce-motion', state.reducedMotion)
  }, [state.theme, state.reducedMotion])
  useEffect(() => {
    if (!state.timer.running) return
    const left = timerRemaining(state.timer)
    const id = window.setTimeout(() => expireTimer(), Math.max(0, left))
    return () => window.clearTimeout(id)
  }, [state.timer])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      const key = event.key.toLowerCase()
      if (key === ' ') {
        event.preventDefault()
        revealNextClue()
      } else if (key === 't') {
        if (state.timer.running) pauseTimer()
        else startTimer()
      } else if (key === 'c' && state.activeTeamId) markCorrect(state.activeTeamId, pointsOrUndefined(customPoints))
      else if (key === 'x' && state.activeTeamId) markIncorrect(state.activeTeamId)
      else if (key === 'a') revealAnswer()
      else if (key === 'n') nextQuestion()
      else if (key === 's') toggleScoreboard()
      else if (key === 'r') replayMedia()
      else if (/^[1-9]$/.test(key)) {
        const team = state.teams[Number(key) - 1]
        if (team) {
          setActiveTeam(team.id)
          if (state.playMode === 'buzz-in') buzz(team.id)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, customPoints])

  return (
    <div className="host">
      <header className="host-bar">
        <div>
          <p className="eyebrow">Spooknight host</p>
          <strong className={linked ? 'live' : 'idle'}>{linked ? 'TV linked' : 'TV window not detected'}</strong>
        </div>
        <button type="button" className="primary" onClick={openDisplay}>Open Audience Display</button>
        <button type="button" className={`score-toggle ${state.showScoreboard ? 'on' : ''}`} onClick={() => toggleScoreboard()}>
          {state.showScoreboard ? 'Back to Game' : 'Show Scores'}
        </button>
        <label>Theme
          <select value={state.theme} onChange={(event) => setTheme(event.target.value as typeof state.theme)}>
            {THEMES.map((theme) => <option key={theme.id} value={theme.id}>{theme.label}</option>)}
          </select>
        </label>
        <label className="check"><input type="checkbox" checked={state.familyMode} onChange={(event) => setFamilyMode(event.target.checked)} /> Family mode</label>
        <label className="check"><input type="checkbox" checked={state.reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /> Reduced motion</label>
        <label className="check"><input type="checkbox" checked={state.showScoreStrip} onChange={(event) => setShowScoreStrip(event.target.checked)} /> Score strip</label>
        <label className="check"><input type="checkbox" checked={state.ambienceOn} onChange={(event) => setAmbience(event.target.checked)} /> Ambience</label>
      </header>
      <div className="volume-row">
        <label>Music <input type="range" min="0" max="1" step="0.05" value={state.volumes.music} onChange={(event) => setVolumes({ ...state.volumes, music: Number(event.target.value) })} /></label>
        <label>Effects <input type="range" min="0" max="1" step="0.05" value={state.volumes.sfx} onChange={(event) => setVolumes({ ...state.volumes, sfx: Number(event.target.value) })} /></label>
        <label>Question audio <input type="range" min="0" max="1" step="0.05" value={state.volumes.media} onChange={(event) => setVolumes({ ...state.volumes, media: Number(event.target.value) })} /></label>
        <nav className="host-nav">
          {(['play', 'create', 'media', 'random', 'history'] as Panel[]).map((item) => (
            <button type="button" key={item} className={panel === item ? 'active' : ''} onClick={() => setPanel(item)}>{item}</button>
          ))}
        </nav>
      </div>
      {panel === 'create' && <CreatorPanel />}
      {panel === 'media' && <MediaPanel />}
      {panel === 'random' && <RandomPanel />}
      {panel === 'history' && <HistoryPanel />}
      {panel === 'play' && (
        <div className="host-grid">
          <aside className="rundown">
            <button type="button" onClick={createRound}>New round</button>
            {state.pack.rounds.map((item) => {
              const questions = questionsForRound({ ...state, roundId: item.id }, item)
              return (
                <section key={item.id} className={!item.enabled ? 'off' : ''}>
                  <header>
                    <button type="button" className={item.id === state.roundId ? 'active' : ''} onClick={() => questions[0] && jumpTo(item.id, questions[0].id)}>{item.title}</button>
                    <button type="button" onClick={() => moveRound(item.id, -1)} aria-label="Move round up">↑</button>
                    <button type="button" onClick={() => moveRound(item.id, 1)} aria-label="Move round down">↓</button>
                    <button type="button" onClick={() => duplicateRound(item.id)}>Copy</button>
                    <button type="button" onClick={() => updateRound({ ...item, enabled: !item.enabled })}>{item.enabled ? 'Hide' : 'Use'}</button>
                  </header>
                  {questions.map((question) => (
                    <div key={question.id} className="q-row">
                      <button type="button" className={question.id === state.questionId ? 'active' : ''} onClick={() => jumpTo(item.id, question.id)}>
                        {question.title}
                        <small>{question.audience} · {question.difficulty}</small>
                      </button>
                      <button type="button" onClick={() => moveQuestion(item.id, question.id, -1)} aria-label="Move question up">↑</button>
                      <button type="button" onClick={() => moveQuestion(item.id, question.id, 1)} aria-label="Move question down">↓</button>
                    </div>
                  ))}
                </section>
              )
            })}
          </aside>
          <section className="play-card">
            <p className="eyebrow">{round?.title} · {state.phase}</p>
            <h1>{challenge?.title ?? 'No question'}</h1>
            <div className="split">
              <label>Play
                <select value={state.playMode} onChange={(event) => setPlayMode(event.target.value as PlayMode)}>
                  <option value="shout-out">Shout-out</option>
                  <option value="round-robin">Round robin</option>
                  <option value="steal">Steal</option>
                  <option value="buzz-in">Timed buzz-in</option>
                </select>
              </label>
              <label>Answers
                <select value={state.answerMode} onChange={(event) => setAnswerMode(event.target.value as AnswerMode)}>
                  <option value="open">Open answer</option>
                  <option value="multiple-choice">Multiple choice</option>
                </select>
              </label>
              <p className="points-now">{available} pts now</p>
              <TimerReadout timer={state.timer} now={now} />
            </div>
            <div className="answer-box">
              <p>Answer</p>
              <strong>{challenge?.answer || '—'}</strong>
              {challenge && challenge.alternateAnswers.length > 0 && <p>Also accept: {challenge.alternateAnswers.join(', ')}</p>}
              {challenge?.hostNotes && <p className="notes">{challenge.hostNotes}</p>}
              {hearing && <p className="hearing">About to play: {hearing}</p>}
            </div>
            <div className="private-preview">
              <p className="eyebrow">Next clue · only on this laptop</p>
              {nextStage ? (
                <>
                  <p>{nextStage.label} · {nextStage.points} pts</p>
                  {nextStage.publicText && <p>{nextStage.publicText}</p>}
                  {nextStage.audio && <p>{nextStage.audio.description}</p>}
                  {nextStage.video && <p>{nextStage.video.description}</p>}
                  {nextStage.image && (
                    <ClueImage
                      image={{
                        mediaId: nextStage.image.mediaId,
                        url: bundledUrl(mediaAsset(state.pack, nextStage.image.mediaId)) ?? '',
                        effect: nextStage.image.effect,
                      }}
                    />
                  )}
                </>
              ) : <p>No further clue.</p>}
            </div>
            <p className="upcoming">Up next: {upcoming?.title ?? 'End of the night'}</p>
            <div className="control-bar">
              {state.phase === 'lobby' && <button type="button" className="primary" onClick={startGame}>Start game</button>}
              {state.phase === 'intro' && <button type="button" className="primary" onClick={beginRound}>Begin round</button>}
              <button type="button" onClick={revealQuestion}>Reveal question</button>
              <button type="button" className="primary" onClick={revealNextClue}>Reveal next clue</button>
              <button type="button" onClick={state.timer.running ? pauseTimer : startTimer}>{state.timer.running ? 'Pause timer' : 'Start timer'}</button>
              <button type="button" onClick={() => resetTimer()}>Reset timer</button>
              <button type="button" onClick={replayMedia}>Replay audio</button>
              <button type="button" onClick={revealNextClue}>Play longer</button>
              <button type="button" onClick={revealAnswer}>Reveal answer</button>
              <button type="button" onClick={passTurn}>Pass to next team</button>
              <button type="button" onClick={() => toggleScoreboard()}>{state.showScoreboard ? 'Back to game' : 'Show scores'}</button>
              <button type="button" onClick={prevQuestion}>Previous</button>
              <button type="button" onClick={nextQuestion}>Next question</button>
              <button type="button" onClick={endRound}>End round</button>
              {(state.phase === 'round-end' || state.phase === 'intro') && <button type="button" onClick={nextRound}>Next round</button>}
              {challenge?.type === 'lightning' && <button type="button" onClick={advanceLightning}>Next lightning prompt</button>}
              <button type="button" onClick={() => { if (confirm('Crown the winner and end the night?')) crownWinner() }}>Crown the winner</button>
            </div>
            <div className="timer-tools">
              <label>Seconds<input type="number" value={Math.round(state.timer.durationMs / 1000)} onChange={(event) => resetTimer(Number(event.target.value))} /></label>
              <label>Style
                <select value={state.timer.style} onChange={(event) => patchTimer({ style: event.target.value as typeof state.timer.style })}>
                  <option value="standard">Standard</option>
                  <option value="dramatic">Dramatic</option>
                  <option value="sudden-death">Sudden death</option>
                </select>
              </label>
              <label className="check"><input type="checkbox" checked={state.timer.autoReveal} onChange={(event) => patchTimer({ autoReveal: event.target.checked })} /> Auto reveal</label>
              <label className="check"><input type="checkbox" checked={state.timer.tickSound} onChange={(event) => patchTimer({ tickSound: event.target.checked })} /> Ticking</label>
              <label>Award points<input value={customPoints} placeholder={String(available)} onChange={(event) => setCustomPoints(event.target.value)} /></label>
            </div>
            {state.phase.startsWith('final') && (
              <div className="final-tools">
                <h2>Final wagers</h2>
                {state.teams.map((team) => (
                  <div key={team.id} className="final-row">
                    <span>{team.icon} {team.name}</span>
                    <input type="number" min={0} max={Math.max(0, team.score)} value={state.finalState.wagers[team.id] ?? 0} onChange={(event) => setWager(team.id, Number(event.target.value))} aria-label={`${team.name} wager`} />
                    <input value={state.finalState.answers[team.id] ?? ''} placeholder="Their answer" onChange={(event) => setFinalAnswer(team.id, event.target.value)} aria-label={`${team.name} answer`} />
                  </div>
                ))}
                <button type="button" onClick={lockWagers}>Lock wagers and show the question</button>
                <button type="button" onClick={lockFinalAnswers}>Lock answers</button>
                <button type="button" className="primary" onClick={stepFinalReveal}>Score this team / next</button>
              </div>
            )}
            {challenge?.bonuses?.map((bonus) => (
              <div key={bonus.id} className="row">
                <span>Bonus: {bonus.prompt} ({bonus.answer}) +{bonus.points}</span>
                {state.teams.map((team) => (
                  <button type="button" key={team.id} onClick={() => awardBonus(team.id, bonus.id)}>{team.name}</button>
                ))}
              </div>
            ))}
            <p className="shortcut-help">Space clue · T timer · C correct · X wrong · A answer · N next · S scores · R replay · 1–9 teams</p>
          </section>
          <aside className="team-rail">
            <button type="button" onClick={addTeam}>Add team</button>
            <button type="button" onClick={undoScore}>Undo last score</button>
            {state.stealOpen && <p className="steal-flag">Steal is open</p>}
            {state.teams.map((team, index) => (
              <article key={team.id} className={team.id === state.activeTeamId ? 'active-team' : ''} style={{ ['--team' as string]: team.color }}>
                <header>
                  <span>{index + 1}</span>
                  <input aria-label="Icon" value={team.icon} onChange={(event) => updateTeam(team.id, { icon: event.target.value })} />
                  <input aria-label="Team name" value={team.name} onChange={(event) => updateTeam(team.id, { name: event.target.value })} />
                  <input aria-label="Color" type="color" value={team.color} onChange={(event) => updateTeam(team.id, { color: event.target.value })} />
                </header>
                <p className="score-line">
                  <input aria-label={`${team.name} score`} type="number" value={team.score} onChange={(event) => setScore(team.id, Number(event.target.value))} />
                </p>
                <div className="row">
                  {[5, 10, 25, 50].map((amount) => <button type="button" key={amount} onClick={() => adjustScore(team.id, amount)}>+{amount}</button>)}
                  {[5, 10].map((amount) => <button type="button" key={`minus-${amount}`} onClick={() => adjustScore(team.id, -amount)}>-{amount}</button>)}
                </div>
                <div className="row">
                  <button type="button" className="primary" onClick={() => markCorrect(team.id, pointsOrUndefined(customPoints))}>Correct</button>
                  <button type="button" onClick={() => markIncorrect(team.id)}>Incorrect</button>
                  <button type="button" onClick={() => { setActiveTeam(team.id); buzz(team.id) }}>Buzz</button>
                  {state.stealOpen && <button type="button" onClick={() => markCorrect(team.id, pointsOrUndefined(customPoints))}>Steal</button>}
                  <button type="button" onClick={() => moveTeam(team.id, -1)} aria-label="Move team up">↑</button>
                  <button type="button" onClick={() => moveTeam(team.id, 1)} aria-label="Move team down">↓</button>
                  <button type="button" onClick={() => { if (confirm(`Remove ${team.name}?`)) removeTeam(team.id) }}>Remove</button>
                </div>
              </article>
            ))}
          </aside>
        </div>
      )}
    </div>
  )
}

function pointsOrUndefined(value: string) {
  if (value.trim() === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function openDisplay() {
  const url = `${location.origin}${import.meta.env.BASE_URL}#/display`
  const popup = window.open(url, 'halloween-display')
  popup?.focus()
}
