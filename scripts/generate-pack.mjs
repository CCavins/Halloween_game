import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const posters = JSON.parse(await readFile(resolve(root, 'src/content/posters.json'), 'utf8'))

const stage = (id, label, points, extra = {}) => ({ id, label, points, ...extra })
const text = (id, label, points, publicText) => stage(id, label, points, { publicText })

const pack = {
  id: 'spooknight',
  version: 4,
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
  if ((partial.stages ?? []).length > 3) throw new Error(`${partial.id} has more than 3 clues`)
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
  'q-poster-hausu', 'q-poster-wicker', 'q-poster-carnival', 'q-poster-eyes', 'q-poster-mungo', 'q-poster-changeling',
])
round('r-emoji', 'Built from Symbols', 'Emoji and symbols add up to a title.', false, 'shout-out', 'open', [
  'q-emoji-thriller', 'q-emoji-mash', 'q-emoji-addams', 'q-emoji-coco', 'q-emoji-gremlins',
  'q-emoji-lugosi', 'q-emoji-ministry', 'q-emoji-boingo', 'q-emoji-sematary', 'q-emoji-spell',
])
round('r-classic', 'Classic Horror', 'A few famous titles, then some that take a sharper memory.', false, 'steal', 'open', [
  'q-psycho', 'q-nosferatu', 'q-frankenstein', 'q-first-novels', 'q-cat-people', 'q-innocents', 'q-black-sunday', 'q-kwaidan', 'q-phibes', 'q-blood-claw',
])
round('r-modern', 'Newer and Nearby', 'Recent horror, and films a casual fan might miss.', false, 'shout-out', 'open', [
  'q-us', 'q-talk', 'q-smile', 'q-cure', 'q-pulse', 'q-session', 'q-pontypool', 'q-dark-song', 'q-his-house', 'q-noroi',
])
round('r-kids', 'For the Kids', 'Movies and shows children actually know.', false, 'round-robin', 'open', [
  'q-poster-coraline', 'q-poster-coco', 'q-poster-monsters', 'q-poster-hotel', 'q-poster-casper', 'q-poster-labyrinth',
  'q-pumpkin-special', 'q-scooby', 'q-gravity', 'q-owl', 'q-adventure', 'q-afraid', 'q-halloweentown', 'q-oz', 'q-watcher', 'q-wicked',
])
round('r-season', 'Candy, Costumes, and Old Customs', 'Familiar sweets, then older seasonal names.', false, 'shout-out', 'multiple-choice', [
  'q-candycorn', 'q-costume-vampire', 'q-souling', 'q-punkie', 'q-hoptunaa',
])
round('r-lightning', 'Lightning Round', 'Fast questions. Easy ones and a few odd ones.', false, 'shout-out', 'open', ['q-lightning'])
round('r-final', 'Final Wager', 'An obscure film. Three clues.', true, 'shout-out', 'open', ['q-final'])

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
  scoring: baseScore('fixed', 60),
  stages: [stage('q-fact-muertos-1', 'Statement', 60)],
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
}, ['👻', '👻 🚫', '👻 🚫 🏙️'])

emoji('q-emoji-hocus', {
  title: 'Three Sisters', category: 'Movies', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family', 'Kids'], instructions: 'Name the movie.',
  hostNotes: 'Hocus Pocus, 1993. The Sanderson sisters.',
  answer: 'Hocus Pocus', alternateAnswers: ['Hocus Pocus 1993'],
}, ['🧙', '🧙 🧹', '🧙 🧹 🐈‍⬛'])

