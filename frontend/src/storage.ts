import type { EngagementState, Outfit, SavedFit, StylePreference, UserProgress, WardrobeItem } from './types'
import { LEGACY_SEED_IDS, WARDROBE_SEED_VERSION } from './mockData'

const STORAGE_KEYS = {
  wardrobe: 'rewear:wardrobe',
  savedFits: 'rewear:saved-fits',
  stylePreferences: 'rewear:style-preferences',
  progress: 'rewear:progress',
  wardrobeSeedVersion: 'rewear:wardrobe-seed-version',
  engagement: 'rewear:engagement',
} as const

function readArray<T>(key: string, isItem: (value: unknown) => value is T): T[] | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.every(isItem) ? parsed : null
  } catch {
    return null
  }
}

function writeArray<T>(key: string, value: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function readValue<T>(key: string, isValue: (value: unknown) => value is T): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    return isValue(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeValue<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isWardrobeItem = (value: unknown): value is WardrobeItem => isObject(value)
  && typeof value.id === 'string'
  && typeof value.name === 'string'
  && typeof value.image === 'string'
  && ['top', 'outerwear', 'bottom', 'shoes', 'accessory'].includes(String(value.category))
  && typeof value.worn === 'number'

const isOutfit = (value: unknown): value is Outfit => isObject(value)
  && typeof value.id === 'string'
  && typeof value.name === 'string'
  && ((Array.isArray(value.items) && value.items.length > 0 && value.items.every(isWardrobeItem))
    || (isWardrobeItem(value.top) && isWardrobeItem(value.bottom) && isWardrobeItem(value.shoes)))

const isSavedFit = (value: unknown): value is SavedFit => isOutfit(value)
  && isObject(value)
  && typeof value.createdAt === 'string'
  && typeof value.outfitId === 'string'

const isStylePreference = (value: unknown): value is StylePreference => isObject(value)
  && typeof value.id === 'string'
  && typeof value.createdAt === 'string'
  && typeof value.comparisonId === 'string'
  && typeof value.selectedOutfitId === 'string'
  && Array.isArray(value.options)
  && value.options.length === 2
  && value.options.every(isOutfit)

const isUserProgress = (value: unknown): value is UserProgress => isObject(value)
  && typeof value.streak === 'number'
  && typeof value.xp === 'number'
  && typeof value.level === 'number'
  && typeof value.nextLevelThreshold === 'number'

const isEngagementState = (value: unknown): value is EngagementState => isObject(value)
  && Array.isArray(value.challenges)
  && Array.isArray(value.uniqueOutfitKeys)
  && Array.isArray(value.uniqueItemIds)
  && typeof value.nextChallengeSequence === 'number'

export function loadWardrobe(seed: WardrobeItem[]) {
  const storedItems = readArray(STORAGE_KEYS.wardrobe, isWardrobeItem)
  const seedIds = new Set(seed.map(item => item.id))
  const storedSeedVersion = readValue(STORAGE_KEYS.wardrobeSeedVersion, (value): value is number => typeof value === 'number')
  const needsSeedMigration = !storedItems
    || storedSeedVersion !== WARDROBE_SEED_VERSION
    || storedItems.some(item => LEGACY_SEED_IDS.has(item.id))

  if (!needsSeedMigration && storedItems) return storedItems

  const userItems = (storedItems ?? []).filter(item => !LEGACY_SEED_IDS.has(item.id) && !seedIds.has(item.id))
  const migratedItems = [...seed, ...userItems]
  writeArray(STORAGE_KEYS.wardrobe, migratedItems)
  writeValue(STORAGE_KEYS.wardrobeSeedVersion, WARDROBE_SEED_VERSION)
  return migratedItems
}

export const loadSavedFits = () => readArray(STORAGE_KEYS.savedFits, isSavedFit) ?? []
export const loadStylePreferences = () => readArray(STORAGE_KEYS.stylePreferences, isStylePreference) ?? []
export const loadProgress = (fallback: UserProgress) => readValue(STORAGE_KEYS.progress, isUserProgress) ?? fallback
export const loadEngagement = (fallback: EngagementState) => readValue(STORAGE_KEYS.engagement, isEngagementState) ?? fallback
export const persistWardrobe = (items: WardrobeItem[]) => writeArray(STORAGE_KEYS.wardrobe, items)
export const persistSavedFits = (fits: SavedFit[]) => writeArray(STORAGE_KEYS.savedFits, fits)
export const persistStylePreferences = (preferences: StylePreference[]) => writeArray(STORAGE_KEYS.stylePreferences, preferences)
export const persistProgress = (progress: UserProgress) => writeValue(STORAGE_KEYS.progress, progress)
export const persistEngagement = (engagement: EngagementState) => writeValue(STORAGE_KEYS.engagement, engagement)
