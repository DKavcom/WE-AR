import { loadEngagement, loadProgress, persistEngagement, persistProgress } from '../storage'
import type { ChallengeType, EngagementChallenge, EngagementState, SustainableAction, UserProgress, WardrobeItem } from '../types'
import { outfitKey, rankNeglectedItems } from './homeOutfitService'
import { runLocalService } from './apiClient'
import type { EngagementUpdate, ProgressService } from './contracts'

export const INITIAL_PROGRESS: UserProgress = { streak: 0, xp: 820, level: 4, nextLevelThreshold: 1000 }
export const XP_REWARDS = { wear: 30, 'forgotten-pick': 40, 'outfit-remix': 45, 'dress-it-up': 45, 'accessory-day': 35, 'color-switch': 35, 'mix-it-up': 45, 'rotation-reset': 140, 'wardrobe-explorer': 140, 'one-piece-three-ways': 150, 'fresh-rotation': 140, repurpose: 80, donate: 100, trade: 90, sell: 80 } as const
const EMPTY: EngagementState = { challenges: [], uniqueOutfitKeys: [], uniqueItemIds: [], nextChallengeSequence: 1 }
let localProgress = loadProgress(INITIAL_PROGRESS)
if (localProgress.streak > 0 && !localProgress.lastQualifyingWearDate) {
  localProgress = { ...localProgress, streak: 0 }
  persistProgress(localProgress)
}
let localEngagement = loadEngagement(EMPTY)
const active = (items: WardrobeItem[]) => items.filter(item => item.isActive !== false)
const count = (item: WardrobeItem) => item.wearCount ?? item.worn ?? 0
const uid = () => crypto.randomUUID()
const key = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const today = () => key()
const weekStart = () => { const date = new Date(); date.setDate(date.getDate() - (date.getDay() + 6) % 7); date.setHours(0, 0, 0, 0); return date }
const week = () => key(weekStart())
const dayExpiry = () => { const date = new Date(); date.setHours(23, 59, 59, 999); return date.toISOString() }
const weekExpiry = () => { const date = weekStart(); date.setDate(date.getDate() + 6); date.setHours(23, 59, 59, 999); return date.toISOString() }
const hash = (value: string) => [...value].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7)
const oldEnough = (item: WardrobeItem, days: number) => Boolean(item.lastWornAt && Date.now() - Date.parse(item.lastWornAt) >= days * 86400000)

function challenge(type: ChallengeType, title: string, description: string, xpReward: number, target: number, cadence: 'daily' | 'weekly', extra: Partial<EngagementChallenge> = {}): EngagementChallenge {
  const periodKey = cadence === 'daily' ? today() : week()
  return { id: `${cadence}-${periodKey}-${type}-${extra.relevantItemId ?? 'all'}`, type, title, description, xpReward, progress: 0, target, completed: false, cadence, periodKey, expiresAt: cadence === 'daily' ? dayExpiry() : weekExpiry(), ...extra }
}

function dailyPool(wardrobe: WardrobeItem[]) {
  const items = active(wardrobe), ranked = rankNeglectedItems(items), first = ranked.find(item => count(item) <= 1) ?? ranked[0]
  const pool: EngagementChallenge[] = [challenge('outfit-remix', 'Outfit Remix', "Wear an outfit combination you haven't logged before.", XP_REWARDS['outfit-remix'], 1, 'daily')]
  if (first) pool.push(challenge('forgotten-pick', 'Forgotten Pick', `Wear ${first.name} today.`, XP_REWARDS['forgotten-pick'], 1, 'daily', { relevantItemId: first.id }))
  const formal = items.find(item => item.category === 'shoes' && (item.metadata?.formalityScore ?? 0) >= 4)
  if (formal) pool.push(challenge('dress-it-up', 'Dress It Up', `Build and wear an outfit with your ${formal.name}.`, XP_REWARDS['dress-it-up'], 1, 'daily', { relevantItemId: formal.id }))
  const accessory = ranked.find(item => item.category === 'accessory')
  if (accessory) pool.push(challenge('accessory-day', 'Accessory Day', `Complete today's fit with your ${accessory.name}.`, XP_REWARDS['accessory-day'], 1, 'daily', { relevantItemId: accessory.id }))
  if (new Set(items.map(item => item.category)).size >= 3) pool.push(challenge('mix-it-up', 'Mix It Up', 'Wear pieces from at least 3 wardrobe categories today.', XP_REWARDS['mix-it-up'], 1, 'daily'))
  return pool
}

