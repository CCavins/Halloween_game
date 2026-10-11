import titles2025 from './horrordle2025.json'

export type HorrordleMovie = {
  id: string
  season: number
  day?: number
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

function season(year: number, titles: string[], calendarDays = 0): HorrordleMovie[] {
  return titles.map((title, index) => ({
    id: `${year}-${index + 1}`,
    season: year,
    day: index < calendarDays ? index + 1 : undefined,
    title,
  }))
}

export const horrordleMovies: HorrordleMovie[] = [
  ...season(2026, october2026, october2026.length),
  ...season(2025, titles2025, 31),
]

export function movieYear(title: string): string | null {
  const match = title.match(/\((\d{4})\)/)
  return match?.[1] ?? null
}
