import type { Outfit, StylePreference, WardrobeItem } from '../types'
import { apiBaseUrl, dataMode, success } from './apiClient'
import type { OutfitRecommendationRequest, OutfitRecommendationResult, OutfitService } from './contracts'

interface ApiOutfit {
  id: string
  itemIds: string[]
  name: string
  rationale: string
  styleTags: string[]
}

interface ApiResponse {
  success?: boolean
  outfits?: ApiOutfit[]
  error?: string
}

function outfitItems(outfit: Outfit) {
  return outfit.items ?? [outfit.top, outfit.outerwear, outfit.bottom, outfit.shoes].filter((item): item is WardrobeItem => Boolean(item))
}

function unique(values: Array<string | undefined>, limit = 8) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].slice(0, limit)
}

function preferenceSignals(preferences: StylePreference[]) {
  const selectedOutfits = preferences.slice(0, 30).map(preference => preference.options.find(option => option.id === preference.selectedOutfitId)).filter((outfit): outfit is Outfit => Boolean(outfit))
  const selected = selectedOutfits.flatMap(outfitItems)
  const formalItems = selected.filter(item => item.metadata?.formalityScore !== undefined)
  return {
    colors: unique(selected.map(item => item.color)),
    styleTags: unique(selected.flatMap(item => item.metadata?.styleTags ?? [])),
    fits: unique(selected.map(item => item.metadata?.fit)),
    categoryCombinations: unique(selectedOutfits.map(outfit => unique(outfitItems(outfit).map(item => item.category), 4).sort().join('+'))),
    averageFormality: formalItems.length ? Math.round(formalItems.reduce((total, item) => total + (item.metadata?.formalityScore ?? 0), 0) / formalItems.length) : undefined,
  }
}

function combinationKey(items: WardrobeItem[]) {
  return items.map(item => item.id).sort().join('|')
}

function createOutfit(items: WardrobeItem[], index: number, source: 'api' | 'local', details?: Partial<ApiOutfit>): Outfit {
  const top = items.find(item => item.category === 'top')
  const outerwear = items.find(item => item.category === 'outerwear')
  const bottom = items.find(item => item.category === 'bottom')
  const shoes = items.find(item => item.category === 'shoes')
  return {
    id: details?.id ?? `${source}-${combinationKey(items) || index}`,
    name: details?.name ?? items.map(item => item.name).join(' + '),
    items,
    ...(top ? { top } : {}),
    ...(outerwear ? { outerwear } : {}),
    ...(bottom ? { bottom } : {}),
    ...(shoes ? { shoes } : {}),
    rationale: details?.rationale ?? 'A practical combination made entirely from your wardrobe.',
    styleTags: details?.styleTags ?? unique(items.flatMap(item => item.metadata?.styleTags ?? []), 5),
  }
}

function localRecommendations(request: OutfitRecommendationRequest): OutfitRecommendationResult {
  const count = Math.min(Math.max(request.count ?? 3, 1), 5)
  const excluded = new Set((request.excludeItemCombinations ?? []).map(ids => [...ids].sort().join('|')))
  const requiredId = request.wardrobe.some(item => item.id === request.requiredItemId) ? request.requiredItemId : undefined
  const tops = request.wardrobe.filter(item => item.category === 'top')
  const outerwear = request.wardrobe.filter(item => item.category === 'outerwear')
  const bottoms = request.wardrobe.filter(item => item.category === 'bottom')
  const shoes = request.wardrobe.filter(item => item.category === 'shoes')
  let combinations: WardrobeItem[][] = []

  if (tops.length && bottoms.length && shoes.length) {
    const outerwearOptions: Array<WardrobeItem | undefined> = [undefined, ...outerwear]
    combinations = tops.flatMap(top => bottoms.flatMap(bottom => shoes.flatMap(shoe => outerwearOptions.map(layer => layer ? [top, layer, bottom, shoe] : [top, bottom, shoe]))))
  }
  else if (request.wardrobe.length) {
    combinations = [request.wardrobe.filter(item => item.category !== 'accessory').slice(0, 3)]
    if (!combinations[0].length) combinations = [[request.wardrobe[0]]]
  }

  if (requiredId) combinations = combinations.filter(items => items.some(item => item.id === requiredId))
  combinations = combinations.filter(items => items.length && !excluded.has(combinationKey(items)))

  const signals = preferenceSignals(request.preferences)
  const score = (items: WardrobeItem[]) => items.reduce((total, item) => total
    + (item.color && signals.colors.includes(item.color) ? 3 : 0)
    + (item.metadata?.fit && signals.fits.includes(item.metadata.fit) ? 2 : 0)
    + (item.metadata?.styleTags?.filter(tag => signals.styleTags.includes(tag)).length ?? 0), 0)
  combinations.sort((a, b) => score(b) - score(a) || combinationKey(a).localeCompare(combinationKey(b)))
  return { outfits: combinations.slice(0, count).map((items, index) => createOutfit(items, index, 'local')), source: 'local' }
}

function wardrobePayload(items: WardrobeItem[]) {
  return items.slice(0, 100).map(item => ({ id: item.id, name: item.name, category: item.category, ...(item.color ? { color: item.color } : {}), ...(item.metadata ? { metadata: item.metadata } : {}) }))
}

async function apiRecommendations(request: OutfitRecommendationRequest): Promise<OutfitRecommendationResult> {
  const response = await fetch(`${apiBaseUrl}/recommend-outfits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wardrobe: wardrobePayload(request.wardrobe),
      preferenceSignals: preferenceSignals(request.preferences),
      entryContext: request.entryContext,
      count: Math.min(Math.max(request.count ?? 3, 1), 5),
      requiredItemId: request.requiredItemId,
      excludeItemCombinations: request.excludeItemCombinations?.slice(0, 20),
    }),
  })
  const payload = await response.json().catch(() => null) as ApiResponse | null
  if (!response.ok || !payload?.success || !Array.isArray(payload.outfits)) throw new Error(payload?.error ?? 'Recommendation request failed.')

  const byId = new Map(request.wardrobe.map(item => [item.id, item]))
  const seen = new Set<string>()
  const outfits = payload.outfits.flatMap((apiOutfit, index) => {
    const items = apiOutfit.itemIds.map(id => byId.get(id)).filter((item): item is WardrobeItem => Boolean(item))
    const key = combinationKey(items)
    if (!items.length || items.length !== apiOutfit.itemIds.length || seen.has(key)) return []
    seen.add(key)
    return [createOutfit(items, index, 'api', apiOutfit)]
  })
  if (!outfits.length && request.wardrobe.length) throw new Error('The recommendation response contained no usable wardrobe combinations.')
  return { outfits, source: 'api' }
}

export const outfitService: OutfitService = {
  async recommend(request) {
    try {
      if (dataMode === 'api') return success(await apiRecommendations(request))
      return success(localRecommendations(request))
    } catch {
      return success(localRecommendations(request))
    }
  },
}
