export type Screen =
  | 'home'
  | 'upload'
  | 'analysis'
  | 'similarity'
  | 'style'
  | 'reward'
  | 'compare'
  | 'saved'
  | 'wardrobe'
  | 'add-wardrobe'

export type SimilarityClassification = 'high' | 'medium' | 'low'
export type StyleEntryPoint = 'home-avatar' | 'similarity' | 'saved-fit' | 'comparison'

export interface NavProps {
  onNavigate: (screen: Screen) => void
}

export type WardrobeCategory = 'top' | 'outerwear' | 'bottom' | 'shoes' | 'accessory'

export interface WardrobeMetadata {
  subcategory?: string
  styleTags?: string[]
  pattern?: string
  fit?: string
  formalityScore?: number
  dominantHex?: string
  rawCategory?: string
  secondaryColors?: string[]
  sleeveLength?: string
  length?: string
  materialGuess?: string
  seasons?: string[]
  conditionNotes?: string
}

export interface WardrobeItem {
  id: string
  name: string
  image: string
  category: WardrobeCategory
  worn: number
  /** `worn` is retained for older saved wardrobes; new confirmations keep both values in sync. */
  wearCount?: number
  lastWornAt?: string
  firstAddedAt?: string
  isActive?: boolean
  archivedAt?: string
  lifecycleHistory?: WardrobeLifecycleEvent[]
  color?: string
  metadata?: WardrobeMetadata
  brand?: string
  size?: string
  notes?: string
}

// Kept as an alias while the existing screens transition to the shared model.
export type ClothingItem = WardrobeItem

export interface ItemPreview {
  id?: string
  name: string
  image: string
  category?: WardrobeCategory
  color?: string
  metadata?: WardrobeMetadata
}

export interface Outfit {
  id: string
  name: string
  items?: WardrobeItem[]
  top?: WardrobeItem
  outerwear?: WardrobeItem
  bottom?: WardrobeItem
  shoes?: WardrobeItem
  rationale?: string
  styleTags?: string[]
}

export interface SimilarityResult {
  uploadedItem: ItemPreview
  closestMatch: ItemPreview | null
  similarityScore: number
  classification: SimilarityClassification
  wardrobeEmpty?: boolean
  breakdown?: Partial<Record<'category' | 'garmentType' | 'color' | 'styleTags' | 'pattern' | 'fit' | 'formality' | 'material' | 'total', number>>
  extractionSource?: 'api' | 'local'
  analysisRunId?: string
}

export interface RewardData {
  currentXP: number
  xpEarned: number
  currentLevel: number
  nextLevelThreshold: number
  newXP: number
  newLevel: number
  messages?: string[]
}

export interface UserProgress {
  streak: number
  xp: number
  level: number
  nextLevelThreshold: number
  lastQualifyingWearDate?: string
}

export type SustainableAction = 'repurpose' | 'donate' | 'trade' | 'sell'
export type WardrobeLifecycleAction = 'wear' | SustainableAction

export interface WardrobeLifecycleEvent {
  id: string
  action: WardrobeLifecycleAction
  createdAt: string
  outfitId?: string
}

export type ChallengeType = 'bring-it-back' | 'forgotten-favorite' | 'mix-it-up' | 'rotation-ready' | 'second-life' | 'pass-it-on' | 'trade-up' | 'new-home'

export interface EngagementChallenge {
  id: string
  type: ChallengeType
  title: string
  description: string
  xpReward: number
  progress: number
  target: number
  completed: boolean
  relevantItemId?: string
  completedAt?: string
}

export interface EngagementState {
  challenges: EngagementChallenge[]
  uniqueOutfitKeys: string[]
  uniqueItemIds: string[]
  nextChallengeSequence: number
}

export interface SavedFit extends Outfit {
  createdAt: string
  outfitId: string
}

export interface StylePreference {
  id: string
  createdAt: string
  comparisonId: string
  selectedOutfitId: string
  options: [Outfit, Outfit]
}
