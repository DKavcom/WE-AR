import type { WardrobeCategory } from '../types'
import { apiBaseUrl, dataMode, success } from './apiClient'
import type { AttributeExtractionService, ExtractedWardrobeMetadata, RawAttributeExtraction, ServiceResult } from './contracts'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeCategory(category: string | undefined): WardrobeCategory | null {
  switch (category?.toLowerCase()) {
    case 'top':
    case 'outerwear':
    case 'jacket':
      return category.toLowerCase() === 'top' ? 'top' : 'outerwear'
    case 'bottom':
      return 'bottom'
    case 'shoes':
      return 'shoes'
    case 'accessory':
      return 'accessory'
    default:
      return null
  }
}

function normalizeAttributes(value: unknown, source: 'api' | 'local'): ExtractedWardrobeMetadata | null {
  if (!isRecord(value)) return null

  const category = asNonEmptyString(value.category)
  const subcategory = asNonEmptyString(value.subcategory)
  const color = asNonEmptyString(value.color) ?? asNonEmptyString(value.dominant_hex)
  const styleTags = Array.isArray(value.style_tags) ? value.style_tags.filter((tag): tag is string => typeof tag === 'string') : undefined
  const pattern = asNonEmptyString(value.pattern)
  const fit = asNonEmptyString(value.fit)
  const dominantHex = asNonEmptyString(value.dominant_hex)
  const formalityScore = typeof value.formality_score === 'number' && Number.isFinite(value.formality_score) ? value.formality_score : undefined
  const secondaryColors = Array.isArray(value.secondary_colors) ? value.secondary_colors.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : undefined
  const sleeveLength = asNonEmptyString(value.sleeve_length)
  const length = asNonEmptyString(value.length)
  const materialGuess = asNonEmptyString(value.material_guess)
  const seasons = Array.isArray(value.season) ? value.season.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : undefined
  const conditionNotes = asNonEmptyString(value.condition_notes)
  const raw: RawAttributeExtraction = { ...value, ...(styleTags ? { style_tags: styleTags } : {}) }

  return {
    source,
    analysisRunId: crypto.randomUUID(),
    category: normalizeCategory(category),
    color: color ?? null,
    name: subcategory ?? null,
    metadata: {
      ...(subcategory ? { subcategory } : {}),
      ...(styleTags ? { styleTags } : {}),
      ...(pattern ? { pattern } : {}),
      ...(fit ? { fit } : {}),
      ...(dominantHex ? { dominantHex } : {}),
      ...(formalityScore !== undefined ? { formalityScore } : {}),
      ...(category ? { rawCategory: category } : {}),
      ...(secondaryColors?.length ? { secondaryColors } : {}),
      ...(sleeveLength ? { sleeveLength } : {}),
      ...(length ? { length } : {}),
      ...(materialGuess ? { materialGuess } : {}),
      ...(seasons?.length ? { seasons } : {}),
      ...(conditionNotes ? { conditionNotes } : {}),
    },
    raw,
  }
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, letter => letter.toUpperCase())
}

export function generateWardrobeItemName(extraction: ExtractedWardrobeMetadata, fallback = 'Clothing Item') {
  const subcategory = extraction.metadata.subcategory ?? extraction.name ?? extraction.category ?? fallback
  const color = extraction.color && !subcategory.toLowerCase().includes(extraction.color.toLowerCase()) ? extraction.color : ''
  const pattern = extraction.metadata.pattern && !['solid', 'other'].includes(extraction.metadata.pattern.toLowerCase()) && !subcategory.toLowerCase().includes(extraction.metadata.pattern.toLowerCase()) ? extraction.metadata.pattern : ''
  return titleCase([color, pattern, subcategory].filter(Boolean).join(' ').trim() || fallback)
}

function mockExtraction(file: File): ExtractedWardrobeMetadata {
  const filename = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim()
  return {
    source: 'local',
    analysisRunId: crypto.randomUUID(),
    category: 'top',
    color: null,
    name: filename || null,
    metadata: { ...(filename ? { subcategory: filename } : {}), rawCategory: 'top' },
    raw: { category: 'top', subcategory: filename || undefined },
  }
}

async function extractFromApi(file: File): Promise<ServiceResult<ExtractedWardrobeMetadata>> {
  try {
    const formData = new FormData()
    formData.append('image', file)

    const response = await fetch(`${apiBaseUrl}/extract-attributes`, { method: 'POST', body: formData })
    const payload: unknown = await response.json().catch(() => null)

    if (!response.ok || !isRecord(payload) || payload.success !== true) {
      const message = isRecord(payload) && typeof payload.error === 'string' ? payload.error : 'Could not analyze this image.'
      return { data: null, error: { code: 'ATTRIBUTE_EXTRACTION_FAILED', message } }
    }

    const normalized = normalizeAttributes(payload.attributes, 'api')
    if (!normalized) {
      return { data: null, error: { code: 'ATTRIBUTE_EXTRACTION_INVALID_RESPONSE', message: 'The analysis response was incomplete.' } }
    }

    return success(normalized)
  } catch {
    return { data: null, error: { code: 'ATTRIBUTE_EXTRACTION_UNAVAILABLE', message: 'AI analysis is unavailable. You can still fill this in manually.' } }
  }
}

export const attributeExtractionService: AttributeExtractionService = {
  extract: (image) => dataMode === 'api' ? extractFromApi(image) : Promise.resolve(success(mockExtraction(image))),
}