emoji('q-emoji-beetle', {
  title: 'Say His Name', category: 'Movies', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family'], instructions: 'Name the movie.',
  hostNotes: 'Beetlejuice, 1988, Tim Burton. The title is a pun on beetle and juice.',
  answer: 'Beetlejuice', alternateAnswers: ['Beetle Juice', 'Betelgeuse'],
}, ['🪲', '🪲 🧃', '🪲 🧃 🏚️'])

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
poster('q-poster-hausu', {
  mediaId: 'p-hausu', title: 'A Hungry House', difficulty: 'expert', audience: 'teen',
  tags: ['Movies', 'Classic Horror', 'Teen', 'Very Difficult'],
  hostNotes: 'House (1977), Nobuhiko Obayashi. Often called Hausu, the Japanese title. Not House (1985).',
  answer: 'House', alternateAnswers: ['Hausu', 'House 1977'],
})
poster('q-poster-wicker', {
  mediaId: 'p-wicker', title: 'The Island', difficulty: 'hard', audience: 'teen',
  tags: ['Movies', 'Classic Horror', 'Teen', 'Very Difficult'],
  hostNotes: 'The Wicker Man (1973), directed by Robin Hardy, with Christopher Lee. Not the 2006 remake. TMDB dates the release 1974.',
  answer: 'The Wicker Man', alternateAnswers: ['Wicker Man', 'The Wicker Man 1973'],
})
poster('q-poster-carnival', {
  mediaId: 'p-carnival', title: 'The Pavilion', difficulty: 'expert', audience: 'teen',
  tags: ['Movies', 'Classic Horror', 'Teen', 'Very Difficult'],
  hostNotes: 'Carnival of Souls (1962), directed by Herk Harvey.',
  answer: 'Carnival of Souls', alternateAnswers: [],
})
poster('q-poster-eyes', {
  mediaId: 'p-eyes', title: 'The Mask', difficulty: 'expert', audience: 'teen',
  tags: ['Movies', 'Classic Horror', 'Teen', 'Very Difficult'],
  hostNotes: 'Eyes Without a Face (1960), Georges Franju. French title Les Yeux sans visage. TMDB uses the 1962 date.',
  answer: 'Eyes Without a Face', alternateAnswers: ['Les Yeux sans visage', 'Eyes Without a Face 1960'],
})
poster('q-poster-mungo', {
  mediaId: 'p-mungo', title: 'The Lake', difficulty: 'expert', audience: 'teen',
  tags: ['Movies', 'Modern Horror', 'Teen', 'Very Difficult'],
  hostNotes: 'Lake Mungo (2008), an Australian mockumentary. Wider release is often dated 2010.',
  answer: 'Lake Mungo', alternateAnswers: [],
})
poster('q-poster-changeling', {
  mediaId: 'p-changeling', title: 'The Wheelchair', difficulty: 'hard', audience: 'teen',
  tags: ['Movies', 'Classic Horror', 'Teen', 'Very Difficult'],
  hostNotes: 'The Changeling (1980), with George C. Scott. Not the 2008 Angelina Jolie film of a different story.',
  answer: 'The Changeling', alternateAnswers: ['The Changeling 1980'],
})

emoji('q-emoji-thriller', {
  title: 'A Dance', category: 'Music', difficulty: 'easy', audience: 'family',
  tags: ['Music', 'Family'], instructions: 'Name the song.',
  hostNotes: 'Thriller, Michael Jackson, 1982. No recording or lyric is included.',
  answer: 'Thriller', alternateAnswers: ['Michael Jackson Thriller'],
}, ['🧟', '🧟 🌙', '🧟 🌙 💃'])

emoji('q-emoji-mash', {
  title: 'A Party Record', category: 'Music', difficulty: 'easy', audience: 'family',
  tags: ['Music', 'Family', 'Kids'], instructions: 'Name the song.',
  hostNotes: 'Monster Mash, Bobby “Boris” Pickett, 1962.',
  answer: 'Monster Mash', alternateAnswers: ['The Monster Mash'],
}, ['🧟 🎹', '🧟 🎹 💃', '🧟 🎹 💃 🎤'])

emoji('q-emoji-addams', {
  title: 'The Family', category: 'Television', difficulty: 'easy', audience: 'family',
  tags: ['Television', 'Family', 'Kids'], instructions: 'Name the family, or the show.',
  hostNotes: 'The Addams Family. Accept the 1960s series or the family name.',
  answer: 'The Addams Family', alternateAnswers: ['Addams Family'],
}, ['🖤', '🖤 🕷️', '🖤 🕷️ 👨 👩 👧'])

emoji('q-emoji-coco', {
  title: 'The Guitar', category: 'Movies', difficulty: 'easy', audience: 'family',
  tags: ['Movies', 'Family', 'Kids'], instructions: 'Name the movie.',
  hostNotes: 'Coco (2017), Pixar. Set around Día de los Muertos. Not the same holiday as Halloween.',
  answer: 'Coco', alternateAnswers: ['Coco 2017'],
}, ['🎸', '🎸 💀', '🎸 💀 🌸'])

