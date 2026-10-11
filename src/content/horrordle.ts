export type HorrordleMovie = {
  id: string
  season: number
  day: number
  title: string
}

const october2026 = [
  'Sinners',
  'Carrie (2013)',
  'Influencers',
  'Obsession',
  'The Wailing',
  'Night of the Living Dead',
  'Final Destination Bloodlines',
  'Spree',
  'The Fourth Kind',
  'Ringu',
  'Resident Evil',
  'Smile 2',
  'The Invisible Man (1933)',
  'Ghost in the Machine',
  'The Wolf Man',
  'Backrooms',
  'Occult',
  'Hokum',
  'Body Bags',
  'The Amityville Horror',
  'Leviathan',
  'The Wicker Man',
  'Black Swan',
  'Alien: Romulus',
  'The Lighthouse',
  'Evil Dead II',
  'Silent Night, Deadly Night',
  'Invasion of the Body Snatchers',
  'The Mist',
  'Raw',
  'Halloween III: Season of the Witch',
]

const october2025 = [
  'NOPE',
  '1408',
  'Heretic',
  'The Fog',
  'The Substance',
  'Vampyr',
  'Weapons',
  'Tremors',
  'Presence',
  'Evil Dead Rise',
  'Ginger Snaps',
  'Crawl',
  'Haxan',
  'The Babadook',
  'House',
  'Wrong Turn',
  'Trap',
  'Audition',
  'Milk & Serial',
  'Eraserhead',
  'Frankenstein (1931)',
  'Black Christmas',
  'Bring Her Back',
  'Skinamarink',
  'Deep Red',
  'Nosferatu (2024)',
  'The Monkey',
  'Demons',
  'Re-Animator',
  'Speak No Evil (2022)',
  'Halloween (2018)',
]

function season(year: number, titles: string[]): HorrordleMovie[] {
  return titles.map((title, index) => ({
    id: `${year}-${index + 1}`,
    season: year,
    day: index + 1,
    title,
  }))
}

export const horrordleMovies: HorrordleMovie[] = [
  ...season(2026, october2026),
  ...season(2025, october2025),
]

export function movieYear(title: string): string | null {
  const match = title.match(/\((\d{4})\)/)
  return match?.[1] ?? null
}
