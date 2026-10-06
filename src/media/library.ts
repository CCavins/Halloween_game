import type { MediaAsset } from '../engine/types'

const DB_NAME = 'spooknight-media'
const STORE = 'assets'

export interface StoredMedia extends MediaAsset {
  blob: Blob
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function idbPut(record: StoredMedia): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function idbDelete(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function idbAll(): Promise<StoredMedia[]> {
  const db = await openDb()
  const records = await new Promise<StoredMedia[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).getAll()
    request.onsuccess = () => resolve(request.result as StoredMedia[])
    request.onerror = () => reject(request.error)
  })
  db.close()
  return records
}

const blobUrls = new Map<string, string>()

export async function hydrateMediaLibrary(): Promise<MediaAsset[]> {
  const records = await idbAll()
  blobUrls.forEach((url) => URL.revokeObjectURL(url))
  blobUrls.clear()
  records.forEach((record) => {
    blobUrls.set(record.id, URL.createObjectURL(record.blob))
  })
  return records.map(({ blob: _blob, ...asset }) => asset)
}

export function blobUrlFor(id: string): string | undefined {
  return blobUrls.get(id)
}

export function bundledUrl(asset: MediaAsset | undefined): string | null {
  if (!asset) return null
  if (asset.originalUrl) return asset.originalUrl
  if (!asset.bundledPath) return null
  return `${import.meta.env.BASE_URL}${asset.bundledPath}`
}

export function resolveAssetUrl(asset: MediaAsset | undefined): string | null {
  if (!asset) return null
  const blob = blobUrls.get(asset.id)
  if (blob) return blob
  return bundledUrl(asset)
}

export function displayUrl(mediaId: string, fallback: string): string {
  return blobUrls.get(mediaId) || (fallback.startsWith('blob:') ? '' : fallback)
}