emoji('q-emoji-gremlins', {
  title: 'The Rules', category: 'Movies', difficulty: 'medium', audience: 'family',
  tags: ['Movies', 'Family'], instructions: 'Name the movie.',
  hostNotes: 'Gremlins (1984), Joe Dante. Do not get them wet. Do not feed them after midnight.',
  answer: 'Gremlins', alternateAnswers: ['Gremlins 1984'],
}, ['🧸', '🧸 💧', '🧸 💧 🌙'])

emoji('q-emoji-lugosi', {
  title: 'A Goth Club Record', category: 'Music', difficulty: 'expert', audience: 'teen',
  tags: ['Music', 'Teen', 'Very Difficult'], instructions: 'Name the song.',
  hostNotes: 'Bela Lugosi’s Dead, Bauhaus, 1979. No recording is included.',
  answer: "Bela Lugosi's Dead", alternateAnswers: ['Bela Lugosis Dead'],
}, ['🦇', '🦇 ⚰️', '🦇 ⚰️ 🎤'])

emoji('q-emoji-ministry', {
  title: 'Every Day', category: 'Music', difficulty: 'hard', audience: 'teen',
  tags: ['Music', 'Teen', 'Very Difficult'], instructions: 'Name the song.',
  hostNotes: 'Everyday Is Halloween, Ministry, 1984.',
  answer: 'Everyday Is Halloween', alternateAnswers: ['Every Day Is Halloween'],
}, ['🎃', '🎃 📅', '🎃 📅 🔁'])

emoji('q-emoji-boingo', {
  title: 'The Party', category: 'Music', difficulty: 'hard', audience: 'family',
  tags: ['Music', 'Family', 'Very Difficult'], instructions: 'Name the song.',
  hostNotes: 'Dead Man’s Party, Oingo Boingo, 1985. Danny Elfman.',
  answer: "Dead Man's Party", alternateAnswers: ['Dead Mans Party'],
}, ['💀 🎉', '💀 🎉 🕺', '💀 🎉 🕺 🎺'])

emoji('q-emoji-sematary', {
  title: 'The Band', category: 'Music', difficulty: 'hard', audience: 'teen',
  tags: ['Music', 'Teen', 'Movies'], instructions: 'Name the song.',
  hostNotes: 'Pet Sematary, the Ramones, 1989, written for the film of Stephen King’s novel. The spelling is Sematary.',
  answer: 'Pet Sematary', alternateAnswers: ['Pet Sematary Ramones'],
}, ['🪦', '🪦 🐈', '🪦 🐈 🎸'])

emoji('q-emoji-spell', {
  title: 'The Spell', category: 'Music', difficulty: 'medium', audience: 'family',
  tags: ['Music', 'Family'], instructions: 'Name the song.',
  hostNotes: 'I Put a Spell on You, Screamin’ Jay Hawkins, 1956. Later covered many times. Accept the original title.',
  answer: 'I Put a Spell on You', alternateAnswers: ['I Put a Spell On You'],
}, ['🪄', '🪄 👀', '🪄 👀 🎤'])

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
  scoring: baseScore('fixed', 80),
  stages: [stage('q-first-novels-1', 'The pair', 80)],
})

clues('q-cat-people', {
  title: 'The Pool', category: 'Classic Horror', difficulty: 'expert', audience: 'teen',
  tags: ['Classic Horror', 'Movies', 'Teen', 'Very Difficult'],
  hostNotes: 'Cat People (1942), produced by Val Lewton, directed by Jacques Tourneur. Not the 1982 remake.',
  answer: 'Cat People', alternateAnswers: ['Cat People 1942'],
}, [
  'A 1942 horror film, produced by Val Lewton.',
  'Jacques Tourneur directed. Much of the fear is what you do not see.',
  'A woman believes she descends from people who turn into cats. What is the film called?',
])

clues('q-innocents', {
  title: 'The Governess', category: 'Classic Horror', difficulty: 'expert', audience: 'teen',
  tags: ['Classic Horror', 'Movies', 'Teen', 'Very Difficult'],
  hostNotes: 'The Innocents (1961), with Deborah Kerr, from Henry James’s The Turn of the Screw.',
  answer: 'The Innocents', alternateAnswers: ['The Innocents 1961'],
}, [
  'A 1961 film starring Deborah Kerr.',
  'It adapts Henry James’s The Turn of the Screw.',
  'A governess believes two children are haunted. What is the film called?',
])

