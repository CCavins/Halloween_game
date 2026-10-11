import { useEffect, useState } from 'react'
import { horrordleMovies, movieYear, type HorrordleMovie } from '../content/horrordle'
import type { Challenge, Round } from '../engine/types'
import { uid } from '../engine/logic'
import {
  blankChallenge,
  deleteChallenge,
  initHost,
  saveRound,
  upsertChallenge,
  useGame,
} from '../state/store'

const STORAGE = 'spooknight-horrordle-picks-v1'

type SavedPicks = {
  decisions: Record<string, boolean>
  challengeIds: Record<string, string>
  roundId: string | null
}

const emptyPicks: SavedPicks = { decisions: {}, challengeIds: {}, roundId: null }

function loadPicks(): SavedPicks {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE) ?? '') as {
      decisions?: Record<string, boolean | string>
      challengeIds?: Record<string, string>
      roundId?: string | null
    }
    const decisions: Record<string, boolean> = {}
    Object.entries(parsed.decisions ?? {}).forEach(([id, value]) => {
      if (value === true || value === 'in') decisions[id] = true
    })
    return {
      decisions,
      challengeIds: parsed.challengeIds ?? {},
      roundId: parsed.roundId ?? null,
    }
  } catch {
    return emptyPicks
  }
}

function savePicks(picks: SavedPicks) {
  localStorage.setItem(STORAGE, JSON.stringify(picks))
}

function plainTitle(title: string) {
  return title.replace(/\s*\(\d{4}\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

export function HorrordlePicker() {
  const state = useGame()
  const [picks, setPicks] = useState<SavedPicks>(loadPicks)
  const [notice, setNotice] = useState('')
  const included = horrordleMovies.filter((movie) => picks.decisions[movie.id])

  useEffect(() => initHost(), [])

  function toggle(movie: HorrordleMovie) {
    const next = { ...picks, decisions: { ...picks.decisions, [movie.id]: !picks.decisions[movie.id] } }
    setPicks(next)
    savePicks(next)
  }

  function addToGame() {
    const chosen = horrordleMovies.filter((item) => picks.decisions[item.id])
    const challengeIds = { ...picks.challengeIds }
    chosen.forEach((item) => {
      const challenge = movieChallenge(item, challengeIds[item.id])
      challengeIds[item.id] = challenge.id
      upsertChallenge(challenge)
    })
    Object.entries(challengeIds).forEach(([movieId, challengeId]) => {
      if (!picks.decisions[movieId]) {
        deleteChallenge(challengeId)
        delete challengeIds[movieId]
      }
    })
    const roundId = picks.roundId ?? uid('round')
    const round: Round = {
      id: roundId,
      title: 'Horrordle picks',
      enabled: true,
      playMode: 'shout-out',
      answerMode: 'open',
      intro: 'Movies chosen from the Horrordle calendar.',
      questionIds: chosen.map((item) => challengeIds[item.id]).filter(Boolean),
    }
    saveRound(round)
    const next = { ...picks, challengeIds, roundId }
    setPicks(next)
    savePicks(next)
    setNotice(chosen.length ? `${chosen.length} movies are in the Horrordle picks round.` : 'Nothing is selected.')
  }

  return (
    <div className="host calm book picker">
      <header className="calm-bar">
        <div>
          <p className="eyebrow">Host only</p>
          <strong>{included.length} selected</strong>
        </div>
        <a className="text-button" href="#/host">Back to the game</a>
        <button type="button" className="primary" onClick={addToGame} disabled={included.length === 0}>Add selected to the game</button>
      </header>
      <h1>Which movies should we use?</h1>
      <p className="notes">Check the Horrordle dailies you want in the night. This list stays on the laptop.</p>
      {notice && <p className="picker-flag">{notice}</p>}
      {[2026, 2025].map((year) => (
        <section key={year} className="picker-list">
          <h2>October {year}</h2>
          {horrordleMovies.filter((movie) => movie.season === year).map((movie) => {
            const checked = Boolean(picks.decisions[movie.id])
            const owned = alreadyInPack(state.pack.challenges, movie)
            return (
              <label key={movie.id} className={checked ? 'picker-row on' : 'picker-row'}>
                <input type="checkbox" checked={checked} onChange={() => toggle(movie)} />
                <span className="picker-day">Oct {movie.day}</span>
                <span className="picker-title">{movie.title}</span>
                {owned && <span className="picker-flag">Already in the game</span>}
              </label>
            )
          })}
        </section>
      ))}
    </div>
  )
}

function alreadyInPack(challenges: Challenge[], movie: HorrordleMovie) {
  const title = plainTitle(movie.title).toLowerCase()
  return challenges.some((challenge) => {
    if (challenge.hostNotes.includes(`October ${movie.day}, ${movie.season}`)) return false
    const names = [challenge.answer, ...challenge.alternateAnswers].map((item) => item.toLowerCase())
    return names.some((name) => name === title || name.startsWith(`${title} `))
  })
}

function movieChallenge(movie: HorrordleMovie, existingId?: string): Challenge {
  const challenge = blankChallenge('text-stage')
  const year = movieYear(movie.title)
  const title = plainTitle(movie.title)
  challenge.id = existingId || challenge.id
  challenge.title = title
  challenge.category = 'Movies'
  challenge.difficulty = 'medium'
  challenge.audience = 'teen'
  challenge.tags = ['Movies', 'Teen']
  challenge.instructions = 'Name the film.'
  challenge.hostNotes = `Chosen from the Horrordle calendar, October ${movie.day}, ${movie.season}. Edit the clues if you want a more specific hint.`
  challenge.answer = title
  challenge.alternateAnswers = movie.title === title ? [] : [movie.title]
  challenge.scoring = { mode: 'decreasing', basePoints: 100, penalty: 0, stealMultiplier: 0.5 }
  challenge.stages = [
    { id: uid('stage'), label: 'Clue 1', publicText: 'A horror film.', points: 100 },
    { id: uid('stage'), label: 'Clue 2', publicText: year ? `It is from ${year}.` : 'The title is the answer.', points: 50 },
    { id: uid('stage'), label: 'Clue 3', publicText: 'What is the film called?', points: 20 },
  ]
  return challenge
}