function weeklyChallenge(wardrobe: WardrobeItem[]) {
  const items = active(wardrobe), neglected = rankNeglectedItems(items).filter(item => count(item) <= 1 || oldEnough(item, 14)), categories = new Set(items.map(item => item.category))
  const pool: EngagementChallenge[] = [challenge('fresh-rotation', 'Fresh Rotation', 'Confirm 4 unique outfits this week.', XP_REWARDS['fresh-rotation'], 4, 'weekly')]
  if (neglected.length) { const target = Math.min(3, neglected.length); pool.push(challenge('rotation-reset', 'Rotation Reset', `Wear ${target} different neglected ${target === 1 ? 'piece' : 'pieces'} this week.`, XP_REWARDS['rotation-reset'], target, 'weekly', { relevantItemIds: neglected.slice(0, target).map(item => item.id) })) }
  if (categories.size >= 2) { const target = Math.min(4, categories.size); pool.push(challenge('wardrobe-explorer', 'Wardrobe Explorer', `Wear pieces from ${target} different wardrobe categories this week.`, XP_REWARDS['wardrobe-explorer'], target, 'weekly')) }
  if (neglected[0]) pool.push(challenge('one-piece-three-ways', 'One Piece, Three Ways', `Use ${neglected[0].name} in 3 different confirmed outfits this week.`, XP_REWARDS['one-piece-three-ways'], 3, 'weekly', { relevantItemId: neglected[0].id }))
  const lifecycle = items.find(item => oldEnough(item, 90)), gentleLifecycle = items.find(item => oldEnough(item, 60) && !oldEnough(item, 90))
  if (lifecycle && hash(week()) % 10 === 0) pool.push(challenge('second-life', 'Second Life', `${lifecycle.name} has not been worn in over 90 days. Repurpose it if it no longer works for you.`, XP_REWARDS.repurpose, 1, 'weekly', { relevantItemId: lifecycle.id }))
  else if (gentleLifecycle && hash(week()) % 10 === 0) pool.push(challenge('still-your-style', 'Still Your Style?', `${gentleLifecycle.name} has not been worn in over 60 days. Wear it once this week before deciding its next chapter.`, 120, 1, 'weekly', { relevantItemId: gentleLifecycle.id }))
  return pool[hash(week()) % pool.length]
}

function ensure(state: EngagementState, wardrobe: WardrobeItem[]) {
  const newDay = state.dailyPeriodKey !== today(), newWeek = state.weeklyPeriodKey !== week()
  const activeIds = new Set(active(wardrobe).map(item => item.id))
  let challenges = state.challenges.filter(item => (item.cadence === 'daily' || item.cadence === 'weekly') && !(newDay && item.cadence === 'daily') && !(newWeek && item.cadence === 'weekly') && (!item.relevantItemId || activeIds.has(item.relevantItemId)) && (!item.relevantItemIds || item.relevantItemIds.every(id => activeIds.has(id))))
  const base: EngagementState = { ...state, challenges, dailyPeriodKey: today(), weeklyPeriodKey: week(), dailyOutfitKeys: newDay ? [] : state.dailyOutfitKeys ?? [], weeklyOutfitKeys: newWeek ? [] : state.weeklyOutfitKeys ?? [], weeklyQualifiedItemIds: newWeek ? [] : state.weeklyQualifiedItemIds ?? [], weeklyCategoryIds: newWeek ? [] : state.weeklyCategoryIds ?? [], weeklyTargetOutfitKeys: newWeek ? [] : state.weeklyTargetOutfitKeys ?? [] }
  const existing = challenges.filter(item => item.cadence === 'daily')
  if (existing.length < 2) challenges = [...challenges, ...dailyPool(wardrobe).sort((a, b) => hash(a.id) - hash(b.id)).filter(candidate => !existing.some(item => item.type === candidate.type || (item.relevantItemId && item.relevantItemId === candidate.relevantItemId))).slice(0, 2 - existing.length)]
  if (!challenges.some(item => item.cadence === 'weekly')) challenges = [...challenges, weeklyChallenge(wardrobe)]
  return { ...base, challenges }
}

