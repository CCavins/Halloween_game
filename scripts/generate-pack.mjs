import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const posters = JSON.parse(await readFile(resolve(root, 'src/content/posters.json'), 'utf8'))

const stage = (id, label, points, extra = {}) => ({ id, label, points, ...extra })
const text = (id, label, points, publicText) => stage(id, label, points, { publicText })

const pack = {
  id: 'spooknight',
  version: 25,
  title: 'Spooknight',
  themeSuggestion: 'cinematic',
  media: [],
  rounds: [],
  challenges: [],
}

const CREDIT = 'Poster from The Movie Database (TMDB). Saved in the game so the TV does not need the other site.'

for (const [id, poster] of Object.entries(posters)) {
  pack.media.push({
    id,
    title: `${poster.title} poster`,
    filename: `${id}.jpg`,
    contentType: 'image/jpeg',
    source: 'tmdb',
    attribution: 'TMDB',
    bundledPath: `media/posters/${id}.jpg`,
    licenseNotes: CREDIT,
  })
}

for (const [id, title, filename] of [
  ['m-coffin-swap', 'Coffin stand-in', 'scene-coffin-swap.jpg'],
  ['m-coffin-original', 'Coffin original', 'scene-coffin-original.jpg'],
  ['m-wolf-swap', 'Desk stand-in', 'scene-wolf-swap.jpg'],
  ['m-wolf-original', 'Desk original', 'scene-wolf-original.jpg'],
  ['m-dracula-swap', 'Point stand-in', 'scene-dracula-swap.jpg'],
  ['m-dracula-original', 'Point original', 'scene-dracula-original.jpg'],
  ['m-mummy-swap', 'Hats stand-in', 'scene-mummy-swap.jpg'],
  ['m-mummy-original', 'Hats original', 'scene-mummy-original.jpg'],
]) {
  pack.media.push({
    id,
    title,
    filename,
    contentType: 'image/jpeg',
    source: 'local',
    bundledPath: `media/scenes/${filename}`,
  })
}

function round(id, title, intro, final, playMode, answerMode, questionIds) {
  pack.rounds.push({ id, title, enabled: true, playMode, answerMode, intro, questionIds, final })
}

const baseScore = (mode = 'decreasing', basePoints = 100, penalty = 0) => ({
  mode,
  basePoints,
  penalty,
  stealMultiplier: 0.5,
})

function challenge(partial) {
  const count = (partial.stages ?? []).length
  const onePicture = Boolean(partial.answerMediaId) && count === 1
  if (partial.type !== 'lightning' && !onePicture && count !== 3) throw new Error(`${partial.id} has ${count} clues`)
  if (count > 3) throw new Error(`${partial.id} has more than 3 clues`)
  pack.challenges.push({
    alternateAnswers: [],
    tags: [partial.category],
    timerSec: 30,
    timerStyle: 'dramatic',
    autoRevealOnExpire: false,
    scoring: baseScore(),
    stages: [],
    ...partial,
  })
}

function poster(id, meta) {
  const mediaId = meta.mediaId
  challenge({
    id,
    type: 'image-stage',
    title: meta.title,
    category: 'Movies',
    difficulty: meta.difficulty,
    audience: meta.audience,
    tags: meta.tags,
    instructions: 'Name this film from the poster.',
    hostNotes: meta.hostNotes,
    answer: meta.answer,
    alternateAnswers: meta.alternateAnswers ?? [],
    stages: [
      stage(`${id}-1`, 'A piece', 100, {
        publicText: 'A piece of the poster.',
        image: { mediaId, effect: { kind: 'crop', crop: { x: 20, y: 32, w: 60, h: 20 } } },
      }),
      stage(`${id}-2`, 'Wider', 50, {
        image: { mediaId, effect: { kind: 'crop', crop: { x: 8, y: 28, w: 84, h: 44 } } },
      }),
      stage(`${id}-3`, 'Full poster', 20, {
        image: { mediaId, effect: { kind: 'none' } },
      }),
    ],
  })
}

function clues(id, meta, lines) {
  const points = [100, 60, 30]
  challenge({
    id,
    type: 'text-stage',
    title: meta.title,
    category: meta.category,
    difficulty: meta.difficulty,
    audience: meta.audience,
    tags: meta.tags,
    instructions: meta.instructions ?? 'Three clues. Name it.',
    hostNotes: meta.hostNotes,
    answer: meta.answer,
    alternateAnswers: meta.alternateAnswers ?? [],
    stages: lines.slice(0, 3).map((line, index) => text(`${id}-${index + 1}`, `Clue ${index + 1}`, points[index], line)),
  })
}

round('r-warmup', 'Halloween Warm-Up', 'A gentle start. The room wakes up.', false, 'shout-out', 'open', [
  'q-turnip',
])
round('r-posters', "What's That Poster?", 'Real posters, loaded as they are revealed. Points fall as more of the picture shows.', false, 'shout-out', 'open', [
  'q-poster-halloween', 'q-poster-shining', 'q-poster-scream', 'q-poster-jaws', 'q-poster-hocus', 'q-poster-potter', 'q-poster-nightmare',
  'q-poster-exorcist', 'q-poster-elm', 'q-poster-conjuring', 'q-poster-it', 'q-poster-addams', 'q-poster-poltergeist',
])
round('r-horrordle', 'Horrordle', 'Three frames. Name the film.', false, 'shout-out', 'open', [
  'q-hd-sinners', 'q-hd-carrie', 'q-hd-obsession', 'q-hd-livingdead', 'q-hd-bloodlines', 'q-hd-mist',
  'q-hd-nope', 'q-hd-substance', 'q-hd-weapons', 'q-hd-tremors', 'q-hd-eraserhead', 'q-hd-speaknoevil',
  'q-hd-halloween', 'q-hd-fly', 'q-hd-childsplay', 'q-hd-candyman', 'q-hd-readyornot', 'q-hd-funnygames',
  'q-hd-cabinfever', 'q-hd-sematary', 'q-hd-birds', 'q-hd-cube', 'q-hd-lasthouse', 'q-hd-trilogy',
  'q-hd-witches', 'q-hd-venom',
])
round('r-classic', 'Classic Horror', 'Famous titles. Three clues each.', false, 'steal', 'open', [
  'q-psycho', 'q-nosferatu', 'q-frankenstein', 'q-first-novels', 'q-carrie', 'q-omen', 'q-rosemary', 'q-alien', 'q-friday', 'q-lostboys',
])
round('r-modern', 'Newer and Nearby', 'Horror movies a party is likely to know.', false, 'shout-out', 'open', [
  'q-us', 'q-talk', 'q-smile', 'q-getout', 'q-hereditary', 'q-quiet', 'q-ring', 'q-sixth', 'q-midsommar', 'q-megan',
])
round('r-kids', 'For the Kids', 'Movies and shows children actually know.', false, 'round-robin', 'open', [
  'q-poster-coraline', 'q-poster-coco', 'q-poster-monsters', 'q-poster-hotel', 'q-poster-casper', 'q-poster-labyrinth',
  'q-pumpkin-special', 'q-scooby', 'q-gravity', 'q-owl', 'q-adventure', 'q-afraid', 'q-halloweentown', 'q-goosebumps', 'q-monsterhouse', 'q-corpse',
])
round('r-costumes', 'Guess the Costume', 'Guess the costume from the items.', false, 'shout-out', 'open', [
  'q-build-witch', 'q-build-dino', 'q-build-buzz', 'q-build-elsa', 'q-build-rumi',
  'q-build-pirate', 'q-build-potter', 'q-build-bluey', 'q-build-carrie', 'q-build-wonder',
  'q-build-dorothy', 'q-build-jedi', 'q-build-woody', 'q-build-moana', 'q-build-jack',
  'q-build-iron', 'q-build-sonic', 'q-build-mira', 'q-build-jason', 'q-build-paddington',
  'q-build-vampire', 'q-build-super', 'q-build-wednesday', 'q-build-astro', 'q-build-myers',
])
round('r-season', 'Candy, Costumes, and Customs', 'Familiar Halloween questions. Three clues each.', false, 'shout-out', 'multiple-choice', [
  'q-candycorn', 'q-costume-vampire', 'q-apples', 'q-blackcat', 'q-allhallows',
])
round('r-quiznight', 'Quiz Night', 'Villains, a connection, a list, and a board. The shapes a pub quiz uses.', false, 'shout-out', 'open', [
  'q-villain-witch', 'q-villain-dracula', 'q-connect-burton', 'q-sisters', 'q-match-monsters', 'q-higher-years',
  'q-villain-myers', 'q-villain-freddy', 'q-villain-pennywise', 'q-timeline-slashers',
])
round('r-scenes', 'Missing Monsters', 'Someone is standing where a monster stood. Name the original scene.', false, 'shout-out', 'open', [
  'q-scene-coffin', 'q-scene-wolf', 'q-scene-dracula', 'q-scene-mummy',
])
round('r-lightning', 'Lightning Round', 'Fast questions.', false, 'shout-out', 'open', ['q-lightning'])
round('r-final', 'One Last Film', 'Name the film.', false, 'shout-out', 'open', ['q-final'])

function scene(id, meta) {
  challenge({
    id,
    type: 'image-stage',
    title: meta.title,
    category: 'Movies',
    difficulty: 'medium',
    audience: 'family',
    tags: ['Movies', 'Classic Horror', 'Family'],
    instructions: "Someone took the monster's place. Name the original scene.",
    hostNotes: meta.hostNotes,
    answer: meta.answer,
    alternateAnswers: meta.alternateAnswers,
    answerMediaId: meta.originalId,
    scoring: baseScore('fixed', 100),
    stages: [
      stage(`${id}-1`, 'The picture', 100, { image: { mediaId: meta.swapId, effect: { kind: 'none' } } }),
    ],
  })
}

