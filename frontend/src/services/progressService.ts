import { loadEngagement, loadProgress, persistEngagement, persistProgress } from '../storage'
import type { ChallengeType, EngagementChallenge, EngagementState, SustainableAction, UserProgress, WardrobeItem } from '../types'
import { outfitKey, rankNeglectedItems } from './homeOutfitService'
import { runLocalService } from './apiClient'
import type { EngagementUpdate, ProgressService } from './contracts'

export const INITIAL_PROGRESS: UserProgress = { streak: 6, xp: 820, level: 4, nextLevelThreshold: 1000 }
export const XP_REWARDS = { wear: 30, 'bring-it-back': 50, 'forgotten-favorite': 50, 'mix-it-up': 60, 'rotation-ready': 60, repurpose: 80, donate: 100, trade: 90, sell: 80 } as const
const EMPTY_ENGAGEMENT: EngagementState = { challenges: [], uniqueOutfitKeys: [], uniqueItemIds: [], nextChallengeSequence: 1 }
let localProgress = loadProgress(INITIAL_PROGRESS)
let localEngagement = loadEngagement(EMPTY_ENGAGEMENT)

const activeItems = (items: WardrobeItem[]) => items.filter(item => item.isActive !== false)
const wearCount = (item: WardrobeItem) => item.wearCount ?? item.worn ?? 0
const uid = () => crypto.randomUUID()
const todayKey = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }

function challengeTemplate(type: ChallengeType, wardrobe: WardrobeItem[], sequence: number): Omit<EngagementChallenge, 'id'> | null {
  const ranked = rankNeglectedItems(activeItems(wardrobe))
  const target = ranked[sequence % Math.max(ranked.length, 1)]
  switch (type) {
    case 'bring-it-back': return target ? { type, title: 'Bring It Back', description: `Wear ${target.name}, one of your least-worn pieces.`, xpReward: XP_REWARDS[type], progress: 0, target: 1, completed: false, relevantItemId: target.id } : null
    case 'forgotten-favorite': return target ? { type, title: 'Forgotten Favorite', description: `Give ${target.name} a proper outing.`, xpReward: XP_REWARDS[type], progress: 0, target: 1, completed: false, relevantItemId: target.id } : null
    case 'mix-it-up': return { type, title: 'Mix It Up', description: 'Confirm 3 different outfit combinations.', xpReward: XP_REWARDS[type], progress: 0, target: 3, completed: false }
    case 'rotation-ready': { const targetCount = Math.min(Math.max(activeItems(wardrobe).length, 1), 5); return { type, title: 'Rotation Ready', description: `Wear ${targetCount} different pieces.`, xpReward: XP_REWARDS[type], progress: 0, target: targetCount, completed: false } }
    case 'second-life': return target ? { type, title: 'Second Life', description: `Repurpose ${target.name} instead of replacing it.`, xpReward: XP_REWARDS.repurpose, progress: 0, target: 1, completed: false, relevantItemId: target.id } : null
    case 'pass-it-on': return target ? { type, title: 'Pass It On', description: `Donate ${target.name} when it is ready for a new home.`, xpReward: XP_REWARDS.donate, progress: 0, target: 1, completed: false, relevantItemId: target.id } : null
    case 'trade-up': return target ? { type, title: 'Trade Up', description: `Trade ${target.name} thoughtfully.`, xpReward: XP_REWARDS.trade, progress: 0, target: 1, completed: false, relevantItemId: target.id } : null
    case 'new-home': return target ? { type, title: 'New Home', description: `Sell ${target.name} instead of discarding it.`, xpReward: XP_REWARDS.sell, progress: 0, target: 1, completed: false, relevantItemId: target.id } : null
  }
}

function ensureChallenges(state: EngagementState, wardrobe: WardrobeItem[]) {
  const types: ChallengeType[] = ['bring-it-back', 'mix-it-up', 'rotation-ready', 'forgotten-favorite', 'second-life', 'pass-it-on', 'trade-up', 'new-home']
  let nextChallengeSequence = state.nextChallengeSequence
  const challenges = [...state.challenges]
  while (challenges.filter(challenge => !challenge.completed).length < 3 && nextChallengeSequence < state.nextChallengeSequence + types.length * 3) {
    const type = types[(nextChallengeSequence - 1) % types.length]
    const template = challengeTemplate(type, wardrobe, nextChallengeSequence++)
    if (!template) continue
    if (!challenges.some(challenge => !challenge.completed && challenge.type === type && challenge.relevantItemId === template.relevantItemId)) challenges.push({ ...template, id: `challenge-${nextChallengeSequence - 1}-${type}-${template.relevantItemId ?? 'all'}` })
  }
  return { ...state, challenges: challenges.slice(-24), nextChallengeSequence }
}

function applyXP(current: UserProgress, earned: number, lastQualifyingWearDate = current.lastQualifyingWearDate): UserProgress {
  let xp = current.xp + earned; let level = current.level; let nextLevelThreshold = current.nextLevelThreshold
  while (xp >= nextLevelThreshold) { level += 1; nextLevelThreshold += 500 }
  return { ...current, xp, level, nextLevelThreshold, lastQualifyingWearDate }
}

function completeChallenges(challenges: EngagementChallenge[], predicate: (challenge: EngagementChallenge) => boolean, messages: string[]) {
  let earned = 0; const completedAt = new Date().toISOString()
  const updated = challenges.map(challenge => {
    if (challenge.completed || !predicate(challenge)) return challenge
    earned += challenge.xpReward; messages.push(`${challenge.title} complete! +${challenge.xpReward} XP`)
    return { ...challenge, progress: challenge.target, completed: true, completedAt }
  })
  return { challenges: updated, earned }
}

