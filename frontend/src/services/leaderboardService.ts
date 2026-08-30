import type { EngagementChallenge, EngagementState, SustainableAction, UserProgress, WardrobeItem } from '../types'
import { getWearCount, rankNeglectedItems } from './homeOutfitService'
import { getLevelProgress, XP_REWARDS } from './progressService'

export interface MockFriend {
  id: string
  name: string
  level: number
  weeklyXp: number
  streak: number
  wardrobeRotationPercent: number
  badge: string
  activity?: string
}

export interface LeaderboardEntry extends MockFriend {
  isCurrentUser?: boolean
  rank: number
}

export interface PersonalBadge {
  id: string
  name: string
  description: string
}

export interface PersonalStats {
  weeklyXp: number
  rotationPercent: number
  recentlyWornCount: number
  activeItemCount: number
  fitsWornThisWeek: number
  uniqueOutfitsThisWeek: number
  challengesCompletedThisWeek: number
  piecesWornThisWeek: number
  mostWorn?: WardrobeItem
  needsLove?: WardrobeItem
  circularActivity: Partial<Record<SustainableAction, number>>
  badges: PersonalBadge[]
  levelProgressPercent: number
  xpToNextLevel: number
}

export interface LeaderboardMessage {
  headline: string
  detail?: string
}

/**
 * Intentional prototype data: social peers are mocked while the current user's
 * row is always derived from locally persisted WE-AR activity.
 */
export const MOCK_FRIENDS: MockFriend[] = [
  { id: 'maya', name: 'Maya', level: 8, weeklyXp: 430, streak: 6, wardrobeRotationPercent: 78, badge: 'Mix Master', activity: 'Completed Rotation Reset' },
  { id: 'alex', name: 'Alex', level: 6, weeklyXp: 315, streak: 3, wardrobeRotationPercent: 65, badge: 'Streak Starter', activity: 'Logged a fresh fit' },
  { id: 'jamie', name: 'Jamie', level: 7, weeklyXp: 235, streak: 5, wardrobeRotationPercent: 72, badge: 'Rotation Regular', activity: 'Brought back an old favorite' },
  { id: 'sam', name: 'Sam', level: 5, weeklyXp: 165, streak: 2, wardrobeRotationPercent: 59, badge: 'Second Life', activity: 'Repurposed a jacket' },
  { id: 'jordan', name: 'Jordan', level: 4, weeklyXp: 95, streak: 1, wardrobeRotationPercent: 48, badge: 'Rotation Rookie', activity: 'Confirmed a wardrobe fit' },
]