scene('q-scene-coffin', {
  title: 'The Coffin',
  swapId: 'm-coffin-swap',
  originalId: 'm-coffin-original',
  hostNotes: 'Abbott and Costello Meet Frankenstein. One picture. Reveal shows the original still.',
  answer: "Dracula standing over Frankenstein's monster who is in the coffin",
  alternateAnswers: ["Dracula standing over Frankenstein's monster", "Dracula and Frankenstein's monster"],
})

scene('q-scene-wolf', {
  title: 'The Desk',
  swapId: 'm-wolf-swap',
  originalId: 'm-wolf-original',
  hostNotes: 'Abbott and Costello Meet Frankenstein. The seated man stays. One picture. Reveal shows the original still.',
  answer: 'The Wolf Man standing behind the man at the desk',
  alternateAnswers: ['The Wolf Man standing behind Lou Costello', 'Wolf Man behind the man at the desk'],
})

scene('q-scene-dracula', {
  title: 'The Point',
  swapId: 'm-dracula-swap',
  originalId: 'm-dracula-original',
  hostNotes: 'Abbott and Costello Meet Frankenstein. The man in the uniform stays. One picture. Reveal shows the original still.',
  answer: 'Dracula pointing at the man in the uniform',
  alternateAnswers: ['Dracula pointing at Lou Costello', 'Dracula hypnotizing the man in the uniform'],
})

scene('q-scene-mummy', {
  title: 'The Hats',
  swapId: 'm-mummy-swap',
  originalId: 'm-mummy-original',
  hostNotes: 'Abbott and Costello Meet the Mummy. The two men holding their hats stay. One picture. Reveal shows the original still.',
  answer: 'The Mummy standing next to the two men holding their hats',
  alternateAnswers: ['The Mummy standing beside Abbott and Costello', 'The Mummy next to Abbott and Costello'],
})

clues('q-turnip', {
  title: 'Before the Pumpkin', category: 'Halloween History', difficulty: 'easy', audience: 'family',
  tags: ['Halloween History', 'Family', 'Kids'],
  hostNotes: 'Irish and Scottish lanterns were carved from turnips or other hard roots before pumpkins became the American version.',
  answer: 'Turnip', alternateAnswers: ['A turnip', 'Turnips'],
}, [
  'Long before porch pumpkins, people in Ireland and Scotland hollowed out a hard root vegetable and carried it as a lantern.',
  'Folklore tied the lantern to Stingy Jack, said to wander with a glowing coal inside.',
  'It is pale and peppery. What was carved first?',
])

poster('q-poster-halloween', {
  mediaId: 'p-halloween', title: 'A Holiday Title', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Modern Horror', 'Teen'],
  hostNotes: 'Halloween (1978), directed by John Carpenter. Not the later sequels. Keep the room off graphic detail.',
  answer: 'Halloween', alternateAnswers: ['Halloween 1978', "John Carpenter's Halloween"],
})
poster('q-poster-shining', {
  mediaId: 'p-shining', title: 'The Overlook', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Classic Horror', 'Teen'],
  hostNotes: 'The Shining (1980), directed by Stanley Kubrick, from Stephen King’s novel.',
  answer: 'The Shining', alternateAnswers: ['Shining'],
})
poster('q-poster-scream', {
  mediaId: 'p-scream', title: 'The Phone', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Modern Horror', 'Teen'],
  hostNotes: 'Scream (1996), directed by Wes Craven. Not the later sequels.',
  answer: 'Scream', alternateAnswers: ['Scream 1996'],
})
poster('q-poster-jaws', {
  mediaId: 'p-jaws', title: 'The Water', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family'],
  hostNotes: 'Jaws (1975), directed by Steven Spielberg.',
  answer: 'Jaws', alternateAnswers: ['Jaws 1975'],
})
poster('q-poster-hocus', {
  mediaId: 'p-hocus', title: 'The Sisters Again', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family', 'Kids'],
  hostNotes: 'Hocus Pocus (1993). Accept the title even if they already had the emoji version.',
  answer: 'Hocus Pocus', alternateAnswers: [],
})
poster('q-poster-potter', {
  mediaId: 'p-potter', title: 'The First Year', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family', 'Kids'],
  hostNotes: 'The 2001 film. Accept either Sorcerer’s Stone or Philosopher’s Stone.',
  answer: "Harry Potter and the Sorcerer's Stone",
  alternateAnswers: ["Harry Potter and the Philosopher's Stone", 'Harry Potter', 'Sorcerers Stone', 'Philosophers Stone'],
})
poster('q-poster-nightmare', {
  mediaId: 'p-nightmare', title: 'Two Holidays', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family', 'Kids'],
  hostNotes: 'The Nightmare Before Christmas (1993). Henry Selick directed. Tim Burton produced and wrote the story.',
  answer: 'The Nightmare Before Christmas', alternateAnswers: ['Nightmare Before Christmas'],
})
poster('q-poster-exorcist', {
  mediaId: 'p-exorcist', title: 'The Stairs', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Classic Horror', 'Teen'],
  hostNotes: 'The Exorcist (1973), directed by William Friedkin. Do not describe graphic scenes.',
  answer: 'The Exorcist', alternateAnswers: ['The Exorcist 1973'],
})
poster('q-poster-elm', {
  mediaId: 'p-elm', title: 'The Sweater', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Modern Horror', 'Teen'],
  hostNotes: 'A Nightmare on Elm Street (1984), Wes Craven. Freddy Krueger. Not the 2010 remake.',
  answer: 'A Nightmare on Elm Street', alternateAnswers: ['Nightmare on Elm Street', 'Elm Street'],
})
poster('q-poster-conjuring', {
  mediaId: 'p-conjuring', title: 'The Farmhouse', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Modern Horror', 'Teen'],
  hostNotes: 'The Conjuring (2013), James Wan. Ed and Lorraine Warren. Not the sequels.',
  answer: 'The Conjuring', alternateAnswers: ['The Conjuring 2013'],
})
poster('q-poster-it', {
  mediaId: 'p-it', title: 'The Balloon', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Modern Horror', 'Teen'],
  hostNotes: 'It (2017), from Stephen King’s novel. Accept It or It Chapter One. Pennywise.',
  answer: 'It', alternateAnswers: ['It 2017', 'It Chapter One', 'IT'],
})
poster('q-poster-addams', {
  mediaId: 'p-addams', title: 'The House', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family', 'Kids'],
  hostNotes: 'The Addams Family (1991), with Anjelica Huston and Raul Julia. Accept the family name.',
  answer: 'The Addams Family', alternateAnswers: ['Addams Family', 'The Addams Family 1991'],
})
poster('q-poster-poltergeist', {
  mediaId: 'p-poltergeist', title: 'The Television', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Classic Horror', 'Teen'],
  hostNotes: 'Poltergeist (1982), produced by Steven Spielberg, directed by Tobe Hooper. Not the 2015 remake.',
  answer: 'Poltergeist', alternateAnswers: ['Poltergeist 1982'],
})


const FRAME_NOTE = 'Frame from Horrordle. Saved in the game so the TV does not need Horrordle.'
const STILL_NOTE = 'Still from The Movie Database (TMDB). Saved in the game so the TV does not need the other site.'

function stills(id, meta, paths) {
  const points = [100, 60, 30]
  const stages = paths.map((_file, index) => {
    const n = index + 1
    const mediaId = `${id}-f${n}`
    pack.media.push({
      id: mediaId,
      title: `${meta.answer} still ${n}`,
      filename: `${mediaId}.jpg`,
      contentType: 'image/jpeg',
      source: 'tmdb',
      attribution: 'TMDB',
      bundledPath: `media/stills/${mediaId}.jpg`,
      licenseNotes: STILL_NOTE,
    })
    return stage(`${id}-${n}`, `Frame ${n}`, points[index], {
      image: { mediaId, effect: { kind: 'none' } },
    })
  })
  challenge({
    id,
    type: 'image-stage',
    title: meta.title,
    category: 'Movies',
    difficulty: meta.difficulty,
    audience: meta.audience,
    tags: meta.tags,
    instructions: 'Name this film from the frame.',
    hostNotes: meta.hostNotes,
    answer: meta.answer,
    alternateAnswers: meta.alternateAnswers ?? [],
    scoring: baseScore('decreasing', points[0]),
    stages,
  })
}

function frames(id, meta) {
  const points = [100, 60, 30]
  const stages = [1, 2, 3].map((n) => {
    const mediaId = `${id}-f${n}`
    const ext = meta.ext || 'jpg'
    pack.media.push({
      id: mediaId,
      title: `${meta.answer} frame ${n}`,
      filename: `${mediaId}.${ext}`,
      contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
      source: 'horrordle',
      attribution: 'Horrordle',
      bundledPath: `media/horrordle/${mediaId}.${ext}`,
      licenseNotes: FRAME_NOTE,
    })
    return stage(`${id}-${n}`, `Frame ${n}`, points[n - 1], {
      image: { mediaId, effect: { kind: 'none' } },
    })
  })
  challenge({
    id,
    type: 'image-stage',
    title: meta.title,
    category: 'Movies',
    difficulty: meta.difficulty,
    audience: meta.audience,
    tags: meta.tags,
    instructions: 'Name this film from the frame.',
    hostNotes: meta.hostNotes,
    answer: meta.answer,
    alternateAnswers: meta.alternateAnswers ?? [],
    scoring: baseScore('decreasing', points[0]),
    stages,
  })
}

frames('q-hd-sinners', {
  title: 'Sinners', category: 'Movies', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'Sinners (2025), written and directed by Ryan Coogler. Michael B. Jordan plays twin brothers. Mississippi, 1932. Vampires.',
  answer: 'Sinners', alternateAnswers: ['Sinners 2025'],
  folder: 'Sinners',
  root: 'images',
})

frames('q-hd-carrie', {
  title: 'Carrie', category: 'Movies', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'Carrie (2013), the remake with Chloë Grace Moretz. Stephen King. Not the 1976 film, which is a separate question.',
  answer: 'Carrie', alternateAnswers: ['Carrie 2013', 'Carrie (2013)'],
  folder: 'Carrie (2013)',
  root: 'images',
})