function finishUpdate(before: UserProgress, wardrobe: WardrobeItem[], engagement: EngagementState, earned: number, messages: string[], lastQualifyingWearDate?: string): EngagementUpdate {
  const progress = applyXP(before, earned, lastQualifyingWearDate)
  localProgress = progress; localEngagement = ensureChallenges(engagement, wardrobe)
  persistProgress(progress); persistEngagement(localEngagement)
  return { progress, wardrobe, challenges: localEngagement.challenges.filter(challenge => !challenge.completed), reward: { currentXP: before.xp, xpEarned: earned, currentLevel: before.level, nextLevelThreshold: before.nextLevelThreshold, newXP: progress.xp, newLevel: progress.level, messages } }
}

export const progressService: ProgressService = {
  get: () => runLocalService(() => localProgress),
  getEngagement: wardrobe => runLocalService(() => { localEngagement = ensureChallenges(localEngagement, wardrobe); persistEngagement(localEngagement); return localEngagement }),
  recordOutfitWear: (outfit, wardrobe) => runLocalService(() => {
    const ownedIds = new Set(activeItems(wardrobe).map(item => item.id))
    const itemIds = [...new Set((outfit.items ?? []).map(item => item.id).filter(id => ownedIds.has(id)))]
    if (!itemIds.length) throw new Error('This outfit has no active wardrobe items to confirm.')
    const now = new Date().toISOString()
    const updatedWardrobe = wardrobe.map(item => itemIds.includes(item.id) ? { ...item, worn: wearCount(item) + 1, wearCount: wearCount(item) + 1, lastWornAt: now, lifecycleHistory: [...(item.lifecycleHistory ?? []), { id: uid(), action: 'wear' as const, createdAt: now, outfitId: outfit.id }] } : item)
    const key = outfitKey({ ...outfit, items: itemIds.map(id => updatedWardrobe.find(item => item.id === id)!).filter(Boolean) })
    const uniqueOutfitKeys = key && !localEngagement.uniqueOutfitKeys.includes(key) ? [...localEngagement.uniqueOutfitKeys, key].slice(-100) : localEngagement.uniqueOutfitKeys
    const uniqueItemIds = [...new Set([...localEngagement.uniqueItemIds, ...itemIds])].slice(-100)
    const messages = [`Outfit worn +${XP_REWARDS.wear} XP`]
    const progressed = localEngagement.challenges.map(challenge => {
      if (challenge.completed) return challenge
      if ((challenge.type === 'bring-it-back' || challenge.type === 'forgotten-favorite') && challenge.relevantItemId && itemIds.includes(challenge.relevantItemId)) return { ...challenge, progress: 1 }
      if (challenge.type === 'mix-it-up') return { ...challenge, progress: Math.min(uniqueOutfitKeys.length, challenge.target) }
      if (challenge.type === 'rotation-ready') return { ...challenge, progress: Math.min(uniqueItemIds.length, challenge.target) }
      return challenge
    })
    const completed = completeChallenges(progressed, challenge => challenge.progress >= challenge.target, messages)
    const today = todayKey(); const previousDay = new Date(); previousDay.setDate(previousDay.getDate() - 1); const yesterday = `${previousDay.getFullYear()}-${String(previousDay.getMonth() + 1).padStart(2, '0')}-${String(previousDay.getDate()).padStart(2, '0')}`
    const qualifiesToday = localProgress.lastQualifyingWearDate !== today
    const before = localProgress
    const progressWithStreak = { ...before, streak: !qualifiesToday ? before.streak : before.lastQualifyingWearDate === yesterday ? before.streak + 1 : 1 }
    return finishUpdate(progressWithStreak, updatedWardrobe, { ...localEngagement, challenges: completed.challenges, uniqueOutfitKeys, uniqueItemIds }, XP_REWARDS.wear + completed.earned, messages, qualifiesToday ? today : before.lastQualifyingWearDate)
  }),
  recordSustainableAction: (itemId, action, wardrobe) => runLocalService(() => {
    const item = wardrobe.find(candidate => candidate.id === itemId)
    if (!item || item.isActive === false) throw new Error('This item is no longer active in your wardrobe.')
    if (item.lifecycleHistory?.some(event => event.action === action)) return finishUpdate(localProgress, wardrobe, localEngagement, 0, [`${item.name} was already recorded as ${action}.`])
    const now = new Date().toISOString()
    const updatedWardrobe = wardrobe.map(candidate => candidate.id !== itemId ? candidate : { ...candidate, isActive: action === 'repurpose', ...(action === 'repurpose' ? {} : { archivedAt: now }), lifecycleHistory: [...(candidate.lifecycleHistory ?? []), { id: uid(), action, createdAt: now }] })
    const messages = [`${action[0].toUpperCase() + action.slice(1)} recorded +${XP_REWARDS[action]} XP`]
    const progressed = localEngagement.challenges.map(challenge => !challenge.completed && challenge.relevantItemId === itemId && ((challenge.type === 'second-life' && action === 'repurpose') || (challenge.type === 'pass-it-on' && action === 'donate') || (challenge.type === 'trade-up' && action === 'trade') || (challenge.type === 'new-home' && action === 'sell')) ? { ...challenge, progress: 1 } : challenge)
    const completed = completeChallenges(progressed, challenge => challenge.progress >= challenge.target, messages)
    return finishUpdate(localProgress, updatedWardrobe, { ...localEngagement, challenges: completed.challenges }, XP_REWARDS[action] + completed.earned, messages)
  }),
}
