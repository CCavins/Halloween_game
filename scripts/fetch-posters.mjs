import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** [id, title, year, search query] */
const movies = [
  ['p-halloween', 'Halloween', 1978, 'Halloween'],
  ['p-shining', 'The Shining', 1980, 'The Shining'],
  ['p-scream', 'Scream', 1996, 'Scream'],
  ['p-jaws', 'Jaws', 1975, 'Jaws'],
  ['p-hocus', 'Hocus Pocus', 1993, 'Hocus Pocus'],
  ['p-potter', "Harry Potter and the Sorcerer's Stone", 2001, "Harry Potter and the Philosopher's Stone"],
  ['p-nightmare', 'The Nightmare Before Christmas', 1993, 'The Nightmare Before Christmas'],
  ['p-exorcist', 'The Exorcist', 1973, 'The Exorcist'],
  ['p-elm', 'A Nightmare on Elm Street', 1984, 'A Nightmare on Elm Street'],
  ['p-conjuring', 'The Conjuring', 2013, 'The Conjuring'],
  ['p-it', 'It', 2017, 'It'],
  ['p-addams', 'The Addams Family', 1991, 'The Addams Family'],
  ['p-poltergeist', 'Poltergeist', 1982, 'Poltergeist'],
  ['p-coraline', 'Coraline', 2009, 'Coraline'],
  ['p-coco', 'Coco', 2017, 'Coco'],
  ['p-monsters', 'Monsters, Inc.', 2001, 'Monsters, Inc.'],
  ['p-hotel', 'Hotel Transylvania', 2012, 'Hotel Transylvania'],
  ['p-casper', 'Casper', 1995, 'Casper'],
  ['p-labyrinth', 'Labyrinth', 1986, 'Labyrinth'],
]

function parseCards(html) {
  const start = html.indexOf('id="movie_results"')
  const slice = start >= 0 ? html.slice(start, start + 120000) : html
  return slice
    .split('comp:media-card')
    .slice(1)
    .map((part) => {
      const id = part.match(/href="\/movie\/(\d+)/)?.[1]
      const title = part.match(/<h2[^>]*>\s*<span>([^<]+)/)?.[1]?.trim()
      const date = part.match(/release_date[^>]*>([^<]+)/)?.[1]?.trim() ?? ''
      const year = Number((date.match(/\d{4}/) ?? [])[0])
      const src = part.match(/https:\/\/media\.themoviedb\.org\/t\/p\/[^"\s]+/)?.[0] ?? ''
      const path = src.match(/(\/[A-Za-z0-9]+\.jpg)/)?.[1] ?? ''
      return { id, title, year: Number.isFinite(year) ? year : 0, path }
    })
    .filter((card) => card.id && card.path && card.title)
}

const curl = promisify(execFile)

async function search(query) {
  const { stdout } = await curl('curl', [
    '-sSL',
    '-A',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    '-H',
    'Accept-Language: en-US,en;q=0.9',
    `https://www.themoviedb.org/search/movie?query=${encodeURIComponent(query)}`,
  ], { maxBuffer: 5_000_000 })
  return parseCards(stdout)
}

function pick(cards, year, title) {
  const exact = cards.find((card) => card.year === year)
  if (exact) return exact
  const named = cards.find((card) => card.title.toLowerCase() === title.toLowerCase() && Math.abs(card.year - year) <= 1)
  return named ?? null
}

const posters = {}
for (const [id, title, year, query] of movies) {
  const cards = await search(query)
  const chosen = pick(cards, year, title)
  if (!chosen) {
    console.warn('NO MATCH', title, year, cards.slice(0, 4).map((card) => `${card.title} ${card.year}`).join(' | '))
    continue
  }
  posters[id] = {
    title,
    year,
    tmdbId: chosen.id,
    matchedTitle: chosen.title,
    originalUrl: `https://image.tmdb.org/t/p/w780${chosen.path}`,
  }
  console.log('OK', title, chosen.year, chosen.title, posters[id].originalUrl)
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 350))
}

await writeFile(resolve(root, 'src/content/posters.json'), JSON.stringify(posters, null, 2))
console.log(`Wrote ${Object.keys(posters).length} posters`)