frames('q-hd-obsession', {
  title: 'Obsession', category: 'Movies', difficulty: 'hard', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'Obsession (2025), written and directed by Curry Barker. A wish called One Wish Willow.',
  answer: 'Obsession', alternateAnswers: ['Obsession 2025'],
  folder: 'Obsession',
  root: 'images',
})

frames('q-hd-livingdead', {
  title: 'Night of the Living Dead', category: 'Movies', difficulty: 'medium', audience: 'family',
  tags: ['Movies', 'Family'], instructions: 'Name the film.',
  hostNotes: 'Night of the Living Dead (1968), George A. Romero. A farmhouse in Pennsylvania. The film is in the public domain.',
  answer: 'Night of the Living Dead', alternateAnswers: ['Night of the Living Dead 1968'],
  folder: 'Night of the Living Dead',
  root: 'images',
})

frames('q-hd-bloodlines', {
  title: 'Final Destination Bloodlines', category: 'Movies', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'Final Destination Bloodlines (2025), the sixth film. Death comes for a family. Tony Todd appears.',
  answer: 'Final Destination Bloodlines', alternateAnswers: ['Final Destination: Bloodlines', 'Final Destination 6'],
  folder: 'Final Destination Bloodlines',
  root: 'images',
})

frames('q-hd-mist', {
  title: 'The Mist', category: 'Movies', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'The Mist (2007), Frank Darabont, from a Stephen King story. A supermarket. Do not describe the ending.',
  answer: 'The Mist', alternateAnswers: ['The Mist 2007'],
  folder: 'The Mist',
  root: 'images',
})

frames('q-hd-nope', {
  title: 'NOPE', category: 'Movies', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'Nope (2022), Jordan Peele. A brother and sister on a horse ranch. Something in the sky.',
  answer: 'Nope', alternateAnswers: ['NOPE', 'Nope 2022'],
  folder: 'NOPE',
  root: 'images/2025',
})

frames('q-hd-substance', {
  title: 'The Substance', category: 'Movies', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'The Substance (2024), Coralie Fargeat. Demi Moore. A treatment that creates a younger double. No graphic description.',
  answer: 'The Substance', alternateAnswers: ['The Substance 2024'],
  folder: 'The Substance',
  root: 'images/2025',
})

frames('q-hd-weapons', {
  title: 'Weapons', category: 'Movies', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'Weapons (2025), Zach Cregger. Seventeen children from one class leave home at the same moment. Josh Brolin and Julia Garner.',
  answer: 'Weapons', alternateAnswers: ['Weapons 2025'],
  folder: 'Weapons',
  root: 'images/2025',
})

frames('q-hd-tremors', {
  title: 'Tremors', category: 'Movies', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family'], instructions: 'Name the film.',
  hostNotes: 'Tremors (1990). Kevin Bacon. The town is Perfection, Nevada. Underground monsters called Graboids.',
  answer: 'Tremors', alternateAnswers: ['Tremors 1990'],
  folder: 'Tremors',
  root: 'images/2025',
})

frames('q-hd-eraserhead', {
  title: 'Eraserhead', category: 'Movies', difficulty: 'hard', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'Eraserhead (1977), David Lynch’s first feature. Black and white. Do not describe the creature.',
  answer: 'Eraserhead', alternateAnswers: ['Eraserhead 1977'],
  folder: 'Eraserhead',
  root: 'images/2025',
})

frames('q-hd-speaknoevil', {
  title: 'Speak No Evil', category: 'Movies', difficulty: 'hard', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'Speak No Evil (2022), the Danish film by Christian Tafdrup. Not the 2024 American remake unless they say that and you want to accept it.',
  answer: 'Speak No Evil', alternateAnswers: ['Speak No Evil 2022'],
  folder: 'Speak No Evil (2022)',
  root: 'images/2025',
})

frames('q-hd-halloween', {
  title: 'Halloween', category: 'Movies', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'Halloween (2018), David Gordon Green. Jamie Lee Curtis returns as Laurie Strode. A sequel to the 1978 film, not a remake. The 1978 film is a separate poster question.',
  answer: 'Halloween', alternateAnswers: ['Halloween 2018', 'Halloween (2018)'],
  folder: 'Halloween (2018)',
  root: 'images/2025',
})

frames('q-hd-fly', {
  title: 'The Fly', category: 'Movies', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'The Fly (1986), David Cronenberg, with Jeff Goldblum and Geena Davis. Accept the 1958 film if that is what they mean.',
  answer: 'The Fly', alternateAnswers: ['The Fly 1986', 'The Fly 1958'],
  folder: 'The Fly',
  root: 'images/2024',
})

frames('q-hd-childsplay', {
  title: "Child's Play", category: 'Movies', difficulty: 'easy', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'Child’s Play (1988). The doll is Chucky, voiced by Brad Dourif.',
  answer: "Child's Play", alternateAnswers: ['Childs Play', 'Chucky'],
  folder: 'Child\'s Play',
  root: 'images/2024',
})

frames('q-hd-candyman', {
  title: 'Candyman', category: 'Movies', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'Candyman (1992), Bernard Rose, with Tony Todd and Virginia Madsen. Say the name five times. A 2021 film uses the same title.',
  answer: 'Candyman', alternateAnswers: ['Candyman 1992', 'Candyman 2021'],
  folder: 'Candyman',
  root: 'images/2024',
})

frames('q-hd-readyornot', {
  title: 'Ready or Not', category: 'Movies', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'Ready or Not (2019). Samara Weaving. A wedding-night game of hide and seek.',
  answer: 'Ready or Not', alternateAnswers: ['Ready or Not 2019'],
  folder: 'Ready or Not',
  root: 'images/2023',
  ext: 'png',
})

frames('q-hd-funnygames', {
  title: 'Funny Games', category: 'Movies', difficulty: 'hard', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'Funny Games (1997), Michael Haneke, or the 2007 American remake he also directed. Two young men torment a family. No graphic description.',
  answer: 'Funny Games', alternateAnswers: ['Funny Games 1997', 'Funny Games 2007'],
  folder: 'Funny Games',
  root: 'images/2023',
  ext: 'png',
})

frames('q-hd-cabinfever', {
  title: 'Cabin Fever', category: 'Movies', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'Cabin Fever (2002), Eli Roth’s first feature. Friends rent a cabin. No graphic description of the illness.',
  answer: 'Cabin Fever', alternateAnswers: ['Cabin Fever 2002'],
  folder: 'Cabin Fever',
  root: 'images/2023',
  ext: 'png',
})

frames('q-hd-sematary', {
  title: 'Pet Sematary', category: 'Movies', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Teen'], instructions: 'Name the film.',
  hostNotes: 'Pet Sematary, Stephen King. The 1989 film is the usual answer. Accept 2019. The spelling is Sematary. The cat is Church.',
  answer: 'Pet Sematary', alternateAnswers: ['Pet Sematary 1989', 'Pet Sematary 2019'],
  folder: 'Pet Sematary',
  root: 'images/2023',
  ext: 'png',
})

stills('q-hd-birds', {
  title: 'The Birds', category: 'Movies', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family'],
  hostNotes: 'The Birds (1963), Alfred Hitchcock. Tippi Hedren. Bodega Bay. Horrordle has no frames for this title, so these are stills.',
  answer: 'The Birds', alternateAnswers: ['The Birds 1963'],
}, ['kskW8dGhUomOPR3W7kQxWcELFXh.jpg', 'chrEy1X4znoTlesC1o12ovrIeiz.jpg', 'gDk6V1UJ2hEG2qA3aAWI4fAxzLt.jpg'])

stills('q-hd-cube', {
  title: 'Cube', category: 'Movies', difficulty: 'medium', audience: 'teen',
  tags: ['Movies', 'Teen'],
  hostNotes: 'Cube (1997), Vincenzo Natali. Strangers wake in identical rooms. Some rooms are trapped. Horrordle has no frames for this title, so these are stills.',
  answer: 'Cube', alternateAnswers: ['Cube 1997'],
}, ['1kdDbg7meZ8eHGEhKkaL30lSEDv.jpg', 'sFNLhzGIArd2sYjS7ZoJN0tcJvo.jpg', '3TimUBrXMVblpnTsyg4HssGVbBv.jpg'])

stills('q-hd-lasthouse', {
  title: 'The Last House on the Left', category: 'Movies', difficulty: 'hard', audience: 'teen',
  tags: ['Movies', 'Teen'],
  hostNotes: 'The Last House on the Left (1972), Wes Craven’s first film. A 2009 remake exists. Do not describe the violence. Horrordle has no frames for this title, so these are stills.',
  answer: 'The Last House on the Left', alternateAnswers: ['Last House on the Left', 'The Last House on the Left 1972'],
}, ['1QvPMQUfRJxUieXWUt8mDmAPm7C.jpg', 'auxILLavKliWawRS4IMQFi7SWD7.jpg', 'mjxuTe76rA1C9btJtTwb8RVbeng.jpg'])

stills('q-hd-trilogy', {
  title: 'Trilogy of Terror', category: 'Movies', difficulty: 'hard', audience: 'teen',
  tags: ['Movies', 'Teen'],
  hostNotes: 'Trilogy of Terror (1975), a TV movie. Karen Black plays a role in all three stories. The famous one has a Zuni fetish doll. Horrordle has no frames for this title, so these are stills.',
  answer: 'Trilogy of Terror', alternateAnswers: ['Trilogy of Terror 1975'],
}, ['suX79E8ueIDl2H5PnjBKVlbLxPE.jpg', '3W0XBpLeLYoOGphaVAvSRMNu6GP.jpg', 'nqhUPh7132UCwpVzgqx6oerTRg4.jpg'])

