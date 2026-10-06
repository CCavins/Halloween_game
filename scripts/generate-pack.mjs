import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const posters = JSON.parse(await readFile(resolve(root, 'src/content/posters.json'), 'utf8'))

const stage = (id, label, points, extra = {}) => ({ id, label, points, ...extra })
const text = (id, label, points, publicText) => stage(id, label, points, { publicText })

const pack = {
  id: 'spooknight',
  version: 6,
  title: 'Spooknight',
  themeSuggestion: 'cinematic',
  media: [],
  rounds: [],
  challenges: [],
}

const CREDIT = 'Poster from The Movie Database (TMDB). This app does not store the image.'

for (const [id, poster] of Object.entries(posters)) {
  const path = new URL(poster.originalUrl).pathname.split('/').pop()
  pack.media.push({
    id,
    title: `${poster.title} poster`,
    filename: path,
    contentType: 'image/jpeg',
    source: 'tmdb',
    attribution: 'TMDB',
    originalUrl: poster.originalUrl,
    licenseNotes: CREDIT,
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
  if (partial.type !== 'lightning' && count !== 3) throw new Error(`${partial.id} has ${count} clues`)
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

function emoji(id, meta, lines) {
  const points = [80, 40, 20]
  challenge({
    id,
    type: 'text-stage',
    title: meta.title,
    category: meta.category,
    difficulty: meta.difficulty,
    audience: meta.audience,
    tags: meta.tags,
    instructions: meta.instructions,
    hostNotes: meta.hostNotes,
    answer: meta.answer,
    alternateAnswers: meta.alternateAnswers ?? [],
    scoring: baseScore('decreasing', points[0]),
    stages: lines.slice(0, 3).map((line, index) => text(`${id}-${index + 1}`, `Clue ${index + 1}`, points[index], line)),
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
  'q-turnip', 'q-fact-muertos', 'q-samhain', 'q-emoji-ghostbusters', 'q-emoji-hocus', 'q-emoji-beetle',
])
round('r-posters', "What's That Poster?", 'Real posters, loaded as they are revealed. Points fall as more of the picture shows.', false, 'shout-out', 'open', [
  'q-poster-halloween', 'q-poster-shining', 'q-poster-scream', 'q-poster-jaws', 'q-poster-hocus', 'q-poster-potter', 'q-poster-nightmare',
  'q-poster-exorcist', 'q-poster-elm', 'q-poster-conjuring', 'q-poster-it', 'q-poster-addams', 'q-poster-poltergeist',
])
round('r-emoji', 'Built from Symbols', 'Three clues. Each one adds to the last.', false, 'shout-out', 'open', [
  'q-emoji-thriller', 'q-emoji-mash', 'q-emoji-addams', 'q-emoji-coco', 'q-emoji-gremlins',
  'q-emoji-skeletons', 'q-emoji-thishalloween', 'q-emoji-warp', 'q-emoji-watching', 'q-emoji-spell',
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
round('r-season', 'Candy, Costumes, and Customs', 'Familiar Halloween questions. Three clues each.', false, 'shout-out', 'multiple-choice', [
  'q-candycorn', 'q-costume-vampire', 'q-apples', 'q-blackcat', 'q-allhallows',
])
round('r-quiznight', 'Quiz Night', 'Villains, a connection, a list, and a board. The shapes a pub quiz uses.', false, 'shout-out', 'open', [
  'q-villain-witch', 'q-villain-dracula', 'q-connect-burton', 'q-sisters', 'q-match-monsters', 'q-higher-years',
  'q-villain-myers', 'q-villain-freddy', 'q-villain-pennywise', 'q-timeline-slashers',
])
round('r-lightning', 'Lightning Round', 'Fast questions.', false, 'shout-out', 'open', ['q-lightning'])
round('r-final', 'Final Wager', 'A known film. Three clues.', true, 'shout-out', 'open', ['q-final'])

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

challenge({
  id: 'q-fact-muertos',
  type: 'fact-or-fright',
  title: 'Two Different Nights',
  category: 'Halloween History',
  difficulty: 'easy',
  audience: 'family',
  tags: ['Halloween History', 'Family'],
  instructions: 'Fact, or a fright of a fib?',
  hostNotes: 'Día de los Muertos is its own tradition, centered on November 1 and 2. It is not another name for Halloween.',
  answer: 'Fright',
  alternateAnswers: ['False', 'Fiction', 'Not true'],
  factStatement: 'Día de los Muertos is just another name for Halloween.',
  factTruth: false,
  scoring: baseScore('decreasing', 60),
  stages: [
    text('q-fact-muertos-1', 'Clue 1', 60, 'Two autumn holidays get mixed up. They are not the same night.'),
    text('q-fact-muertos-2', 'Clue 2', 30, 'One is costumes and candy. The other honors family who have died, on November 1 and 2.'),
    text('q-fact-muertos-3', 'Clue 3', 15, 'Fact or a fib: Día de los Muertos is just another name for Halloween.'),
  ],
})

clues('q-samhain', {
  title: 'The Harvest Hinge', category: 'Halloween History', difficulty: 'medium', audience: 'family',
  tags: ['Halloween History', 'Family'],
  hostNotes: 'Samhain, pronounced roughly SOW-in. An old Irish festival at the turn from harvest to winter. Do not say it is the same thing as Halloween.',
  answer: 'Samhain', alternateAnswers: ['Samain'],
}, [
  'It belongs to old Irish tradition, at the hinge between autumn and winter.',
  'People marked the end of the harvest. Later Halloween customs in Ireland and Scotland are often discussed alongside it.',
  'It is not Día de los Muertos. What is the festival called?',
])

emoji('q-emoji-ghostbusters', {
  title: 'Emoji Movie', category: 'Movies', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family'], instructions: 'Name the movie.',
  hostNotes: 'Ghostbusters, 1984. Emoji only. No stills or audio from the film.',
  answer: 'Ghostbusters', alternateAnswers: ['Ghost Busters'],
}, ['👻', '👻 🚫 A comedy about catching ghosts.', '👻 🚫 🏙️ New York, 1984.'])

emoji('q-emoji-hocus', {
  title: 'Three Sisters', category: 'Movies', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family', 'Kids'], instructions: 'Name the movie.',
  hostNotes: 'Hocus Pocus, 1993. The Sanderson sisters.',
  answer: 'Hocus Pocus', alternateAnswers: ['Hocus Pocus 1993'],
}, ['🧙', '🧙 🧹 Three sisters and a spell book.', '🧙 🧹 🐈‍⬛ A black cat. 1993.'])

emoji('q-emoji-beetle', {
  title: 'Say His Name', category: 'Movies', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family'], instructions: 'Name the movie.',
  hostNotes: 'Beetlejuice, 1988, Tim Burton. The title is a pun on beetle and juice.',
  answer: 'Beetlejuice', alternateAnswers: ['Beetle Juice', 'Betelgeuse'],
}, ['🪲', '🪲 🧃 Say the name three times.', '🪲 🧃 🏚️ Tim Burton, 1988.'])

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

emoji('q-emoji-thriller', {
  title: 'A Dance', category: 'Music', difficulty: 'easy', audience: 'family',
  tags: ['Music', 'Family'], instructions: 'Name the song.',
  hostNotes: 'Thriller, Michael Jackson, 1982. No recording or lyric is included.',
  answer: 'Thriller', alternateAnswers: ['Michael Jackson Thriller'],
}, ['🧟', '🧟 🌙 A dance of the living dead.', '🧟 🌙 💃 Michael Jackson, 1982.'])

emoji('q-emoji-mash', {
  title: 'A Party Record', category: 'Music', difficulty: 'easy', audience: 'family',
  tags: ['Music', 'Family', 'Kids'], instructions: 'Name the song.',
  hostNotes: 'Monster Mash, Bobby “Boris” Pickett, 1962.',
  answer: 'Monster Mash', alternateAnswers: ['The Monster Mash'],
}, ['🧟 🎹', '🧟 🎹 💃 It was a graveyard smash.', '🧟 🎹 💃 🎤 Bobby Pickett, 1962.'])

emoji('q-emoji-addams', {
  title: 'The Family', category: 'Television', difficulty: 'easy', audience: 'family',
  tags: ['Television', 'Family', 'Kids'], instructions: 'Name the family, or the show.',
  hostNotes: 'The Addams Family. Accept the 1960s series or the family name.',
  answer: 'The Addams Family', alternateAnswers: ['Addams Family'],
}, ['🖤', '🖤 🕷️ They snap their fingers.', '🖤 🕷️ 👨 👩 👧 A creepy, kooky family.'])

emoji('q-emoji-coco', {
  title: 'The Guitar', category: 'Movies', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family', 'Kids'], instructions: 'Name the movie.',
  hostNotes: 'Coco (2017), Pixar. Set around Día de los Muertos. Not the same holiday as Halloween.',
  answer: 'Coco', alternateAnswers: ['Coco 2017'],
}, ['🎸', '🎸 💀 A boy visits the land of the dead.', '🎸 💀 🌸 Pixar, 2017.'])

emoji('q-emoji-gremlins', {
  title: 'The Rules', category: 'Movies', difficulty: 'medium', audience: 'family',
  tags: ['Movies', 'Family'], instructions: 'Name the movie.',
  hostNotes: 'Gremlins (1984), Joe Dante. Do not get them wet. Do not feed them after midnight.',
  answer: 'Gremlins', alternateAnswers: ['Gremlins 1984'],
}, ['🧸', '🧸 💧 Do not get them wet.', '🧸 💧 🌙 Do not feed them after midnight. 1984.'])

emoji('q-emoji-skeletons', {
  title: 'The Shivers', category: 'Music', difficulty: 'easy', audience: 'family',
  tags: ['Music', 'Family', 'Kids'], instructions: 'Name the song.',
  hostNotes: 'Spooky Scary Skeletons, Andrew Gold, 1996. A kids’ Halloween staple.',
  answer: 'Spooky Scary Skeletons', alternateAnswers: ['Spooky, Scary Skeletons'],
}, ['💀', '💀 🎹 They send shivers down your spine.', '💀 🎹 🕺 Andrew Gold, 1996.'])

emoji('q-emoji-thishalloween', {
  title: 'The Town Song', category: 'Music', difficulty: 'easy', audience: 'family',
  tags: ['Music', 'Family', 'Kids'], instructions: 'Name the song.',
  hostNotes: 'This Is Halloween, from The Nightmare Before Christmas (1993).',
  answer: 'This Is Halloween', alternateAnswers: ['This is Halloween'],
}, ['🎃', '🎃 🎵 Everybody scream.', '🎃 🎵 💀 Jack’s town sings it.'])

emoji('q-emoji-warp', {
  title: 'The Dance', category: 'Music', difficulty: 'medium', audience: 'family',
  tags: ['Music', 'Family'], instructions: 'Name the song.',
  hostNotes: 'The Time Warp, from The Rocky Horror Picture Show (1975).',
  answer: 'The Time Warp', alternateAnswers: ['Time Warp'],
}, ['🕺', '🕺 👈 A jump to the left.', '🕺 👈 👉 Then a step to the right. Rocky Horror.'])

emoji('q-emoji-watching', {
  title: 'The Window', category: 'Music', difficulty: 'medium', audience: 'family',
  tags: ['Music', 'Family'], instructions: 'Name the song.',
  hostNotes: 'Somebody’s Watching Me, Rockwell, 1984. Michael Jackson sings the chorus.',
  answer: "Somebody's Watching Me", alternateAnswers: ['Somebodys Watching Me', 'Somebody is Watching Me'],
}, ['👀', '👀 🪟 He thinks someone is outside.', '👀 🪟 🎤 Rockwell, 1984. Michael Jackson on the chorus.'])

emoji('q-emoji-spell', {
  title: 'The Spell', category: 'Music', difficulty: 'medium', audience: 'family',
  tags: ['Music', 'Family'], instructions: 'Name the song.',
  hostNotes: 'I Put a Spell on You, Screamin’ Jay Hawkins, 1956. Later covered many times. Accept the original title.',
  answer: 'I Put a Spell on You', alternateAnswers: ['I Put a Spell On You'],
}, ['🪄', '🪄 👀 A witchy song from 1956.', '🪄 👀 🎤 Screamin’ Jay Hawkins.'])

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
  instructions: 'Name the film. This one is a wager.',
  hostNotes: 'The Blair Witch Project (1999). Heather, Mike, and Josh. Found footage. Not the later sequels.',
  answer: 'The Blair Witch Project', alternateAnswers: ['Blair Witch', 'The Blair Witch'],
}, [
  'A 1999 horror film shot to look like found footage.',
  'Three students hike into the Maryland woods to film a local legend.',
  'Their tapes are what the movie pretends to be. What is the film called?',
])
pack.challenges.find((item) => item.id === 'q-final').scoring = { mode: 'wager', basePoints: 0, penalty: 0, stealMultiplier: 1 }

const json = JSON.stringify(pack, null, 2)
await mkdir(resolve(root, 'src/content'), { recursive: true })
await mkdir(resolve(root, 'public/packs/spooknight'), { recursive: true })
await writeFile(resolve(root, 'src/content/spooknight.json'), json)
await writeFile(resolve(root, 'public/packs/spooknight/pack.json'), json)
const over = pack.challenges.filter((item) => item.stages.length > 3)
console.log(`Wrote ${pack.challenges.length} challenges, over-limit ${over.length}`)
