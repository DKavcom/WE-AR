import type { Outfit, WardrobeCategory, WardrobeItem } from '../types'

const outfitOrder: WardrobeCategory[] = ['top', 'outerwear', 'bottom', 'shoes', 'accessory']

function itemLastWornTime(item: WardrobeItem) {
  const timestamp = item.lastWornAt ? Date.parse(item.lastWornAt) : Number.NEGATIVE_INFINITY
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY
}

export const isActiveWardrobeItem = (item: WardrobeItem) => item.isActive !== false
export const getWearCount = (item: WardrobeItem) => item.wearCount ?? item.worn ?? 0

export function rankNeglectedItems(items: WardrobeItem[]) {
  return [...items].filter(isActiveWardrobeItem).sort((first, second) => {
    const firstNeverWorn = getWearCount(first) === 0 ? 0 : 1
    const secondNeverWorn = getWearCount(second) === 0 ? 0 : 1
    if (firstNeverWorn !== secondNeverWorn) return firstNeverWorn - secondNeverWorn
    if (getWearCount(first) !== getWearCount(second)) return getWearCount(first) - getWearCount(second)
    if (itemLastWornTime(first) !== itemLastWornTime(second)) return itemLastWornTime(first) - itemLastWornTime(second)
    return first.id.localeCompare(second.id)
  })
}

function selectNeglectedItem(items: WardrobeItem[], variation: number) {
  const ranked = rankNeglectedItems(items)
  if (!ranked.length) return undefined
  const preferredCount = Math.min(ranked.length, 3)
  return ranked[Math.abs(variation) % preferredCount]
}

export function outfitKey(outfit: Outfit | undefined) {
  return outfit?.items?.map(item => item.id).sort().join('|') ?? ''
}

function createHomeOutfit(items: WardrobeItem[], variation: number): Outfit {
  const byCategory = new Map(items.map(item => [item.category, item]))
  const top = byCategory.get('top')
  const outerwear = byCategory.get('outerwear')
  const bottom = byCategory.get('bottom')
  const shoes = byCategory.get('shoes')
  const accessory = byCategory.get('accessory')
  const orderedItems = outfitOrder.map(category => byCategory.get(category)).filter((item): item is WardrobeItem => Boolean(item))
  return {
    id: `home-${orderedItems.map(item => item.id).join('-') || variation}`,
    name: orderedItems.length ? orderedItems.map(item => item.name).join(' + ') : 'Your wardrobe fit',
    items: orderedItems,
    ...(top ? { top } : {}),
    ...(outerwear ? { outerwear } : {}),
    ...(bottom ? { bottom } : {}),
    ...(shoes ? { shoes } : {}),
  }
}

export function generateHomeOutfit(items: WardrobeItem[], previous?: Outfit, variation = 0): Outfit | undefined {
  items = items.filter(isActiveWardrobeItem)
  if (!items.length) return undefined
  const categoryItems = (category: WardrobeCategory) => items.filter(item => item.category === category)
  const attempts = Math.max(1, Math.min(6, items.length))

  for (let offset = 0; offset < attempts; offset += 1) {
    const turn = variation + offset
    const selected = [
      selectNeglectedItem(categoryItems('top'), turn),
      turn % 2 === 1 ? selectNeglectedItem(categoryItems('outerwear'), turn) : undefined,
      selectNeglectedItem(categoryItems('bottom'), turn + 1),
      selectNeglectedItem(categoryItems('shoes'), turn + 2),
      turn % 3 === 2 ? selectNeglectedItem(categoryItems('accessory'), turn) : undefined,
    ].filter((item): item is WardrobeItem => Boolean(item))
    const outfit = createHomeOutfit(selected, turn)
    if (!previous || outfitKey(outfit) !== outfitKey(previous)) return outfit
  }

  return createHomeOutfit([selectNeglectedItem(items, variation)].filter((item): item is WardrobeItem => Boolean(item)), variation)
}

export function replaceHomeOutfitSlot(outfit: Outfit | undefined, item: WardrobeItem): Outfit {
  const currentItems = outfit?.items ?? [outfit?.top, outfit?.outerwear, outfit?.bottom, outfit?.shoes].filter((entry): entry is WardrobeItem => Boolean(entry))
  const byCategory = new Map(currentItems.map(currentItem => [currentItem.category, currentItem]))
  byCategory.set(item.category, item)
  return createHomeOutfit(outfitOrder.map(category => byCategory.get(category)).filter((entry): entry is WardrobeItem => Boolean(entry)), 0)
}

export function homeOutfitHasItem(outfit: Outfit | undefined, item: WardrobeItem) {
  return outfit?.items?.some(currentItem => currentItem.id === item.id) ?? false
}