stills('q-hd-witches', {
  title: 'The Witches', category: 'Movies', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family'],
  hostNotes: 'The Witches (1990), Nicolas Roeg, from Roald Dahl. Anjelica Huston. Accept the 2020 film if that is what they mean. Horrordle has no frames for this title, so these are stills.',
  answer: 'The Witches', alternateAnswers: ['The Witches 1990', 'The Witches 2020'],
}, ['5rws4sVIxAYZbosx5K0erPyk0VX.jpg', 'u8GO1SyKB1QBK7RON7eFhrdy9uX.jpg', 'vIwxers3UICVilD1AhO9CXWCga9.jpg'])

stills('q-hd-venom', {
  title: 'Venom', category: 'Movies', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family'],
  hostNotes: 'Venom (2018), with Tom Hardy. A Marvel film. Eddie Brock and the symbiote. Horrordle has no frames for this title, so these are stills.',
  answer: 'Venom', alternateAnswers: ['Venom 2018'],
}, ['7WajfTWfq7raotXEz9OsS8JIJrs.jpg', '7IGJDdvlstA6gHArHw5NCnB1DuS.jpg', '2uuyLEYaJsJKB733gRLPqJ26Exn.jpg'])

clues('q-psycho', {
  title: 'The Motel', category: 'Classic Horror', difficulty: 'medium', audience: 'teen',
  tags: ['Classic Horror', 'Movies', 'Teen'],
  hostNotes: 'Psycho (1960), Alfred Hitchcock. Do not describe the famous scene.',
  answer: 'Psycho', alternateAnswers: ['Psycho 1960'],
}, [
  'A 1960 film, directed by Alfred Hitchcock.',
  'A roadside motel is run by a quiet man named Norman.',
  'The film was adapted from a novel by Robert Bloch. What is the title?',
])

clues('q-nosferatu', {
  title: 'The Silent Count', category: 'Classic Horror', difficulty: 'hard', audience: 'teen',
  tags: ['Classic Horror', 'Movies', 'Teen', 'Very Difficult'],
  hostNotes: 'Nosferatu (1922), F. W. Murnau. Count Orlok. An unauthorized adaptation of Dracula.',
  answer: 'Nosferatu', alternateAnswers: ['Nosferatu 1922'],
}, [
  'A silent film from Germany, released in 1922.',
  'Directed by F. W. Murnau. The vampire is Count Orlok.',
  'It borrowed a famous novel without permission. What is the film called?',
])

clues('q-frankenstein', {
  title: 'The Laboratory', category: 'Classic Horror', difficulty: 'easy', audience: 'family',
  tags: ['Classic Horror', 'Movies', 'Family'],
  hostNotes: 'Frankenstein (1931), Universal, directed by James Whale, with Boris Karloff. Accept the film or the creature’s film.',
  answer: 'Frankenstein', alternateAnswers: ['Frankenstein 1931', 'Universal Frankenstein'],
}, [
  'A 1931 Universal film.',
  'James Whale directed. Boris Karloff played the creature.',
  'The story began as Mary Shelley’s 1818 novel. What is the film called?',
])

challenge({
  id: 'q-first-novels',
  type: 'which-came-first',
  title: 'Two Famous Books',
  category: 'Classic Horror',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Classic Horror', 'Family'],
  instructions: 'Which work was published first?',
  hostNotes: 'Frankenstein, 1818. Dracula, 1897.',
  answer: 'Frankenstein',
  alternateAnswers: ['Frankenstein novel'],
  pair: { a: 'Frankenstein (the novel)', b: 'Dracula (the novel)', first: 'a', detail: 'Frankenstein, 1818. Dracula followed in 1897.' },
  scoring: baseScore('decreasing', 80),
  stages: [
    text('q-first-novels-1', 'Clue 1', 80, 'Two famous horror novels. Which was published first?'),
    text('q-first-novels-2', 'Clue 2', 40, 'One is from 1818. The other is from 1897.'),
    text('q-first-novels-3', 'Clue 3', 20, 'Frankenstein, or Dracula?'),
  ],
})

clues('q-carrie', {
  title: 'The Prom', category: 'Classic Horror', difficulty: 'medium', audience: 'teen',
  tags: ['Classic Horror', 'Movies', 'Teen'],
  hostNotes: 'Carrie (1976), Brian De Palma, from Stephen King’s novel. Sissy Spacek. Do not describe the prom in graphic detail.',
  answer: 'Carrie', alternateAnswers: ['Carrie 1976'],
}, [
  'A 1976 film from a Stephen King novel.',
  'Brian De Palma directed. Sissy Spacek plays a bullied teenager.',
  'Prom night goes wrong. What is the film called?',
])

clues('q-omen', {
  title: 'The Child', category: 'Classic Horror', difficulty: 'medium', audience: 'teen',
  tags: ['Classic Horror', 'Movies', 'Teen'],
  hostNotes: 'The Omen (1976), with Gregory Peck and Lee Remick. Damien.',
  answer: 'The Omen', alternateAnswers: ['The Omen 1976', 'Omen'],
}, [
  'A 1976 film starring Gregory Peck.',
  'A diplomat and his wife adopt a boy named Damien.',
  'The boy may be something far worse than a troubled child. What is the film called?',
])

clues('q-rosemary', {
  title: 'The Apartment', category: 'Classic Horror', difficulty: 'hard', audience: 'teen',
  tags: ['Classic Horror', 'Movies', 'Teen'],
  hostNotes: 'Rosemary’s Baby (1968), Roman Polanski, from Ira Levin’s novel. Mia Farrow.',
  answer: "Rosemary's Baby", alternateAnswers: ['Rosemarys Baby'],
}, [
  'A 1968 film directed by Roman Polanski.',
  'Mia Farrow plays a woman in a New York apartment building.',
  'The neighbors take too much interest in her pregnancy. What is the film called?',
])

clues('q-alien', {
  title: 'The Ship', category: 'Classic Horror', difficulty: 'medium', audience: 'teen',
  tags: ['Classic Horror', 'Movies', 'Teen'],
  hostNotes: 'Alien (1979), Ridley Scott. Sigourney Weaver as Ripley. Not Aliens (1986).',
  answer: 'Alien', alternateAnswers: ['Alien 1979'],
}, [
  'A 1979 science-fiction horror film directed by Ridley Scott.',
  'The crew of a commercial ship answers a signal.',
  'Sigourney Weaver plays Ripley. What is the film called?',
])

clues('q-friday', {
  title: 'The Camp', category: 'Classic Horror', difficulty: 'medium', audience: 'teen',
  tags: ['Classic Horror', 'Movies', 'Teen'],
  hostNotes: 'Friday the 13th (1980). Camp Crystal Lake. Do not describe kills.',
  answer: 'Friday the 13th', alternateAnswers: ['Friday the 13th 1980'],
}, [
  'A 1980 slasher film.',
  'Teen counselors reopen a summer camp with a bad history.',
  'The camp is Crystal Lake. What is the film called?',
])

clues('q-lostboys', {
  title: 'The Boardwalk', category: 'Classic Horror', difficulty: 'hard', audience: 'teen',
  tags: ['Classic Horror', 'Movies', 'Teen'],
  hostNotes: 'The Lost Boys (1987), Joel Schumacher. Santa Carla. Kiefer Sutherland.',
  answer: 'The Lost Boys', alternateAnswers: ['Lost Boys'],
}, [
  'A 1987 film directed by Joel Schumacher.',
  'A family moves to the California town of Santa Carla.',
  'The teens on the boardwalk are vampires. What is the film called?',
])

clues('q-us', {
  title: 'The Doubles', category: 'Modern Horror', difficulty: 'medium', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen'],
  hostNotes: 'Us (2019), written and directed by Jordan Peele.',
  answer: 'Us', alternateAnswers: ['Us 2019'],
}, [
  'A 2019 film written and directed by Jordan Peele.',
  'A family on vacation is confronted by doubles of themselves.',
  'The title is a two-letter word. What is it?',
])

clues('q-talk', {
  title: 'The Hand', category: 'Modern Horror', difficulty: 'medium', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen'],
  hostNotes: 'Talk to Me (2022), directed by Danny and Michael Philippou.',
  answer: 'Talk to Me', alternateAnswers: ['Talk to Me 2022'],
}, [
  'A 2022 Australian horror film.',
  'Teenagers use an embalmed hand to contact the dead.',
  'The title is the dare they say. What is the film called?',
])

clues('q-smile', {
  title: 'The Grin', category: 'Modern Horror', difficulty: 'medium', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen'],
  hostNotes: 'Smile (2022), directed by Parker Finn.',
  answer: 'Smile', alternateAnswers: ['Smile 2022'],
}, [
  'A 2022 horror film directed by Parker Finn.',
  'A therapist starts seeing people grin at the worst moments.',
  'The title is that expression. What is the film called?',
])

clues('q-getout', {
  title: 'The Weekend', category: 'Modern Horror', difficulty: 'medium', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen'],
  hostNotes: 'Get Out (2017), Jordan Peele.',
  answer: 'Get Out', alternateAnswers: ['Get Out 2017'],
}, [
  'A 2017 film written and directed by Jordan Peele.',
  'A young man meets his girlfriend’s family for a weekend in the country.',
  'The visit is not what it seems. What is the film called?',
])

clues('q-hereditary', {
  title: 'The Miniature', category: 'Modern Horror', difficulty: 'hard', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen'],
  hostNotes: 'Hereditary (2018), Ari Aster. Toni Collette. Do not describe graphic scenes.',
  answer: 'Hereditary', alternateAnswers: ['Hereditary 2018'],
}, [
  'A 2018 film directed by Ari Aster.',
  'Toni Collette plays a mother and artist who builds miniature rooms.',
  'A family grief turns into something older. What is the film called?',
])

clues('q-quiet', {
  title: 'The Silence', category: 'Modern Horror', difficulty: 'medium', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen'],
  hostNotes: 'A Quiet Place (2018), John Krasinski. Not Part II.',
  answer: 'A Quiet Place', alternateAnswers: ['A Quiet Place 2018', 'Quiet Place'],
}, [
  'A 2018 film directed by John Krasinski.',
  'A family lives by one rule: do not make a sound.',
  'The things hunting them track noise. What is the film called?',
])

