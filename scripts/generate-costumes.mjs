import { access, mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'public/media/costumes')

const piece = 'Photoreal studio product photo, one object centered, seamless dark charcoal background, soft even lighting. No person, no mannequin, no hands, no text, no letters, no numbers, no logo, no label, no watermark, no packaging.'
const worn = 'Photoreal full-body studio photo, one person head to toe, centered, seamless dark charcoal background, soft even lighting. No text, no letters, no logo, no watermark, no blood, no second person.'

const jobs = [
  ['witch-1.png', '1:1', `${piece} A straw broom standing upright.`],
  ['witch-2.png', '1:1', `${piece} A tall black pointed witch hat with a plain band.`],
  ['witch-3.png', '1:1', `${piece} A pair of black and orange horizontally striped knee socks, laid flat.`],
  ['witch-full.png', '3:4', `${worn} A smiling person in a family-friendly witch costume: tall black pointed hat, black dress, orange and black striped socks, holding a straw broom. Not frightening.`],
  ['dino-1.png', '1:1', `${piece} A stuffed green dinosaur tail from a costume.`],
  ['dino-2.png', '1:1', `${piece} Two small stuffed green dinosaur arms with tiny claws, side by side.`],
  ['dino-3.png', '1:1', `${piece} A plush green dinosaur hood with big cartoon eyes and a row of white felt teeth.`],
  ['dino-full.png', '3:4', `${worn} A person wearing a cute child-friendly green tyrannosaurus costume with big friendly eyes, tiny arms, and a thick tail. Not frightening.`],
  ['astro-1.png', '1:1', `${piece} A pair of bulky white astronaut gloves. No patches and no flags.`],
  ['astro-2.png', '1:1', `${piece} A round white space helmet with a gold mirrored visor. No flags and no brands.`],
  ['astro-3.png', '1:1', `${piece} A plain white boxy astronaut life-support backpack. No flags and no brands.`],
  ['astro-full.png', '3:4', `${worn} A person in a plain white astronaut costume with a round gold-visor helmet, white gloves, and a white backpack. No flags and no brand names.`],
  ['pirate-1.png', '1:1', `${piece} A black and white horizontally striped long-sleeve shirt on a hanger.`],
  ['pirate-2.png', '1:1', `${piece} A brown tricorn pirate hat. No skull and no emblem.`],
  ['pirate-3.png', '1:1', `${piece} A plain black eyepatch with a thin strap.`],
  ['pirate-full.png', '3:4', `${worn} A smiling person in a pirate costume: striped shirt, brown tricorn hat, black eyepatch, and boots. No weapon.`],
  ['vampire-1.png', '1:1', `${piece} A black cape with a tall stiff collar and red satin lining, on a hanger.`],
  ['vampire-2.png', '1:1', `${piece} A pair of white plastic vampire fangs.`],
  ['vampire-3.png', '1:1', `${piece} A round blank gold medallion on a thin chain. Nothing engraved.`],
  ['vampire-full.png', '3:4', `${worn} A person in a classic vampire costume: black cape with red lining and a tall collar, pale face, small fangs, and a plain gold medallion.`],
  ['rumi-1.png', '1:1', `${piece} A cropped bright yellow bomber jacket on a hanger. No patches.`],
  ['rumi-2.png', '1:1', `${piece} A long lavender-purple hair braid wig, laid in a gentle curve.`],
  ['rumi-3.png', '1:1', `${piece} A sheathed decorative straight sword with a simple dark scabbard.`],
  ['rumi-full.png', '3:4', `${worn} A young woman in an original pop-stage costume: cropped bright yellow bomber jacket, long lavender braid over one shoulder, black shorts, holding a sheathed decorative sword at her side.`],
  ['myers-1.png', '1:1', `${piece} Empty faded blue-gray mechanic coveralls on a wooden hanger.`],
  ['myers-2.png', '1:1', `${piece} One large plain stainless steel kitchen knife. Clean blade, no blood.`],
  ['myers-3.png', '1:1', `${piece} A blank white expressionless face mask with hollow black eyes and shoulder-length brown hair attached. No blood.`],
  ['myers-full.png', '3:4', `${worn} An adult standing still in faded blue-gray mechanic coveralls and a white expressionless mask with brown hair, holding a clean kitchen knife down at one side. No victim.`],
  ['art-1.png', '1:1', `${piece} One stick of white greasepaint and one stick of black greasepaint, side by side, with no packaging.`],
  ['art-2.png', '1:1', `${piece} A tiny black top hat small enough for a clown. No writing on the band.`],
  ['art-3.png', '1:1', `${piece} A black and white satin clown jumpsuit on a hanger, with a ruffled collar and two pom-poms. No blood.`],
  ['art-full.png', '3:4', `${worn} A person in a black and white clown costume: white face paint, black makeup around the eyes and a small black smile, a tiny black top hat, and a black and white satin clown suit. Hands empty. No weapon.`],
]

await mkdir(outDir, { recursive: true })

const pending = []
for (const job of jobs) {
  try {
    await access(resolve(outDir, job[0]))
    console.log(`keep ${job[0]}`)
  } catch {
    pending.push(job)
  }
}

let cursor = 0
const failures = []
async function worker() {
  while (cursor < pending.length) {
    const job = pending[cursor]
    cursor += 1
    try {
      await make(job)
      console.log(`made ${job[0]}`)
    } catch (error) {
      failures.push(`${job[0]}: ${error.message}`)
      console.error(`fail ${job[0]}: ${error.message}`)
    }
  }
}

await Promise.all(Array.from({ length: 4 }, () => worker()))
if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
}

async function make([filename, ratio, prompt]) {
  const text = await runHiggsfield(prompt, ratio)
  const url = findUrl(parsePayload(text))
  if (!url) throw new Error(`no image url in ${text.slice(0, 400)}`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`download ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length < 1000) throw new Error('downloaded file is too small')
  await writeFile(resolve(outDir, filename), bytes)
}

function runHiggsfield(prompt, ratio) {
  return new Promise((done, reject) => {
    const child = spawn('higgsfield', [
      'generate', 'create', 'gpt_image_2',
      '--prompt', prompt,
      '--aspect_ratio', ratio,
      '--wait',
      '--json',
    ], { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    child.stdout.on('data', (chunk) => { out += chunk })
    child.stderr.on('data', (chunk) => { err += chunk })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(err.trim() || out.trim() || `exit ${code}`))
      else done(out)
    })
  })
}

function parsePayload(text) {
  const objectAt = text.indexOf('{')
  const arrayAt = text.indexOf('[')
  const starts = [objectAt, arrayAt].filter((index) => index >= 0)
  if (!starts.length) throw new Error(text.slice(0, 400) || 'empty response')
  return JSON.parse(text.slice(Math.min(...starts)))
}

function findUrl(value) {
  const found = []
  walk(value, found)
  return found.find((url) => /\.(png|jpe?g|webp)(\?|$)/i.test(url)) ?? found[0]
}

function walk(value, found) {
  if (typeof value === 'string') {
    if (value.startsWith('https://') && !value.includes('api.higgsfield.ai')) found.push(value)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, found))
    return
  }
  if (value && typeof value === 'object') Object.values(value).forEach((item) => walk(item, found))
}
