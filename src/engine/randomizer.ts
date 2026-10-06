import type { Challenge, Difficulty, Pack, Round } from './types'
import { uid } from './logic'

export interface RandomizerInput {
  minutes: number
  difficulty: Difficulty | 'any'
  categories: string[]
  kids: boolean
}

const RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2, expert: 3 }

function fits(challenge: Challenge, input: RandomizerInput): boolean {
  if (input.kids && challenge.audience !== 'family') return false
  if (input.difficulty !== 'any' && RANK[challenge.difficulty] > RANK[input.difficulty]) return false
  if (input.categories.length === 0) return true
  const tags = [challenge.category, ...challenge.tags]
  return input.categories.some((category) => tags.includes(category))
}

export function buildRandomGame(pack: Pack, input: RandomizerInput): Round[] {
  const target = Math.max(6, Math.round(input.minutes / 1.4))
  const pool = pack.challenges.filter((challenge) => fits(challenge, input) && challenge.scoring.mode !== 'wager')
  const finals = pack.challenges.filter((challenge) => challenge.scoring.mode === 'wager' && fits(challenge, input))
  const picked: Challenge[] = []
  const unused = [...pool]
  while (picked.length < target && unused.length) {
    const lastType = picked[picked.length - 1]?.type
    const different = unused.filter((challenge) => challenge.type !== lastType)
    const source = different.length ? different : unused
    const index = Math.floor(Math.random() * source.length)
    const [choice] = source.splice(index, 1)
    const unusedIndex = unused.findIndex((challenge) => challenge.id === choice.id)
    if (unusedIndex >= 0) unused.splice(unusedIndex, 1)
    picked.push(choice)
  }
  const chunk = Math.max(3, Math.ceil(picked.length / 4))
  const rounds: Round[] = []
  for (let i = 0; i < picked.length; i += chunk) {
    const slice = picked.slice(i, i + chunk)
    rounds.push({
      id: uid('round'),
      title: `Round ${rounds.length + 1}`,
      enabled: true,
      playMode: slice[0]?.type === 'lightning' ? 'shout-out' : i % 2 === 0 ? 'shout-out' : 'round-robin',
      answerMode: slice.some((challenge) => (challenge.choices?.length ?? 0) > 0) ? 'multiple-choice' : 'open',
      intro: 'A fresh haunt begins.',
      questionIds: slice.map((challenge) => challenge.id),
    })
  }
  const finale = finals[0]
  if (finale) {
    rounds.push({
      id: uid('final'),
      title: 'Final Round',
      enabled: true,
      playMode: 'shout-out',
      answerMode: 'open',
      intro: 'Wager what you dare.',
      questionIds: [finale.id],
      final: true,
    })
  }
  return rounds
}