clues('q-ring', {
  title: 'The Tape', category: 'Modern Horror', difficulty: 'medium', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen'],
  hostNotes: 'The Ring (2002), Gore Verbinski, the American film. Naomi Watts. Not the Japanese original Ringu unless they say that and you want to accept it.',
  answer: 'The Ring', alternateAnswers: ['The Ring 2002', 'Ringu'],
}, [
  'A 2002 American horror film starring Naomi Watts.',
  'A videotape carries a curse.',
  'After you watch it, the phone rings. What is the film called?',
])

clues('q-sixth', {
  title: 'The Boy', category: 'Modern Horror', difficulty: 'medium', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen'],
  hostNotes: 'The Sixth Sense (1999), M. Night Shyamalan. Bruce Willis and Haley Joel Osment. Do not say the ending.',
  answer: 'The Sixth Sense', alternateAnswers: ['Sixth Sense', 'The 6th Sense'],
}, [
  'A 1999 film directed by M. Night Shyamalan.',
  'Bruce Willis plays a child psychologist.',
  'Haley Joel Osment’s character sees people others do not. What is the film called?',
])

clues('q-midsommar', {
  title: 'The Festival', category: 'Modern Horror', difficulty: 'hard', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen'],
  hostNotes: 'Midsommar (2019), Ari Aster. A midsummer festival in Sweden.',
  answer: 'Midsommar', alternateAnswers: ['Midsummer', 'Midsommar 2019'],
}, [
  'A 2019 film directed by Ari Aster.',
  'Friends travel to a remote festival in Sweden.',
  'The celebration lasts through the bright summer nights. What is the film called?',
])

clues('q-megan', {
  title: 'The Doll', category: 'Modern Horror', difficulty: 'medium', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen'],
  hostNotes: 'M3GAN (2022). A companion doll. Accept M3GAN or Megan.',
  answer: 'M3GAN', alternateAnswers: ['Megan', 'M3gan'],
}, [
  'A 2022 horror film.',
  'A robotics designer builds a doll to look after her niece.',
  'The doll learns too well. What is she called?',
])

poster('q-poster-coraline', {
  mediaId: 'p-coraline', title: 'The Other Mother', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family', 'Kids'],
  hostNotes: 'Coraline (2009), Laika, from Neil Gaiman’s book.',
  answer: 'Coraline', alternateAnswers: [],
})
poster('q-poster-coco', {
  mediaId: 'p-coco', title: 'The Land of the Dead', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family', 'Kids'],
  hostNotes: 'Coco (2017), Pixar. Día de los Muertos, not Halloween.',
  answer: 'Coco', alternateAnswers: [],
})
poster('q-poster-monsters', {
  mediaId: 'p-monsters', title: 'The Scream Factory', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family', 'Kids'],
  hostNotes: 'Monsters, Inc. (2001), Pixar. Sulley and Mike.',
  answer: 'Monsters, Inc.', alternateAnswers: ['Monsters Inc', 'Monsters Incorporated'],
})
poster('q-poster-hotel', {
  mediaId: 'p-hotel', title: 'The Hotel', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family', 'Kids'],
  hostNotes: 'Hotel Transylvania (2012). Adam Sandler voices Dracula. Genndy Tartakovsky directed.',
  answer: 'Hotel Transylvania', alternateAnswers: [],
})
poster('q-poster-casper', {
  mediaId: 'p-casper', title: 'The Friendly One', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family', 'Kids'],
  hostNotes: 'Casper (1995), or the friendly ghost of that name.',
  answer: 'Casper', alternateAnswers: ['Casper 1995', 'Casper the Friendly Ghost'],
})
poster('q-poster-labyrinth', {
  mediaId: 'p-labyrinth', title: 'The Maze', difficulty: 'medium', audience: 'family',
  tags: ['Movies', 'Family', 'Kids'],
  hostNotes: 'Labyrinth (1986), Jim Henson, with David Bowie and Jennifer Connelly.',
  answer: 'Labyrinth', alternateAnswers: ['Labyrinth 1986'],
})

clues('q-pumpkin-special', {
  title: 'The Patch', category: 'Television', difficulty: 'easy', audience: 'family',
  tags: ['Television', 'Kids', 'Family'],
  hostNotes: 'It’s the Great Pumpkin, Charlie Brown, first broadcast in 1966.',
  answer: "It's the Great Pumpkin, Charlie Brown",
  alternateAnswers: ['The Great Pumpkin', 'Great Pumpkin Charlie Brown'],
}, [
  'This animated special first aired in 1966.',
  'A round-headed boy waits all night in a pumpkin patch.',
  'His dog spends the night on a doghouse. What is the special called?',
])

clues('q-scooby', {
  title: 'The Dog', category: 'Television', difficulty: 'easy', audience: 'family',
  tags: ['Television', 'Kids', 'Family'],
  hostNotes: 'Scooby-Doo, Where Are You! premiered in 1969. A Great Dane.',
  answer: 'Scooby-Doo', alternateAnswers: ['Scooby Doo', 'Scooby'],
}, [
  'A cartoon that started in 1969.',
  'Four teenagers and a Great Dane solve mysteries that are never really ghosts.',
  'The dog talks, a little. What is his name?',
])

clues('q-gravity', {
  title: 'The Town', category: 'Television', difficulty: 'medium', audience: 'family',
  tags: ['Television', 'Kids', 'Family'],
  hostNotes: 'Gravity Falls (2012), created by Alex Hirsch.',
  answer: 'Gravity Falls', alternateAnswers: [],
}, [
  'An animated series that began in 2012, created by Alex Hirsch.',
  'Twins spend a summer with a con-man great-uncle in a weird Oregon town.',
  'A journal has a six-fingered hand on it. What is the show called?',
])

clues('q-owl', {
  title: 'The Isles', category: 'Television', difficulty: 'medium', audience: 'family',
  tags: ['Television', 'Kids', 'Family'],
  hostNotes: 'The Owl House (2020), created by Dana Terrace.',
  answer: 'The Owl House', alternateAnswers: [],
}, [
  'An animated series that began in 2020, created by Dana Terrace.',
  'A human girl stumbles into a world of witches and becomes a witch’s apprentice.',
  'The house has an owl for a face. What is the show called?',
])

clues('q-adventure', {
  title: 'The Land', category: 'Television', difficulty: 'medium', audience: 'family',
  tags: ['Television', 'Kids', 'Family'],
  hostNotes: 'Adventure Time (2010), created by Pendleton Ward.',
  answer: 'Adventure Time', alternateAnswers: [],
}, [
  'An animated series that began in 2010, created by Pendleton Ward.',
  'A boy and his stretchy dog have adventures after a magical war.',
  'The candy kingdom has a princess made of bubblegum. What is the show called?',
])

clues('q-afraid', {
  title: 'The Campfire', category: 'Television', difficulty: 'medium', audience: 'family',
  tags: ['Television', 'Kids', 'Family'],
  hostNotes: 'Are You Afraid of the Dark? premiered on Nickelodeon in 1990. The storytellers are the Midnight Society.',
  answer: 'Are You Afraid of the Dark?', alternateAnswers: ['Are You Afraid of the Dark'],
}, [
  'A Nickelodeon series that started in 1990.',
  'Kids meet in the woods and tell scary stories.',
  'They call themselves the Midnight Society. What is the show called?',
])

clues('q-halloweentown', {
  title: 'The Grandmother', category: 'Television', difficulty: 'easy', audience: 'family',
  tags: ['Television', 'Kids', 'Family'],
  hostNotes: 'Halloweentown (1998), a Disney Channel movie. Debbie Reynolds plays Aggie Cromwell.',
  answer: 'Halloweentown', alternateAnswers: ['Halloween Town'],
}, [
  'A 1998 Disney Channel movie.',
  'Debbie Reynolds plays a grandmother who is also a witch.',
  'On her 13th Halloween, a girl learns her family is from another town. What is that town called?',
])

clues('q-goosebumps', {
  title: 'The Books', category: 'Movies', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family', 'Kids'],
  hostNotes: 'Goosebumps, R. L. Stine’s series. Accept the books, the show, or the 2015 movie.',
  answer: 'Goosebumps', alternateAnswers: ['Goosebumps 2015'],
}, [
  'R. L. Stine wrote a long series of kids’ horror books.',
  'Each cover has a dripping logo.',
  'A 2015 movie put those monsters in one story. What is the series called?',
])

clues('q-monsterhouse', {
  title: 'The Neighborhood', category: 'Movies', difficulty: 'medium', audience: 'family',
  tags: ['Movies', 'Family', 'Kids'],
  hostNotes: 'Monster House (2006). Three kids. The house across the street is alive.',
  answer: 'Monster House', alternateAnswers: ['Monster House 2006'],
}, [
  'A 2006 animated movie.',
  'Three kids suspect the house across the street is alive.',
  'Halloween is the night they go in. What is the film called?',
])

clues('q-corpse', {
  title: 'The Wedding', category: 'Movies', difficulty: 'medium', audience: 'family',
  tags: ['Movies', 'Family', 'Kids'],
  hostNotes: 'Corpse Bride (2005), Tim Burton. Stop-motion.',
  answer: 'Corpse Bride', alternateAnswers: ['The Corpse Bride', 'Corpse Bride 2005'],
}, [
  'A 2005 stop-motion film from Tim Burton.',
  'A nervous groom practices his wedding vows in the woods.',
  'The bride who answers is not alive. What is the film called?',
])

