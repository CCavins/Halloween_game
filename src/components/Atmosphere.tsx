export function Atmosphere({ theme }: { theme: string }) {
  return (
    <div className={`atmosphere theme-${theme}`} aria-hidden="true">
      <div className="stars" />
      <div className="moon" />
      <div className="glow" />
      <div className="fog" />
      <div className="fog fog-low" />
      <div className="grain" />
      <div className="vignette" />
      <svg className="treeline" viewBox="0 0 1440 160" preserveAspectRatio="none">
        <path d="M0 160 L0 96 L40 78 L70 110 L110 64 L150 100 L190 48 L230 92 L280 40 L330 88 L380 56 L430 104 L480 36 L540 90 L600 50 L660 108 L720 44 L790 96 L850 58 L910 112 L980 46 L1050 98 L1120 62 L1180 108 L1240 54 L1300 96 L1360 70 L1440 100 L1440 160 Z" />
      </svg>
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
