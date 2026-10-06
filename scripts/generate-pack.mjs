import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const stage = (id, label, points, extra = {}) => ({ id, label, points, ...extra })
const text = (id, label, points, publicText) => stage(id, label, points, { publicText })

const pack = {
  id: 'spooknight',
  title: 'Spooknight',
  themeSuggestion: 'cinematic',
  media: [
    asset('m01', 'The Lantern Watch poster', 'posters/lantern-watch.svg', 'Original poster illustration of a lantern above a crooked porch. No copyrighted film art.'),
    asset('m02', 'Mrs Hollow’s Pie poster', 'posters/hollows-pie.svg', 'Original poster of a glowing pie cooling on a windowsill under a full moon.'),
    asset('m03', 'Fog Harbor poster', 'posters/fog-harbor.svg', 'Original poster of a lighthouse swallowed by Halloween fog and bats.'),
    asset('m04', 'Lantern handle close-up', 'objects/lantern-handle.svg', 'Extreme close-up illustration of an iron lantern handle and rivets.'),
    asset('m05', 'Shadow behind the door', 'scenes/door-shadow.svg', 'A tall original shadow waits behind a cracked wooden door.'),
    asset('m06', 'Lantern Pie mashup', 'posters/lantern-pie-mashup.svg', 'Original mashup illustration combining The Lantern Watch and Mrs Hollow’s Pie.'),
    asset('m07', 'Poster without the keeper', 'posters/lantern-without-star.svg', 'The Lantern Watch porch with the keeper removed from the scene.'),
    asset('m08', 'Vampire portrait', 'characters/vampire.svg', 'Original generic vampire costume design: cape, widow’s peak, and fangs. Not a specific film character.'),
    asset('m09', 'Glove and candlestick', 'characters/glove.svg', 'Original close crop of a velvet glove holding a dripping candlestick.'),
    asset('m10', 'Monster ensemble', 'characters/ensemble.svg', 'Original lineup of a witch, vampire, werewolf, and an empty gap where a ghost should be.'),
    asset('m11', 'Moondrop candy', 'objects/candy-wrapper.svg', 'Original candy wrapper design for the fictional candy Moondrop.'),
    asset('m12', 'Pip the porch ghost', 'characters/pip.svg', 'Original friendly ghost character with a pumpkin bucket.'),
    asset('m13', 'Wickkeeper coat', 'characters/wickkeeper.svg', 'Original fictional villain costume: oilcoat, lantern, and porch boots.'),
  ],
  rounds: [
    round('r-warmup', 'Halloween Warm-Up', 'A gentle start. The room wakes up.', false, 'shout-out', 'open', ['q-turnip', 'q-fact-date', 'q-fact-muertos', 'q-first-novels', 'q-emoji-hollow', 'q-ofrenda']),
    round('r-posters', "What's That Poster?", 'Original posters. Points fall as the picture clears.', false, 'shout-out', 'open', ['q-lantern', 'q-pie', 'q-fog', 'q-zoom', 'q-door', 'q-mashup', 'q-nostar', 'q-video']),
    round('r-sounds', 'Name That Sound', 'Short clips. Longer playback is worth fewer points.', false, 'buzz-in', 'open', ['q-howl', 'q-thunder', 'q-cauldron', 'q-wrapper', 'q-porchlight']),
    round('r-monsters', 'Monsters & Folklore', 'Folklore, silhouettes, and fictional figures.', false, 'steal', 'open', ['q-silhouette', 'q-horseman', 'q-glove', 'q-match', 'q-missing', 'q-wick', 'q-nosferatu', 'q-halloween-film']),
    round('r-kids', 'Halloween for Kids', 'Family-friendly puzzles, costumes, and television.', false, 'round-robin', 'open', ['q-pip', 'q-candy-look', 'q-dorothy', 'q-lyric', 'q-pumpkin-special', 'q-emoji-raven', 'q-trick']),
    round('r-quotes', 'Words in the Dark', 'Public-domain lines and a timeline.', false, 'shout-out', 'open', ['q-nevermore', 'q-weary', 'q-higher', 'q-timeline', 'q-emoji-busters']),
    round('r-candy', 'Candy & Costumes', 'Choices on the board.', false, 'shout-out', 'multiple-choice', ['q-candycorn', 'q-fact-turnip', 'q-costume-vampire']),
    round('r-lightning', 'Lightning Round', 'Fast questions. First clear shout wins.', false, 'shout-out', 'open', ['q-lightning']),
    round('r-final', 'Halloween Nightmare', 'Wager, then chase the last clue.', true, 'shout-out', 'open', ['q-final']),
  ],
  challenges: [],
}

function asset(id, title, path, prompt) {
  return {
    id,
    title,
    filename: path.split('/').pop(),
    contentType: 'image/svg+xml',
    source: 'original',
    licenseNotes: 'Original artwork created for Spooknight. Safe to ship and replace.',
    generationPrompt: prompt,
    bundledPath: `media/${path}`,
  }
}

function round(id, title, intro, final, playMode, answerMode, questionIds) {
  return { id, title, enabled: true, playMode, answerMode, intro, questionIds, final }
}

const baseScore = (mode = 'decreasing', basePoints = 100, penalty = 0) => ({
  mode,
  basePoints,
  penalty,
  stealMultiplier: 0.5,
})

