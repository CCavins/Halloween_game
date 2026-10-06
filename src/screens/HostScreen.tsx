import { useEffect, useState } from 'react'
import { usePlayback } from '../audio/usePlayback'
import { ClueImage, useClock } from '../challenges/StageView'
import { TimerReadout } from '../components/TimerReadout'
import {
  currentChallenge,
  currentRound,
  currentScoreKey,
  currentStage,
  enabledRounds,
  hostAudioDescription,
  mediaAsset,
  pointsAvailable,
  questionsForRound,
  timerRemaining,
  upcomingChallenge,
} from '../engine/logic'
import { THEMES, type AnswerMode, type PlayMode, type Pack, type Stage } from '../engine/types'
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
  resetGame,
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

type Drawer = 'questions' | 'teams' | 'settings' | 'create' | 'media' | 'random' | 'history'

export function HostScreen() {
  const state = useGame()
  const [drawer, setDrawer] = useState<Drawer | null>(null)
  const [linked, setLinked] = useState(false)
  const [customPoints, setCustomPoints] = useState('')
  const now = useClock(state.timer.running)
  const challenge = currentChallenge(state)
  const round = currentRound(state)
  const available = pointsAvailable(state)
  const upcoming = upcomingChallenge(state)
  const shownStage = currentStage(challenge, state.stageIndex)
  const nextStage = challenge?.stages[state.stageIndex + 1]
  const hearing = hostAudioDescription(challenge, state.stageIndex)
  const lightningNow = challenge?.type === 'lightning' ? challenge.lightningPrompts?.[state.lightningIndex] : undefined
  const lightningNext = challenge?.type === 'lightning' ? challenge.lightningPrompts?.[state.lightningIndex + 1] : undefined

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

  const questions = round ? questionsForRound(state, round) : []
  const questionNumber = Math.max(1, questions.findIndex((item) => item.id === state.questionId) + 1)
  const primary = primaryAction(state.phase, state.questionRevealed, state.stageIndex, challenge?.stages.length ?? 0, challenge?.type)
  const award = pointsOrUndefined(customPoints)
  const questionScored = state.scoredQuestionKey === currentScoreKey(state)
  const scoredTeam = state.teams.find((team) => team.id === state.scoredTeamId)

  return (
    <div className="host calm">
      <header className="calm-bar">
        <div>
          <p className="eyebrow">Host</p>
          <strong className={linked ? 'live' : 'idle'}>{linked ? 'TV linked' : 'Open the TV window'}</strong>
        </div>
        <button type="button" onClick={openDisplay}>Open TV</button>
        <a className="text-button" href="#/answers">All questions</a>
        <button type="button" className="text-button" onClick={confirmReset}>Reset game</button>
        <button type="button" className={`score-toggle ${state.showScoreboard ? 'on' : ''}`} onClick={() => toggleScoreboard()}>
          {state.showScoreboard ? 'Back to game' : 'Show scores'}
        </button>
      </header>

      <main className="calm-main">
        <section className="play-card">
          <p className="eyebrow">{round?.title} · {questionNumber} of {Math.max(questions.length, 1)}</p>
          <h1>{challenge?.title ?? 'Ready when you are'}</h1>
          <p className="answer-label">Answer</p>
          <p className="big-answer">{challenge?.answer || '—'}</p>
          <p className="points-now">{available} points</p>
          <div className="calm-meta">
            <span>Clue {Math.min(state.stageIndex + 1, Math.max(challenge?.stages.length ?? 1, 1))} of {challenge?.stages.length || 1}</span>
            <TimerReadout timer={state.timer} now={now} />
          </div>
          <div className="clue-pair">
            <CluePeek
              label={state.questionRevealed ? 'On the TV' : 'Ready to show'}
              live={state.questionRevealed}
              text={lightningNow?.prompt || challenge?.factStatement || challenge?.instructions}
              stage={lightningNow ? undefined : shownStage}
              pack={state.pack}
              empty="Nothing on the TV yet."
            />
            <CluePeek
              label="Next clue"
              text={lightningNext?.prompt}
              stage={lightningNow ? undefined : nextStage}
              pack={state.pack}
              empty="This is the last clue."
            />
          </div>
          {hearing && <p className="hearing">About to play: {hearing}</p>}
          <button type="button" className="primary big-action" onClick={primary.run}>{primary.label}</button>
          <div className="quiet-actions">
            <button type="button" onClick={state.timer.running ? pauseTimer : startTimer}>{state.timer.running ? 'Pause timer' : 'Start timer'}</button>
            <button type="button" onClick={revealAnswer}>Reveal answer</button>
            {primary.label !== 'Next question' && primary.label !== 'Next round' && <button type="button" onClick={nextQuestion}>Skip ahead</button>}
            {hearing && <button type="button" onClick={replayMedia}>Replay</button>}
            {state.playMode !== 'shout-out' && <button type="button" onClick={passTurn}>Pass</button>}
          </div>
          <details className="host-details">
            <summary>Notes and next clue</summary>
            {challenge && challenge.alternateAnswers.length > 0 && <p>Also accept: {challenge.alternateAnswers.join(', ')}</p>}
            {challenge?.hostNotes && <p>{challenge.hostNotes}</p>}
            <p>Up next: {upcoming?.title ?? 'End of the night'}</p>
          </details>
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
              <button type="button" onClick={lockFinalAnswers}>Lock answers</button>
              <button type="button" onClick={stepFinalReveal}>Score this team</button>
            </div>
          )}
          {challenge?.bonuses?.map((bonus) => (
            <p key={bonus.id} className="bonus-line">Bonus +{bonus.points}: {bonus.prompt} ({bonus.answer})</p>
          ))}
        </section>

        <aside className="team-rail calm-teams">
          <h2>Who got it?</h2>
          {questionScored && scoredTeam && <p className="scored-note">{scoredTeam.name} has this one. You can still show the next clue.</p>}
          {state.stealOpen && !questionScored && <p className="steal-flag">Another team can steal</p>}
          {state.teams.map((team, index) => (
            <article key={team.id} style={{ ['--team' as string]: team.color }}>
              <div className="team-line">
                <span>{index + 1}. {team.icon} {team.name}</span>
                <strong>{team.score}</strong>
              </div>
              <div className="team-actions">
                <button type="button" className="primary" disabled={questionScored} onClick={() => markCorrect(team.id, award)}>
                  {questionScored ? 'Scored' : state.stealOpen ? 'Steal' : 'Got it'}
                </button>
                <button type="button" className="text-button" disabled={questionScored} onClick={() => markIncorrect(team.id)}>Wrong</button>
                {challenge?.bonuses?.[0] && (
                  <button type="button" className="text-button" onClick={() => awardBonus(team.id, challenge.bonuses![0].id)}>Bonus</button>
                )}
              </div>
            </article>
          ))}
          <button type="button" className="text-button" onClick={undoScore}>Undo last score</button>
        </aside>
      </main>

      <nav className="calm-nav">
        {(['questions', 'teams', 'settings'] as Drawer[]).map((item) => (
          <button type="button" key={item} className={drawer === item ? 'active' : ''} onClick={() => setDrawer(drawer === item ? null : item)}>
            {item === 'questions' ? 'Questions' : item === 'teams' ? 'Edit teams' : 'Settings'}
          </button>
        ))}
      </nav>

      {drawer === 'questions' && (
        <section className="drawer">
          {enabledRounds(state).map((item) => {
            const list = questionsForRound({ ...state, roundId: item.id }, item)
            return (
              <div key={item.id}>
                <h3>{item.title}</h3>
                {list.map((question) => (
                  <button type="button" key={question.id} className={question.id === state.questionId ? 'active' : ''} onClick={() => { jumpTo(item.id, question.id); setDrawer(null) }}>
                    {question.title}
                  </button>
                ))}
              </div>
            )
          })}
          <div className="quiet-actions">
            <button type="button" onClick={prevQuestion}>Previous</button>
            <button type="button" onClick={endRound}>End round</button>
            <button type="button" onClick={nextRound}>Next round</button>
          </div>
        </section>
      )}

      {drawer === 'teams' && (
        <section className="drawer">
          <button type="button" onClick={addTeam}>Add team</button>
          {state.teams.map((team) => (
            <article key={team.id} className="edit-team">
              <input aria-label="Icon" value={team.icon} onChange={(event) => updateTeam(team.id, { icon: event.target.value })} />
              <input aria-label="Team name" value={team.name} onChange={(event) => updateTeam(team.id, { name: event.target.value })} />
              <input aria-label="Color" type="color" value={team.color} onChange={(event) => updateTeam(team.id, { color: event.target.value })} />
              <input aria-label={`${team.name} score`} type="number" value={team.score} onChange={(event) => setScore(team.id, Number(event.target.value))} />
              <button type="button" onClick={() => adjustScore(team.id, 10)}>+10</button>
              <button type="button" onClick={() => adjustScore(team.id, -10)}>-10</button>
              <button type="button" onClick={() => moveTeam(team.id, -1)} aria-label="Move team up">Up</button>
              <button type="button" onClick={() => moveTeam(team.id, 1)} aria-label="Move team down">Down</button>
              <button type="button" onClick={() => { if (confirm(`Remove ${team.name}?`)) removeTeam(team.id) }}>Remove</button>
            </article>
          ))}
        </section>
      )}

      {drawer === 'settings' && (
        <section className="drawer settings-grid">
          <label>How they answer
            <select value={state.playMode} onChange={(event) => setPlayMode(event.target.value as PlayMode)}>
              <option value="shout-out">Everyone can shout</option>
              <option value="round-robin">One team at a time</option>
              <option value="steal">One team, then a steal</option>
              <option value="buzz-in">Buzz-in</option>
            </select>
          </label>
          <label>Choices on the TV
            <select value={state.answerMode} onChange={(event) => setAnswerMode(event.target.value as AnswerMode)}>
              <option value="open">Hidden</option>
              <option value="multiple-choice">Show choices</option>
            </select>
          </label>
          <label>Theme
            <select value={state.theme} onChange={(event) => setTheme(event.target.value as typeof state.theme)}>
              {THEMES.map((theme) => <option key={theme.id} value={theme.id}>{theme.label}</option>)}
            </select>
          </label>
          <label>Points to award if not the shown value<input value={customPoints} placeholder={String(available)} onChange={(event) => setCustomPoints(event.target.value)} /></label>
          <label>Timer seconds<input type="number" value={Math.round(state.timer.durationMs / 1000)} onChange={(event) => resetTimer(Number(event.target.value))} /></label>
          <label className="check"><input type="checkbox" checked={state.familyMode} onChange={(event) => setFamilyMode(event.target.checked)} /> Family mode</label>
          <label className="check"><input type="checkbox" checked={state.reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /> Reduced motion</label>
          <label className="check"><input type="checkbox" checked={state.showScoreStrip} onChange={(event) => setShowScoreStrip(event.target.checked)} /> Score strip on questions</label>
          <label className="check"><input type="checkbox" checked={state.ambienceOn} onChange={(event) => setAmbience(event.target.checked)} /> Background ambience</label>
          <label className="check"><input type="checkbox" checked={state.timer.tickSound} onChange={(event) => patchTimer({ tickSound: event.target.checked })} /> Timer ticks</label>
          <label className="check"><input type="checkbox" checked={state.timer.autoReveal} onChange={(event) => patchTimer({ autoReveal: event.target.checked })} /> Reveal answer when time runs out</label>
          <label>Music <input type="range" min="0" max="1" step="0.05" value={state.volumes.music} onChange={(event) => setVolumes({ ...state.volumes, music: Number(event.target.value) })} /></label>
          <label>Effects <input type="range" min="0" max="1" step="0.05" value={state.volumes.sfx} onChange={(event) => setVolumes({ ...state.volumes, sfx: Number(event.target.value) })} /></label>
          <label>Question audio <input type="range" min="0" max="1" step="0.05" value={state.volumes.media} onChange={(event) => setVolumes({ ...state.volumes, media: Number(event.target.value) })} /></label>
          <div className="quiet-actions">
            <button type="button" onClick={() => setDrawer('create')}>Edit questions</button>
            <button type="button" onClick={() => setDrawer('media')}>Media</button>
            <button type="button" onClick={() => setDrawer('random')}>Build a night</button>
            <button type="button" onClick={() => setDrawer('history')}>Saved games</button>
            <button type="button" onClick={() => { if (confirm('Crown the winner and end the night?')) crownWinner() }}>Crown the winner</button>
          </div>
          <div className="quiet-actions">
            <button type="button" onClick={createRound}>New round</button>
            {round && (
              <>
                <button type="button" onClick={() => moveRound(round.id, -1)}>Move round up</button>
                <button type="button" onClick={() => moveRound(round.id, 1)}>Move round down</button>
                <button type="button" onClick={() => duplicateRound(round.id)}>Copy round</button>
                <button type="button" onClick={() => updateRound({ ...round, enabled: !round.enabled })}>{round.enabled ? 'Hide round' : 'Use round'}</button>
                <button type="button" onClick={() => moveQuestion(round.id, state.questionId, -1)}>Move question up</button>
                <button type="button" onClick={() => moveQuestion(round.id, state.questionId, 1)}>Move question down</button>
              </>
            )}
          </div>
        </section>
      )}
      {drawer === 'create' && <div className="drawer"><button type="button" onClick={() => setDrawer('settings')}>Back</button><CreatorPanel /></div>}
      {drawer === 'media' && <div className="drawer"><button type="button" onClick={() => setDrawer('settings')}>Back</button><MediaPanel /></div>}
      {drawer === 'random' && <div className="drawer"><button type="button" onClick={() => setDrawer('settings')}>Back</button><RandomPanel /></div>}
      {drawer === 'history' && <div className="drawer"><button type="button" onClick={() => setDrawer('settings')}>Back</button><HistoryPanel /></div>}
    </div>
  )
}