const DAY_MS = 86_400_000
const validTime = (value?: string) => {
  const parsed = value ? Date.parse(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : undefined
}

export function currentWeekStart(now = new Date()) {
  const start = new Date(now)
  start.setDate(start.getDate() - (start.getDay() + 6) % 7)
  start.setHours(0, 0, 0, 0)
  return start.getTime()
}

const isSince = (value: string | undefined, start: number) => {
  const timestamp = validTime(value)
  return timestamp !== undefined && timestamp >= start
}

function weeklyWearRecords(wardrobe: WardrobeItem[], weekStart: number) {
  return wardrobe.flatMap(item => (item.lifecycleHistory ?? [])
    .filter(event => event.action === 'wear' && isSince(event.createdAt, weekStart))
    .map(event => ({ itemId: item.id, outfitId: event.outfitId, createdAt: event.createdAt })))
}

function weeklyFitCount(records: ReturnType<typeof weeklyWearRecords>) {
  return new Set(records.map(record => `${record.createdAt}|${record.outfitId ?? 'fit'}`)).size
}

function selectNeedsLove(activeItems: WardrobeItem[], now: Date) {
  const matureItems = activeItems.filter(item => {
    const added = validTime(item.firstAddedAt)
    return added === undefined || now.getTime() - added >= 14 * DAY_MS
  })
  return rankNeglectedItems(matureItems)[0]
}

function deriveBadges(progress: UserProgress, wardrobe: WardrobeItem[], engagement: EngagementState): PersonalBadge[] {
  const events = wardrobe.flatMap(item => item.lifecycleHistory ?? [])
  const hasWear = events.some(event => event.action === 'wear') || wardrobe.some(item => getWearCount(item) > 0)
  const confirmedOutfitIds = new Set(events.filter(event => event.action === 'wear' && event.outfitId).map(event => event.outfitId))
  const uniqueOutfitCount = Math.max(engagement.uniqueOutfitKeys.length, confirmedOutfitIds.size)
  return [
    hasWear ? { id: 'rotation-rookie', name: 'Rotation Rookie', description: 'Confirmed a wardrobe wear.' } : undefined,
    uniqueOutfitCount >= 5 ? { id: 'mix-master', name: 'Mix Master', description: 'Confirmed 5 unique outfit combinations.' } : undefined,
    events.some(event => event.action === 'repurpose') ? { id: 'second-life', name: 'Second Life', description: 'Repurposed a wardrobe piece.' } : undefined,
    events.some(event => ['donate', 'sell', 'trade'].includes(event.action)) ? { id: 'circular-closet', name: 'Circular Closet', description: 'Helped a piece find its next chapter.' } : undefined,
    progress.streak >= 3 ? { id: 'streak-starter', name: 'Streak Starter', description: 'Built a 3-day wear streak.' } : undefined,
  ].filter((badge): badge is PersonalBadge => Boolean(badge))
}

export function derivePersonalStats(
  progress: UserProgress,
  wardrobe: WardrobeItem[],
  engagement: EngagementState,
  now = new Date(),
): PersonalStats {
  const activeItems = wardrobe.filter(item => item.isActive !== false)
  const recentStart = now.getTime() - 30 * DAY_MS
  // Wardrobe Rotation is the percentage of active pieces worn in the last 30 days.
  // It is a behavioral closet metric, not an environmental impact claim.
  const recentlyWorn = activeItems.filter(item => isSince(item.lastWornAt, recentStart))
  const weekStart = currentWeekStart(now)
  const wearRecords = weeklyWearRecords(wardrobe, weekStart)
  const recordedFits = weeklyFitCount(wearRecords)
  const engagementFits = engagement.weeklyOutfitKeys?.length ?? 0
  const fitsWornThisWeek = Math.max(recordedFits, engagementFits)
  const recordedUniqueOutfits = new Set(wearRecords.map(record => record.outfitId).filter(Boolean)).size
  const completedChallenges = engagement.challenges.filter(challenge => challenge.completed && isSince(challenge.completedAt, weekStart))
  const circularEvents = wardrobe.flatMap(item => item.lifecycleHistory ?? []).filter(event => event.action !== 'wear')
  const weeklyCircularEvents = circularEvents.filter(event => isSince(event.createdAt, weekStart))
  const circularActivity = circularEvents.reduce<PersonalStats['circularActivity']>((totals, event) => {
    const action = event.action as SustainableAction
    totals[action] = (totals[action] ?? 0) + 1
    return totals
  }, {})
  const weeklyXp = fitsWornThisWeek * XP_REWARDS.wear
    + completedChallenges.reduce((total, challenge) => total + challenge.xpReward, 0)
    + weeklyCircularEvents.reduce((total, event) => total + XP_REWARDS[event.action as SustainableAction], 0)
  const mostWorn = [...activeItems]
    .filter(item => getWearCount(item) > 0)
    .sort((first, second) => getWearCount(second) - getWearCount(first) || second.name.localeCompare(first.name))[0]
  const levelProgress = getLevelProgress(progress)

  return {
    weeklyXp,
    rotationPercent: activeItems.length ? Math.round((recentlyWorn.length / activeItems.length) * 100) : 0,
    recentlyWornCount: recentlyWorn.length,
    activeItemCount: activeItems.length,
    fitsWornThisWeek,
    uniqueOutfitsThisWeek: Math.max(engagementFits, recordedUniqueOutfits),
    challengesCompletedThisWeek: completedChallenges.length,
    piecesWornThisWeek: new Set(wearRecords.map(record => record.itemId)).size,
    mostWorn,
    needsLove: selectNeedsLove(activeItems, now),
    circularActivity,
    badges: deriveBadges(progress, wardrobe, engagement),
    levelProgressPercent: levelProgress.progressPercent,
    xpToNextLevel: levelProgress.xpToNextLevel,
  }
}

export function buildLeaderboard(progress: UserProgress, stats: PersonalStats): LeaderboardEntry[] {
  const currentUser: MockFriend & { isCurrentUser: true } = {
    id: 'current-user',
    name: 'You · WE-AR',
    level: progress.level,
    weeklyXp: stats.weeklyXp,
    streak: progress.streak,
    wardrobeRotationPercent: stats.rotationPercent,
    badge: stats.badges[0]?.name ?? 'Building momentum',
    isCurrentUser: true,
  }
  const entrants: Array<MockFriend & { isCurrentUser?: boolean }> = [...MOCK_FRIENDS, currentUser]
  return entrants
    .sort((first, second) => second.weeklyXp - first.weeklyXp || Number(Boolean(first.isCurrentUser)) - Number(Boolean(second.isCurrentUser)) || first.name.localeCompare(second.name))
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
}

export function leaderboardMessage(entries: LeaderboardEntry[], activeChallenges: EngagementChallenge[]): LeaderboardMessage {
  const userIndex = entries.findIndex(entry => entry.isCurrentUser)
  if (userIndex <= 0) return { headline: "You're leading this week 🔥", detail: 'Keep wearing what you own to hold the top spot.' }

  const user = entries[userIndex]
  const next = entries[userIndex - 1]
  const gapToPass = next.weeklyXp - user.weeklyXp + 1
  const usefulChallenge = activeChallenges
    .filter(challenge => !challenge.completed && challenge.xpReward >= gapToPass)
    .sort((first, second) => first.xpReward - second.xpReward)[0]

  return {
    headline: `You're #${user.rank} this week`,
    detail: usefulChallenge
      ? `Complete ${usefulChallenge.title} (+${usefulChallenge.xpReward} XP) to move into #${next.rank}.`
      : `${gapToPass} XP to pass ${next.name.replace(' · WE-AR', '')}.`,
  }
}
