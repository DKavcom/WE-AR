import type { ItemPreview, SimilarityClassification, SimilarityResult, WardrobeItem } from '../types'
import { success } from './apiClient'
import { attributeExtractionService } from './attributeExtractionService'
import type { SimilarityAnalysisService, SimilarityAnalysisRequest } from './contracts'

export const SIMILARITY_WEIGHTS = {
  category: 10,
  garmentType: 30,
  color: 20,
  pattern: 10,
  styleTags: 10,
  fit: 8,
  formality: 7,
  material: 5,
} as const

export const SIMILARITY_THRESHOLDS = { high: 75, medium: 45 } as const

type ScoreField = keyof typeof SIMILARITY_WEIGHTS
export type SimilarityScoreBreakdown = Partial<Record<ScoreField, number>>

const GARMENT_TYPE_ALIASES: Record<string, string> = {
  tee: 't-shirt',
  tshirt: 't-shirt',
  't shirt': 't-shirt',
  't-shirt': 't-shirt',
  'button down': 'button-up shirt',
  'button-down': 'button-up shirt',
  'button up': 'button-up shirt',
  'button-up': 'button-up shirt',
  'button down shirt': 'button-up shirt',
  'button-up shirt': 'button-up shirt',
  sneaker: 'sneakers',
  sneakers: 'sneakers',
  trainer: 'sneakers',
  trainers: 'sneakers',
  trouser: 'trousers',
  trousers: 'trousers',
  pant: 'trousers',
  pants: 'trousers',
}

const COLOR_ALIASES: Record<string, string> = {
  gray: 'grey',
  grey: 'grey',
  navy: 'navy',
  'dark blue': 'navy',
  'light blue': 'blue',
  'sky blue': 'blue',
  beige: 'tan',
}

function normalizedText(value: string | undefined) {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim() ?? ''
}

function normalizedGarmentType(value: string | undefined) {
  const normalized = normalizedText(value)
  if (!normalized) return ''
  if (normalized.includes('jean')) return 'jeans'
  if (normalized.includes('short')) return 'shorts'
  if (normalized.includes('trouser') || normalized.includes('pant')) return 'trousers'
  if (normalized.includes('button down') || normalized.includes('button up')) return 'button-up shirt'
  if (normalized.includes('t shirt') || normalized === 'tee') return 't-shirt'
  if (normalized.includes('sneaker') || normalized.includes('trainer')) return 'sneakers'
  return GARMENT_TYPE_ALIASES[normalized] ?? normalized
}

function normalizedColor(value: string | undefined) {
  const normalized = normalizedText(value)
  return COLOR_ALIASES[normalized] ?? normalized
}

function normalizedPattern(value: string | undefined) {
  const normalized = normalizedText(value)
  if (normalized === 'plain') return 'solid'
  if (normalized === 'checked') return 'plaid'
  return normalized
}

function normalizedMaterial(value: string | undefined) {
  return normalizedText(value)
}