function addXP(current: UserProgress, earned: number, lastQualifyingWearDate = current.lastQualifyingWearDate) {
  let xp = current.xp + earned, level = current.level, nextLevelThreshold = current.nextLevelThreshold
  while (xp >= nextLevelThreshold) { level += 1; nextLevelThreshold += 500 }
  return { ...current, xp, level, nextLevelThreshold, lastQualifyingWearDate }
}
function complete(challenges: EngagementChallenge[], messages: string[]) {
  let earned = 0
  const updated = challenges.map(item => { if (item.completed || item.progress < item.target) return item; earned += item.xpReward; messages.push(`${item.title} complete! +${item.xpReward} XP`); return { ...item, completed: true, completedAt: new Date().toISOString() } })
  return { challenges: updated, earned }
}
function finish(before: UserProgress, wardrobe: WardrobeItem[], engagement: EngagementState, earned: number, messages: string[], last?: string, includeStreak = false, progressBase = before): EngagementUpdate {
  const progress = addXP(progressBase, earned, last); localProgress = progress; localEngagement = ensure(engagement, wardrobe); persistProgress(progress); persistEngagement(localEngagement)
  return { progress, wardrobe, challenges: localEngagement.challenges.filter(item => !item.completed), reward: { currentXP: before.xp, xpEarned: earned, currentLevel: before.level, nextLevelThreshold: before.nextLevelThreshold, newXP: progress.xp, newLevel: progress.level, ...(includeStreak ? { streakBefore: before.streak, streakAfter: progress.streak } : {}), messages } }
}