clues('q-black-sunday', {
  title: 'The Mask of Satan', category: 'Classic Horror', difficulty: 'expert', audience: 'teen',
  tags: ['Classic Horror', 'Movies', 'Teen', 'Very Difficult'],
  hostNotes: 'Black Sunday (1960), Mario Bava, starring Barbara Steele. Also known as Mask of Satan.',
  answer: 'Black Sunday', alternateAnswers: ['The Mask of Satan', 'Black Sunday 1960'],
}, [
  'A 1960 Italian horror film directed by Mario Bava.',
  'Barbara Steele plays a witch and her descendant.',
  'It is also called Mask of Satan. What is the English title most people use?',
])

clues('q-kwaidan', {
  title: 'Four Stories', category: 'Classic Horror', difficulty: 'expert', audience: 'teen',
  tags: ['Classic Horror', 'Movies', 'Teen', 'Very Difficult'],
  hostNotes: 'Kwaidan (1964), Masaki Kobayashi. An anthology of Japanese ghost stories.',
  answer: 'Kwaidan', alternateAnswers: ['Kaidan', 'Kwaidan 1964'],
}, [
  'A 1964 Japanese film directed by Masaki Kobayashi.',
  'It tells four ghost stories, filmed in bold color.',
  'The title is a word for ghost stories. What is the film called?',
])

clues('q-phibes', {
  title: 'The Organ', category: 'Classic Horror', difficulty: 'hard', audience: 'teen',
  tags: ['Classic Horror', 'Movies', 'Teen'],
  hostNotes: 'The Abominable Dr. Phibes (1971), Vincent Price.',
  answer: 'The Abominable Dr. Phibes', alternateAnswers: ['Dr Phibes', 'Doctor Phibes', 'The Abominable Doctor Phibes'],
}, [
  'A 1971 film starring Vincent Price.',
  'A disfigured genius takes revenge with themed murders.',
  'He plays a pipe organ. What is the doctor’s name in the title?',
])

