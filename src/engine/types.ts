export type PlayMode = 'shout-out' | 'round-robin' | 'steal' | 'buzz-in'
export type AnswerMode = 'open' | 'multiple-choice'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
export type Audience = 'family' | 'teen' | 'mature'
export type ThemeId = 'cinematic' | 'vhs' | 'classic' | 'neon' | 'family' | 'gothic'
export type TimerStyle = 'standard' | 'dramatic' | 'sudden-death'
export type Phase =
  | 'lobby'
  | 'intro'
  | 'question'
  | 'answer'
  | 'round-end'
  | 'final-wager'
  | 'final-question'
  | 'final-reveal'
  | 'victory'

export type ChallengeType =
  | 'image-stage'
  | 'audio-stage'
  | 'text-stage'
  | 'fact-or-fright'
  | 'which-came-first'
  | 'higher-lower'
  | 'timeline'
  | 'monster-match'
  | 'video-stage'
  | 'lightning'

export type ImageKind = 'crop' | 'blur' | 'pixelate' | 'silhouette' | 'zoom' | 'mask' | 'brightness' | 'none'
export type MaskKind = 'door' | 'fog' | 'flashlight' | 'curtain' | 'window'

export interface Crop {
  x: number
  y: number
  w: number
  h: number
}

export interface ImageEffect {
  kind: ImageKind
  crop?: Crop
  blur?: number
  pixelSize?: number
  zoom?: number
  mask?: MaskKind
  reveal?: number
  brightness?: number
}

export interface Stage {
  id: string
  label: string
  publicText?: string
  points: number
  image?: { mediaId: string; effect: ImageEffect }
  audio?: { mediaId: string; start: number; end: number; description: string }
  video?: { mediaId: string; start: number; end: number; description: string }
}

export interface Bonus {
  id: string
  prompt: string
  answer: string
  points: number
}

export interface TimelineItem {
  id: string
  label: string
  order: number
}

export interface MatchPair {
  id: string
  left: string
  right: string
}

export interface LightningPrompt {
  id: string
  prompt: string
  answer: string
  points: number
}

export interface Challenge {
  id: string
  type: ChallengeType
  title: string
  category: string
  difficulty: Difficulty
  audience: Audience
  tags: string[]
  instructions: string
  hostNotes: string
  answer: string
  alternateAnswers: string[]
  choices?: string[]
  bonuses?: Bonus[]
  timerSec?: number
  timerStyle?: TimerStyle
  autoRevealOnExpire?: boolean
  scoring: {
    mode: 'fixed' | 'decreasing' | 'wager'
    basePoints: number
    penalty?: number
    stealMultiplier?: number
  }
  stages: Stage[]
  factStatement?: string
  factTruth?: boolean
  pair?: { a: string; b: string; first: 'a' | 'b'; detail?: string }
  higherLower?: {
    shown: { label: string; value: number; unit: string }
    hidden: { label: string; value: number }
  }
  timelineItems?: TimelineItem[]
  matchPairs?: MatchPair[]
  lightningPrompts?: LightningPrompt[]
}

export interface MediaAsset {
  id: string
  title: string
  filename: string
  contentType: string
  source: string
  attribution?: string
  originalUrl?: string
  licenseNotes?: string
  generationPrompt?: string
  bundledPath?: string
}

export interface Round {
  id: string
  title: string
  enabled: boolean
  playMode: PlayMode
  answerMode: AnswerMode
  intro?: string
  questionIds: string[]
  final?: boolean
}

export interface Pack {
  id: string
  title: string
  themeSuggestion?: ThemeId
  rounds: Round[]
  challenges: Challenge[]
  media: MediaAsset[]
}

export interface Team {
  id: string
  name: string
  color: string
  icon: string
  score: number
  sound?: string
}

export interface ScoreEvent {
  id: string
  teamId: string
  delta: number
  reason: string
  at: number
}

export interface TimerState {
  running: boolean
  durationMs: number
  startedAt: number | null
  elapsedMs: number
  style: TimerStyle
  autoReveal: boolean
  tickSound: boolean
}