challenge({
  id: 'q-candycorn',
  type: 'text-stage',
  title: 'Three Colors',
  category: 'Candy',
  difficulty: 'easy',
  audience: 'family',
  tags: ['Candy', 'Kids', 'Family'],
  instructions: 'Which colors are stacked in a classic candy corn kernel?',
  hostNotes: 'White, orange, and yellow. Any order.',
  answer: 'White, orange, and yellow',
  alternateAnswers: ['White orange yellow', 'Orange yellow white'],
  choices: ['Red, green, and white', 'White, orange, and yellow', 'Purple and black', 'Pink and blue'],
  scoring: baseScore('decreasing', 40),
  stages: [
    text('q-corn-1', 'Clue 1', 40, 'A Halloween candy shaped like a little kernel.'),
    text('q-corn-2', 'Clue 2', 20, 'The classic piece is stacked in three color bands.'),
    text('q-corn-3', 'Clue 3', 10, 'Name those three colors.'),
  ],
})

challenge({
  id: 'q-costume-vampire',
  type: 'text-stage',
  title: 'Classic Costume',
  category: 'Kids',
  difficulty: 'easy',
  audience: 'family',
  tags: ['Kids', 'Family'],
  instructions: 'Which costume is this?',
  hostNotes: 'A generic vampire costume.',
  answer: 'Vampire',
  alternateAnswers: ['A vampire'],
  choices: ['Werewolf', 'Vampire', 'Pirate', 'Robot'],
  scoring: baseScore('decreasing', 40),
  stages: [
    text('q-vamp-1', 'Clue 1', 40, 'A costume with a long black cape.'),
    text('q-vamp-2', 'Clue 2', 20, 'The teeth come to points.'),
    text('q-vamp-3', 'Clue 3', 10, 'The hairline comes to a peak. What monster is it?'),
  ],
})

clues('q-apples', {
  title: 'The Tub', category: 'Halloween History', difficulty: 'easy', audience: 'family',
  tags: ['Halloween History', 'Family', 'Kids'],
  instructions: 'Name the party game.',
  hostNotes: 'Bobbing for apples. Also accept apple bobbing.',
  answer: 'Bobbing for apples', alternateAnswers: ['Apple bobbing', 'Bobbing apples'],
}, [
  'A party game played around Halloween.',
  'A tub is filled with water and fruit.',
  'You try to catch one with your teeth. What is the game called?',
])

clues('q-blackcat', {
  title: 'The Crossing', category: 'Halloween History', difficulty: 'easy', audience: 'family',
  tags: ['Halloween History', 'Family', 'Kids'],
  instructions: 'Name the animal.',
  hostNotes: 'A black cat. The old superstition says one crossing your path is bad luck.',
  answer: 'A black cat', alternateAnswers: ['Black cat', 'Black cats'],
}, [
  'An old superstition about bad luck.',
  'It has to do with an animal walking past you.',
  'The animal is a cat of one color. What color?',
])

clues('q-allhallows', {
  title: 'The Other Name', category: 'Halloween History', difficulty: 'medium', audience: 'family',
  tags: ['Halloween History', 'Family'],
  instructions: 'What is the older name?',
  hostNotes: 'All Hallows’ Eve. Halloween is a shortened form of it. The eve of All Saints’ Day.',
  answer: "All Hallows' Eve", alternateAnswers: ['All Hallows Eve', 'Allhallows Eve', 'All Hallows Evening'],
}, [
  'Halloween is a shortened name.',
  'It is the evening before All Saints’ Day.',
  '“Hallow” is an old word for a saint. What is the longer name?',
])

clues('q-villain-witch', {
  title: 'The Green One', category: 'Villains', difficulty: 'easy', audience: 'family',
  tags: ['Villains', 'Family', 'Kids'],
  hostNotes: 'The Wicked Witch of the West, from The Wizard of Oz. Margaret Hamilton in the 1939 film. Accept the Wicked Witch.',
  answer: 'The Wicked Witch of the West', alternateAnswers: ['The Wicked Witch', 'Wicked Witch of the West'],
}, [
  'She is green, and she wants a pair of shoes.',
  'She rides a broom and melts in water.',
  'She is from The Wizard of Oz. What is she called?',
])

clues('q-villain-dracula', {
  title: 'The Count', category: 'Villains', difficulty: 'easy', audience: 'family',
  tags: ['Villains', 'Family'],
  hostNotes: 'Count Dracula. Bram Stoker’s novel, 1897. Accept Dracula.',
  answer: 'Dracula', alternateAnswers: ['Count Dracula'],
}, [
  'He sleeps in a coffin and does not like garlic.',
  'He can turn into a bat. His home is Transylvania.',
  'Bram Stoker wrote him in 1897. What is the count’s name?',
])

clues('q-connect-burton', {
  title: 'The Same Name', category: 'Connections', difficulty: 'medium', audience: 'family',
  tags: ['Connections', 'Movies', 'Family'],
  hostNotes: 'Tim Burton directed Beetlejuice, Edward Scissorhands, and Corpse Bride. He produced The Nightmare Before Christmas. Henry Selick directed that one. Accept Tim Burton.',
  answer: 'Tim Burton', alternateAnswers: ['Burton'],
}, [
  'Beetlejuice, Edward Scissorhands, and Corpse Bride.',
  'He also produced The Nightmare Before Christmas. Someone else directed it.',
  'Who is the director people name for all of these?',
])

clues('q-sisters', {
  title: 'Three Names', category: 'Lists', difficulty: 'medium', audience: 'family',
  tags: ['Lists', 'Movies', 'Family', 'Kids'],
  hostNotes: 'The Sanderson sisters: Winifred, Sarah, and Mary. Any order. Accept if they get all three. Winnie is fine for Winifred.',
  answer: 'Winifred, Sarah, and Mary', alternateAnswers: ['Winifred Sarah Mary', 'Winnie, Sarah, and Mary'],
}, [
  'A 1993 movie about three witches.',
  'They are the Sanderson sisters, from Hocus Pocus.',
  'Name all three. Any order.',
])

challenge({
  id: 'q-match-monsters',
  type: 'monster-match',
  title: 'Match the Monster',
  category: 'Monsters',
  difficulty: 'easy',
  audience: 'family',
  tags: ['Monsters', 'Family', 'Kids'],
  instructions: 'Match each monster to the clue.',
  hostNotes: 'Dracula and Transylvania. Werewolf and a full moon. The Mummy and bandages. A ghost and “boo.” Accept if the pairs are right.',
  answer: 'Dracula, werewolf, mummy, ghost',
  alternateAnswers: ['All four pairs'],
  scoring: baseScore('fixed', 80),
  matchPairs: [
    { id: 'm1', left: 'Dracula', right: 'Transylvania' },
    { id: 'm2', left: 'Werewolf', right: 'A full moon' },
    { id: 'm3', left: 'The Mummy', right: 'Bandages' },
    { id: 'm4', left: 'A ghost', right: 'Boo' },
  ],
  stages: [
    text('q-match-monsters-1', 'Clue 1', 80, 'Four monsters are on the left. Their clues are shuffled on the right.'),
    text('q-match-monsters-2', 'Clue 2', 40, 'One of them hates garlic. One changes under a full moon.'),
    text('q-match-monsters-3', 'Clue 3', 20, 'One is wrapped up. One just says boo. Match them.'),
  ],
})

challenge({
  id: 'q-higher-years',
  type: 'higher-lower',
  title: 'Higher or Lower',
  category: 'Movies',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Movies', 'Family'],
  instructions: 'The first year is showing. Is the hidden movie earlier or later?',
  hostNotes: 'Hocus Pocus is 1993. Coco is 2017, so the answer is Higher.',
  answer: 'Higher',
  alternateAnswers: ['Later', 'After'],
  scoring: baseScore('fixed', 60),
  higherLower: {
    shown: { label: 'Hocus Pocus', value: 1993, unit: 'Release year' },
    hidden: { label: 'Coco', value: 2017 },
  },
  stages: [
    text('q-higher-years-1', 'Clue 1', 60, 'Hocus Pocus came out in 1993.'),
    text('q-higher-years-2', 'Clue 2', 30, 'Coco is a Pixar film about Día de los Muertos.'),
    text('q-higher-years-3', 'Clue 3', 15, 'Is Coco’s release year higher or lower than 1993?'),
  ],
})

clues('q-villain-myers', {
  title: 'The Mask', category: 'Villains', difficulty: 'medium', audience: 'teen',
  tags: ['Villains', 'Movies', 'Teen'],
  hostNotes: 'Michael Myers, from Halloween (1978). The town is Haddonfield. Do not describe attacks.',
  answer: 'Michael Myers', alternateAnswers: ['Michael Myers Halloween'],
}, [
  'He wears a blank white mask and dark coveralls.',
  'The town is Haddonfield. The film is from 1978.',
  'John Carpenter’s Halloween. What is the killer’s name?',
])

clues('q-villain-freddy', {
  title: 'The Sweater', category: 'Villains', difficulty: 'medium', audience: 'teen',
  tags: ['Villains', 'Movies', 'Teen'],
  hostNotes: 'Freddy Krueger, A Nightmare on Elm Street (1984). Accept Freddy or Freddy Krueger.',
  answer: 'Freddy Krueger', alternateAnswers: ['Freddy', 'Fred Krueger', 'Frederick Krueger'],
}, [
  'He wears a red and green striped sweater and a hat.',
  'He shows up in dreams. His glove has blades.',
  'The street in the title is Elm Street. What is his name?',
])

clues('q-villain-pennywise', {
  title: 'The Clown', category: 'Villains', difficulty: 'medium', audience: 'teen',
  tags: ['Villains', 'Movies', 'Teen'],
  hostNotes: 'Pennywise, from Stephen King’s It. Derry, Maine. Accept Pennywise or It.',
  answer: 'Pennywise', alternateAnswers: ['Pennywise the Dancing Clown', 'It', 'Pennywise the Clown'],
}, [
  'A clown who offers a red balloon.',
  'The town is Derry. The story is a Stephen King novel.',
  'The 2017 film and the 1990 miniseries both use him. What is the clown called?',
])