function challenge(partial) {
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

challenge({
  id: 'q-turnip',
  type: 'text-stage',
  title: 'Before the Pumpkin',
  category: 'Halloween History',
  difficulty: 'easy',
  audience: 'family',
  tags: ['Halloween History', 'Family', 'Kids'],
  instructions: 'Three clues. Name the vegetable.',
  hostNotes: 'Irish and Scottish lanterns were traditionally carved from turnips or other hard roots. Pumpkins became the familiar version in North America.',
  answer: 'Turnip',
  alternateAnswers: ['A turnip', 'Turnips'],
  stages: [
    text('q-turnip-1', 'Clue 1', 100, 'Long before porch pumpkins, people in Ireland and Scotland hollowed out a hard root vegetable and carried it as a lantern.'),
    text('q-turnip-2', 'Clue 2', 60, 'Folklore tied the lantern to Stingy Jack, said to wander with a glowing coal inside.'),
    text('q-turnip-3', 'Clue 3', 30, 'It is pale, peppery, and older than the American pumpkin custom. What was carved first?'),
  ],
})

challenge({
  id: 'q-fact-date',
  type: 'fact-or-fright',
  title: 'Calendar Check',
  category: 'General Halloween',
  difficulty: 'easy',
  audience: 'family',
  tags: ['General Halloween', 'Family', 'Kids'],
  instructions: 'Fact, or a fright of a fib?',
  hostNotes: 'Halloween is October 31.',
  answer: 'Fright',
  alternateAnswers: ['False', 'Fiction', 'Fib', 'Not true'],
  factStatement: 'Halloween is celebrated on October 30.',
  factTruth: false,
  scoring: baseScore('fixed', 50),
  stages: [stage('q-fact-date-1', 'Statement', 50)],
})

challenge({
  id: 'q-fact-muertos',
  type: 'fact-or-fright',
  title: 'Two Different Nights',
  category: 'Halloween History',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Halloween History', 'Family'],
  instructions: 'Fact, or a fright of a fib?',
  hostNotes: 'Día de los Muertos is its own tradition, centered on November 1 and 2, ofrendas, and honoring people who have died. It is not another name for Halloween.',
  answer: 'Fright',
  alternateAnswers: ['False', 'Fiction', 'Not true'],
  factStatement: 'Día de los Muertos is just another name for Halloween.',
  factTruth: false,
  scoring: baseScore('fixed', 80),
  stages: [stage('q-fact-muertos-1', 'Statement', 80)],
})

challenge({
  id: 'q-first-novels',
  type: 'which-came-first',
  title: 'Two Famous Books',
  category: 'Classic Horror',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Classic Horror', 'Movies', 'Family'],
  instructions: 'Which work was published first?',
  hostNotes: 'Mary Shelley’s Frankenstein was published in 1818. Bram Stoker’s Dracula was published in 1897.',
  answer: 'Frankenstein',
  alternateAnswers: ["Frankenstein novel", "Mary Shelley's Frankenstein"],
  pair: { a: 'Frankenstein (the novel)', b: 'Dracula (the novel)', first: 'a', detail: 'Frankenstein, 1818. Dracula followed in 1897.' },
  scoring: baseScore('fixed', 80),
  stages: [stage('q-first-novels-1', 'The pair', 80)],
})

challenge({
  id: 'q-emoji-hollow',
  type: 'text-stage',
  title: 'Emoji Story',
  category: 'Movies',
  difficulty: 'easy',
  audience: 'family',
  tags: ['Movies', 'Family', 'Kids'],
  instructions: 'Name the public-domain story.',
  hostNotes: 'Washington Irving published The Legend of Sleepy Hollow in 1820.',
  answer: 'The Legend of Sleepy Hollow',
  alternateAnswers: ['Sleepy Hollow', 'Legend of Sleepy Hollow'],
  stages: [
    text('q-emoji-hollow-1', 'Emoji', 80, '🐴 🌉 🎃'),
    text('q-emoji-hollow-2', 'Extra', 40, 'A rider with no head. A town that does not sleep well.'),
  ],
})

challenge({
  id: 'q-ofrenda',
  type: 'text-stage',
  title: 'The Offering Table',
  category: 'Halloween History',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Halloween History', 'Family'],
  instructions: 'Name what the clues describe.',
  hostNotes: 'An ofrenda is the offering altar for Día de los Muertos, often with photos, food, candles, and cempasúchil marigolds. Speak about the tradition with respect. It is not a Halloween prop.',
  answer: 'An ofrenda',
  alternateAnswers: ['Ofrenda', 'Ofrendas', 'An altar', 'Day of the Dead altar'],
  stages: [
    text('q-ofrenda-1', 'Clue 1', 100, 'For Día de los Muertos, families build a place to welcome loved ones who have died.'),
    text('q-ofrenda-2', 'Clue 2', 70, 'Photos, favorite foods, candles, and bright orange marigolds are common.'),
    text('q-ofrenda-3', 'Clue 3', 40, 'The Spanish name for this offering altar is the answer.'),
  ],
})

const img = (id, label, points, mediaId, effect, publicText) =>
  stage(id, label, points, { publicText, image: { mediaId, effect } })

challenge({
  id: 'q-lantern',
  type: 'image-stage',
  title: 'Progressive Poster',
  category: 'Movies',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Movies', 'Family'],
  instructions: 'This is an original Spooknight poster. Name the film.',
  hostNotes: 'Demo title: The Lantern Watch. Replace this image with a poster you have rights to use. Early crops should avoid the title.',
  answer: 'The Lantern Watch',
  alternateAnswers: ['Lantern Watch'],
  stages: [
    img('q-lantern-1', 'Flame', 100, 'm01', { kind: 'crop', crop: { x: 44, y: 30, w: 14, h: 18 } }, 'A tiny piece of the poster.'),
    img('q-lantern-2', 'Lantern', 80, 'm01', { kind: 'crop', crop: { x: 36, y: 24, w: 30, h: 42 } }),
    img('q-lantern-3', 'Porch', 50, 'm01', { kind: 'crop', crop: { x: 8, y: 8, w: 84, h: 70 } }),
    img('q-lantern-4', 'Full poster', 20, 'm01', { kind: 'none' }, 'The whole illustration.'),
  ],
})

challenge({
  id: 'q-pie',
  type: 'image-stage',
  title: 'Blur to Clear',
  category: 'Movies',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Movies', 'Family'],
  instructions: 'Name this original film.',
  hostNotes: 'Demo title: Mrs Hollow’s Pie.',
  answer: "Mrs Hollow's Pie",
  alternateAnswers: ['Mrs Hollows Pie', 'Mrs. Hollow’s Pie', 'Hollows Pie'],
  stages: [
    img('q-pie-1', 'Heavy blur', 100, 'm02', { kind: 'blur', blur: 28 }),
    img('q-pie-2', 'Soft', 70, 'm02', { kind: 'blur', blur: 12 }),
    img('q-pie-3', 'Almost', 40, 'm02', { kind: 'blur', blur: 4 }),
    img('q-pie-4', 'Clear', 20, 'm02', { kind: 'none' }),
  ],
})

challenge({
  id: 'q-fog',
  type: 'image-stage',
  title: 'Pixelated Horror',
  category: 'Movies',
  difficulty: 'hard',
  audience: 'family',
  tags: ['Movies', 'Family'],
  instructions: 'Name this original film.',
  hostNotes: 'Demo title: Fog Harbor.',
  answer: 'Fog Harbor',
  alternateAnswers: ['The Fog Harbor'],
  stages: [
    img('q-fog-1', 'Chunks', 100, 'm03', { kind: 'pixelate', pixelSize: 42 }),
    img('q-fog-2', 'Blocks', 70, 'm03', { kind: 'pixelate', pixelSize: 20 }),
    img('q-fog-3', 'Dots', 40, 'm03', { kind: 'pixelate', pixelSize: 8 }),
    img('q-fog-4', 'Clear', 20, 'm03', { kind: 'none' }),
  ],
})

challenge({
  id: 'q-zoom',
  type: 'image-stage',
  title: 'Zoomed-In Object',
  category: 'General Halloween',
  difficulty: 'medium',
  audience: 'family',
  tags: ['General Halloween', 'Family'],
  instructions: 'What object is this?',
  hostNotes: 'An iron lantern. The last stage shows the whole prop.',
  answer: 'A lantern',
  alternateAnswers: ['Lantern', 'Oil lantern', 'An iron lantern'],
  stages: [
    img('q-zoom-1', 'Rivets', 100, 'm04', { kind: 'zoom', zoom: 7 }),
    img('q-zoom-2', 'Closer', 70, 'm04', { kind: 'zoom', zoom: 3.5 }),
    img('q-zoom-3', 'Wider', 40, 'm04', { kind: 'zoom', zoom: 1.6 }),
    img('q-zoom-4', 'The object', 20, 'm04', { kind: 'none' }),
  ],
})

challenge({
  id: 'q-door',
  type: 'image-stage',
  title: 'Shadow Behind the Door',
  category: 'Classic Horror',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Classic Horror', 'Family'],
  instructions: 'Who is waiting in the dark? A role, not a film title.',
  hostNotes: 'The figure is a generic vampire silhouette: cape and peaked hair. Accept vampire.',
  answer: 'A vampire',
  alternateAnswers: ['Vampire', 'The vampire'],
  stages: [
    img('q-door-1', 'A crack', 100, 'm05', { kind: 'mask', mask: 'door', reveal: 0.12 }),
    img('q-door-2', 'Wider', 70, 'm05', { kind: 'mask', mask: 'door', reveal: 0.38 }),
    img('q-door-3', 'Flashlight', 40, 'm05', { kind: 'mask', mask: 'flashlight', reveal: 0.7 }),
    img('q-door-4', 'Open', 20, 'm05', { kind: 'none' }),
  ],
})

challenge({
  id: 'q-mashup',
  type: 'image-stage',
  title: 'Two Films, One Picture',
  category: 'Movies',
  difficulty: 'hard',
  audience: 'family',
  tags: ['Movies', 'Family', 'Very Difficult'],
  instructions: 'This original mashup hides two Spooknight films. Name both.',
  hostNotes: 'Award the base points for one title and use Award Bonus for the second. Titles: The Lantern Watch and Mrs Hollow’s Pie.',
  answer: 'The Lantern Watch and Mrs Hollow’s Pie',
  alternateAnswers: ["The Lantern Watch", "Mrs Hollow's Pie"],
  bonuses: [{ id: 'q-mashup-b', prompt: 'Second title', answer: "Mrs Hollow's Pie", points: 40 }],
  stages: [
    img('q-mashup-1', 'Mashup', 80, 'm06', { kind: 'brightness', brightness: 0.35 }, 'Both films are in this picture.'),
    img('q-mashup-2', 'Lit', 40, 'm06', { kind: 'none' }),
  ],
})

challenge({
  id: 'q-nostar',
  type: 'image-stage',
  title: 'Poster Without the Star',
  category: 'Movies',
  difficulty: 'hard',
  audience: 'family',
  tags: ['Movies', 'Family'],
  instructions: 'The leading figure was removed. Name the original demo film.',
  hostNotes: 'The Lantern Watch, with the keeper painted out.',
  answer: 'The Lantern Watch',
  alternateAnswers: ['Lantern Watch'],
  stages: [
    img('q-nostar-1', 'Empty porch', 80, 'm07', { kind: 'mask', mask: 'fog', reveal: 0.25 }),
    img('q-nostar-2', 'Clear', 30, 'm07', { kind: 'none' }, 'The star is still missing.'),
  ],
})

challenge({
  id: 'q-video',
  type: 'video-stage',
  title: 'One Second',
  category: 'Movies',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Movies', 'Family'],
  instructions: 'Name the original film this short scene is from.',
  hostNotes: 'Original animation, not a film clip. The scene is the porch from The Lantern Watch. Each stage plays a longer piece.',
  answer: 'The Lantern Watch',
  alternateAnswers: ['Lantern Watch'],
  stages: [
    stage('q-video-1', 'One second', 100, { video: { mediaId: 'story:porch', start: 0, end: 1, description: 'Original animation. Second 1: a match flares beside a dark porch.' } }),
    stage('q-video-2', 'Two seconds', 70, { video: { mediaId: 'story:porch', start: 0, end: 2, description: 'A lantern lifts into frame.' } }),
    stage('q-video-3', 'Three seconds', 40, { video: { mediaId: 'story:porch', start: 0, end: 3, description: 'The porch and crooked house are visible.' } }),
    stage('q-video-4', 'Full scene', 20, { video: { mediaId: 'story:porch', start: 0, end: 4, description: 'The lantern blazes. Still no on-screen title.' } }),
  ],
})

function audioStage(id, label, points, mediaId, end, description) {
  return stage(id, label, points, { audio: { mediaId, start: 0, end, description } })
}

challenge({
  id: 'q-howl',
  type: 'audio-stage',
  title: 'Mystery Sound',
  category: 'General Halloween',
  difficulty: 'easy',
  audience: 'family',
  tags: ['General Halloween', 'Family', 'Kids'],
  instructions: 'What are you hearing?',
  hostNotes: 'Synthesized wolf howl created in the app. Not a movie soundtrack.',
  answer: 'A wolf',
  alternateAnswers: ['Wolf', 'A howl', 'Wolf howl', 'Werewolf'],
  stages: [audioStage('q-howl-1', 'Short', 80, 'motif:howl', 1.1, 'Synthesized wolf howl, first half.'), audioStage('q-howl-2', 'Full', 40, 'motif:howl', 2.4, 'Full synthesized wolf howl.')],
})

challenge({
  id: 'q-thunder',
  type: 'audio-stage',
  title: 'Storm in a Box',
  category: 'General Halloween',
  difficulty: 'easy',
  audience: 'family',
  tags: ['General Halloween', 'Family'],
  instructions: 'Name the sound.',
  hostNotes: 'Synthesized thunder.',
  answer: 'Thunder',
  alternateAnswers: ['A thunderstorm', 'Lightning', 'A storm'],
  stages: [audioStage('q-thunder-1', 'Rumble', 60, 'motif:thunder', 2.2, 'Synthesized thunder rumble.')],
})

challenge({
  id: 'q-cauldron',
  type: 'audio-stage',
  title: 'Kitchen Magic',
  category: 'Kids',
  difficulty: 'easy',
  audience: 'family',
  tags: ['Kids', 'Family'],
  instructions: 'What is bubbling?',
  hostNotes: 'Synthesized cauldron bubbles.',
  answer: 'A cauldron',
  alternateAnswers: ['Cauldron', 'A witch’s pot', 'A bubbling pot'],
  stages: [audioStage('q-cauldron-1', 'Bubbles', 60, 'motif:cauldron', 2.5, 'Synthesized bubbling cauldron.')],
})

challenge({
  id: 'q-wrapper',
  type: 'audio-stage',
  title: 'Pocket Noise',
  category: 'Candy',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Candy', 'Family', 'Kids'],
  instructions: 'What is making that sound?',
  hostNotes: 'Synthesized candy-wrapper crinkle.',
  answer: 'A candy wrapper',
  alternateAnswers: ['Candy wrapper', 'Wrapper', 'A wrapper'],
  stages: [
    audioStage('q-wrapper-1', 'Crinkle', 80, 'motif:wrapper', 0.6, 'Very short synthesized wrapper crinkle.'),
    audioStage('q-wrapper-2', 'Longer', 40, 'motif:wrapper', 1.4, 'Longer wrapper crinkle.'),
  ],
})

challenge({
  id: 'q-porchlight',
  type: 'audio-stage',
  title: 'Name That Tune',
  category: 'Music',
  difficulty: 'hard',
  audience: 'family',
  tags: ['Music', 'Family'],
  instructions: 'Name this original song.',
  hostNotes: 'Original motif written for Spooknight, titled Porchlight Procession. It is not a commercial recording. Bonus for the demo artist name The Spooknight Band. Replace the motif with a file you have rights to play.',
  answer: 'Porchlight Procession',
  alternateAnswers: ['The Porchlight Procession'],
  bonuses: [{ id: 'q-porch-b', prompt: 'Name the demo artist', answer: 'The Spooknight Band', points: 20 }],
  stages: [
    audioStage('q-porch-1', 'A glimpse', 100, 'motif:porchlight', 0.9, 'Original motif Porchlight Procession, under a second.'),
    audioStage('q-porch-2', 'A phrase', 70, 'motif:porchlight', 2, 'Two seconds of the original motif.'),
    audioStage('q-porch-3', 'Almost', 40, 'motif:porchlight', 3.2, 'Longer phrase of the original motif.'),
    audioStage('q-porch-4', 'Full', 20, 'motif:porchlight', 4, 'Full four-second original motif.'),
  ],
})

challenge({
  id: 'q-silhouette',
  type: 'image-stage',
  title: 'Silhouette',
  category: 'Classic Horror',
  difficulty: 'easy',
  audience: 'family',
  tags: ['Classic Horror', 'Family', 'Kids'],
  instructions: 'Name the classic costume.',
  hostNotes: 'Generic vampire silhouette. Not a specific actor or film still.',
  answer: 'A vampire',
  alternateAnswers: ['Vampire'],
  stages: [
    img('q-sil-1', 'Shadow', 80, 'm08', { kind: 'silhouette' }),
    img('q-sil-2', 'In color', 30, 'm08', { kind: 'none' }, 'The costume, in color.'),
  ],
})

challenge({
  id: 'q-horseman',
  type: 'text-stage',
  title: 'Who Rides Tonight?',
  category: 'Classic Horror',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Classic Horror', 'Family'],
  instructions: 'Name the fictional figure.',
  hostNotes: 'The Headless Horseman from Washington Irving’s The Legend of Sleepy Hollow. Public-domain fiction, not a real crime.',
  answer: 'The Headless Horseman',
  alternateAnswers: ['Headless Horseman', 'The horseman'],
  stages: [
    text('q-horseman-1', 'Clue 1', 100, 'A fictional rider. No face. A pumpkin comes into the story.'),
    text('q-horseman-2', 'Clue 2', 70, 'He chases Ichabod Crane through Sleepy Hollow.'),
    text('q-horseman-3', 'Clue 3', 40, 'Washington Irving wrote him. What do people call the rider?'),
  ],
})

challenge({
  id: 'q-glove',
  type: 'image-stage',
  title: 'Character Detail',
  category: 'Classic Horror',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Classic Horror', 'Family'],
  instructions: 'Name the kind of character from this detail.',
  hostNotes: 'Original art of a glove and candlestick suggesting a vampire or gothic host. Accept vampire.',
  answer: 'A vampire',
  alternateAnswers: ['Vampire', 'A gothic vampire'],
  stages: [
    img('q-glove-1', 'Fingers', 100, 'm09', { kind: 'crop', crop: { x: 38, y: 42, w: 22, h: 28 } }, 'Only a detail.'),
    img('q-glove-2', 'Hand', 60, 'm09', { kind: 'crop', crop: { x: 22, y: 20, w: 56, h: 60 } }),
    img('q-glove-3', 'Whole prop', 30, 'm09', { kind: 'none' }),
  ],
})

challenge({
  id: 'q-match',
  type: 'monster-match',
  title: 'Monster Match',
  category: 'Halloween History',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Halloween History', 'Family'],
  instructions: 'Match each figure to the tradition it comes from.',
  hostNotes: 'These are broad folklore homes, not the only place a story is told. Vampire: Eastern European folklore. Banshee: Irish folklore. Jiangshi: Chinese folklore. La Llorona: Mexican folklore.',
  answer: 'All four matched',
  alternateAnswers: ['Complete match'],
  scoring: baseScore('fixed', 100),
  matchPairs: [
    { id: 'mm1', left: 'Vampire', right: 'Eastern European folklore' },
    { id: 'mm2', left: 'Banshee', right: 'Irish folklore' },
    { id: 'mm3', left: 'Jiangshi', right: 'Chinese folklore' },
    { id: 'mm4', left: 'La Llorona', right: 'Mexican folklore' },
  ],
  stages: [stage('q-match-1', 'Board', 100, { publicText: 'Call the matches. The right column is shuffled.' })],
})

challenge({
  id: 'q-missing',
  type: 'image-stage',
  title: 'Who Is Missing?',
  category: 'Kids',
  difficulty: 'easy',
  audience: 'family',
  tags: ['Kids', 'Family'],
  instructions: 'One classic costume is missing from the lineup.',
  hostNotes: 'The picture shows a witch, a vampire, and a werewolf. The gap is for a ghost.',
  answer: 'A ghost',
  alternateAnswers: ['Ghost', 'The ghost'],
  stages: [
    img('q-missing-1', 'The lineup', 80, 'm10', { kind: 'none' }, 'Who is missing?'),
    text('q-missing-2', 'Hint', 40, 'They are usually a sheet, a boo, or a pale little shape.'),
  ],
})

challenge({
  id: 'q-wick',
  type: 'image-stage',
  title: 'Who Is the Keeper?',
  category: 'Modern Horror',
  difficulty: 'hard',
  audience: 'teen',
  tags: ['Modern Horror', 'Teen', 'Movies'],
  instructions: 'Name this original fictional character.',
  hostNotes: 'Original character The Wickkeeper. Not a real person and not a film still. Family Mode hides this question.',
  answer: 'The Wickkeeper',
  alternateAnswers: ['Wickkeeper'],
  stages: [
    img('q-wick-1', 'Boots', 100, 'm13', { kind: 'crop', crop: { x: 30, y: 68, w: 40, h: 24 } }, 'A fictional porch figure.'),
    img('q-wick-2', 'Coat', 70, 'm13', { kind: 'crop', crop: { x: 22, y: 28, w: 56, h: 64 } }),
    img('q-wick-3', 'Lantern', 40, 'm13', { kind: 'mask', mask: 'flashlight', reveal: 0.55 }),
    img('q-wick-4', 'Full figure', 20, 'm13', { kind: 'none' }),
  ],
})

challenge({
  id: 'q-nosferatu',
  type: 'text-stage',
  title: 'By the Numbers',
  category: 'Classic Horror',
  difficulty: 'expert',
  audience: 'teen',
  tags: ['Classic Horror', 'Movies', 'Very Difficult', 'Teen'],
  instructions: 'Name the silent film.',
  hostNotes: 'Nosferatu (1922), directed by F. W. Murnau. Public-domain film. Count Orlok. An unauthorized adaptation of Dracula. Family Mode hides this.',
  answer: 'Nosferatu',
  alternateAnswers: ['Nosferatu: A Symphony of Horror', 'Nosferatu eine Symphonie des Grauens'],
  scoring: baseScore('decreasing', 100, 10),
  stages: [
    text('q-nosferatu-1', 'Year', 100, 'Released in 1922.'),
    text('q-nosferatu-2', 'Form', 80, 'It is silent, and it was made in Germany.'),
    text('q-nosferatu-3', 'Director', 50, 'Directed by F. W. Murnau.'),
    text('q-nosferatu-4', 'Count', 30, 'Its vampire is Count Orlok. The film borrowed a famous novel without permission.'),
  ],
})

challenge({
  id: 'q-halloween-film',
  type: 'text-stage',
  title: 'The Holiday Title',
  category: 'Modern Horror',
  difficulty: 'medium',
  audience: 'teen',
  tags: ['Modern Horror', 'Movies', 'Teen'],
  instructions: 'Name the 1978 film.',
  hostNotes: 'Halloween (1978), directed by John Carpenter. Keep the clues non-graphic. Family Mode hides this question. No stills or audio from the film are included.',
  answer: 'Halloween',
  alternateAnswers: ['Halloween 1978', 'John Carpenter’s Halloween'],
  stages: [
    text('q-halloween-film-1', 'Year', 100, 'It reached theaters in 1978.'),
    text('q-halloween-film-2', 'Director', 60, 'John Carpenter directed it.'),
    text('q-halloween-film-3', 'Title', 30, 'The film shares its name with the holiday itself.'),
  ],
})

challenge({
  id: 'q-pip',
  type: 'image-stage',
  title: 'Friendly Ghost',
  category: 'Kids',
  difficulty: 'easy',
  audience: 'family',
  tags: ['Kids', 'Family'],
  instructions: 'Name this original character.',
  hostNotes: 'Pip is an original Spooknight ghost. The bucket has a letter P.',
  answer: 'Pip',
  alternateAnswers: ['Pip the ghost', 'Pip the porch ghost'],
  stages: [
    img('q-pip-1', 'Eyes', 80, 'm12', { kind: 'crop', crop: { x: 38, y: 18, w: 24, h: 20 } }, 'A friendly ghost. Not from a movie.'),
    img('q-pip-2', 'Full', 40, 'm12', { kind: 'none' }, 'Look for the letter on the bucket.'),
  ],
})

challenge({
  id: 'q-candy-look',
  type: 'image-stage',
  title: 'Candy Close-Up',
  category: 'Candy',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Candy', 'Kids', 'Family'],
  instructions: 'Name this original candy.',
  hostNotes: 'Fictional candy Moondrop. The wrapper says the name only on the full reveal.',
  answer: 'Moondrop',
  alternateAnswers: ['Moon drop', 'A Moondrop'],
  stages: [
    img('q-candy-1', 'Foil', 100, 'm11', { kind: 'crop', crop: { x: 40, y: 36, w: 18, h: 22 } }),
    img('q-candy-2', 'Wrapper', 60, 'm11', { kind: 'zoom', zoom: 2.2 }),
    img('q-candy-3', 'The name', 20, 'm11', { kind: 'none' }),
  ],
})

challenge({
  id: 'q-dorothy',
  type: 'text-stage',
  title: 'Costume Time Machine',
  category: 'Movies',
  difficulty: 'easy',
  audience: 'family',
  tags: ['Movies', 'Kids', 'Family'],
  instructions: 'Which costume do the clues describe?',
  hostNotes: 'Dorothy, from the 1939 film The Wizard of Oz. Ruby slippers and the yellow brick road are the giveaway. No stills are included.',
  answer: 'Dorothy',
  alternateAnswers: ['Dorothy Gale', 'Wizard of Oz', 'Dorothy from The Wizard of Oz'],
  stages: [
    text('q-dorothy-1', '1939', 80, 'A 1939 movie made this costume a Halloween staple.'),
    text('q-dorothy-2', 'Road', 50, 'Blue gingham, a basket, and a yellow road.'),
    text('q-dorothy-3', 'Shoes', 30, 'The shoes sparkle red.'),
  ],
})

challenge({
  id: 'q-lyric',
  type: 'text-stage',
  title: 'Finish the Line',
  category: 'Music',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Music', 'Kids', 'Family'],
  instructions: 'Finish the original lyric.',
  hostNotes: 'Original lyric written for Spooknight. Not a commercial song. Full line: “Porchlight, porchlight, burning low, guide the little ghosts back home.” You can play motif:mice from the media library as a melodic hint.',
  answer: 'guide the little ghosts back home',
  alternateAnswers: ['Guide the little ghosts home', 'guide the ghosts back home'],
  stages: [
    text('q-lyric-1', 'The line', 80, 'Porchlight, porchlight, burning low…'),
    audioStage('q-lyric-2', 'The tune', 40, 'motif:mice', 4, 'Original melody for the demo lyric. Not a commercial song.'),
  ],
})

challenge({
  id: 'q-pumpkin-special',
  type: 'text-stage',
  title: 'The Patch',
  category: 'Television',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Television', 'Kids', 'Family'],
  instructions: 'Name the television special.',
  hostNotes: 'It’s the Great Pumpkin, Charlie Brown, the Peanuts special first broadcast in the 1960s. No video from the special is included.',
  answer: "It's the Great Pumpkin, Charlie Brown",
  alternateAnswers: ['The Great Pumpkin', 'Great Pumpkin Charlie Brown', 'Its the Great Pumpkin Charlie Brown'],
  stages: [
    text('q-pumpkin-special-1', 'Decade', 100, 'This animated special first aired in the 1960s.'),
    text('q-pumpkin-special-2', 'Patch', 60, 'A round-headed boy waits all night in a pumpkin patch.'),
    text('q-pumpkin-special-3', 'Dog', 30, 'His dog spends the night on a doghouse, fighting a famous ace.'),
  ],
})

challenge({
  id: 'q-emoji-raven',
  type: 'text-stage',
  title: 'Emoji Poem',
  category: 'Classic Horror',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Classic Horror', 'Family'],
  instructions: 'Name the poem.',
  hostNotes: 'Edgar Allan Poe’s The Raven, 1845. Public domain.',
  answer: 'The Raven',
  alternateAnswers: ['Raven', 'The Raven by Poe'],
  stages: [text('q-emoji-raven-1', 'Emoji', 70, '🐦 🚪 🗣️'), text('q-emoji-raven-2', 'Word', 30, 'It answers with a single famous word.')],
})

challenge({
  id: 'q-trick',
  type: 'text-stage',
  title: 'Three Clues at the Door',
  category: 'Kids',
  difficulty: 'easy',
  audience: 'family',
  tags: ['Kids', 'Family', 'General Halloween'],
  instructions: 'What do you say at the door?',
  hostNotes: 'Trick or treat.',
  answer: 'Trick or treat',
  alternateAnswers: ['Trick-or-treat', 'Trick or treating'],
  stages: [
    text('q-trick-1', 'Clue 1', 60, 'You say it on a porch.'),
    text('q-trick-2', 'Clue 2', 40, 'A costume helps. A bucket helps more.'),
    text('q-trick-3', 'Clue 3', 20, 'Three words. The middle one is “or.”'),
  ],
})

challenge({
  id: 'q-nevermore',
  type: 'text-stage',
  title: 'The Quote',
  category: 'Classic Horror',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Classic Horror', 'Family'],
  instructions: 'Which work does this line come from?',
  hostNotes: 'Public domain. “Quoth the Raven, Nevermore.” From Poe’s The Raven, 1845. Bonus if they name the raven or Poe.',
  answer: 'The Raven',
  alternateAnswers: ['The Raven by Edgar Allan Poe', 'Poe’s The Raven'],
  bonuses: [{ id: 'q-never-b', prompt: 'Who wrote it, or who speaks the word?', answer: 'Edgar Allan Poe', points: 20 }],
  stages: [text('q-never-1', 'Line', 80, '“Quoth the Raven, Nevermore.”'), text('q-never-2', 'Hint', 40, 'A poem from 1845. A bird that will not leave.')],
})

challenge({
  id: 'q-weary',
  type: 'text-stage',
  title: 'Finish the Quote',
  category: 'Classic Horror',
  difficulty: 'hard',
  audience: 'family',
  tags: ['Classic Horror', 'Family', 'Very Difficult'],
  instructions: 'Finish the public-domain line.',
  hostNotes: '“Once upon a midnight dreary, while I pondered, weak and weary.” The Raven, Poe.',
  answer: 'weary',
  alternateAnswers: ['Weak and weary'],
  stages: [
    text('q-weary-1', 'Start', 80, 'Once upon a midnight dreary, while I pondered, weak and ______.'),
    text('q-weary-2', 'Hint', 30, 'It rhymes with dreary.'),
  ],
})

challenge({
  id: 'q-higher',
  type: 'higher-lower',
  title: 'Higher or Lower',
  category: 'Movies',
  difficulty: 'medium',
  audience: 'teen',
  tags: ['Movies', 'Classic Horror', 'Teen'],
  instructions: 'Is the hidden release year higher or lower?',
  hostNotes: 'Nosferatu is 1922. Universal’s Frankenstein film is 1931, so higher. Family Mode hides this.',
  answer: 'Higher',
  alternateAnswers: ['1931', 'Frankenstein is higher'],
  higherLower: {
    shown: { label: 'Nosferatu', value: 1922, unit: 'release year' },
    hidden: { label: 'Frankenstein (Universal film)', value: 1931 },
  },
  scoring: baseScore('fixed', 60),
  stages: [stage('q-higher-1', 'The number', 60)],
})

challenge({
  id: 'q-timeline',
  type: 'timeline',
  title: 'Put Them in Order',
  category: 'Halloween History',
  difficulty: 'hard',
  audience: 'family',
  tags: ['Halloween History', 'Classic Horror', 'Family', 'Very Difficult'],
  instructions: 'Put these in the order they first appeared, oldest first.',
  hostNotes: 'Frankenstein novel 1818, The Legend of Sleepy Hollow 1820, The Raven 1845, Dracula novel 1897, Nosferatu 1922.',
  answer: 'Frankenstein, Sleepy Hollow, The Raven, Dracula, Nosferatu',
  alternateAnswers: ['Correct order'],
  timelineItems: [
    { id: 'tl1', label: 'Frankenstein, the novel', order: 1 },
    { id: 'tl2', label: 'The Legend of Sleepy Hollow', order: 2 },
    { id: 'tl3', label: 'The Raven', order: 3 },
    { id: 'tl4', label: 'Dracula, the novel', order: 4 },
    { id: 'tl5', label: 'Nosferatu, the film', order: 5 },
  ],
  scoring: baseScore('fixed', 120),
  stages: [stage('q-timeline-1', 'The list', 120, { publicText: 'Oldest first. Shout the order.' })],
})

challenge({
  id: 'q-emoji-busters',
  type: 'text-stage',
  title: 'Emoji Movie',
  category: 'Movies',
  difficulty: 'easy',
  audience: 'family',
  tags: ['Movies', 'Family'],
  instructions: 'Name the movie.',
  hostNotes: 'Ghostbusters. Emoji only. No stills, quotes, or audio from the film are included.',
  answer: 'Ghostbusters',
  alternateAnswers: ['Ghost Busters', 'The Ghostbusters'],
  stages: [text('q-busters-1', 'Emoji', 60, '👻 🚫 👻'), text('q-busters-2', 'Hint', 20, 'Scientists. Proton packs. A city that will not stay quiet.')],
})

challenge({
  id: 'q-candycorn',
  type: 'text-stage',
  title: 'Three Colors',
  category: 'Candy',
  difficulty: 'easy',
  audience: 'family',
  tags: ['Candy', 'Kids', 'Family'],
  instructions: 'Which colors are stacked in a classic candy corn kernel?',
  hostNotes: 'White, orange, and yellow. Accept any order.',
  answer: 'White, orange, and yellow',
  alternateAnswers: ['Yellow orange white', 'Orange yellow white', 'White orange yellow'],
  choices: ['Red, green, and white', 'White, orange, and yellow', 'Purple and black', 'Pink and blue'],
  scoring: baseScore('fixed', 50),
  stages: [text('q-corn-1', 'Kernel', 50, 'Name the three classic candy-corn colors.')],
})

challenge({
  id: 'q-fact-turnip',
  type: 'fact-or-fright',
  title: 'Root Lantern',
  category: 'Halloween History',
  difficulty: 'medium',
  audience: 'family',
  tags: ['Halloween History', 'Family'],
  instructions: 'Fact, or a fright of a fib?',
  hostNotes: 'True. Turnips and other roots were used before pumpkins.',
  answer: 'Fact',
  alternateAnswers: ['True', 'Yes'],
  factStatement: 'A traditional Irish or Scottish jack-o’-lantern was often carved from a turnip.',
  factTruth: true,
  choices: ['Fact', 'Fright'],
  scoring: baseScore('fixed', 70),
  stages: [stage('q-fact-turnip-1', 'Statement', 70)],
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
  alternateAnswers: ['A vampire', 'Dracula costume'],
  choices: ['Werewolf', 'Vampire', 'Pirate', 'Robot'],
  scoring: baseScore('fixed', 40),
  stages: [text('q-vamp-costume-1', 'Clues', 40, 'A black cape, fangs, and a sharp hairline.')],
})

challenge({
  id: 'q-lightning',
  type: 'lightning',
  title: 'Lightning Round',
  category: 'General Halloween',
  difficulty: 'easy',
  audience: 'family',
  tags: ['General Halloween', 'Kids', 'Family'],
  instructions: 'First clear answer. Ten points each.',
  hostNotes: 'Short family questions. The timer advances on its own.',
  answer: 'See each prompt',
  scoring: baseScore('fixed', 10),
  timerSec: 12,
  timerStyle: 'sudden-death',
  autoRevealOnExpire: true,
  lightningPrompts: [
    { id: 'l1', prompt: 'What fruit is carved into a jack-o’-lantern?', answer: 'A pumpkin', points: 10 },
    { id: 'l2', prompt: 'What night is Halloween?', answer: 'October 31', points: 10 },
    { id: 'l3', prompt: 'What do you say when the door opens?', answer: 'Trick or treat', points: 10 },
    { id: 'l4', prompt: 'Which root was carved before pumpkins?', answer: 'A turnip', points: 10 },
    { id: 'l5', prompt: 'What flies in a classic witch costume’s hand?', answer: 'A broom', points: 10 },
    { id: 'l6', prompt: 'What color is a traditional vampire cape?', answer: 'Black', points: 10 },
    { id: 'l7', prompt: 'What do you light inside a jack-o’-lantern?', answer: 'A candle', points: 10 },
    { id: 'l8', prompt: 'Name the ghost word that means “boo.”', answer: 'Boo', points: 10 },
  ],
  stages: [stage('q-lightning-1', 'Rapid', 10)],
})

challenge({
  id: 'q-final',
  type: 'text-stage',
  title: 'The Last Night of Harvest',
  category: 'Halloween History',
  difficulty: 'hard',
  audience: 'family',
  tags: ['Halloween History', 'Family', 'Very Difficult'],
  instructions: 'Name the ancient festival.',
  hostNotes: 'Samhain, the Irish festival at the turn of the harvest season, often linked by historians with later Halloween customs. Pronunciation is roughly “SOW-in.” Do not claim it and Halloween are identical. Wagers are entered by the host.',
  answer: 'Samhain',
  alternateAnswers: ['Samain', 'The festival of Samhain'],
  scoring: { mode: 'wager', basePoints: 0, penalty: 0, stealMultiplier: 1 },
  stages: [
    text('q-final-1', 'Clue 1', 0, 'It belongs to old Irish tradition, at the hinge between autumn and winter.'),
    text('q-final-2', 'Clue 2', 0, 'People marked the end of the harvest and told stories about the boundary between worlds.'),
    text('q-final-3', 'Clue 3', 0, 'Later Halloween customs in Ireland and Scotland are often discussed alongside it. It is not Día de los Muertos, and it is not a pumpkin.'),
    text('q-final-4', 'Clue 4', 0, 'The name is still used for the festival itself. What is it called?'),
  ],
})

const json = JSON.stringify(pack, null, 2)
await mkdir(resolve(root, 'src/content'), { recursive: true })
await mkdir(resolve(root, 'public/packs/spooknight'), { recursive: true })
await writeFile(resolve(root, 'src/content/spooknight.json'), json)
await writeFile(resolve(root, 'public/packs/spooknight/pack.json'), json)
console.log(`Wrote ${pack.challenges.length} challenges`)