export interface MediaCue {
  id: number
  at: number
  action: 'play' | 'stop'
  mediaId: string
  start: number
  end: number
  description: string
  url?: string | null
}

export interface Celebration {
  id: number
  teamId: string
  points: number
  at: number
}

export interface HistoryEntry {
  id: string
  at: number
  title: string
  teams: { name: string; score: number; color: string; icon: string }[]
  winners: string[]
}

export interface SavedSlot {
  id: string
  name: string
  at: number
  state: PrivateState
}

export interface FinalState {
  wagers: Record<string, number>
  answers: Record<string, string>
  wagersLocked: boolean
  answersLocked: boolean
  revealIndex: number
  scoredIds: string[]
}

export interface PrivateState {
  teams: Team[]
  pack: Pack
  roundId: string
  questionId: string
  phase: Phase
  questionRevealed: boolean
  stageIndex: number
  answerRevealed: boolean
  showScoreboard: boolean
  showScoreStrip: boolean
  activeTeamId: string | null
  stealOpen: boolean
  playMode: PlayMode
  answerMode: AnswerMode
  timer: TimerState
  theme: ThemeId
  reducedMotion: boolean
  familyMode: boolean
  volumes: { music: number; sfx: number; media: number }
  ambienceOn: boolean
  scoreLog: ScoreEvent[]
  celebration: Celebration | null
  mediaCue: MediaCue | null
  mediaCueSeq: number
  celebrationSeq: number
  finalState: FinalState
  history: HistoryEntry[]
  lightningIndex: number
  timelineOrder: string[]
  matchRightOrder: string[]
  awardedBonusIds: string[]
  scoredQuestionKey: string | null
  scoredTeamId: string | null
  revision: number
}

export interface PublicStage {
  publicText?: string
  points: number
  image?: { url: string; mediaId: string; effect: ImageEffect }
  audio?: { mediaId: string; start: number; end: number }
  video?: { url: string | null; mediaId: string; start: number; end: number }
}

export interface PublicState {
  revision: number
  phase: Phase
  theme: ThemeId
  reducedMotion: boolean
  showScoreboard: boolean
  showScoreStrip: boolean
  ambienceOn: boolean
  volumes: { music: number; sfx: number; media: number }
  teams: Team[]
  activeTeamId: string | null
  roundTitle: string
  roundIntro?: string
  category?: string
  difficulty?: Difficulty
  instructions?: string
  points: number
  questionRevealed: boolean
  answerRevealed: boolean
  answerText?: string
  stage: PublicStage | null
  stageIndex: number
  stageCount: number
  choices?: string[]
  challengeType?: ChallengeType
  factStatement?: string
  factTruth?: boolean
  pair?: { a: string; b: string; first?: 'a' | 'b'; detail?: string }
  higherLower?: {
    shown: { label: string; value: number; unit: string }
    hiddenLabel: string
    hiddenValue?: number
    direction?: 'higher' | 'lower'
  }
  timeline?: { label: string; order?: number }[]
  match?: { left: string[]; right: string[]; pairs?: { left: string; right: string }[] }
  lightning?: { prompt: string; index: number; count: number; answer?: string }
  bonuses?: { prompt: string; points: number; answer?: string }[]
  timer: TimerState
  celebration: Celebration | null
  mediaCue: MediaCue | null
  finalReveal?: {
    teamName: string
    icon: string
    color: string
    wager: number
    answer: string
    correct: boolean
    delta: number
    pending: boolean
  }
  winners?: string[]
}

export const CATEGORIES = [
  'Family',
  'Teen',
  'Classic Horror',
  'Modern Horror',
  'Music',
  'Movies',
  'Television',
  'Kids',
  'Candy',
  'Halloween History',
  'General Halloween',
  'Very Difficult',
] as const

export const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'cinematic', label: 'Cinematic Haunted House' },
  { id: 'vhs', label: 'Retro Horror / VHS' },
  { id: 'classic', label: 'Classic Halloween' },
  { id: 'neon', label: 'Neon Monster Arcade' },
  { id: 'family', label: 'Family Halloween' },
  { id: 'gothic', label: 'Gothic Mansion' },
]
