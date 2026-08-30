import { useMemo, useState } from 'react'
import type { EngagementState, NavProps, UserProgress, WardrobeItem } from '../types'
import {
  buildLeaderboard,
  derivePersonalStats,
  leaderboardMessage,
  type LeaderboardEntry,
} from '../services/leaderboardService'
import { getWearCount } from '../services/homeOutfitService'

interface Props extends NavProps {
  progress: UserProgress
  wardrobe: WardrobeItem[]
  engagement: EngagementState
}

const rankMark = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank)

function FriendsTab({ entries, engagement, onOpenFriend }: { entries: LeaderboardEntry[]; engagement: EngagementState; onOpenFriend: (entry: LeaderboardEntry) => void }) {
  const message = leaderboardMessage(entries, engagement.challenges.filter(challenge => !challenge.completed))
  return <>
    <div className="bg-[#1b4332] text-white rounded-[24px] p-5 mb-4 shadow-sm">
      <p className="text-[10px] font-bold tracking-[.14em] uppercase text-[#b9d1c3] mb-2">Your weekly pace</p>
      <h2 className="text-xl font-bold tracking-tight">{message.headline}</h2>
      {message.detail && <p className="text-sm text-[#d8e4dc] mt-1.5 leading-5">{message.detail}</p>}
    </div>

    <div className="flex items-end justify-between mb-3 px-1">
      <div><h2 className="text-[17px] font-bold text-[#111]">Friends</h2><p className="text-xs text-[#888] mt-0.5">This week · Resets weekly</p></div>
      <span className="text-[10px] font-bold tracking-[.12em] text-[#9a742c] bg-[#fef8e9] border border-[#ead9a9] rounded-full px-2.5 py-1">WEEKLY XP</span>
    </div>

    <div className="space-y-2.5">
      {entries.map(entry => <button
        key={entry.id}
        onClick={() => { if (!entry.isCurrentUser) onOpenFriend(entry) }}
        className={`w-full rounded-[20px] border p-3.5 text-left shadow-sm transition-transform active:scale-[.99] ${entry.isCurrentUser ? 'bg-[#edf4ef] border-[#92ad9e]' : 'bg-white border-[#edebe6]'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`size-9 rounded-full flex items-center justify-center shrink-0 font-bold ${entry.rank <= 3 ? 'bg-[#fef8e9] text-base' : 'bg-[#f2f0ec] text-xs text-[#777]'}`}>{rankMark(entry.rank)}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3"><p className="font-bold text-sm text-[#111] truncate">{entry.name}</p><p className="font-bold text-sm text-[#9a6e1e] shrink-0">{entry.weeklyXp} XP</p></div>
            <div className="flex items-center gap-2.5 mt-1 text-[11px] text-[#777]"><span>Lv. {entry.level}</span><span>{entry.wardrobeRotationPercent}% rotation</span><span>🔥 {entry.streak}</span></div>
          </div>
          {!entry.isCurrentUser && <span className="text-[#bbb] text-sm">›</span>}
        </div>
      </button>)}
    </div>
    <p className="text-[11px] text-[#999] leading-4 px-2 mt-4">Weekly XP reflects sustainable engagement. Your permanent level and total XP never reset.</p>
  </>
}

function StatTile({ value, label }: { value: string | number; label: string }) {
  return <div className="bg-[#faf9f6] rounded-2xl p-3"><p className="text-xl font-bold text-[#1b4332]">{value}</p><p className="text-[11px] text-[#777] mt-0.5">{label}</p></div>
}

function MyStatsTab({ progress, wardrobe, engagement }: Pick<Props, 'progress' | 'wardrobe' | 'engagement'>) {
  const stats = useMemo(() => derivePersonalStats(progress, wardrobe, engagement), [progress, wardrobe, engagement])
  const circularTotal = Object.values(stats.circularActivity).reduce((total, count) => total + (count ?? 0), 0)
  return <div className="space-y-4">
    <section className="bg-[#1b4332] text-white rounded-[24px] p-5 shadow-sm">
      <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold tracking-[.14em] text-[#b9d1c3] uppercase">Your progress</p><h2 className="text-3xl font-bold mt-1">Level {progress.level}</h2></div><div className="text-right"><p className="text-xl font-bold text-[#f4d58d]">{progress.xp}</p><p className="text-[10px] text-[#b9d1c3]">TOTAL XP</p></div></div>
      <div className="h-2.5 bg-white/15 rounded-full overflow-hidden mt-5"><div className="h-full bg-[#e8bd62] rounded-full" style={{ width: `${stats.levelProgressPercent}%` }} /></div>
      <p className="text-xs text-[#d8e4dc] mt-2">{stats.xpToNextLevel ? `${stats.xpToNextLevel} XP to Level ${progress.level + 1}` : 'Next level unlocked'}</p>
      <div className="border-t border-white/15 mt-4 pt-3 flex items-center justify-between"><span className="text-sm">🔥 {progress.streak} day streak</span><span className="text-xs text-[#b9d1c3]">{stats.weeklyXp} XP this week</span></div>
    </section>

    <section className="bg-white border border-[#edebe6] rounded-[24px] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.14em] text-[#999] uppercase">Wardrobe rotation</p><p className="text-4xl font-bold text-[#1b4332] mt-1">{stats.rotationPercent}%</p></div><div className="size-14 rounded-full border-[6px] border-[#d6e3db] flex items-center justify-center text-xs font-bold text-[#1b4332]">30d</div></div>
      <p className="text-sm text-[#666] mt-3">{stats.activeItemCount ? `${stats.recentlyWornCount} of ${stats.activeItemCount} active pieces worn recently` : 'No active wardrobe pieces yet'}</p>
      <p className="text-[11px] text-[#999] leading-4 mt-2">The share of active wardrobe pieces worn in the last 30 days.</p>
    </section>

    <section className="bg-white border border-[#edebe6] rounded-[24px] p-5 shadow-sm">
      <div className="flex justify-between items-center mb-3"><div><p className="text-[10px] font-bold tracking-[.14em] text-[#999] uppercase">This week</p><h3 className="font-bold text-base mt-0.5">Your wardrobe in motion</h3></div><span className="text-xs font-bold text-[#9a6e1e]">+{stats.weeklyXp} XP</span></div>
      {stats.fitsWornThisWeek || stats.challengesCompletedThisWeek || stats.piecesWornThisWeek ? <div className="grid grid-cols-2 gap-2">
        <StatTile value={stats.fitsWornThisWeek} label="fits worn" />
        <StatTile value={stats.uniqueOutfitsThisWeek} label="unique combinations" />
        <StatTile value={stats.piecesWornThisWeek} label="pieces worn" />
        <StatTile value={stats.challengesCompletedThisWeek} label="challenges completed" />
      </div> : <div className="bg-[#faf9f6] rounded-2xl p-4 text-center"><p className="font-semibold text-sm">No wears logged this week</p><p className="text-xs text-[#888] mt-1">Confirm a fit to start building your weekly stats.</p></div>}
    </section>

    <div className="grid grid-cols-2 gap-3">
      <section className="bg-white border border-[#edebe6] rounded-[22px] p-4 shadow-sm min-w-0">
        <p className="text-[10px] font-bold tracking-[.12em] text-[#999] uppercase">Most worn</p>
        {stats.mostWorn ? <><div className="h-20 flex items-center justify-center my-2"><img src={stats.mostWorn.image} alt={stats.mostWorn.name} className="max-h-20 max-w-full object-contain" /></div><p className="font-bold text-sm truncate">{stats.mostWorn.name}</p><p className="text-xs text-[#888] mt-0.5">{getWearCount(stats.mostWorn)} {getWearCount(stats.mostWorn) === 1 ? 'wear' : 'wears'}</p></> : <div className="py-7"><p className="font-semibold text-sm">No clear favorite yet</p><p className="text-xs text-[#999] mt-1">Log a wear to get started.</p></div>}
      </section>
      <section className="bg-white border border-[#edebe6] rounded-[22px] p-4 shadow-sm min-w-0">
        <p className="text-[10px] font-bold tracking-[.12em] text-[#999] uppercase">Needs some love</p>
        {stats.needsLove ? <><div className="h-20 flex items-center justify-center my-2"><img src={stats.needsLove.image} alt={stats.needsLove.name} className="max-h-20 max-w-full object-contain" /></div><p className="font-bold text-sm truncate">{stats.needsLove.name}</p><p className="text-xs text-[#888] mt-0.5">Bring it back into rotation.</p></> : <div className="py-7"><p className="font-semibold text-sm">Nothing waiting</p><p className="text-xs text-[#999] mt-1">New pieces get time to settle in.</p></div>}
      </section>
    </div>

    {circularTotal > 0 && <section className="bg-white border border-[#edebe6] rounded-[24px] p-5 shadow-sm"><p className="text-[10px] font-bold tracking-[.14em] text-[#999] uppercase mb-3">Circular activity</p><div className="space-y-2 text-sm">
      {(stats.circularActivity.repurpose ?? 0) > 0 && <div className="flex justify-between"><span>Pieces repurposed</span><strong>{stats.circularActivity.repurpose}</strong></div>}
      {(stats.circularActivity.donate ?? 0) > 0 && <div className="flex justify-between"><span>Pieces donated</span><strong>{stats.circularActivity.donate}</strong></div>}
      {(stats.circularActivity.trade ?? 0) > 0 && <div className="flex justify-between"><span>Pieces traded</span><strong>{stats.circularActivity.trade}</strong></div>}
      {(stats.circularActivity.sell ?? 0) > 0 && <div className="flex justify-between"><span>Pieces sold</span><strong>{stats.circularActivity.sell}</strong></div>}
    </div></section>}

    <section className="bg-white border border-[#edebe6] rounded-[24px] p-5 shadow-sm">
      <p className="text-[10px] font-bold tracking-[.14em] text-[#999] uppercase mb-3">Earned badges</p>
      {stats.badges.length ? <div className="flex flex-wrap gap-2">{stats.badges.map(badge => <div key={badge.id} title={badge.description} className="bg-[#fef8e9] border border-[#ead9a9] rounded-full px-3 py-2 text-[11px] font-bold text-[#7d5a1c]">✦ {badge.name}</div>)}</div> : <p className="text-sm text-[#888]">Your first confirmed wear will unlock your first badge.</p>}
    </section>
  </div>
}

function FriendModal({ friend, onClose }: { friend: LeaderboardEntry; onClose: () => void }) {
  return <div className="fixed inset-0 z-30 bg-black/35 flex items-end justify-center" onClick={onClose}>
    <div className="w-full max-w-[430px] bg-[#f7f5f2] rounded-t-[28px] p-5 pb-8" onClick={event => event.stopPropagation()}>
      <div className="w-10 h-1 bg-[#d5d1ca] rounded-full mx-auto mb-5" />
      <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold tracking-[.14em] text-[#999] uppercase">Friend snapshot</p><h2 className="text-2xl font-bold mt-1">{friend.name}</h2></div><button onClick={onClose} className="size-9 rounded-full bg-white border border-[#edebe6] text-[#777]">×</button></div>
      <div className="grid grid-cols-3 gap-2 mt-5"><StatTile value={`Lv. ${friend.level}`} label="level" /><StatTile value={friend.weeklyXp} label="weekly XP" /><StatTile value={`🔥 ${friend.streak}`} label="day streak" /></div>
      <div className="bg-white border border-[#edebe6] rounded-2xl p-4 mt-3"><div className="flex justify-between text-sm"><span className="text-[#777]">Wardrobe rotation</span><strong>{friend.wardrobeRotationPercent}%</strong></div><div className="flex justify-between text-sm mt-3"><span className="text-[#777]">Badge</span><strong className="text-[#8a6200]">{friend.badge}</strong></div>{friend.activity && <p className="text-xs text-[#888] border-t border-[#edebe6] mt-3 pt-3">Recently: {friend.activity}</p>}</div>
    </div>
  </div>
}

export default function LeaderboardScreen({ onNavigate, progress, wardrobe, engagement }: Props) {
  const [tab, setTab] = useState<'friends' | 'stats'>('friends')
  const [selectedFriend, setSelectedFriend] = useState<LeaderboardEntry>()
  const stats = useMemo(() => derivePersonalStats(progress, wardrobe, engagement), [progress, wardrobe, engagement])
  const entries = useMemo(() => buildLeaderboard(progress, stats), [progress, stats])
  return <div className="bg-[#f7f5f2] min-h-screen pb-10">
    <div className="h-12" />
    <div className="px-5">
      <button onClick={() => onNavigate('home')} className="text-[#777] text-sm mb-4">← Back</button>
      <div className="mb-5"><p className="text-[10px] font-bold tracking-[.15em] text-[#999] uppercase">Social progress</p><h1 className="text-[30px] leading-tight font-bold tracking-tight mt-1">Leaderboard</h1><p className="text-sm text-[#888] mt-1">Small wins feel better together.</p></div>
      <div className="grid grid-cols-2 bg-[#ebe8e2] rounded-2xl p-1 mb-5"><button onClick={() => setTab('friends')} className={`rounded-xl py-2.5 text-sm font-bold transition-colors ${tab === 'friends' ? 'bg-white text-[#111] shadow-sm' : 'text-[#777]'}`}>Friends</button><button onClick={() => setTab('stats')} className={`rounded-xl py-2.5 text-sm font-bold transition-colors ${tab === 'stats' ? 'bg-white text-[#111] shadow-sm' : 'text-[#777]'}`}>My Stats</button></div>
      {tab === 'friends' ? <FriendsTab entries={entries} engagement={engagement} onOpenFriend={setSelectedFriend} /> : <MyStatsTab progress={progress} wardrobe={wardrobe} engagement={engagement} />}
    </div>
    {selectedFriend && <FriendModal friend={selectedFriend} onClose={() => setSelectedFriend(undefined)} />}
  </div>
}