clues('q-blood-claw', {
  title: 'The Village', category: 'Classic Horror', difficulty: 'expert', audience: 'teen',
  tags: ['Classic Horror', 'Movies', 'Teen', 'Very Difficult'],
  hostNotes: 'Blood on Satan’s Claw (1971), directed by Piers Haggard. Also known as Satan’s Skin.',
  answer: "Blood on Satan's Claw", alternateAnswers: ['Satans Skin', "Satan's Skin"],
}, [
  'A 1971 British folk-horror film directed by Piers Haggard.',
  'In a rural village, something buried in a field starts to change the young people.',
  'It is also called Satan’s Skin. What is the better-known title?',
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

clues('q-cure', {
  title: 'The Question', category: 'Modern Horror', difficulty: 'expert', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen', 'Very Difficult'],
  hostNotes: 'Cure (1997), directed by Kiyoshi Kurosawa. Not The Cure the band.',
  answer: 'Cure', alternateAnswers: ['Cure 1997'],
}, [
  'A 1997 Japanese film directed by Kiyoshi Kurosawa.',
  'A detective investigates murders whose culprits do not remember why they did it.',
  'A drifter asks people, “Who are you?” What is the film called?',
])

clues('q-pulse', {
  title: 'The Dial-Up', category: 'Modern Horror', difficulty: 'expert', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen', 'Very Difficult'],
  hostNotes: 'Pulse (2001), Kiyoshi Kurosawa. Japanese title Kairo. Not the 2006 American remake.',
  answer: 'Pulse', alternateAnswers: ['Kairo', 'Pulse 2001'],
}, [
  'A 2001 Japanese film directed by Kiyoshi Kurosawa.',
  'Ghosts seem to arrive through the internet.',
  'The Japanese title is Kairo. What is the usual English title?',
])

clues('q-session', {
  title: 'The Hospital', category: 'Modern Horror', difficulty: 'expert', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen', 'Very Difficult'],
  hostNotes: 'Session 9 (2001), Brad Anderson, filmed at Danvers State Hospital.',
  answer: 'Session 9', alternateAnswers: ['Session Nine'],
}, [
  'A 2001 film directed by Brad Anderson.',
  'An asbestos crew works inside an abandoned mental hospital.',
  'It was filmed at Danvers State Hospital. What is the title?',
])

clues('q-pontypool', {
  title: 'The Radio Station', category: 'Modern Horror', difficulty: 'expert', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen', 'Very Difficult'],
  hostNotes: 'Pontypool (2008), Bruce McDonald. A virus spreads through language.',
  answer: 'Pontypool', alternateAnswers: [],
}, [
  'A 2008 Canadian film directed by Bruce McDonald.',
  'A shock jock and his producer are trapped in a small-town radio station.',
  'The danger spreads through spoken language. What is the film called?',
])

clues('q-dark-song', {
  title: 'The Ritual', category: 'Modern Horror', difficulty: 'expert', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen', 'Very Difficult'],
  hostNotes: 'A Dark Song (2016), directed by Liam Gavin.',
  answer: 'A Dark Song', alternateAnswers: ['Dark Song'],
}, [
  'A 2016 Irish-Welsh film directed by Liam Gavin.',
  'A grieving woman hires an occultist to perform a months-long ritual in a rented house.',
  'The title is two words after “A.” What is the film called?',
])

clues('q-his-house', {
  title: 'The New Home', category: 'Modern Horror', difficulty: 'hard', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen', 'Very Difficult'],
  hostNotes: 'His House (2020), Remi Weekes. A refugee couple in England.',
  answer: 'His House', alternateAnswers: ['His House 2020'],
}, [
  'A 2020 film directed by Remi Weekes.',
  'A refugee couple from South Sudan are housed in a bleak English town.',
  'Something in the walls is not the neighbor. What is the film called?',
])

clues('q-noroi', {
  title: 'The Documentary', category: 'Modern Horror', difficulty: 'expert', audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen', 'Very Difficult'],
  hostNotes: 'Noroi: The Curse (2005), Koji Shiraishi. A fake documentary.',
  answer: 'Noroi', alternateAnswers: ['Noroi: The Curse', 'Noroi the Curse'],
}, [
  'A 2005 Japanese film directed by Koji Shiraishi.',
  'It pretends to be a documentary left by a paranormal investigator.',
  'The title means “curse.” What is the film called?',
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

clues('q-oz', {
  title: 'Back Again', category: 'Movies', difficulty: 'hard', audience: 'family',
  tags: ['Movies', 'Family', 'Kids', 'Very Difficult'],
  hostNotes: 'Return to Oz (1985), with Fairuza Balk. A darker Disney sequel, not the 1939 film.',
  answer: 'Return to Oz', alternateAnswers: ['Return to Oz 1985'],
}, [
  'A 1985 Disney film, darker than the famous musical.',
  'Fairuza Balk plays Dorothy.',
  'She goes back and meets a talking chicken and a pumpkin-headed man. What is the film called?',
])

clues('q-watcher', {
  title: 'The Woods', category: 'Movies', difficulty: 'hard', audience: 'family',
  tags: ['Movies', 'Family', 'Very Difficult'],
  hostNotes: 'The Watcher in the Woods (1980), Disney, with Bette Davis.',
  answer: 'The Watcher in the Woods', alternateAnswers: ['Watcher in the Woods'],
}, [
  'A 1980 Disney film starring Bette Davis.',
  'An American family rents a house in the English countryside.',
  'Something in the woods is looking for a girl who vanished years ago. What is the film called?',
])

clues('q-wicked', {
  title: 'The Carnival', category: 'Movies', difficulty: 'hard', audience: 'family',
  tags: ['Movies', 'Family', 'Very Difficult'],
  hostNotes: 'Something Wicked This Way Comes (1983), from Ray Bradbury’s novel. Disney.',
  answer: 'Something Wicked This Way Comes', alternateAnswers: [],
}, [
  'A 1983 Disney film from a Ray Bradbury novel.',
  'A mysterious carnival arrives in a small town in autumn.',
  'Mr. Dark runs it. What is the film called?',
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
  scoring: baseScore('fixed', 40),
  stages: [text('q-corn-1', 'Kernel', 40, 'Name the three classic candy-corn colors.')],
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
  scoring: baseScore('fixed', 40),
  stages: [text('q-vamp-1', 'Clues', 40, 'A black cape, fangs, and a sharp hairline.')],
})

clues('q-souling', {
  title: 'The Cakes', category: 'Halloween History', difficulty: 'expert', audience: 'family',
  tags: ['Halloween History', 'Family', 'Very Difficult'],
  instructions: 'Name the old custom.',
  hostNotes: 'Souling. People, often children, went door to door around All Souls’ Day asking for soul cakes and offering prayers for the dead.',
  answer: 'Souling', alternateAnswers: ['Soul cakes', 'Going souling'],
}, [
  'In parts of England and Ireland, people went door to door around All Souls’ Day.',
  'They offered songs or prayers for the dead.',
  'In return they hoped for a small round cake. What was this custom called?',
])

clues('q-punkie', {
  title: 'The Lantern Night', category: 'Halloween History', difficulty: 'expert', audience: 'family',
  tags: ['Halloween History', 'Family', 'Very Difficult'],
  instructions: 'Name the local night.',
  hostNotes: 'Punkie Night, in parts of Somerset, England, late October. Children carry lanterns carved from mangelwurzels or turnips, called punkies.',
  answer: 'Punkie Night', alternateAnswers: ['Punkie', 'Punkies'],
}, [
  'It is a local custom in Somerset, England, in late October.',
  'Children carry lanterns carved from turnips or mangelwurzels.',
  'Those lanterns are called punkies. What is the night called?',
])

clues('q-hoptunaa', {
  title: 'The Island', category: 'Halloween History', difficulty: 'expert', audience: 'family',
  tags: ['Halloween History', 'Family', 'Very Difficult'],
  instructions: 'Name the festival.',
  hostNotes: 'Hop-tu-Naa, the Isle of Man’s October 31 custom. Children sing and carry turnip lanterns.',
  answer: 'Hop-tu-Naa', alternateAnswers: ['Hop tu Naa', 'Hop-tu-naa'],
}, [
  'It is the old Halloween custom of the Isle of Man.',
  'Children sing from door to door and carry turnip lanterns.',
  'The name is not Samhain. What do Manx people call the night?',
])

challenge({
  id: 'q-lightning',
  type: 'lightning',
  title: 'Lightning Round',
  category: 'General Halloween',
  difficulty: 'medium',
  audience: 'family',
  tags: ['General Halloween', 'Kids', 'Family'],
  instructions: 'First clear answer.',
  hostNotes: 'A mix of easy kids’ answers and a few odd real ones. Family safe.',
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
    { id: 'l8', prompt: 'What is the Isle of Man’s name for Halloween night?', answer: 'Hop-tu-Naa', points: 20 },
    { id: 'l9', prompt: 'Name the 1966 Peanuts special about a boy in a pumpkin patch.', answer: "It's the Great Pumpkin, Charlie Brown", points: 15 },
    { id: 'l10', prompt: 'Who directed The Nightmare Before Christmas?', answer: 'Henry Selick', points: 20 },
    { id: 'l11', prompt: 'Name the 1993 movie about the Sanderson sisters.', answer: 'Hocus Pocus', points: 10 },
    { id: 'l12', prompt: 'What do you light inside a jack-o’-lantern?', answer: 'A candle', points: 10 },
  ],
  stages: [stage('q-lightning-1', 'Rapid', 10)],
})

clues('q-final', {
  title: 'The Reeds', category: 'Classic Horror', difficulty: 'expert', audience: 'teen',
  tags: ['Classic Horror', 'Movies', 'Teen', 'Very Difficult'],
  instructions: 'Name the film. This one is a wager.',
  hostNotes: 'Onibaba (1964), directed by Kaneto Shindo. Two women in a reed marsh in wartime Japan. A demon mask. Not a graphic description for the room.',
  answer: 'Onibaba', alternateAnswers: ['Onibaba 1964', 'The Demon'],
}, [
  'A 1964 Japanese film directed by Kaneto Shindo.',
  'Two women live in a marsh of tall reeds during a civil war, and survive by a grim trade.',
  'A stolen mask will not come off. What is the film called?',
])
pack.challenges.find((item) => item.id === 'q-final').scoring = { mode: 'wager', basePoints: 0, penalty: 0, stealMultiplier: 1 }

const json = JSON.stringify(pack, null, 2)
await mkdir(resolve(root, 'src/content'), { recursive: true })
await mkdir(resolve(root, 'public/packs/spooknight'), { recursive: true })
await writeFile(resolve(root, 'src/content/spooknight.json'), json)
await writeFile(resolve(root, 'public/packs/spooknight/pack.json'), json)
const over = pack.challenges.filter((item) => item.stages.length > 3)
console.log(`Wrote ${pack.challenges.length} challenges, over-limit ${over.length}`)
