import { useSyncExternalStore } from 'react'
import { samplePack } from '../content/loadPack'
import {
  answerMatches,
  blankTimer,
  challengeById,
  currentChallenge,
  currentRound,
  currentScoreKey,
  currentStage,
  enabledRounds,
  mediaAsset,
  nextQuestionPointer,
  pointsAvailable,
  prepareBoard,
  prevQuestionPointer,
  questionsForRound,
  roundById,
  sortedTeams,
  stageMediaCue,
  timerRemaining,
  toPublic,
  uid,
} from '../engine/logic'
import { buildRandomGame, type RandomizerInput } from '../engine/randomizer'
import type {
  AnswerMode,
  Challenge,
  ChallengeType,
  FinalState,
  Pack,
  Phase,
  PlayMode,
  PrivateState,
  Round,
  Team,
  ThemeId,
  TimerState,
} from '../engine/types'
import { bundledUrl, resolveAssetUrl } from '../media/library'
import { listenForDisplay, noteDisplayAlive, publishPreload, publishPublic } from '../sync/channel'

const KEY = 'spooknight-private-v1'
const SLOTS = 'spooknight-slots-v1'

export interface SaveSlot {
  id: string
  name: string
  at: number
  state: PrivateState
}

let state = loadState()
let persistTimer = 0
const listeners = new Set<() => void>()

function emptyFinal(): FinalState {
  return { wagers: {}, answers: {}, wagersLocked: false, answersLocked: false, revealIndex: 0, scoredIds: [] }
}

export function createInitial(source: Pack = samplePack): PrivateState {
  const pack = capClues(source)
  const round = pack.rounds.find((item) => item.enabled) ?? pack.rounds[0]
  const questionId = round?.questionIds[0] ?? ''
  const challenge = challengeById(pack, questionId)
  return {
    teams: [
      { id: 'team-howlers', name: 'The Howlers', color: '#ff6a1a', icon: '🐺', score: 0 },
      { id: 'team-lanterns', name: 'Lantern Kids', color: '#ffd166', icon: '🎃', score: 0 },
      { id: 'team-owls', name: 'Night Owls', color: '#9b6bff', icon: '🦉', score: 0 },
      { id: 'team-brooms', name: 'Broom Closet', color: '#5ee0a0', icon: '🧹', score: 0 },
    ],
    pack,
    roundId: round?.id ?? '',
    questionId,
    phase: 'lobby',
    questionRevealed: false,
    stageIndex: 0,
    answerRevealed: false,
    showScoreboard: false,
    showScoreStrip: false,
    activeTeamId: 'team-howlers',
    stealOpen: false,
    playMode: round?.playMode ?? 'shout-out',
    answerMode: round?.answerMode ?? 'open',
    timer: {
      ...blankTimer((challenge?.timerSec ?? 30) * 1000),
      style: challenge?.timerStyle ?? 'dramatic',
      autoReveal: Boolean(challenge?.autoRevealOnExpire),
    },
    theme: pack.themeSuggestion ?? 'cinematic',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    familyMode: false,
    volumes: { music: 0.35, sfx: 0.75, media: 0.9 },
    ambienceOn: false,
    scoreLog: [],
    celebration: null,
    mediaCue: null,
    mediaCueSeq: 1,
    celebrationSeq: 1,
    finalState: emptyFinal(),
    history: [],
    lightningIndex: 0,
    ...prepareBoard(challenge),
    awardedBonusIds: [],
    scoredQuestionKey: null,
    scoredTeamId: null,
    revision: 1,
  }
}

/** Host-made ids come from uid('q'): ten base36 characters, and they include a digit. Built-in slugs do not. */
function isHostAdded(id: string): boolean {
  return /^q-[0-9a-z]{10}$/.test(id) && /\d/.test(id)
}