challenge({
  id: 'q-timeline-slashers',
  type: 'timeline',
  title: 'Oldest First',
  category: 'Movies',
  difficulty: 'hard',
  audience: 'teen',
  tags: ['Movies', 'Teen'],
  instructions: 'Put these films in order, oldest first.',
  hostNotes: 'Halloween 1978, Friday the 13th 1980, A Nightmare on Elm Street 1984, Scream 1996.',
  answer: 'Halloween, Friday the 13th, A Nightmare on Elm Street, Scream',
  alternateAnswers: ['Halloween, Friday the 13th, Nightmare on Elm Street, Scream'],
  scoring: baseScore('fixed', 80),
  timelineItems: [
    { id: 't1', label: 'Halloween', order: 1 },
    { id: 't2', label: 'Friday the 13th', order: 2 },
    { id: 't3', label: 'A Nightmare on Elm Street', order: 3 },
    { id: 't4', label: 'Scream', order: 4 },
  ],
  stages: [
    text('q-timeline-slashers-1', 'Clue 1', 80, 'Four films. Shout them oldest first.'),
    text('q-timeline-slashers-2', 'Clue 2', 40, 'One is 1978. One is 1996.'),
    text('q-timeline-slashers-3', 'Clue 3', 20, 'Friday the 13th is 1980. Elm Street is 1984. Put all four in order.'),
  ],
})

challenge({
  id: 'q-lightning',
  type: 'lightning',
  title: 'Lightning Round',
  category: 'General Halloween',
  difficulty: 'medium',
  audience: 'family',
  tags: ['General Halloween', 'Kids', 'Family'],
  instructions: 'First clear answer.',
  hostNotes: 'Short family questions. First clear answer.',
  answer: 'See each prompt',
  scoring: baseScore('fixed', 10),
  timerSec: 12,
  timerStyle: 'sudden-death',
  autoRevealOnExpire: true,
  lightningPrompts: [
    { id: 'l1', prompt: 'What fruit is carved into a jack-o’-lantern?', answer: 'A pumpkin', points: 10 },
    { id: 'l2', prompt: 'What night is Halloween?', answer: 'October 31', points: 10 },
    { id: 'l3', prompt: 'What do you say when the door opens?', answer: 'Trick or treat', points: 10 },
    { id: 'l4', prompt: 'Name the Great Dane who solves fake ghost mysteries.', answer: 'Scooby-Doo', points: 10 },
    { id: 'l5', prompt: 'Which Pixar film is set around Día de los Muertos?', answer: 'Coco', points: 10 },
    { id: 'l6', prompt: 'What snack is Scooby always after?', answer: 'Scooby Snacks', points: 10 },
    { id: 'l7', prompt: 'Debbie Reynolds plays the grandmother in which Disney Channel movie?', answer: 'Halloweentown', points: 15 },
    { id: 'l8', prompt: 'What do witches ride in a classic costume?', answer: 'A broom', points: 10 },
    { id: 'l9', prompt: 'Name the 1966 Peanuts special about a boy in a pumpkin patch.', answer: "It's the Great Pumpkin, Charlie Brown", points: 15 },
    { id: 'l10', prompt: 'Who directed The Nightmare Before Christmas?', answer: 'Henry Selick', points: 20 },
    { id: 'l11', prompt: 'Name the 1993 movie about the Sanderson sisters.', answer: 'Hocus Pocus', points: 10 },
    { id: 'l12', prompt: 'What do you light inside a jack-o’-lantern?', answer: 'A candle', points: 10 },
  ],
  stages: [stage('q-lightning-1', 'Rapid', 10)],
})

clues('q-final', {
  title: 'The Woods', category: 'Modern Horror', difficulty: 'hard', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen'],
  instructions: 'Name the film.',
  hostNotes: 'The Blair Witch Project (1999). Heather, Mike, and Josh. Found footage. Not the later sequels.',
  answer: 'The Blair Witch Project', alternateAnswers: ['Blair Witch', 'The Blair Witch'],
}, [
  'A 1999 horror film shot to look like found footage.',
  'Three students hike into the Maryland woods to film a local legend.',
  'Their tapes are what the movie pretends to be. What is the film called?',
])

function costumeFile(id, title, filename, product) {
  pack.media.push({
    id,
    title,
    filename,
    contentType: 'image/jpeg',
    source: product ? 'original' : 'generated',
    bundledPath: `media/costumes/${filename}`,
    licenseNotes: product
      ? 'Product photo of a costume piece you can buy. Saved in the game so the TV does not need the store. Nothing is written on the picture.'
      : 'Original generated picture. Nothing is written on the image.',
  })
}

function costume(id, meta) {
  const points = [100, 60, 30]
  const pieceIds = meta.files.slice(0, 3).map((filename, index) => {
    const mediaId = `${id}-piece-${index + 1}`
    costumeFile(mediaId, `${meta.answer} piece ${index + 1}`, filename, meta.product)
    return mediaId
  })
  const answerId = `${id}-full`
  costumeFile(answerId, `${meta.answer} costume`, meta.files[3], meta.product)
  challenge({
    id,
    type: 'costume',
    title: meta.title,
    category: 'Costumes',
    difficulty: meta.difficulty,
    audience: meta.audience,
    tags: meta.tags,
    instructions: 'Guess the costume.',
    hostNotes: meta.hostNotes,
    answer: meta.answer,
    alternateAnswers: meta.alternateAnswers ?? [],
    answerMediaId: answerId,
    scoring: baseScore(),
    stages: pieceIds.map((mediaId, index) => stage(`${id}-${index + 1}`, `Item ${index + 1}`, points[index], {
      image: { mediaId, effect: { kind: 'none' } },
    })),
  })
}