export const progressService: ProgressService = {
  get: () => runLocalService(() => localProgress),
  getEngagement: wardrobe => runLocalService(() => { localEngagement = ensure(localEngagement, wardrobe); persistEngagement(localEngagement); return localEngagement }),
  recordOutfitWear: (outfit, wardrobe) => runLocalService(() => {
    const outfitIds = [...new Set((outfit.items ?? []).map(item => item.id))]
    if (!outfitIds.length || outfitIds.some(id => !active(wardrobe).some(item => item.id === id))) throw new Error('This fit has unavailable wardrobe pieces and cannot be confirmed as worn.')
    const ids = outfitIds
    const before = localProgress, now = new Date().toISOString(), outfitId = outfitKey(outfit), newDaily = !localEngagement.dailyOutfitKeys?.includes(outfitId), newWeekly = !localEngagement.weeklyOutfitKeys?.includes(outfitId)
    const updatedWardrobe = wardrobe.map(item => ids.includes(item.id) ? { ...item, worn: count(item) + 1, wearCount: count(item) + 1, lastWornAt: now, lifecycleHistory: [...(item.lifecycleHistory ?? []), { id: uid(), action: 'wear' as const, createdAt: now, outfitId: outfit.id }] } : item)
    const categories = [...new Set(ids.map(id => updatedWardrobe.find(item => item.id === id)?.category).filter(Boolean) as string[])]
    const qualified = [...new Set([...(localEngagement.weeklyQualifiedItemIds ?? []), ...ids.filter(id => localEngagement.challenges.some(item => item.type === 'rotation-reset' && item.relevantItemIds?.includes(id)))])]
    const weeklyCategories = [...new Set([...(localEngagement.weeklyCategoryIds ?? []), ...categories])]
    const target = localEngagement.challenges.find(item => item.type === 'one-piece-three-ways')
    const targetOutfits = target?.relevantItemId && ids.includes(target.relevantItemId) && newWeekly ? [...new Set([...(localEngagement.weeklyTargetOutfitKeys ?? []), outfitId])] : localEngagement.weeklyTargetOutfitKeys ?? []
    const progressed = localEngagement.challenges.map(item => {
      if (item.completed) return item
      if (['forgotten-pick', 'dress-it-up', 'accessory-day'].includes(item.type) && item.relevantItemId && ids.includes(item.relevantItemId)) return { ...item, progress: item.target }
      if (item.type === 'outfit-remix' && newDaily) return { ...item, progress: 1 }
      if (item.type === 'mix-it-up' && categories.length >= 3) return { ...item, progress: 1 }
      if (item.type === 'rotation-reset') return { ...item, progress: Math.min(qualified.filter(id => item.relevantItemIds?.includes(id)).length, item.target) }
      if (item.type === 'wardrobe-explorer') return { ...item, progress: Math.min(weeklyCategories.length, item.target) }
      if (item.type === 'one-piece-three-ways') return { ...item, progress: Math.min(targetOutfits.length, item.target) }
      if (item.type === 'fresh-rotation') return { ...item, progress: Math.min((localEngagement.weeklyOutfitKeys ?? []).length + Number(newWeekly), item.target) }
      if (item.type === 'still-your-style' && item.relevantItemId && ids.includes(item.relevantItemId)) return { ...item, progress: item.target }
      return item
    })
    const messages = [`Outfit worn +${XP_REWARDS.wear} XP`], done = complete(progressed, messages)
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); const qualifies = before.lastQualifyingWearDate !== today(); const streak = { ...before, streak: !qualifies ? before.streak : before.lastQualifyingWearDate === key(yesterday) ? before.streak + 1 : 1 }
    return finish(before, updatedWardrobe, { ...localEngagement, challenges: done.challenges, dailyOutfitKeys: [...new Set([...(localEngagement.dailyOutfitKeys ?? []), outfitId])], weeklyOutfitKeys: [...new Set([...(localEngagement.weeklyOutfitKeys ?? []), outfitId])], weeklyQualifiedItemIds: qualified, weeklyCategoryIds: weeklyCategories, weeklyTargetOutfitKeys: targetOutfits }, XP_REWARDS.wear + done.earned, messages, qualifies ? today() : before.lastQualifyingWearDate, true, streak)
  }),
  recordSustainableAction: (itemId, action, wardrobe) => runLocalService(() => {
    const item = wardrobe.find(candidate => candidate.id === itemId); if (!item || item.isActive === false) throw new Error('This item is no longer active in your wardrobe.')
    if (item.lifecycleHistory?.some(event => event.action === action)) return finish(localProgress, wardrobe, localEngagement, 0, [`${item.name} was already recorded as ${action}.`])
    const now = new Date().toISOString(), updatedWardrobe = wardrobe.map(candidate => candidate.id !== itemId ? candidate : { ...candidate, isActive: action === 'repurpose', ...(action === 'repurpose' ? {} : { archivedAt: now }), lifecycleHistory: [...(candidate.lifecycleHistory ?? []), { id: uid(), action, createdAt: now }] })
    const progressed = localEngagement.challenges.map(challenge => !challenge.completed && challenge.relevantItemId === itemId && challenge.type === 'second-life' && action === 'repurpose' ? { ...challenge, progress: challenge.target } : challenge)
    const messages = [`${action[0].toUpperCase() + action.slice(1)} recorded +${XP_REWARDS[action]} XP`], done = complete(progressed, messages)
    return finish(localProgress, updatedWardrobe, { ...localEngagement, challenges: done.challenges }, XP_REWARDS[action] + done.earned, messages)
  }),
}
