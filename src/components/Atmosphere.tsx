export function Atmosphere({ theme }: { theme: string }) {
  return (
    <div className={`atmosphere theme-${theme}`} aria-hidden="true">
      <div className="glow" />
      <div className="fog" />
      <div className="grain" />
      <div className="vignette" />
      {theme === 'vhs' && <div className="scanlines" />}
      {theme === 'neon' && <div className="grid" />}
      <svg className="web" viewBox="0 0 200 120">
        <path d="M8 8 Q40 20 20 60 Q10 30 8 8" fill="none" stroke="currentColor" strokeWidth="0.4" />
        <path d="M8 8 L48 18 M8 8 L30 48" fill="none" stroke="currentColor" strokeWidth="0.3" />
      </svg>
      <svg className="bat bat-a" viewBox="0 0 64 24">
        <path d="M32 14 C24 4 10 6 2 2 C12 12 14 16 32 14 C50 16 52 12 62 2 C54 6 40 4 32 14 Z" />
      </svg>
      <svg className="bat bat-b" viewBox="0 0 64 24">
        <path d="M32 14 C24 4 10 6 2 2 C12 12 14 16 32 14 C50 16 52 12 62 2 C54 6 40 4 32 14 Z" />
      </svg>
    </div>
  )
}

export function Celebration({
  name,
  points,
  color,
  icon,
}: {
  name: string
  points: number
  color: string
  icon: string
}) {
  const sign = points >= 0 ? '+' : ''
  return (
    <div className="celebration" style={{ ['--team' as string]: color }}>
      <div className="sparks" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => <i key={index} />)}
      </div>
      <p>{icon} {name}</p>
      <strong>{sign}{points}</strong>
    </div>
  )
}
