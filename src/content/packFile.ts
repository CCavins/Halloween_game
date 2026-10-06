import JSZip from 'jszip'
import type { Pack } from '../engine/types'
import { hydrateMediaLibrary, idbPut, resolveAssetUrl } from '../media/library'

export async function exportPack(pack: Pack) {
  const zip = new JSZip()
  zip.file('pack.json', JSON.stringify(pack, null, 2))
  const folder = zip.folder('media')
  for (const asset of pack.media) {
    const url = resolveAssetUrl(asset)
    if (!url || !folder) continue
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      folder.file(asset.filename || `${asset.id}`, blob)
    } catch {
      /* skip missing demo files during export */
    }
  }
  const archive = await zip.generateAsync({ type: 'blob' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(archive)
  link.download = `${pack.id || 'spooknight'}-pack.zip`
  link.click()
  URL.revokeObjectURL(link.href)
}

export async function importPackFile(file: File): Promise<Pack> {
  const zip = await JSZip.loadAsync(file)
  const entry = zip.file('pack.json')
  if (!entry) throw new Error('That archive has no pack.json')
  const pack = JSON.parse(await entry.async('string')) as Pack
  for (const [path, item] of Object.entries(zip.files)) {
    if (item.dir || path.endsWith('pack.json')) continue
    const filename = path.split('/').pop() ?? path
    const asset = pack.media?.find((media) => media.filename === filename || path.endsWith(media.bundledPath ?? '---'))
    if (!asset) continue
    const blob = await item.async('blob')
    await idbPut({ ...asset, blob })
  }
  await hydrateMediaLibrary()
  return pack
}
