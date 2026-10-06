import { mkdir, copyFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const from = resolve(root, 'src/content/spooknight.json')
const to = resolve(root, 'public/packs/spooknight/pack.json')
await mkdir(dirname(to), { recursive: true })
await copyFile(from, to)
