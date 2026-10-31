import type { Crop, ImageEffect } from '../engine/types'
import raw from './poster-crops.json'

export type PosterCrops = Record<string, Crop[]>

export const posterCrops = raw as PosterCrops

export function isFullPoster(crop: Crop) {
  return crop.x <= 0.5 && crop.y <= 0.5 && crop.w >= 99 && crop.h >= 99
}

export function posterEffect(crop: Crop): ImageEffect {
  return isFullPoster(crop) ? { kind: 'none' } : { kind: 'crop', crop }
}

export function applyPosterCrop<T extends { mediaId: string; effect: ImageEffect }>(
  challengeId: string | undefined,
  stageIndex: number,
  image: T,
): T {
  const crop = challengeId ? posterCrops[challengeId]?.[stageIndex] : undefined
  if (!crop) return image
  return { ...image, effect: posterEffect(crop) }
}