function parseHex(value: string | undefined): [number, number, number] | null {
  const match = value?.trim().match(/^#?([0-9a-f]{6})$/i)
  if (!match) return null
  const numeric = Number.parseInt(match[1], 16)
  return [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255]
}

function colorDistanceScore(candidate: ItemPreview, item: WardrobeItem) {
  const candidateHex = parseHex(candidate.metadata?.dominantHex ?? candidate.color)
  const itemHex = parseHex(item.metadata?.dominantHex ?? item.color)
  if (candidateHex && itemHex) {
    const distance = Math.hypot(candidateHex[0] - itemHex[0], candidateHex[1] - itemHex[1], candidateHex[2] - itemHex[2])
    return Math.round(SIMILARITY_WEIGHTS.color * Math.max(0, 1 - distance / Math.sqrt(3 * 255 ** 2)))
  }

  const candidateColor = normalizedColor(candidate.color)
  const itemColor = normalizedColor(item.color)
  return candidateColor && itemColor && candidateColor === itemColor ? SIMILARITY_WEIGHTS.color : 0
}

function tagScore(candidateTags: string[] | undefined, itemTags: string[] | undefined) {
  if (!candidateTags?.length || !itemTags?.length) return 0
  const candidateSet = new Set(candidateTags.map(normalizedText).filter(Boolean))
  const itemSet = new Set(itemTags.map(normalizedText).filter(Boolean))
  const overlap = [...candidateSet].filter(tag => itemSet.has(tag)).length
  if (!overlap) return 0
  return Math.round(SIMILARITY_WEIGHTS.styleTags * overlap / new Set([...candidateSet, ...itemSet]).size)
}

function gradualNumericScore(first: number | undefined, second: number | undefined, weight: number, maximumDifference: number) {
  if (first === undefined || second === undefined) return 0
  return Math.round(weight * Math.max(0, 1 - Math.abs(first - second) / maximumDifference))
}

function scoreCandidate(candidate: ItemPreview, item: WardrobeItem): SimilarityScoreBreakdown {
  if (candidate.category && candidate.category !== item.category) return {}

  const breakdown: SimilarityScoreBreakdown = {}
  if (candidate.category === item.category) breakdown.category = SIMILARITY_WEIGHTS.category

  const candidateGarment = normalizedGarmentType(candidate.metadata?.subcategory ?? candidate.name)
  const itemGarment = normalizedGarmentType(item.metadata?.subcategory ?? item.name)
  if (candidateGarment && itemGarment && candidateGarment === itemGarment) breakdown.garmentType = SIMILARITY_WEIGHTS.garmentType

  const color = colorDistanceScore(candidate, item)
  if (color) breakdown.color = color

  const candidatePattern = normalizedPattern(candidate.metadata?.pattern)
  const itemPattern = normalizedPattern(item.metadata?.pattern)
  if (candidatePattern && itemPattern && candidatePattern === itemPattern) breakdown.pattern = SIMILARITY_WEIGHTS.pattern

  const tags = tagScore(candidate.metadata?.styleTags, item.metadata?.styleTags)
  if (tags) breakdown.styleTags = tags

  const candidateFit = normalizedText(candidate.metadata?.fit)
  const itemFit = normalizedText(item.metadata?.fit)
  if (candidateFit && itemFit && candidateFit === itemFit) breakdown.fit = SIMILARITY_WEIGHTS.fit

  const formality = gradualNumericScore(candidate.metadata?.formalityScore, item.metadata?.formalityScore, SIMILARITY_WEIGHTS.formality, 4)
  if (formality) breakdown.formality = formality

  const candidateMaterial = normalizedMaterial(candidate.metadata?.materialGuess)
  const itemMaterial = normalizedMaterial(item.metadata?.materialGuess)
  if (candidateMaterial && itemMaterial && candidateMaterial === itemMaterial) breakdown.material = SIMILARITY_WEIGHTS.material

  return breakdown
}

function totalScore(breakdown: SimilarityScoreBreakdown) {
  return Object.values(breakdown).reduce<number>((total, score) => total + (score ?? 0), 0)
}

function classify(score: number): SimilarityClassification {
  if (score >= SIMILARITY_THRESHOLDS.high) return 'high'
  if (score >= SIMILARITY_THRESHOLDS.medium) return 'medium'
  return 'low'
}

export function scoreSimilarity(candidate: ItemPreview, item: WardrobeItem) {
  const breakdown = scoreCandidate(candidate, item)
  const total = totalScore(breakdown)
  return { breakdown: { ...breakdown, total }, total, classification: classify(total) }
}

function toPreview(item: WardrobeItem): ItemPreview {
  return { id: item.id, name: item.name, image: item.image, category: item.category, color: item.color, metadata: item.metadata }
}

export const analysisService: SimilarityAnalysisService = {
  async analyze({ file, image, wardrobe }: SimilarityAnalysisRequest) {
    const extraction = await attributeExtractionService.extract(file)
    if (!extraction.data) return { data: null, error: extraction.error }

    const candidate: ItemPreview = {
      name: generateCandidateName(extraction.data),
      image,
      ...(extraction.data.category ? { category: extraction.data.category } : {}),
      ...(extraction.data.color ? { color: extraction.data.color } : {}),
      metadata: extraction.data.metadata,
    }

    if (!wardrobe.length) {
      return success({ uploadedItem: candidate, closestMatch: null, similarityScore: 0, classification: 'low', wardrobeEmpty: true, breakdown: { total: 0 }, extractionSource: extraction.data.source, analysisRunId: extraction.data.analysisRunId })
    }

    const scoredItems = wardrobe.map(item => ({ item, score: scoreSimilarity(candidate, item) }))
    const best = scoredItems.reduce((currentBest, entry) => entry.score.total > currentBest.score.total ? entry : currentBest)

    return success({
      uploadedItem: candidate,
      closestMatch: toPreview(best.item),
      similarityScore: best.score.total,
      classification: best.score.classification,
      breakdown: best.score.breakdown,
      extractionSource: extraction.data.source,
      analysisRunId: extraction.data.analysisRunId,
    })
  },
}

function generateCandidateName(extraction: import('./contracts').ExtractedWardrobeMetadata) {
  const garment = extraction.metadata.subcategory ?? extraction.name ?? extraction.category ?? 'Clothing item'
  const color = extraction.color && !garment.toLowerCase().includes(extraction.color.toLowerCase()) ? `${extraction.color} ` : ''
  return `${color}${garment}`.replace(/\b\w/g, letter => letter.toUpperCase())
}