function loadState(): PrivateState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return createInitial()
    const parsed = JSON.parse(raw) as PrivateState
    if (!parsed.pack?.challenges || !parsed.teams) return createInitial()
    const savedVersion = parsed.pack.version ?? 1
    const nextVersion = samplePack.version ?? 1
    let migrated = false
    if (parsed.pack.id === samplePack.id && savedVersion < nextVersion) {
      const previousRounds = parsed.pack.rounds
      const custom = parsed.pack.challenges.filter((challenge) => isHostAdded(challenge.id) && !samplePack.challenges.some((item) => item.id === challenge.id))
      const first = samplePack.rounds.find((round) => round.enabled) ?? samplePack.rounds[0]
      const rounds = samplePack.rounds.map((round) => {
        const previous = previousRounds.find((item) => item.id === round.id)
        const extras = previous?.questionIds.filter((id) => custom.some((challenge) => challenge.id === id)) ?? []
        return extras.length ? { ...round, questionIds: [...round.questionIds, ...extras] } : round
      })
      parsed.pack = { ...samplePack, rounds, challenges: [...samplePack.challenges, ...custom] }
      parsed.phase = 'lobby'
      parsed.roundId = first?.id ?? ''
      parsed.questionId = first?.questionIds[0] ?? ''
      parsed.questionRevealed = false
      parsed.answerRevealed = false
      parsed.stageIndex = 0
      parsed.showScoreboard = false
      parsed.scoredQuestionKey = null
      parsed.scoredTeamId = null
      parsed.lightningIndex = 0
      parsed.awardedBonusIds = []
      parsed.finalState = emptyFinal()
      migrated = true
    }
    parsed.pack = capClues(parsed.pack)
    parsed.timer = { ...parsed.timer, running: false, startedAt: null }
    if (parsed.stageIndex > 2) parsed.stageIndex = 2
    if (migrated) {
      try {
        localStorage.setItem(KEY, JSON.stringify(parsed))
      } catch {
        /* quota */
      }
    }
    return parsed
  } catch {
    return createInitial()
  }
}

function capClues(pack: Pack): Pack {
  return {
    ...pack,
    challenges: pack.challenges.map((challenge) => {
      const fresh = samplePack.challenges.find((item) => item.id === challenge.id)
      const stages = fresh && challenge.stages.length > 3 ? fresh.stages : challenge.stages.slice(0, 3)
      return { ...challenge, stages }
    }),
  }
}

function resolveMediaId(id: string): string | null {
  if (id.startsWith('motif:') || id.startsWith('story:')) return null
  const asset = mediaAsset(state.pack, id)
  return bundledUrl(asset) || resolveAssetUrl(asset)
}

function broadcast() {
  publishPublic(toPublic(state, resolveMediaId))
  const urls: string[] = []
  const seen = new Set<string>()
  const collect = (challenge: Challenge | undefined) => {
    challenge?.stages.forEach((stage) => {
      const id = stage.image?.mediaId ?? stage.video?.mediaId ?? stage.audio?.mediaId
      if (!id || seen.has(id) || id.startsWith('motif:') || id.startsWith('story:')) return
      seen.add(id)
      const url = resolveMediaId(id)
      if (url) urls.push(url)
    })
  }
  collect(currentChallenge(state))
  let cursor = state
  for (let i = 0; i < 3; i++) {
    const pointer = nextQuestionPointer(cursor)
    if (!pointer) break
    cursor = { ...cursor, roundId: pointer.roundId, questionId: pointer.questionId }
    collect(currentChallenge(cursor))
  }
  publishPreload(urls)
}

function commit(next: PrivateState) {
  state = { ...next, revision: state.revision + 1 }
  listeners.forEach((listener) => listener())
  broadcast()
  window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* quota */
    }
  }, 40)
}

