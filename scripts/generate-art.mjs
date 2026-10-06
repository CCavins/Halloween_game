import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function svg(body, background = '#140c18') {
  const backdrop = background ? `<rect width="100" height="100" fill="${background}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img">
  ${backdrop}
  ${body}
</svg>`
}

const sky = `
  <circle cx="78" cy="18" r="10" fill="#f4e7c8"/>
  <circle cx="82" cy="18" r="8" fill="#140c18"/>
  <g fill="#f4e7c8" opacity="0.8">
    <circle cx="12" cy="14" r="0.6"/><circle cx="22" cy="28" r="0.4"/>
    <circle cx="30" cy="12" r="0.5"/><circle cx="58" cy="10" r="0.45"/>
    <circle cx="90" cy="40" r="0.4"/>
  </g>`

const files = {
  'media/posters/lantern-watch.svg': svg(`
    ${sky}
    <path d="M8 78 L18 48 L28 78 Z" fill="#241628"/>
    <rect x="16" y="58" width="4" height="6" fill="#ffb15a"/>
    <path d="M6 88 Q30 70 54 88 L6 92 Z" fill="#2a1a16"/>
    <rect x="44" y="46" width="14" height="22" rx="2" fill="#3a2414" stroke="#e7b15a" stroke-width="1"/>
    <path d="M46 46 H56 L54 40 H48 Z" fill="#5a3a18"/>
    <rect x="49" y="42" width="4" height="3" fill="#2a1a10"/>
    <path d="M51 44 C49 38 48 34 51 30 C54 34 53 38 51 44 Z" fill="#ffb03a"/>
    <path d="M51 44 C50 39 50 35 51 32 C52 35 52 39 51 44 Z" fill="#fff1c9"/>
    <rect x="47" y="66" width="8" height="3" fill="#1a100c"/>
    <path d="M70 84 Q80 60 92 84" fill="none" stroke="#241820" stroke-width="3"/>
  `),
  'media/posters/hollows-pie.svg': svg(`
    ${sky}
    <rect x="18" y="22" width="64" height="46" rx="2" fill="#1c2430" stroke="#c9d4e2" stroke-width="2"/>
    <path d="M18 45 H82" stroke="#c9d4e2" stroke-width="1.5"/>
    <path d="M50 22 V68" stroke="#c9d4e2" stroke-width="1.5"/>
    <ellipse cx="50" cy="62" rx="18" ry="7" fill="#f2d2a2"/>
    <path d="M32 62 Q50 40 68 62" fill="#c4491d"/>
    <circle cx="42" cy="54" r="1.2" fill="#f6efe4"/>
    <circle cx="50" cy="50" r="1.2" fill="#f6efe4"/>
    <circle cx="58" cy="55" r="1.1" fill="#f6efe4"/>
    <path d="M44 48 Q46 40 48 48" fill="none" stroke="#f4e7c8" stroke-width="0.8" opacity="0.7"/>
    <path d="M54 46 Q57 38 58 47" fill="none" stroke="#f4e7c8" stroke-width="0.8" opacity="0.7"/>
    <rect x="10" y="68" width="80" height="8" fill="#3a2a22"/>
  `),
  'media/posters/fog-harbor.svg': svg(`
    <rect width="100" height="100" fill="#1a2430"/>
    <circle cx="70" cy="20" r="8" fill="#d9e2ea" opacity="0.35"/>
    <path d="M62 78 V34 H70 V28 H74 V34 H78 V78 Z" fill="#d7d0c4"/>
    <rect x="68" y="30" width="6" height="8" fill="#ffb15a"/>
    <path d="M60 40 H80 L78 78 H62 Z" fill="#8d867c"/>
    <g fill="#e7eef2" opacity="0.28">
      <ellipse cx="30" cy="58" rx="28" ry="6"/>
      <ellipse cx="70" cy="66" rx="34" ry="7"/>
      <ellipse cx="40" cy="74" rx="40" ry="8"/>
    </g>
    <path d="M8 40 Q14 36 18 40 Q14 44 8 40 Z" fill="#0e141c"/>
    <path d="M20 30 Q24 27 27 30 Q24 33 20 30 Z" fill="#0e141c"/>
    <path d="M0 82 H100 V100 H0 Z" fill="#0d1a22"/>
  `),
  'media/objects/lantern-handle.svg': svg(`
    <rect width="100" height="100" fill="#1a120e"/>
    <path d="M18 50 H82" stroke="#8a5a32" stroke-width="8" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="7" fill="#c9a06a" stroke="#5a3a20" stroke-width="2"/>
    <circle cx="50" cy="50" r="2.2" fill="#2a1c12"/>
    <circle cx="34" cy="50" r="2" fill="#d7b88a"/>
    <circle cx="66" cy="50" r="2" fill="#d7b88a"/>
    <path d="M50 18 V36" stroke="#8a5a32" stroke-width="4"/>
    <path d="M42 18 H58" stroke="#d7b88a" stroke-width="3" stroke-linecap="round"/>
  `),
  'media/scenes/door-shadow.svg': svg(`
    <rect width="100" height="100" fill="#0c1014"/>
    <path d="M38 16 Q50 8 62 16 L66 88 H34 Z" fill="#f4e7c8"/>
    <path d="M46 28 Q50 24 54 30 L52 46 Q50 50 48 46 Z" fill="#0c1014"/>
    <path d="M40 40 L34 88 H66 L58 40 Q50 48 40 40 Z" fill="#0c1014"/>
    <path d="M34 88 H66 L70 96 H30 Z" fill="#0c1014"/>
  `),
  'media/posters/lantern-pie-mashup.svg': svg(`
    ${sky}
    <rect x="40" y="28" width="12" height="20" fill="#3a2414" stroke="#e7b15a"/>
    <path d="M46 30 C44 24 44 20 46 16 C48 20 48 24 46 30 Z" fill="#ffb03a"/>
    <ellipse cx="72" cy="70" rx="14" ry="5" fill="#f2d2a2"/>
    <path d="M58 70 Q72 54 86 70" fill="#c4491d"/>
    <path d="M8 84 H100 V100 H8 Z" fill="#241820"/>
  `),
  'media/posters/lantern-without-star.svg': svg(`
    ${sky}
    <path d="M8 78 L18 48 L28 78 Z" fill="#241628"/>
    <rect x="16" y="58" width="4" height="6" fill="#ffb15a"/>
    <path d="M6 88 Q40 72 94 88 L6 94 Z" fill="#2a1a16"/>
    <rect x="46" y="64" width="10" height="4" fill="#3a2414" opacity="0.0"/>
    <circle cx="52" cy="70" r="6" fill="none" stroke="#ffb15a" stroke-dasharray="1.5 1.5" opacity="0.7"/>
  `),
  'media/characters/vampire.svg': svg(`
    <path d="M50 18 L58 28 L50 26 L42 28 Z" fill="#1a1014"/>
    <circle cx="50" cy="32" r="8" fill="#f0d8c8"/>
    <path d="M44 36 L46 42 L48 36 Z" fill="#f4f1ea"/>
    <path d="M52 36 L54 42 L56 36 Z" fill="#f4f1ea"/>
    <path d="M28 48 L50 42 L72 48 L80 92 H20 Z" fill="#1a1014"/>
    <path d="M50 46 L58 70 H42 Z" fill="#6e1020"/>
    <circle cx="47" cy="31" r="0.8" fill="#1a1014"/>
    <circle cx="53" cy="31" r="0.8" fill="#1a1014"/>
  `, ''),
  'media/characters/glove.svg': svg(`
    <rect width="100" height="100" fill="#1a1016"/>
    <rect x="46" y="8" width="6" height="28" fill="#f4e7c8"/>
    <path d="M49 8 C47 4 51 2 52 8" fill="#ffb03a"/>
    <path d="M28 58 Q34 40 40 56 L44 46 Q48 38 50 52 L54 42 Q58 36 60 54 L66 48 Q74 46 76 62 L70 78 H30 Z" fill="#4a1020"/>
    <path d="M34 70 H72" stroke="#2a0a10" stroke-width="1"/>
  `),
  'media/characters/ensemble.svg': svg(`
    <rect width="100" height="100" fill="#221428"/>
    <path d="M16 30 L22 24 L28 30 L26 70 H18 Z" fill="#241830"/>
    <path d="M14 28 H30 L22 16 Z" fill="#241830"/>
    <path d="M22 70 L30 86 H14 Z" fill="#c4491d"/>
    <path d="M40 28 L52 36 L36 36 Z" fill="#1a1014"/>
    <circle cx="44" cy="40" r="6" fill="#f0d8c8"/>
    <path d="M34 48 L44 44 L56 48 L60 78 H30 Z" fill="#1a1014"/>
    <circle cx="78" cy="46" r="8" fill="#3a3a3a"/>
    <path d="M70 52 H88 L92 80 H66 Z" fill="#2a2a2a"/>
    <circle cx="62" cy="58" r="8" fill="none" stroke="#f4e7c8" stroke-dasharray="1.4 1.3"/>
    <path d="M58 70 H66" stroke="#f4e7c8" stroke-dasharray="1 1"/>
  `),
  'media/objects/candy-wrapper.svg': svg(`
    <rect width="100" height="100" fill="#24102a"/>
    <path d="M10 50 L28 38 V62 Z" fill="#7a3cff"/>
    <path d="M90 50 L72 38 V62 Z" fill="#7a3cff"/>
    <rect x="28" y="36" width="44" height="28" rx="3" fill="#ffd166"/>
    <path d="M32 40 H68" stroke="#ff7a18" stroke-width="2"/>
    <path d="M32 46 H68" stroke="#7a3cff" stroke-width="2"/>
    <circle cx="40" cy="54" r="3" fill="#f4e7c8"/>
    <circle cx="50" cy="56" r="2.4" fill="#ff7a18"/>
    <circle cx="60" cy="54" r="3" fill="#f4e7c8"/>
    <text x="50" y="86" text-anchor="middle" font-family="Georgia, serif" font-size="8" fill="#ffd166">MOONDROP</text>
  `),
  'media/characters/pip.svg': svg(`
    <rect width="100" height="100" fill="#1c2438"/>
    <ellipse cx="50" cy="42" rx="22" ry="26" fill="#f7f4ee"/>
    <circle cx="42" cy="36" r="3" fill="#243044"/>
    <circle cx="58" cy="36" r="3" fill="#243044"/>
    <path d="M44 48 Q50 54 56 48" fill="none" stroke="#243044" stroke-width="1.5"/>
    <path d="M30 64 Q50 78 70 64 L66 92 H34 Z" fill="#f7f4ee"/>
    <rect x="42" y="70" width="16" height="14" rx="2" fill="#ff7a18"/>
    <path d="M48 74 H52 V78 H48 Z M50 74 V82" stroke="#f7f4ee" stroke-width="1.4"/>
    <circle cx="18" cy="20" r="6" fill="#f4e7c8" opacity="0.8"/>
  `),
  'media/characters/wickkeeper.svg': svg(`
    <rect width="100" height="100" fill="#100c14"/>
    <ellipse cx="50" cy="90" rx="28" ry="4" fill="#000" opacity="0.4"/>
    <path d="M38 78 H46 L44 96 H36 Z" fill="#1a120c"/>
    <path d="M54 78 H62 L66 96 H56 Z" fill="#1a120c"/>
    <path d="M34 40 L50 32 L66 40 L70 80 H30 Z" fill="#24180f"/>
    <path d="M44 32 L50 14 L56 32" fill="#3a2414"/>
    <rect x="46" y="20" width="8" height="12" fill="#5a3a18" stroke="#e7b15a" stroke-width="0.6"/>
    <path d="M50 20 C48 14 48 10 50 8 C52 10 52 14 50 20 Z" fill="#ffb03a"/>
    <rect x="42" y="46" width="16" height="18" fill="#1a100c"/>
  `),
  'favicon.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="14" fill="#140c18"/>
    <path d="M32 8 C28 20 18 24 18 36 a14 14 0 0 0 28 0 C46 24 36 20 32 8 Z" fill="#ff7a18"/>
    <path d="M32 20 C30 28 26 30 26 36 a6 6 0 0 0 12 0 C38 30 34 28 32 20 Z" fill="#ffd166"/>
  </svg>`,
}

for (const [path, contents] of Object.entries(files)) {
  const full = resolve(root, 'public', path)
  await mkdir(dirname(full), { recursive: true })
  await writeFile(full, contents.trim())
}
console.log(`Wrote ${Object.keys(files).length} art files`)