function CluePeek({
  label,
  live,
  text,
  stage,
  pack,
  empty,
}: {
  label: string
  live?: boolean
  text?: string
  stage?: Stage
  pack: Pack
  empty: string
}) {
  const image = stage?.image
  const asset = image ? mediaAsset(pack, image.mediaId) : undefined
  const hasBody = Boolean(text || stage?.publicText || stage?.audio || stage?.video || image)
  return (
    <article className={`clue-peek ${live ? 'on-air' : ''}`}>
      <p className="eyebrow">{label}{stage ? ` · ${stage.points} pts` : ''}</p>
      {!hasBody && <p>{empty}</p>}
      {image && (
        <ClueImage image={{ mediaId: image.mediaId, url: bundledUrl(asset) ?? '', effect: image.effect }} />
      )}
      {(stage?.publicText || (text && text !== stage?.publicText)) && <p>{stage?.publicText || text}</p>}
      {stage?.audio && <p>Sound: {stage.audio.description}</p>}
      {stage?.video && <p>Clip: {stage.video.description}</p>}
    </article>
  )
}

function primaryAction(phase: string, revealed: boolean, stageIndex: number, stageCount: number, type?: string) {
  if (phase === 'lobby') return { label: 'Start the night', run: startGame }
  if (phase === 'intro') return { label: 'Begin this round', run: beginRound }
  if (phase === 'round-end') return { label: 'Next round', run: nextRound }
  if (phase === 'final-wager') return { label: 'Lock wagers', run: lockWagers }
  if (phase === 'final-reveal') return { label: 'Score and continue', run: stepFinalReveal }
  if (phase === 'victory') return { label: 'Show scores', run: () => toggleScoreboard(true) }
  if (!revealed) return { label: 'Show the question', run: revealQuestion }
  if (type === 'lightning') return { label: 'Next prompt', run: advanceLightning }
  if (stageIndex < stageCount - 1) return { label: 'Reveal next clue', run: revealNextClue }
  return { label: 'Next question', run: nextQuestion }
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

function confirmReset() {
  if (confirm('Reset the game? Scores and teams go back to the start, and question edits in this browser are cleared.')) resetGame()
}
