import type { EngagementChallenge, EngagementState, ItemPreview, Outfit, RewardData, SavedFit, SimilarityResult, StylePreference, SustainableAction, UserProgress, WardrobeCategory, WardrobeItem, WardrobeMetadata } from '../types'

export interface ServiceError {
  code: string
  message: string
}

export interface ServiceResult<T> {
  data: T | null
  error: ServiceError | null
}

export interface ServiceState<T> {
  data: T | null
  loading: boolean
  error: ServiceError | null
}

export interface WardrobeService {
  list(): Promise<ServiceResult<WardrobeItem[]>>
  create(item: WardrobeItem): Promise<ServiceResult<WardrobeItem>>
  update(item: WardrobeItem): Promise<ServiceResult<WardrobeItem>>
  remove(id: string): Promise<ServiceResult<void>>
}

export interface SavedFitsService {
  list(): Promise<ServiceResult<SavedFit[]>>
  create(fit: SavedFit): Promise<ServiceResult<SavedFit>>
  remove(id: string): Promise<ServiceResult<void>>
}

export interface PreferencesService {
  list(): Promise<ServiceResult<StylePreference[]>>
  record(preference: StylePreference): Promise<ServiceResult<StylePreference>>
}

export interface SimilarityAnalysisRequest {
  image: string
  file: File
  wardrobe: WardrobeItem[]
}

export interface SimilarityAnalysisService {
  analyze(request: SimilarityAnalysisRequest): Promise<ServiceResult<SimilarityResult>>
}

export interface RawAttributeExtraction {
  category?: string
  subcategory?: string
  color?: string
  dominant_hex?: string
  style_tags?: string[]
  secondary_colors?: string[]
  pattern?: string
  fit?: string
  sleeve_length?: string
  length?: string
  material_guess?: string
  formality_score?: number
  season?: string[]
  condition_notes?: string
  [key: string]: unknown
}

export interface ExtractedWardrobeMetadata {
  source: 'api' | 'local'
  analysisRunId: string
  category: WardrobeCategory | null
  color: string | null
  name: string | null
  metadata: WardrobeMetadata
  raw: RawAttributeExtraction
}

export interface AttributeExtractionService {
  extract(image: File): Promise<ServiceResult<ExtractedWardrobeMetadata>>
}

export interface OutfitRecommendationRequest {
  wardrobe: WardrobeItem[]
  preferences: StylePreference[]
  entryContext?: import('../types').StyleEntryPoint
  count?: number
  requiredItemId?: string
  excludeItemCombinations?: string[][]
}

export interface OutfitRecommendationResult {
  outfits: Outfit[]
  source: 'api' | 'local'
}

export interface OutfitService {
  recommend(request: OutfitRecommendationRequest): Promise<ServiceResult<OutfitRecommendationResult>>
}

export interface ProgressService {
  get(): Promise<ServiceResult<UserProgress>>
  getEngagement(wardrobe: WardrobeItem[]): Promise<ServiceResult<EngagementState>>
  recordOutfitWear(outfit: Outfit, wardrobe: WardrobeItem[]): Promise<ServiceResult<EngagementUpdate>>
  recordSustainableAction(itemId: string, action: SustainableAction, wardrobe: WardrobeItem[]): Promise<ServiceResult<EngagementUpdate>>
}

export interface EngagementUpdate {
  progress: UserProgress
  wardrobe: WardrobeItem[]
  challenges: EngagementChallenge[]
  reward: RewardData
}

export type UploadedItemPreview = ItemPreview