export function getState() {
  return state
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function initHost() {
  broadcast()
  return listenForDisplay(
    () => broadcast(),
    () => noteDisplayAlive(),
  )
}

export { displayLastSeen } from '../sync/channel'

function stopTimer(timer: TimerState): TimerState {
  const elapsed = timer.running && timer.startedAt ? timer.elapsedMs + (Date.now() - timer.startedAt) : timer.elapsedMs
  return { ...timer, running: false, startedAt: null, elapsedMs: elapsed }
}

function armTimer(challenge: Challenge | undefined, run: boolean): TimerState {
  const timer = blankTimer((challenge?.timerSec ?? 30) * 1000)
  timer.style = challenge?.timerStyle ?? (challenge?.type === 'lightning' ? 'sudden-death' : 'dramatic')
  timer.autoReveal = Boolean(challenge?.autoRevealOnExpire)
  timer.tickSound = true
  if (run) {
    timer.running = true
    timer.startedAt = Date.now()
  }
  return timer
}

function withScore(base: PrivateState, teamId: string, delta: number, reason: string): PrivateState {
  if (!delta) return base
  return {
    ...base,
    teams: base.teams.map((team) => (team.id === teamId ? { ...team, score: team.score + delta } : team)),
    scoreLog: [...base.scoreLog, { id: uid('score'), teamId, delta, reason, at: Date.now() }],
    celebration: { id: base.celebrationSeq + 1, teamId, points: delta, at: Date.now() },
    celebrationSeq: base.celebrationSeq + 1,
  }
}

function withHistory(base: PrivateState): PrivateState {
  const ranked = sortedTeams(base.teams)
  const top = ranked[0]?.score ?? 0
  const winners = ranked.filter((team) => team.score === top).map((team) => team.name)
  return {
    ...base,
    history: [
      {
        id: uid('hist'),
        at: Date.now(),
        title: base.pack.title,
        teams: base.teams.map((team) => ({ name: team.name, score: team.score, color: team.color, icon: team.icon })),
        winners,
      },
      ...base.history,
    ].slice(0, 20),
  }
}

function enterQuestion(base: PrivateState, roundId: string, questionId: string, phase?: Phase): PrivateState {
  const round = roundById(base.pack, roundId)
  const challenge = challengeById(base.pack, questionId)
  const board = prepareBoard(challenge)
  return {
    ...base,
    roundId,
    questionId,
    phase: phase ?? (round?.final ? 'final-wager' : 'question'),
    questionRevealed: false,
    answerRevealed: false,
    stageIndex: 0,
    showScoreboard: false,
    stealOpen: false,
    activeTeamId: base.activeTeamId ?? base.teams[0]?.id ?? null,
    playMode: round?.playMode ?? base.playMode,
    answerMode: round?.answerMode ?? base.answerMode,
    timer: armTimer(challenge, false),
    lightningIndex: 0,
    awardedBonusIds: [],
    scoredQuestionKey: null,
    scoredTeamId: null,
    mediaCue: null,
    finalState: round?.final ? emptyFinal() : base.finalState,
    ...board,
  }
}

export function addTeam() {
  const colors = ['#ff6a1a', '#ffd166', '#9b6bff', '#5ee0a0', '#ff5d8f', '#7fd1ff', '#f4f1ea']
  const icons = ['🎃', '👻', '🦇', '🐺', '🕸️', '🧹', '🦉', '🍬', '🕯️', '🐈']
  const team: Team = {
    id: uid('team'),
    name: `Team ${state.teams.length + 1}`,
    color: colors[state.teams.length % colors.length],
    icon: icons[state.teams.length % icons.length],
    score: 0,
  }
  commit({ ...state, teams: [...state.teams, team], activeTeamId: state.activeTeamId ?? team.id })
}

export function updateTeam(id: string, patch: Partial<Team>) {
  commit({
    ...state,
    teams: state.teams.map((team) => (team.id === id ? { ...team, ...patch, id: team.id } : team)),
  })
}

export function removeTeam(id: string) {
  const teams = state.teams.filter((team) => team.id !== id)
  commit({ ...state, teams, activeTeamId: state.activeTeamId === id ? teams[0]?.id ?? null : state.activeTeamId })
}

export function moveTeam(id: string, direction: -1 | 1) {
  const index = state.teams.findIndex((team) => team.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= state.teams.length) return
  const teams = [...state.teams]
  const [item] = teams.splice(index, 1)
  teams.splice(target, 0, item)
  commit({ ...state, teams })
}

export function adjustScore(teamId: string, delta: number, reason = 'Adjustment') {
  commit(withScore(state, teamId, delta, reason))
}

export function setScore(teamId: string, value: number) {
  const team = state.teams.find((item) => item.id === teamId)
  if (!team) return
  commit(withScore(state, teamId, value - team.score, 'Manual edit'))
}

export function undoScore() {
  const last = state.scoreLog[state.scoreLog.length - 1]
  if (!last) return
  commit({
    ...state,
    teams: state.teams.map((team) => (team.id === last.teamId ? { ...team, score: team.score - last.delta } : team)),
    scoreLog: state.scoreLog.slice(0, -1),
    celebration: null,
    scoredQuestionKey: last.reason === 'Correct' || last.reason === 'Steal' ? null : state.scoredQuestionKey,
    scoredTeamId: last.reason === 'Correct' || last.reason === 'Steal' ? null : state.scoredTeamId,
  })
}

export function toggleScoreboard(force?: boolean) {
  commit({ ...state, showScoreboard: force ?? !state.showScoreboard })
}

export function setShowScoreStrip(show: boolean) {
  commit({ ...state, showScoreStrip: show })
}

export function setTheme(theme: ThemeId) {
  commit({ ...state, theme })
}

export function setReducedMotion(reducedMotion: boolean) {
  commit({ ...state, reducedMotion })
}

export function setFamilyMode(familyMode: boolean) {
  let next = { ...state, familyMode }
  const challenge = currentChallenge(next)
  if (challenge && familyMode && challenge.audience !== 'family') {
    const pointer = nextQuestionPointer(next)
    if (pointer) next = enterQuestion(next, pointer.roundId, pointer.questionId, state.phase === 'lobby' ? 'lobby' : 'question')
  }
  commit(next)
}

export function setVolumes(volumes: PrivateState['volumes']) {
  commit({ ...state, volumes })
}

export function setAmbience(ambienceOn: boolean) {
  commit({ ...state, ambienceOn })
}

export function setPlayMode(playMode: PlayMode) {
  commit({ ...state, playMode, stealOpen: false })
}

export function setAnswerMode(answerMode: AnswerMode) {
  commit({ ...state, answerMode })
}

export function setActiveTeam(teamId: string) {
  commit({ ...state, activeTeamId: teamId })
}

export function startGame() {
  const round = currentRound(state) ?? enabledRounds(state)[0]
  if (!round) return
  const questions = questionsForRound(state, round)
  commit({ ...enterQuestion(state, round.id, questions[0]?.id ?? state.questionId, 'intro'), showScoreboard: false })
}

export function beginRound() {
  const round = currentRound(state)
  commit({
    ...state,
    phase: round?.final ? 'final-wager' : 'question',
    showScoreboard: false,
    questionRevealed: false,
    answerRevealed: false,
  })
}

export function revealQuestion() {
  const challenge = currentChallenge(state)
  const stage = currentStage(challenge, 0)
  commit({
    ...state,
    phase: state.phase === 'final-wager' || state.phase === 'final-question' ? 'final-question' : 'question',
    questionRevealed: true,
    answerRevealed: false,
    stageIndex: 0,
    showScoreboard: false,
    timer: challenge?.type === 'lightning' ? armTimer(challenge, true) : state.timer,
    mediaCue: stageMediaCue(stage, state.mediaCueSeq + 1, resolveMediaId),
    mediaCueSeq: state.mediaCueSeq + 1,
  })
}

export function revealNextClue() {
  const challenge = currentChallenge(state)
  if (!challenge) return
  if (!state.questionRevealed) {
    revealQuestion()
    return
  }
  if (challenge.type === 'lightning') {
    advanceLightning()
    return
  }
  if (state.stageIndex >= challenge.stages.length - 1) return
  const stageIndex = state.stageIndex + 1
  const stage = challenge.stages[stageIndex]
  commit({
    ...state,
    stageIndex,
    mediaCue: stageMediaCue(stage, state.mediaCueSeq + 1, resolveMediaId),
    mediaCueSeq: state.mediaCueSeq + 1,
  })
}

export function revealAnswer() {
  commit({
    ...state,
    answerRevealed: true,
    phase: state.phase === 'final-question' ? 'final-question' : state.phase === 'question' ? 'answer' : state.phase,
    timer: stopTimer(state.timer),
  })
}

export function patchTimer(patch: Partial<TimerState>) {
  commit({ ...state, timer: { ...state.timer, ...patch } })
}

export function replayMedia() {
  const stage = currentStage(currentChallenge(state), state.stageIndex)
  const cue = stageMediaCue(stage, state.mediaCueSeq + 1, resolveMediaId)
  if (!cue) return
  commit({ ...state, mediaCue: cue, mediaCueSeq: state.mediaCueSeq + 1 })
}

export function markCorrect(teamId: string, customPoints?: number) {
  const key = currentScoreKey(state)
  if (state.scoredQuestionKey === key) return
  const challenge = currentChallenge(state)
  const multiplier = state.stealOpen ? challenge?.scoring.stealMultiplier ?? 0.5 : 1
  const amount = customPoints ?? Math.round(pointsAvailable(state) * multiplier)
  const reason = state.stealOpen ? 'Steal' : 'Correct'
  let next = withScore(state, teamId, amount, reason)
  next = {
    ...next,
    activeTeamId: teamId,
    stealOpen: false,
    scoredQuestionKey: key,
    scoredTeamId: teamId,
    timer: stopTimer(next.timer),
  }
  commit(next)
}

export function markIncorrect(teamId: string) {
  if (state.scoredQuestionKey === currentScoreKey(state)) return
  const challenge = currentChallenge(state)
  const penalty = challenge?.scoring.penalty ?? 0
  let next = penalty ? withScore(state, teamId, -Math.abs(penalty), 'Incorrect') : { ...state, activeTeamId: teamId }
  if (state.playMode === 'round-robin') {
    const index = next.teams.findIndex((team) => team.id === teamId)
    next = { ...next, activeTeamId: next.teams[(index + 1) % Math.max(next.teams.length, 1)]?.id ?? null }
  } else if (state.playMode === 'steal') {
    next = { ...next, stealOpen: true, activeTeamId: teamId }
  }
  commit(next)
}

export function passTurn() {
  if (!state.teams.length) return
  const index = state.teams.findIndex((team) => team.id === state.activeTeamId)
  const activeTeamId = state.teams[(index + 1) % state.teams.length].id
  commit({ ...state, activeTeamId, stealOpen: state.playMode === 'steal' ? true : state.stealOpen })
}

export function buzz(teamId: string) {
  commit({ ...state, activeTeamId: teamId, timer: stopTimer(state.timer) })
}

export function awardBonus(teamId: string, bonusId: string) {
  const bonus = currentChallenge(state)?.bonuses?.find((item) => item.id === bonusId)
  if (!bonus || state.awardedBonusIds.includes(bonusId)) return
  const next = withScore(state, teamId, bonus.points, bonus.prompt)
  commit({ ...next, awardedBonusIds: [...state.awardedBonusIds, bonusId], activeTeamId: teamId })
}

export function startTimer() {
  if (timerRemaining(state.timer) <= 0) {
    commit({ ...state, timer: { ...state.timer, elapsedMs: 0, running: true, startedAt: Date.now() } })
    return
  }
  commit({ ...state, timer: { ...state.timer, running: true, startedAt: Date.now() } })
}

export function pauseTimer() {
  commit({ ...state, timer: stopTimer(state.timer) })
}

export function resetTimer(seconds?: number) {
  const durationMs = (seconds ?? Math.round(state.timer.durationMs / 1000)) * 1000
  commit({ ...state, timer: { ...state.timer, durationMs, elapsedMs: 0, running: false, startedAt: null } })
}

export function expireTimer() {
  if (timerRemaining(state.timer) > 0) return
  const challenge = currentChallenge(state)
  const stopped = { ...state.timer, running: false, startedAt: null, elapsedMs: state.timer.durationMs }
  if (challenge?.type === 'lightning' && (state.timer.autoReveal || challenge.autoRevealOnExpire)) {
    const prompts = challenge.lightningPrompts ?? []
    const nextIndex = state.lightningIndex + 1
    if (nextIndex >= prompts.length) {
      commit({ ...state, timer: stopped, answerRevealed: true, phase: 'answer' })
      return
    }
    commit({
      ...state,
      timer: armTimer(challenge, true),
      lightningIndex: nextIndex,
      answerRevealed: false,
    })
    return
  }
  if (state.timer.autoReveal || challenge?.autoRevealOnExpire) {
    commit({
      ...state,
      timer: stopped,
      answerRevealed: true,
      phase: state.phase === 'final-question' ? 'final-question' : 'answer',
    })
    return
  }
  commit({ ...state, timer: stopped })
}

export function advanceLightning() {
  const challenge = currentChallenge(state)
  const prompts = challenge?.lightningPrompts ?? []
  const nextIndex = state.lightningIndex + 1
  if (nextIndex >= prompts.length) {
    commit({ ...state, answerRevealed: true, phase: 'answer', timer: stopTimer(state.timer) })
    return
  }
  commit({
    ...state,
    lightningIndex: nextIndex,
    answerRevealed: false,
    timer: armTimer(challenge, true),
  })
}

export function jumpTo(roundId: string, questionId: string) {
  const round = roundById(state.pack, roundId)
  commit(enterQuestion(state, roundId, questionId, round?.final ? 'final-wager' : state.phase === 'lobby' ? 'lobby' : 'question'))
}

export function nextQuestion() {
  const round = currentRound(state)
  if (!round) return
  const questions = questionsForRound(state, round)
  const index = questions.findIndex((question) => question.id === state.questionId)
  if (index >= 0 && index < questions.length - 1) {
    commit(enterQuestion(state, round.id, questions[index + 1].id))
    return
  }
  commit({
    ...state,
    phase: 'round-end',
    showScoreboard: true,
    questionRevealed: false,
    answerRevealed: false,
    timer: stopTimer(state.timer),
  })
}

export function prevQuestion() {
  const pointer = prevQuestionPointer(state)
  if (!pointer) return
  commit(enterQuestion(state, pointer.roundId, pointer.questionId))
}

export function endRound() {
  commit({
    ...state,
    phase: 'round-end',
    showScoreboard: true,
    questionRevealed: false,
    answerRevealed: false,
    timer: stopTimer(state.timer),
  })
}

export function nextRound() {
  const rounds = enabledRounds(state)
  const index = rounds.findIndex((round) => round.id === state.roundId)
  const upcoming = rounds[index + 1]
  if (!upcoming) {
    commit(withHistory({ ...state, phase: 'victory', showScoreboard: false, questionRevealed: false }))
    return
  }
  const questions = questionsForRound(state, upcoming)
  if (!questions[0]) return
  commit(enterQuestion(state, upcoming.id, questions[0].id, 'intro'))
}

export function setWager(teamId: string, wager: number) {
  const safe = Math.max(0, Math.min(wager, state.teams.find((team) => team.id === teamId)?.score ?? 0))
  commit({ ...state, finalState: { ...state.finalState, wagers: { ...state.finalState.wagers, [teamId]: safe } } })
}

export function setFinalAnswer(teamId: string, answer: string) {
  commit({ ...state, finalState: { ...state.finalState, answers: { ...state.finalState.answers, [teamId]: answer } } })
}

export function lockWagers() {
  const challenge = currentChallenge(state)
  const stage = currentStage(challenge, 0)
  commit({
    ...state,
    phase: 'final-question',
    finalState: { ...state.finalState, wagersLocked: true },
    questionRevealed: true,
    stageIndex: 0,
    mediaCue: stageMediaCue(stage, state.mediaCueSeq + 1, resolveMediaId),
    mediaCueSeq: state.mediaCueSeq + 1,
  })
}

export function lockFinalAnswers() {
  commit({
    ...state,
    phase: 'final-reveal',
    showScoreboard: false,
    answerRevealed: false,
    finalState: { ...state.finalState, answersLocked: true, revealIndex: 0 },
  })
}

export function stepFinalReveal() {
  const index = state.finalState.revealIndex
  const team = state.teams[index]
  if (!team) {
    commit(withHistory({ ...state, phase: 'victory', showScoreboard: false }))
    return
  }
  if (!state.finalState.scoredIds.includes(team.id)) {
    const challenge = currentChallenge(state)
    const guess = state.finalState.answers[team.id] ?? ''
    const wager = state.finalState.wagers[team.id] ?? 0
    const correct = challenge ? answerMatches(challenge, guess) : false
    const delta = correct ? wager : -Math.abs(wager)
    const scored = withScore(state, team.id, delta, 'Final wager')
    commit({
      ...scored,
      finalState: { ...scored.finalState, scoredIds: [...scored.finalState.scoredIds, team.id] },
    })
    return
  }
  if (index + 1 >= state.teams.length) {
    commit(withHistory({ ...state, phase: 'victory', showScoreboard: true }))
    return
  }
  commit({ ...state, finalState: { ...state.finalState, revealIndex: index + 1 } })
}

export function crownWinner() {
  commit(withHistory({ ...state, phase: 'victory', showScoreboard: false, questionRevealed: false, answerRevealed: false }))
}

export function newGame() {
  const round = enabledRounds(state)[0]
  const questionId = round ? questionsForRound(state, round)[0]?.id ?? '' : ''
  commit({
    ...enterQuestion({ ...state, teams: state.teams.map((team) => ({ ...team, score: 0 })), scoreLog: [], celebration: null }, round?.id ?? state.roundId, questionId, 'lobby'),
    phase: 'lobby',
    showScoreboard: false,
  })
}

export function resetGame() {
  const history = state.history
  commit({ ...createInitial(samplePack), history, revision: state.revision })
}

export function saveGame(name: string) {
  const slots = listSaveSlots()
  const slot: SaveSlot = { id: uid('save'), name, at: Date.now(), state }
  localStorage.setItem(SLOTS, JSON.stringify([slot, ...slots].slice(0, 12)))
}

export function listSaveSlots(): SaveSlot[] {
  try {
    const raw = localStorage.getItem(SLOTS)
    return raw ? (JSON.parse(raw) as SaveSlot[]) : []
  } catch {
    return []
  }
}

export function resumeGame(id: string) {
  const slot = listSaveSlots().find((item) => item.id === id)
  if (!slot) return
  commit({ ...slot.state, timer: { ...slot.state.timer, running: false, startedAt: null } })
}

export function upsertChallenge(challenge: Challenge) {
  const capped = { ...challenge, stages: challenge.stages.slice(0, 3) }
  const exists = state.pack.challenges.some((item) => item.id === capped.id)
  const challenges = exists
    ? state.pack.challenges.map((item) => (item.id === capped.id ? capped : item))
    : [...state.pack.challenges, capped]
  commit({ ...state, pack: { ...state.pack, challenges } })
}

export function deleteChallenge(id: string) {
  commit({
    ...state,
    pack: {
      ...state.pack,
      challenges: state.pack.challenges.filter((challenge) => challenge.id !== id),
      rounds: state.pack.rounds.map((round) => ({ ...round, questionIds: round.questionIds.filter((questionId) => questionId !== id) })),
    },
  })
}

export function upsertMedia(asset: Pack['media'][number]) {
  const media = state.pack.media.some((item) => item.id === asset.id)
    ? state.pack.media.map((item) => (item.id === asset.id ? asset : item))
    : [...state.pack.media, asset]
  commit({ ...state, pack: { ...state.pack, media } })
}

export function removeMedia(id: string) {
  commit({ ...state, pack: { ...state.pack, media: state.pack.media.filter((asset) => asset.id !== id) } })
}

export function updateRound(round: Round) {
  commit({ ...state, pack: { ...state.pack, rounds: state.pack.rounds.map((item) => (item.id === round.id ? round : item)) } })
}

export function moveRound(id: string, direction: -1 | 1) {
  const index = state.pack.rounds.findIndex((round) => round.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= state.pack.rounds.length) return
  const rounds = [...state.pack.rounds]
  const [item] = rounds.splice(index, 1)
  rounds.splice(target, 0, item)
  commit({ ...state, pack: { ...state.pack, rounds } })
}

export function duplicateRound(id: string) {
  const round = state.pack.rounds.find((item) => item.id === id)
  if (!round) return
  const copy: Round = { ...round, id: uid('round'), title: `${round.title} copy`, questionIds: [...round.questionIds] }
  const index = state.pack.rounds.findIndex((item) => item.id === id)
  const rounds = [...state.pack.rounds]
  rounds.splice(index + 1, 0, copy)
  commit({ ...state, pack: { ...state.pack, rounds } })
}

export function createRound() {
  const round: Round = {
    id: uid('round'),
    title: 'New Round',
    enabled: true,
    playMode: 'shout-out',
    answerMode: 'open',
    intro: 'A new round begins.',
    questionIds: [],
  }
  commit({ ...state, pack: { ...state.pack, rounds: [...state.pack.rounds, round] } })
}

export function moveQuestion(roundId: string, questionId: string, direction: -1 | 1) {
  const round = state.pack.rounds.find((item) => item.id === roundId)
  if (!round) return
  const index = round.questionIds.indexOf(questionId)
  const target = index + direction
  if (index < 0 || target < 0 || target >= round.questionIds.length) return
  const questionIds = [...round.questionIds]
  const [item] = questionIds.splice(index, 1)
  questionIds.splice(target, 0, item)
  updateRound({ ...round, questionIds })
}

export function addQuestionToRound(roundId: string, questionId: string) {
  const round = state.pack.rounds.find((item) => item.id === roundId)
  if (!round || round.questionIds.includes(questionId)) return
  updateRound({ ...round, questionIds: [...round.questionIds, questionId] })
}

export function applyRandomizer(input: RandomizerInput) {
  const rounds = buildRandomGame(state.pack, input)
  const first = rounds[0]
  commit({
    ...state,
    pack: { ...state.pack, rounds },
    familyMode: input.kids || state.familyMode,
    roundId: first?.id ?? state.roundId,
    questionId: first?.questionIds[0] ?? state.questionId,
    phase: 'lobby',
    questionRevealed: false,
    answerRevealed: false,
    showScoreboard: false,
  })
}

export function replacePack(pack: Pack) {
  const round = pack.rounds.find((item) => item.enabled) ?? pack.rounds[0]
  commit({
    ...createInitial(pack),
    teams: state.teams,
    history: state.history,
    theme: state.theme,
    volumes: state.volumes,
    reducedMotion: state.reducedMotion,
    familyMode: state.familyMode,
    roundId: round?.id ?? '',
    questionId: round?.questionIds[0] ?? '',
    revision: state.revision,
  })
}

export function useGame() {
  return useSyncExternalStore(subscribe, getState, getState)
}

export function blankChallenge(type: ChallengeType): Challenge {
  return {
    id: uid('q'),
    type,
    title: 'New challenge',
    category: 'General Halloween',
    difficulty: 'medium',
    audience: 'family',
    tags: ['General Halloween'],
    instructions: 'Name it.',
    hostNotes: '',
    answer: '',
    alternateAnswers: [],
    scoring: { mode: type === 'lightning' ? 'fixed' : 'decreasing', basePoints: 100, penalty: 0, stealMultiplier: 0.5 },
    timerSec: type === 'lightning' ? 12 : 30,
    timerStyle: type === 'lightning' ? 'sudden-death' : 'dramatic',
    stages: [
      { id: uid('stage'), label: 'Clue 1', publicText: '', points: 100 },
      { id: uid('stage'), label: 'Clue 2', publicText: '', points: 60 },
    ],
    lightningPrompts: type === 'lightning' ? [{ id: uid('bolt'), prompt: '', answer: '', points: 10 }] : undefined,
  }
}