costume('q-build-witch', {
  title: 'The Broom', difficulty: 'easy', audience: 'family',
  tags: ['Costumes', 'Family', 'Kids'],
  files: ['witch-3.jpg', 'witch-1.jpg', 'witch-2.jpg', 'witch-full.jpg'],
  hostNotes: 'Item 1 is striped socks. Item 2 is a broom. Item 3 is a pointed black hat. Accept witch.',
  answer: 'Witch', alternateAnswers: ['A witch', 'Wicked witch'],
})
costume('q-build-dino', {
  title: 'Tiny Arms', difficulty: 'easy', audience: 'family',
  tags: ['Costumes', 'Family', 'Kids'],
  files: ['dino-2.jpg', 'dino-1.jpg', 'dino-3.jpg', 'dino-full.jpg'],
  hostNotes: 'Item 1 is a pair of tiny arms. Item 2 is a green tail. Item 3 is a toothy hood. Accept dinosaur, T. rex, or a dinosaur costume.',
  answer: 'Dinosaur', alternateAnswers: ['A dinosaur', 'T-rex', 'T. rex', 'Tyrannosaurus'],
})
costume('q-build-astro', {
  title: 'The Visor', difficulty: 'easy', audience: 'family',
  tags: ['Costumes', 'Family', 'Kids'],
  files: ['astro-1.jpg', 'astro-3.jpg', 'astro-2.jpg', 'astro-full.jpg'],
  hostNotes: 'Item 1 is white gloves. Item 2 is a backpack. Item 3 is a space helmet. Accept astronaut.',
  answer: 'Astronaut', alternateAnswers: ['An astronaut', 'Spaceman', 'A space suit'],
})
costume('q-build-pirate', {
  title: 'The Patch', difficulty: 'easy', audience: 'family',
  tags: ['Costumes', 'Family'],
  files: ['pirate-1.jpg', 'pirate-3.jpg', 'pirate-2.jpg', 'pirate-full.jpg'],
  hostNotes: 'Item 1 is a striped shirt. Item 2 is an eyepatch. Item 3 is a tricorn hat. Accept pirate.',
  answer: 'Pirate', alternateAnswers: ['A pirate'],
})
costume('q-build-jedi', {
  title: 'Brown Robe', difficulty: 'easy', audience: 'family', product: true,
  tags: ['Costumes', 'Family', 'Movies'],
  files: ['jedi-1.jpg', 'jedi-2.jpg', 'jedi-3.jpg', 'jedi-full.jpg'],
  hostNotes: 'Item 1 is a brown robe. Item 2 is a brown hood. Item 3 is a blue lightsaber. Accept Jedi or Jedi Knight.',
  answer: 'Jedi', alternateAnswers: ['A Jedi', 'Jedi Knight'],
})
costume('q-build-potter', {
  title: 'Round Glasses', difficulty: 'easy', audience: 'family', product: true,
  tags: ['Costumes', 'Family', 'Movies'],
  files: ['hp-1.jpg', 'hp-2.jpg', 'hp-3.jpg', 'hp-full.jpg'],
  hostNotes: 'Item 1 is round glasses. Item 2 is a red and gold scarf. Item 3 is a wand. Accept Harry Potter.',
  answer: 'Harry Potter', alternateAnswers: ['Potter'],
})
costume('q-build-elsa', {
  title: 'Pale Blue', difficulty: 'easy', audience: 'family', product: true,
  tags: ['Costumes', 'Family', 'Kids', 'Movies'],
  files: ['elsa-1.jpg', 'elsa-2.jpg', 'elsa-3.jpg', 'elsa-full.jpg'],
  hostNotes: 'Item 1 is an ice-blue gown. Item 2 is a blue wand. Item 3 is a blonde side braid. Accept Elsa. The answer picture is Elsa from the movie.',
  answer: 'Elsa', alternateAnswers: ['Elsa from Frozen'],
})
costume('q-build-wonder', {
  title: 'Gold Cuffs', difficulty: 'easy', audience: 'family', product: true,
  tags: ['Costumes', 'Family', 'Movies'],
  files: ['ww-2.jpg', 'ww-1.jpg', 'ww-3.jpg', 'ww-full.jpg'],
  hostNotes: 'Item 1 is a gold lasso. Item 2 is gold cuffs. Item 3 is a gold tiara with a red star. Accept Wonder Woman.',
  answer: 'Wonder Woman', alternateAnswers: ['Diana Prince'],
})
costume('q-build-rumi', {
  title: 'Purple Braid', difficulty: 'medium', audience: 'family', product: true,
  tags: ['Costumes', 'Family', 'Movies'],
  files: ['rumi-1.jpg', 'rumi-2.jpg', 'rumi-3.jpg', 'rumi-full.jpg'],
  hostNotes: 'Item 1 is a gold bomber jacket. Item 2 is a sword. Item 3 is a long purple braid. Accept Rumi. The group name alone is not this costume. The answer picture is Rumi from the movie.',
  answer: 'Rumi (K-Pop Demon Hunters)', alternateAnswers: ['Rumi', 'Rumi from K-Pop Demon Hunters'],
})
costume('q-build-mira', {
  title: 'Pink Hair', difficulty: 'medium', audience: 'family', product: true,
  tags: ['Costumes', 'Family', 'Movies'],
  files: ['mira-1.jpg', 'mira-2.jpg', 'mira-3.jpg', 'mira-full.jpg'],
  hostNotes: 'Item 1 is black boots. Item 2 is a yellow skirt. Item 3 is a bright pink wig. Accept Mira. The group name alone is not this costume. The answer picture is Mira from the movie.',
  answer: 'Mira', alternateAnswers: ['Mira from K-Pop Demon Hunters'],
})
costume('q-build-bluey', {
  title: 'Blue Tail', difficulty: 'easy', audience: 'family', product: true,
  tags: ['Costumes', 'Family', 'Kids'],
  files: ['bluey-1.jpg', 'bluey-2.jpg', 'bluey-3.jpg', 'bluey-full.jpg'],
  hostNotes: 'Item 1 is a dark blue tail. Item 2 is a yellow belly piece you wear. Item 3 is a blue dog hood. Accept Bluey. The answer picture is Bluey.',
  answer: 'Bluey', alternateAnswers: [],
})
costume('q-build-woody', {
  title: 'Cow Vest', difficulty: 'easy', audience: 'family', product: true,
  tags: ['Costumes', 'Family', 'Kids', 'Movies'],
  files: ['woody-1.jpg', 'woody-2.jpg', 'woody-3.jpg', 'woody-full.jpg'],
  hostNotes: 'Item 1 is a yellow plaid shirt. Item 2 is a cow-print vest. Item 3 is a cowboy hat. Accept Woody. Toy Story alone is not this costume.',
  answer: 'Woody', alternateAnswers: ['Woody from Toy Story'],
})
costume('q-build-buzz', {
  title: 'Space Wings', difficulty: 'easy', audience: 'family', product: true,
  tags: ['Costumes', 'Family', 'Kids', 'Movies'],
  files: ['buzz-1.jpg', 'buzz-2.jpg', 'buzz-3.jpg', 'buzz-full.jpg'],
  hostNotes: 'Item 1 is white gloves. Item 2 is a purple and green jetpack. Item 3 is a space helmet. Accept Buzz Lightyear. Toy Story alone is not this costume.',
  answer: 'Buzz Lightyear', alternateAnswers: ['Buzz'],
})
costume('q-build-jack', {
  title: 'Bat Tie', difficulty: 'medium', audience: 'family', product: true,
  tags: ['Costumes', 'Family', 'Movies'],
  files: ['jack-1.jpg', 'jack-2.jpg', 'jack-3.jpg', 'jack-full.jpg'],
  hostNotes: 'Item 1 is a bat bow tie. Item 2 is a black pinstripe jacket. Item 3 is white and black face paint. Accept Jack Skellington.',
  answer: 'Jack Skellington', alternateAnswers: ['Jack'],
})
costume('q-build-dorothy', {
  title: 'Ruby Shoes', difficulty: 'easy', audience: 'family', product: true,
  tags: ['Costumes', 'Family', 'Movies'],
  files: ['dorothy-1.jpg', 'dorothy-2.jpg', 'dorothy-3.jpg', 'dorothy-full.jpg'],
  hostNotes: 'Item 1 is a wicker basket. Item 2 is a blue gingham dress. Item 3 is ruby slippers. Accept Dorothy. The movie title alone is not this costume.',
  answer: 'Dorothy', alternateAnswers: ['Dorothy Gale'],
})
costume('q-build-sonic', {
  title: 'Red Shoes', difficulty: 'easy', audience: 'family', product: true,
  tags: ['Costumes', 'Family', 'Kids', 'Movies'],
  files: ['sonic-1.jpg', 'sonic-2.jpg', 'sonic-3.jpg', 'sonic-full.jpg'],
  hostNotes: 'Item 1 is white gloves. Item 2 is red sneakers. Item 3 is a blue hedgehog hood. Accept Sonic.',
  answer: 'Sonic the Hedgehog', alternateAnswers: ['Sonic'],
})
costume('q-build-moana', {
  title: 'Green Heart', difficulty: 'easy', audience: 'family', product: true,
  tags: ['Costumes', 'Family', 'Kids', 'Movies'],
  files: ['moana-1.jpg', 'moana-2.jpg', 'moana-3.jpg', 'moana-full.jpg'],
  hostNotes: 'Item 1 is a cream wrap skirt with a red sash. Item 2 is a wooden paddle. Item 3 is a green heart necklace. Accept Moana.',
  answer: 'Moana', alternateAnswers: [],
})
costume('q-build-iron', {
  title: 'Arc Light', difficulty: 'easy', audience: 'family', product: true,
  tags: ['Costumes', 'Family', 'Movies'],
  files: ['iron-1.jpg', 'iron-2.jpg', 'iron-3.jpg', 'iron-full.jpg'],
  hostNotes: 'Item 1 is red boots with gold tops. Item 2 is an arc reactor. Item 3 is a red and gold glove. Accept Iron Man.',
  answer: 'Iron Man', alternateAnswers: ['Tony Stark'],
})
costume('q-build-wednesday', {
  title: 'White Collar', difficulty: 'medium', audience: 'family', product: true,
  tags: ['Costumes', 'Family', 'Movies'],
  files: ['wednesday-1.jpg', 'wednesday-2.jpg', 'wednesday-3.jpg', 'wednesday-full.jpg'],
  hostNotes: 'Item 1 is a black dress. Item 2 is a white pointed collar. Item 3 is two black braids. Accept Wednesday Addams. The Addams Family alone is not this costume.',
  answer: 'Wednesday Addams', alternateAnswers: ['Wednesday'],
})
costume('q-build-paddington', {
  title: 'Red Hat', difficulty: 'easy', audience: 'family', product: true,
  tags: ['Costumes', 'Family', 'Kids', 'Movies'],
  files: ['paddington-1.jpg', 'paddington-2.jpg', 'paddington-3.jpg', 'paddington-full.jpg'],
  hostNotes: 'Item 1 is a brown suitcase. Item 2 is a blue toggle coat. Item 3 is a red hat. Accept Paddington.',
  answer: 'Paddington', alternateAnswers: ['Paddington Bear'],
})
costume('q-build-super', {
  title: 'Red Boots', difficulty: 'easy', audience: 'family', product: true,
  tags: ['Costumes', 'Family', 'Movies'],
  files: ['super-1.jpg', 'super-2.jpg', 'super-3.jpg', 'super-full.jpg'],
  hostNotes: 'Item 1 is red boots. Item 2 is a yellow belt. Item 3 is a red cape. Accept Superman.',
  answer: 'Superman', alternateAnswers: ['Clark Kent'],
})
costume('q-build-vampire', {
  title: 'High Collar', difficulty: 'easy', audience: 'family', product: true,
  tags: ['Costumes', 'Family'],
  files: ['vampire-1.jpg', 'vampire-2.jpg', 'vampire-3.jpg', 'vampire-full.jpg'],
  hostNotes: 'Item 1 is a black hooded cape. Item 2 is fake blood. Item 3 is fangs. Accept vampire or Dracula.',
  answer: 'Vampire', alternateAnswers: ['A vampire', 'Dracula'],
})
costume('q-build-carrie', {
  title: 'Prom Night', difficulty: 'medium', audience: 'teen', product: true,
  tags: ['Costumes', 'Teen', 'Movies'],
  files: ['carrie-1.jpg', 'carrie-2.jpg', 'carrie-3.jpg', 'carrie-full.jpg'],
  hostNotes: 'Item 1 is a tiara. Item 2 is a pale pink gown. Item 3 is a bucket of blood. Accept Carrie. The answer picture is Carrie at the prom. Hidden in family mode.',
  answer: 'Carrie', alternateAnswers: ['Carrie White'],
})
costume('q-build-myers', {
  title: 'Coveralls', difficulty: 'medium', audience: 'teen', product: true,
  tags: ['Costumes', 'Teen', 'Movies'],
  files: ['myers-1.jpg', 'myers-2.jpg', 'myers-3.jpg', 'myers-full.jpg'],
  hostNotes: 'Item 1 is blue coveralls. Item 2 is a kitchen knife. Item 3 is the white mask. Accept Michael Myers or The Shape. Hidden in family mode.',
  answer: 'Michael Myers', alternateAnswers: ['Mike Myers', 'The Shape'],
})
costume('q-build-jason', {
  title: 'Work Shirt', difficulty: 'medium', audience: 'teen', product: true,
  tags: ['Costumes', 'Teen', 'Movies'],
  files: ['jason-1.jpg', 'jason-2.jpg', 'jason-3.jpg', 'jason-full.jpg'],
  hostNotes: 'Item 1 is a dark green work shirt. Item 2 is a machete. Item 3 is a white hockey mask. Accept Jason or Jason Voorhees. The answer picture is Jason from the movie. Hidden in family mode.',
  answer: 'Jason Voorhees', alternateAnswers: ['Jason'],
})

const json = JSON.stringify(pack, null, 2)
await mkdir(resolve(root, 'src/content'), { recursive: true })
await mkdir(resolve(root, 'public/packs/spooknight'), { recursive: true })
await writeFile(resolve(root, 'src/content/spooknight.json'), json)
await writeFile(resolve(root, 'public/packs/spooknight/pack.json'), json)
const over = pack.challenges.filter((item) => item.stages.length > 3)
console.log(`Wrote ${pack.challenges.length} challenges, over-limit ${over.length}`)
