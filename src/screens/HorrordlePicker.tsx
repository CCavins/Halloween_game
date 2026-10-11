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
  const [query, setQuery] = useState('')
  const included = horrordleMovies.filter((movie) => picks.decisions[movie.id])
  const needle = query.trim().toLowerCase()

  useEffect(() => initHost(), [])
  useEffect(() => {
    document.getElementById('horrordle-2025')?.scrollIntoView()
  }, [])

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
      <p className="notes">The 2025 list is every title from that Horrordle season. The first 31 were the daily games. Check the ones you want, then add them.</p>
      <label className="picker-search">Find a title
        <input value={query} placeholder="Search the list" onChange={(event) => setQuery(event.target.value)} />
      </label>
      {notice && <p className="picker-flag">{notice}</p>}
      {[2025, 2026].map((year) => {
        const movies = horrordleMovies.filter((movie) => movie.season === year && (!needle || movie.title.toLowerCase().includes(needle)))
        return (
          <section key={year} id={`horrordle-${year}`} className="picker-list">
            <h2>{year === 2025 ? `2025 list · ${movies.length}` : `October ${year} · ${movies.length}`}</h2>
            {movies.map((movie) => {
              const checked = Boolean(picks.decisions[movie.id])
              const owned = alreadyInPack(state.pack.challenges, movie)
              return (
                <label key={movie.id} className={checked ? 'picker-row on' : 'picker-row'}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(movie)} />
                  {movie.day ? <span className="picker-day">Oct {movie.day}</span> : <span className="picker-day">2025</span>}
                  <span className="picker-title">{movie.title}</span>
                  {owned && <span className="picker-flag">Already in the game</span>}
                </label>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}

function alreadyInPack(challenges: Challenge[], movie: HorrordleMovie) {
  const title = plainTitle(movie.title).toLowerCase()
  return challenges.some((challenge) => {
    if (challenge.hostNotes.startsWith('Chosen from') || challenge.hostNotes.includes('Horrordle')) return false
    const names = [challenge.answer, ...challenge.alternateAnswers].map((item) => item.toLowerCase())
    return names.some((name) => name === title || name.startsWith(`${title} `))
  })
}

type MovieClue = {
  audience?: 'family' | 'teen'
  difficulty?: 'easy' | 'medium' | 'hard'
  answer?: string
  alternates?: string[]
  notes: string
  clues: [string, string, string]
}

const movieClues: Record<string, MovieClue> = {
  Sinners: {
    difficulty: 'medium',
    notes: 'Sinners (2025), written and directed by Ryan Coogler. Michael B. Jordan plays twin brothers. Mississippi, 1932. Vampires.',
    clues: [
      'A 2025 horror film from Ryan Coogler, who directed Black Panther.',
      'Michael B. Jordan plays twin brothers who come home to the Mississippi Delta.',
      'It is 1932, and they open a juke joint. What is the film called?',
    ],
  },
  'Carrie (2013)': {
    difficulty: 'medium',
    notes: 'Carrie (2013), the remake with Chloë Grace Moretz. Stephen King. Not the 1976 film, which is a separate question.',
    answer: 'Carrie',
    alternates: ['Carrie 2013', 'Carrie (2013)'],
    clues: [
      'A 2013 remake of a famous Stephen King story.',
      'Chloë Grace Moretz plays a bullied teenager with a frightening gift.',
      'The story still ends at the prom. What is the film called?',
    ],
  },
  Obsession: {
    difficulty: 'hard',
    notes: 'Obsession (2025), written and directed by Curry Barker. A wish called One Wish Willow.',
    alternates: ['Obsession 2025'],
    clues: [
      'A 2025 horror film written and directed by Curry Barker.',
      'A man makes a wish that his crush will love him.',
      'The charm is called One Wish Willow. What is the film called?',
    ],
  },
  'Night of the Living Dead': {
    difficulty: 'medium',
    audience: 'family',
    notes: 'Night of the Living Dead (1968), George A. Romero. A farmhouse in Pennsylvania. The film is in the public domain.',
    clues: [
      'A 1968 black-and-white film directed by George A. Romero.',
      'Strangers barricade themselves in a Pennsylvania farmhouse.',
      'The things outside were not called zombies in the film. What is it called?',
    ],
  },
  'Final Destination Bloodlines': {
    difficulty: 'medium',
    notes: 'Final Destination Bloodlines (2025), the sixth film. Death comes for a family. Tony Todd appears.',
    alternates: ['Final Destination: Bloodlines', 'Final Destination 6'],
    clues: [
      'A 2025 film, the sixth in a series about cheating death.',
      'A college student inherits a warning that death is coming for her family.',
      'Tony Todd returns. What is this chapter called?',
    ],
  },
  'The Mist': {
    difficulty: 'medium',
    notes: 'The Mist (2007), Frank Darabont, from a Stephen King story. A supermarket. Do not describe the ending.',
    alternates: ['The Mist 2007'],
    clues: [
      'A 2007 film directed by Frank Darabont, from a Stephen King story.',
      'A strange fog rolls over a small town after a storm.',
      'People take shelter in a supermarket. What is the film called?',
    ],
  },
  NOPE: {
    difficulty: 'medium',
    notes: 'Nope (2022), Jordan Peele. A brother and sister on a horse ranch. Something in the sky.',
    alternates: ['Nope'],
    clues: [
      'A 2022 film written and directed by Jordan Peele.',
      'A brother and sister run a horse ranch in California.',
      'Something in the sky does not want to be filmed. What is the film called?',
    ],
  },
  'The Substance': {
    difficulty: 'medium',
    notes: 'The Substance (2024), Coralie Fargeat. Demi Moore. A treatment that creates a younger double. No graphic description.',
    clues: [
      'A 2024 film directed by Coralie Fargeat.',
      'Demi Moore plays a fading star who is offered a secret treatment.',
      'The treatment grows a younger version of her. What is the film called?',
    ],
  },
  Weapons: {
    difficulty: 'medium',
    notes: 'Weapons (2025), Zach Cregger. Seventeen children from one class leave home at the same moment. Josh Brolin and Julia Garner.',
    alternates: ['Weapons 2025'],
    clues: [
      'A 2025 horror film directed by Zach Cregger.',
      'Seventeen children from the same class run out of their homes at the same time.',
      'Josh Brolin and Julia Garner star. What is the film called?',
    ],
  },
  Tremors: {
    difficulty: 'easy',
    audience: 'family',
    notes: 'Tremors (1990). Kevin Bacon. The town is Perfection, Nevada. Underground monsters called Graboids.',
    alternates: ['Tremors 1990'],
    clues: [
      'A 1990 monster comedy with Kevin Bacon.',
      'The tiny desert town is called Perfection.',
      'Something under the ground hunts by sound. What is the film called?',
    ],
  },
  Eraserhead: {
    difficulty: 'hard',
    notes: 'Eraserhead (1977), David Lynch’s first feature. Black and white. Do not describe the creature.',
    alternates: ['Eraserhead 1977'],
    clues: [
      'A 1977 black-and-white film, David Lynch’s first feature.',
      'A nervous man in an industrial city becomes a father.',
      'The sound of the world is as strange as the pictures. What is the film called?',
    ],
  },
  'Speak No Evil (2022)': {
    difficulty: 'hard',
    notes: 'Speak No Evil (2022), the Danish film by Christian Tafdrup. Not the 2024 American remake unless they say that and you want to accept it.',
    answer: 'Speak No Evil',
    alternates: ['Speak No Evil 2022'],
    clues: [
      'A 2022 Danish horror film.',
      'A family accepts a weekend invitation from people they met on holiday.',
      'The hosts’ manners hide something wrong. What is the film called?',
    ],
  },
  'Halloween (2018)': {
    difficulty: 'medium',
    notes: 'Halloween (2018), David Gordon Green. Jamie Lee Curtis returns as Laurie Strode. A sequel to the 1978 film, not a remake. The 1978 film is a separate poster question.',
    answer: 'Halloween',
    alternates: ['Halloween 2018', 'Halloween (2018)'],
    clues: [
      'A 2018 sequel, not a remake, directed by David Gordon Green.',
      'Jamie Lee Curtis returns as Laurie Strode, forty years later.',
      'It ignores every sequel except the 1978 original. What is the film called?',
    ],
  },
  'The Fly': {
    difficulty: 'medium',
    notes: 'The Fly (1986), David Cronenberg, with Jeff Goldblum and Geena Davis. Accept the 1958 film if that is what they mean.',
    alternates: ['The Fly 1986', 'The Fly 1958'],
    clues: [
      'A 1986 film directed by David Cronenberg.',
      'Jeff Goldblum plays a scientist named Seth Brundle.',
      'An experiment with teleportation goes wrong. What is the film called?',
    ],
  },
  "Child's Play": {
    difficulty: 'easy',
    notes: 'Child’s Play (1988). The doll is Chucky, voiced by Brad Dourif.',
    alternates: ['Childs Play', 'Chucky'],
    clues: [
      'A 1988 horror film about a doll.',
      'A boy’s new toy says its name is Chucky.',
      'Brad Dourif voices the doll. What is the film called?',
    ],
  },
  Candyman: {
    difficulty: 'medium',
    notes: 'Candyman (1992), Bernard Rose, with Tony Todd and Virginia Madsen. Say the name five times. A 2021 film uses the same title.',
    alternates: ['Candyman 1992', 'Candyman 2021'],
    clues: [
      'A 1992 horror film starring Tony Todd.',
      'Say his name five times in front of a mirror.',
      'The story is set around Chicago’s Cabrini-Green. What is he called?',
    ],
  },
  'Ready or Not': {
    difficulty: 'medium',
    notes: 'Ready or Not (2019). Samara Weaving. A wedding-night game of hide and seek.',
    clues: [
      'A 2019 horror comedy.',
      'Samara Weaving plays a bride on her wedding night.',
      'The rich family plays a deadly game of hide and seek. What is the film called?',
    ],
  },
  'Funny Games': {
    difficulty: 'hard',
    notes: 'Funny Games (1997), Michael Haneke, or the 2007 American remake he also directed. Two young men torment a family. No graphic description.',
    alternates: ['Funny Games 1997', 'Funny Games 2007'],
    clues: [
      'A film directed by Michael Haneke. There is a 1997 original and a 2007 remake.',
      'Two polite young men show up at a family’s vacation house.',
      'They insist on playing a game. What is the film called?',
    ],
  },
  'Cabin Fever': {
    difficulty: 'medium',
    notes: 'Cabin Fever (2002), Eli Roth’s first feature. Friends rent a cabin. No graphic description of the illness.',
    alternates: ['Cabin Fever 2002'],
    clues: [
      'A 2002 film, Eli Roth’s first feature.',
      'Five friends rent a cabin in the woods.',
      'A stranger brings them a terrible infection. What is the film called?',
    ],
  },
  'Pet Sematary': {
    difficulty: 'medium',
    notes: 'Pet Sematary, Stephen King. The 1989 film is the usual answer. Accept 2019. The spelling is Sematary. The cat is Church.',
    alternates: ['Pet Sematary 1989', 'Pet Sematary 2019'],
    clues: [
      'A Stephen King story, filmed in 1989 and again in 2019.',
      'A family moves next to a pet cemetery with a misspelled sign.',
      'Beyond it is ground that does not give things back the same. What is the film called?',
    ],
  },
  'The Birds': {
    difficulty: 'easy',
    audience: 'family',
    notes: 'The Birds (1963), Alfred Hitchcock. Tippi Hedren. Bodega Bay.',
    alternates: ['The Birds 1963'],
    clues: [
      'A 1963 film directed by Alfred Hitchcock.',
      'Tippi Hedren travels to a coastal town.',
      'The town is Bodega Bay, and the birds attack. What is the film called?',
    ],
  },
  Cube: {
    difficulty: 'medium',
    notes: 'Cube (1997), Vincenzo Natali. Strangers wake in identical rooms. Some rooms are trapped.',
    alternates: ['Cube 1997'],
    clues: [
      'A 1997 Canadian science-fiction horror film.',
      'Strangers wake in a maze of identical rooms.',
      'Some rooms are safe. Some are not. What is the film called?',
    ],
  },
  'The Last House on the Left': {
    difficulty: 'hard',
    notes: 'The Last House on the Left (1972), Wes Craven’s first film. A 2009 remake exists. Do not describe the violence.',
    alternates: ['Last House on the Left', 'The Last House on the Left 1972'],
    clues: [
      'Wes Craven’s first feature, released in 1972.',
      'It was later remade in 2009.',
      'The title names the place the story ends. What is the film called?',
    ],
  },
  'Trilogy of Terror': {
    difficulty: 'hard',
    notes: 'Trilogy of Terror (1975), a TV movie. Karen Black plays a role in all three stories. The famous one has a Zuni fetish doll.',
    alternates: ['Trilogy of Terror 1975'],
    clues: [
      'A 1975 television horror film.',
      'Karen Black stars in all three stories.',
      'The best-known story has a tiny warrior doll. What is the film called?',
    ],
  },
  'The Witches': {
    difficulty: 'easy',
    audience: 'family',
    notes: 'The Witches (1990), Nicolas Roeg, from Roald Dahl. Anjelica Huston. Accept the 2020 film if that is what they mean.',
    alternates: ['The Witches 1990', 'The Witches 2020'],
    clues: [
      'A film from a Roald Dahl book. The famous one is from 1990.',
      'Anjelica Huston leads a gathering of witches at a seaside hotel.',
      'A boy and his grandmother are also staying there. What is the film called?',
    ],
  },
  Venom: {
    difficulty: 'easy',
    audience: 'family',
    notes: 'Venom (2018), with Tom Hardy. A Marvel film. Eddie Brock and the symbiote.',
    alternates: ['Venom 2018'],
    clues: [
      'A 2018 Marvel film starring Tom Hardy.',
      'A reporter named Eddie Brock bonds with an alien.',
      'The alien calls itself a name. What is that name?',
    ],
  },
}

function movieChallenge(movie: HorrordleMovie, existingId?: string): Challenge {
  const known = movieClues[movie.title]
  const challenge = blankChallenge('text-stage')
  const year = movieYear(movie.title)
  const title = known?.answer ?? plainTitle(movie.title)
  const lines = known?.clues ?? [
    'A horror film.',
    year ? `It is from ${year}.` : 'The title is the answer.',
    'What is the film called?',
  ]
  challenge.id = existingId || challenge.id
  challenge.title = title
  challenge.category = 'Movies'
  challenge.difficulty = known?.difficulty ?? 'medium'
  challenge.audience = known?.audience ?? 'teen'
  challenge.tags = ['Movies', challenge.audience === 'family' ? 'Family' : 'Teen']
  challenge.instructions = 'Name the film.'
  challenge.hostNotes = known?.notes ?? (movie.day
    ? `Chosen from the Horrordle calendar, October ${movie.day}, ${movie.season}.`
    : `Chosen from the ${movie.season} Horrordle list.`)
  challenge.answer = title
  challenge.alternateAnswers = known?.alternates ?? (movie.title === title ? [] : [movie.title])
  challenge.scoring = { mode: 'decreasing', basePoints: 100, penalty: 0, stealMultiplier: 0.5 }
  challenge.stages = lines.map((publicText, index) => ({
    id: uid('stage'),
    label: `Clue ${index + 1}`,
    publicText,
    points: [100, 50, 20][index],
  }))
  return challenge
}
