import { STARTING_WARDROBE } from '../mockData'
import { loadWardrobe, persistWardrobe } from '../storage'
import type { WardrobeItem } from '../types'
import { runLocalService } from './apiClient'
import type { WardrobeService } from './contracts'

let localWardrobe = loadWardrobe(STARTING_WARDROBE)

export const wardrobeService: WardrobeService = {
  list: () => runLocalService(() => localWardrobe),
  create: (item: WardrobeItem) => runLocalService(() => {
    const nextWardrobe = [item, ...localWardrobe]
    if (!persistWardrobe(nextWardrobe)) throw new Error('Could not save this item to your wardrobe. Try a smaller image and save again.')
    localWardrobe = nextWardrobe
    return item
  }),
  update: (item: WardrobeItem) => runLocalService(() => {
    localWardrobe = localWardrobe.map(existing => existing.id === item.id ? item : existing)
    persistWardrobe(localWardrobe)
    return item
  }),
  remove: (id: string) => runLocalService(() => {
    localWardrobe = localWardrobe.filter(item => item.id !== id)
    persistWardrobe(localWardrobe)
  }),
}

/** Keeps the local service cache aligned after a cross-cutting engagement update. */
export function syncWardrobe(items: WardrobeItem[]) {
  localWardrobe = items
  persistWardrobe(localWardrobe)
}
