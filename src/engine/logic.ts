import type {
  Challenge,
  MediaAsset,
  Pack,
  PrivateState,
  PublicStage,
  PublicState,
  Round,
  Stage,
  Team,
} from './types'

export function uid(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}

export function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededShuffle<T>(items: T[], seed: string): T[] {
  const next = mulberry32(hashString(seed))
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

export function allowedChallenge(challenge: Challenge, familyMode: boolean): boolean {
  if (!familyMode) return true
  return challenge.audience === 'family'
}

export function enabledRounds(state: Pick<PrivateState, 'pack'>): Round[] {
  return state.pack.rounds.filter((round) => round.enabled)
}

export function challengeById(pack: Pack, id: string): Challenge | undefined {
  return pack.challenges.find((challenge) => challenge.id === id)
}

export function roundById(pack: Pack, id: string): Round | undefined {
  return pack.rounds.find((round) => round.id === id)
}

export function questionsForRound(state: PrivateState, round: Round): Challenge[] {
  return round.questionIds
    .map((id) => challengeById(state.pack, id))
    .filter((challenge): challenge is Challenge => Boolean(challenge))
    .filter((challenge) => allowedChallenge(challenge, state.familyMode))
}

export function currentRound(state: PrivateState): Round | undefined {
  return roundById(state.pack, state.roundId) ?? enabledRounds(state)[0]
}

export function currentChallenge(state: PrivateState): Challenge | undefined {
  return challengeById(state.pack, state.questionId)
}

export function currentScoreKey(state: Pick<PrivateState, 'questionId' | 'lightningIndex' | 'pack'>): string {
  const challenge = challengeById(state.pack, state.questionId)
  if (challenge?.type === 'lightning') return `${state.questionId}:${state.lightningIndex}`
  return state.questionId
}

export function currentStage(challenge: Challenge | undefined, stageIndex: number): Stage | undefined {
  if (!challenge || challenge.stages.length === 0) return undefined
  return challenge.stages[Math.max(0, Math.min(stageIndex, challenge.stages.length - 1))]
}

export function pointsAvailable(state: PrivateState): number {
  const challenge = currentChallenge(state)
  if (!challenge) return 0
  if (challenge.type === 'lightning') {
    const prompt = challenge.lightningPrompts?.[state.lightningIndex]
    return prompt?.points ?? challenge.scoring.basePoints
  }
  if (challenge.scoring.mode === 'wager') return challenge.scoring.basePoints
  const stage = currentStage(challenge, state.stageIndex)
  return stage?.points ?? challenge.scoring.basePoints
}

export function mediaAsset(pack: Pack, id: string): MediaAsset | undefined {
  return pack.media.find((asset) => asset.id === id)
}

export function timerRemaining(timer: PrivateState['timer'], now = Date.now()): number {
  const runningFor = timer.running && timer.startedAt ? Math.max(0, now - timer.startedAt) : 0
  return Math.max(0, timer.durationMs - timer.elapsedMs - runningFor)
}

export function sortedTeams(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

export function blankTimer(durationMs = 30000): PrivateState['timer'] {
  return {
    running: false,
    durationMs,
    startedAt: null,
    elapsedMs: 0,
    style: 'dramatic',
    autoReveal: false,
    tickSound: true,
  }
}

export function prepareBoard(challenge: Challenge | undefined): { timelineOrder: string[]; matchRightOrder: string[] } {
  if (!challenge) return { timelineOrder: [], matchRightOrder: [] }
  return {
    timelineOrder: seededShuffle(
      (challenge.timelineItems ?? []).map((item) => item.id),
      `${challenge.id}-timeline`,
    ),
    matchRightOrder: seededShuffle(
      (challenge.matchPairs ?? []).map((pair) => pair.id),
      `${challenge.id}-match`,
    ),
  }
}

export function nextQuestionPointer(state: PrivateState): { roundId: string; questionId: string } | null {
  const rounds = enabledRounds(state)
  const roundIndex = Math.max(0, rounds.findIndex((round) => round.id === state.roundId))
  const round = rounds[roundIndex]
  if (!round) return null
  const questions = questionsForRound(state, round)
  const questionIndex = questions.findIndex((question) => question.id === state.questionId)
  if (questionIndex >= 0 && questionIndex < questions.length - 1) {
    return { roundId: round.id, questionId: questions[questionIndex + 1].id }
  }
  const nextRound = rounds[roundIndex + 1]
  if (!nextRound) return null
  const nextQuestions = questionsForRound(state, nextRound)
  if (!nextQuestions[0]) return null
  return { roundId: nextRound.id, questionId: nextQuestions[0].id }
}

export function prevQuestionPointer(state: PrivateState): { roundId: string; questionId: string } | null {
  const rounds = enabledRounds(state)
  const roundIndex = Math.max(0, rounds.findIndex((round) => round.id === state.roundId))
  const round = rounds[roundIndex]
  if (!round) return null
  const questions = questionsForRound(state, round)
  const questionIndex = questions.findIndex((question) => question.id === state.questionId)
  if (questionIndex > 0) return { roundId: round.id, questionId: questions[questionIndex - 1].id }
  const prevRound = rounds[roundIndex - 1]
  if (!prevRound) return null
  const prevQuestions = questionsForRound(state, prevRound)
  const last = prevQuestions[prevQuestions.length - 1]
  if (!last) return null
  return { roundId: prevRound.id, questionId: last.id }
}

export function stageMediaCue(
  stage: Stage | undefined,
  seq: number,
  resolve?: (id: string) => string | null,
): PrivateState['mediaCue'] {
  if (!stage?.audio && !stage?.video) return null
  const clip = stage.audio ?? stage.video
  if (!clip) return null
  const special = clip.mediaId.startsWith('motif:') || clip.mediaId.startsWith('story:')
  return {
    id: seq,
    at: Date.now(),
    action: 'play',
    mediaId: clip.mediaId,
    start: clip.start,
    end: clip.end,
    description: clip.description,
    url: special ? null : resolve?.(clip.mediaId) ?? null,
  }
}

export function toPublic(state: PrivateState, resolveUrl: (id: string) => string | null): PublicState {
  const round = currentRound(state)
  const challenge = currentChallenge(state)
  const stage = currentStage(challenge, state.stageIndex)
  const showAnswer = state.answerRevealed || state.phase === 'answer' || state.phase === 'victory'
  const publicStage: PublicStage | null =
    state.questionRevealed && stage
      ? {
          publicText: stage.publicText,
          points: stage.points,
          image: stage.image
            ? {
                mediaId: stage.image.mediaId,
                url: resolveUrl(stage.image.mediaId) ?? '',
                effect: stage.image.effect,
              }
            : undefined,
          audio: stage.audio
            ? { mediaId: stage.audio.mediaId, start: stage.audio.start, end: stage.audio.end }
            : undefined,
          video: stage.video
            ? {
                url: resolveUrl(stage.video.mediaId),
                mediaId: stage.video.mediaId,
                start: stage.video.start,
                end: stage.video.end,
              }
            : undefined,
        }
      : null

  const timelineItems = challenge?.timelineItems ?? []
  const timeline = state.questionRevealed
    ? showAnswer
      ? [...timelineItems]
          .sort((a, b) => a.order - b.order)
          .map((item) => ({ label: item.label, order: item.order }))
      : state.timelineOrder
          .map((id) => timelineItems.find((item) => item.id === id))
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .map((item) => ({ label: item.label }))
    : undefined

  const pairs = challenge?.matchPairs ?? []
  const match = state.questionRevealed
    ? {
        left: pairs.map((pair) => pair.left),
        right: showAnswer
          ? pairs.map((pair) => pair.right)
          : state.matchRightOrder
              .map((id) => pairs.find((pair) => pair.id === id)?.right)
              .filter((value): value is string => Boolean(value)),
        pairs: showAnswer ? pairs.map((pair) => ({ left: pair.left, right: pair.right })) : undefined,
      }
    : undefined

  const lightningPrompt = challenge?.lightningPrompts?.[state.lightningIndex]
  const hidden = challenge?.higherLower?.hidden
  const shown = challenge?.higherLower?.shown
  let direction: 'higher' | 'lower' | undefined
  if (showAnswer && hidden && shown) direction = hidden.value >= shown.value ? 'higher' : 'lower'

  const revealTeam = state.teams[state.finalState.revealIndex]
  const finalCorrect = Boolean(challenge && revealTeam && answerMatches(challenge, state.finalState.answers[revealTeam.id] ?? ''))
  const wager = revealTeam ? state.finalState.wagers[revealTeam.id] ?? 0 : 0

  const winners = sortedTeams(state.teams)
    .filter((team, _, all) => team.score === all[0]?.score)
    .map((team) => team.name)

  return {
    revision: state.revision,
    phase: state.phase,
    theme: state.theme,
    reducedMotion: state.reducedMotion,
    showScoreboard: state.showScoreboard,
    showScoreStrip: state.showScoreStrip,
    ambienceOn: state.ambienceOn,
    volumes: state.volumes,
    teams: state.teams,
    activeTeamId: state.activeTeamId,
    roundTitle: round?.title ?? 'Spooknight',
    roundIntro: round?.intro,
    category: challenge?.category,
    difficulty: challenge?.difficulty,
    instructions: state.questionRevealed ? challenge?.instructions : undefined,
    points: pointsAvailable(state),
    questionRevealed: state.questionRevealed,
    answerRevealed: showAnswer,
    answerText: showAnswer ? challenge?.answer : undefined,
    stage: publicStage,
    stageIndex: state.stageIndex,
    stageCount: challenge?.stages.length ?? 0,
    choices:
      state.questionRevealed && state.answerMode === 'multiple-choice' ? challenge?.choices : undefined,
    challengeType: challenge?.type,
    factStatement: state.questionRevealed ? challenge?.factStatement : undefined,
    factTruth: showAnswer ? challenge?.factTruth : undefined,
    pair: state.questionRevealed
      ? challenge?.pair
        ? {
            a: challenge.pair.a,
            b: challenge.pair.b,
            first: showAnswer ? challenge.pair.first : undefined,
            detail: showAnswer ? challenge.pair.detail : undefined,
          }
        : undefined
      : undefined,
    higherLower:
      state.questionRevealed && shown && hidden
        ? {
            shown,
            hiddenLabel: hidden.label,
            hiddenValue: showAnswer ? hidden.value : undefined,
            direction,
          }
        : undefined,
    timeline,
    match,
    lightning:
      state.questionRevealed && lightningPrompt && challenge?.type === 'lightning'
        ? {
            prompt: lightningPrompt.prompt,
            index: state.lightningIndex,
            count: challenge.lightningPrompts?.length ?? 0,
            answer: showAnswer ? lightningPrompt.answer : undefined,
          }
        : undefined,
    bonuses: challenge?.bonuses?.map((bonus) => ({
      prompt: bonus.prompt,
      points: bonus.points,
      answer: state.awardedBonusIds.includes(bonus.id) || showAnswer ? bonus.answer : undefined,
    })),
    timer: state.timer,
    celebration: state.celebration,
    mediaCue: state.mediaCue,
    finalReveal:
      state.phase === 'final-reveal' && revealTeam
        ? {
            teamName: revealTeam.name,
            icon: revealTeam.icon,
            color: revealTeam.color,
            wager,
            answer: state.finalState.answers[revealTeam.id] || '—',
            correct: Boolean(revealTeam && state.finalState.scoredIds.includes(revealTeam.id) && finalCorrect),
            delta:
              revealTeam && state.finalState.scoredIds.includes(revealTeam.id)
                ? finalCorrect
                  ? wager
                  : -wager
                : 0,
            pending: !revealTeam || !state.finalState.scoredIds.includes(revealTeam.id),
          }
        : undefined,
    winners: state.phase === 'victory' ? winners : undefined,
  }
}

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function answerMatches(challenge: Challenge, guess: string): boolean {
  const needle = normalize(guess)
  if (!needle) return false
  const accepted = [challenge.answer, ...challenge.alternateAnswers].map(normalize)
  return accepted.some((answer) => answer === needle || (answer.length > 4 && needle.includes(answer)))
}

export function upcomingChallenge(state: PrivateState): Challenge | undefined {
  const pointer = nextQuestionPointer(state)
  if (!pointer) return undefined
  return challengeById(state.pack, pointer.questionId)
}

export function hostAudioDescription(challenge: Challenge | undefined, stageIndex: number): string {
  const stage = currentStage(challenge, stageIndex)
  return stage?.audio?.description || stage?.video?.description || ''
}
