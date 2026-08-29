import type { BuyCheckDecision, ItemPreview, WardrobeCategory, WardrobeItem, WardrobeUtilityResult } from '../types'

const COMPLEMENTS: Record<WardrobeCategory, WardrobeCategory[]> = {
  top: ['bottom', 'shoes', 'outerwear', 'accessory'],
  bottom: ['top', 'shoes', 'outerwear', 'accessory'],
  shoes: ['top', 'bottom', 'outerwear'],
  outerwear: ['top', 'bottom', 'shoes'],
  accessory: ['top', 'bottom', 'outerwear'],
}
const NEUTRALS = new Set(['black', 'white', 'grey', 'gray', 'navy', 'beige', 'tan', 'brown'])
const normalize = (value: string | undefined) => value?.trim().toLowerCase() ?? ''
const preview = (item: WardrobeItem): ItemPreview => ({ id: item.id, name: item.name, image: item.image, category: item.category, color: item.color, metadata: item.metadata })

function compatibilityScore(candidate: ItemPreview, item: WardrobeItem) {
  if (!candidate.category || !COMPLEMENTS[candidate.category].includes(item.category)) return 0
  let score = 2
  const candidateTags = new Set((candidate.metadata?.styleTags ?? []).map(normalize))
  if ((item.metadata?.styleTags ?? []).some(tag => candidateTags.has(normalize(tag)))) score += 2
  const candidateFormality = candidate.metadata?.formalityScore
  const itemFormality = item.metadata?.formalityScore
  if (candidateFormality !== undefined && itemFormality !== undefined && Math.abs(candidateFormality - itemFormality) <= 1) score += 2
  const firstColor = normalize(candidate.color), secondColor = normalize(item.color)
  if (firstColor && secondColor && (firstColor === secondColor || NEUTRALS.has(firstColor) || NEUTRALS.has(secondColor))) score += 1
  return score
}

export function calculateWardrobeUtility(candidate: ItemPreview, wardrobe: WardrobeItem[]): WardrobeUtilityResult {
  const active = wardrobe.filter(item => item.isActive !== false)
  const scored = active.map(item => ({ item, score: compatibilityScore(candidate, item) })).filter(entry => entry.score >= 3).sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
  const compatible = scored.map(entry => entry.item)
  const categoryCount = new Set(compatible.map(item => item.category)).size
  const level = compatible.length >= 4 && categoryCount >= 2 ? 'high' : compatible.length >= 2 ? 'medium' : 'low'
  const visible = compatible.slice(0, 4).map(preview)
  const reasons = visible.slice(0, 3).map(item => `Works with your ${item.name}`)
  const gapSummary = level === 'high'
    ? `Works with several pieces across ${categoryCount} wardrobe categories.`
    : level === 'medium'
      ? 'Different from what you own, with some realistic styling potential.'
      : 'This is different, but it may be hard to style with your current wardrobe.'
  return { level, compatibleItems: visible, reasons, gapSummary }
}

export function deterministicDecision(match: 'high' | 'medium' | 'low', utility: WardrobeUtilityResult): BuyCheckDecision {
  if (match === 'high') return { type: 'rewear_existing', summary: 'Try styling the similar piece you already own.' }
  if (match === 'low' && utility.level === 'high') return { type: 'useful_gap', summary: 'This adds something different and works well with pieces you already own.' }
  if (utility.level === 'low') return { type: 'low_utility', summary: 'This is different, but it may be hard to style with your current wardrobe.' }
  return { type: 'consider_if_needed', summary: match === 'medium' ? 'It overlaps with your wardrobe, but could still be useful if it fills a real need.' : 'Different from what you own, with some styling potential.' }
}
