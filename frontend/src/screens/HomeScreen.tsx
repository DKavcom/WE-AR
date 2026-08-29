import { useMemo, useState } from 'react'
import type { ClothingItem, EngagementChallenge, NavProps, Outfit, SavedFit, UserProgress } from '../types'
import avatarImg from '@/imports/1Home/d0dc5bfef11f2172c1ab7437f3dd356890372cbc.png'
import { homeOutfitHasItem } from '../services/homeOutfitService'

const categories = ['All', 'Tops', 'Outerwear', 'Bottoms', 'Shoes', 'Accessories'] as const
type Category = (typeof categories)[number]

const categoryMap: Record<Category, ClothingItem['category'] | undefined> = {
  All: undefined,
  Tops: 'top',
  Outerwear: 'outerwear',
  Bottoms: 'bottom',
  Shoes: 'shoes',
  Accessories: 'accessory',
}

interface Props extends NavProps {
  items: ClothingItem[]
  progress: UserProgress
  challenges: EngagementChallenge[]
  outfit?: Outfit
  onShuffleFit: () => void
  onSelectOutfitItem: (item: ClothingItem) => void
  onWearThis: () => void
  savedFits: SavedFit[]
  onSaveFit: (fit: SavedFit) => void
  onRemoveSavedFit: (id: string) => void
}

function combinationKey(value: Outfit | undefined) {
  return (value?.items ?? []).map(item => item.id).sort().join('|')
}

export default function HomeScreen({ onNavigate, items, progress, challenges, outfit, onShuffleFit, onSelectOutfitItem, onWearThis, savedFits, onSaveFit, onRemoveSavedFit }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const shownItems = useMemo(() => {
    const category = categoryMap[activeCategory]
    return (category ? items.filter(item => item.category === category) : items).slice(0, 4)
  }, [activeCategory, items])
  const outfitItems = outfit?.items ?? [outfit?.top, outfit?.outerwear, outfit?.bottom, outfit?.shoes].filter((item): item is ClothingItem => Boolean(item))
  const savedFit = useMemo(() => {
    const key = combinationKey(outfit)
    return key ? savedFits.find(fit => combinationKey(fit) === key) : undefined
  }, [outfit, savedFits])
  const toggleSavedFit = () => {
    if (!outfit || !outfitItems.length) return
    if (savedFit) {
      onRemoveSavedFit(savedFit.id)
      return
    }
    const id = crypto.randomUUID()
    onSaveFit({ ...outfit, id, outfitId: outfit.id, createdAt: new Date().toISOString(), items: [...outfitItems] })
  }

  return (
    <div className="bg-[#f7f5f2] min-h-screen pb-28">
      {/* Status bar spacer */}
      <div className="h-12" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 mb-3">
        <h1
          className="text-[26px] font-bold tracking-tight text-[#111]"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          ReWear
        </h1>
        <div className="flex items-center gap-1.5 bg-[#fef9ec] border border-[#f0d98a] px-3 py-1.5 rounded-full">
          <span className="text-sm">⭐</span>
          <span className="text-[#8a6200] text-xs font-semibold tracking-tight">Lv. {progress.level} · {progress.xp} XP</span>
        </div>
      </div>

      <div className="mx-5 mb-4 bg-white border border-[#edebe6] rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between text-xs mb-2"><span className="font-bold text-[#111]">Level {progress.level}</span><span className="text-[#888]">{progress.xp} / {progress.nextLevelThreshold} XP</span></div>
        <div className="h-2 bg-[#f0ede8] rounded-full overflow-hidden"><div className="h-full bg-[#c9973a] rounded-full" style={{ width: `${Math.min((progress.xp / progress.nextLevelThreshold) * 100, 100)}%` }} /></div>
      </div>

      {/* Streak banner */}
      <div className="mx-5 mb-4 bg-[#fff8ee] border border-[#ffe4a3] rounded-2xl px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🔥</span>
          <span className="text-[#111] text-sm font-medium">{progress.streak}-day SmartChoice streak</span>
        </div>
        <span className="text-[#c9973a] text-xs font-semibold">Keep it up!</span>
      </div>

      {/* Hero CTA */}
      <button
        onClick={() => onNavigate('upload')}
        className="mx-5 mb-5 bg-[#111] rounded-[24px] p-5 cursor-pointer active:scale-[0.97] transition-transform text-left w-[calc(100%-2.5rem)]"
      >
        <p className="text-[#999] text-[10px] font-semibold tracking-[0.12em] uppercase mb-1.5">
          Thinking of buying something?
        </p>
        <p className="text-white text-[22px] font-bold leading-snug mb-4">
          Check Before<br />You Buy
        </p>
        <div className="flex items-center justify-between">
          <p className="text-[#aaa] text-xs">Compare with your wardrobe instantly</p>
          <div className="bg-white text-[#111] text-xs font-bold px-4 py-2 rounded-full shrink-0 ml-3">
            Check →
          </div>
        </div>
      </button>

      {/* Quick actions */}
      <div className="flex gap-3 px-5 mb-6">
        <button onClick={() => onNavigate('compare')} className="flex-1 bg-white border border-[#edebe6] rounded-2xl py-3.5 text-[13px] font-semibold text-[#111] text-center shadow-sm active:bg-[#f0ede8]">
          🪞 Compare Fits
        </button>
        <button onClick={() => onNavigate('saved')} className="flex-1 bg-white border border-[#edebe6] rounded-2xl py-3.5 text-[13px] font-semibold text-[#111] text-center shadow-sm active:bg-[#f0ede8]">
          🔖 Saved Fits
        </button>
      </div>

      {/* Current outfit */}
      <div className="mx-5 mb-6">
        <div className="w-full text-left bg-white rounded-[24px] border border-[#edebe6] shadow-sm overflow-hidden relative">
          <button onClick={toggleSavedFit} disabled={!outfitItems.length} className="absolute top-4 left-4 z-10 bg-white/90 border border-[#edebe6] rounded-full px-3 py-1.5 text-[11px] font-bold text-[#555] shadow-sm disabled:text-[#bbb]">{savedFit ? 'Saved ✓' : 'Save Fit'}</button>
          <div className="flex flex-col items-center py-7 px-4 bg-gradient-to-b from-[#f0ede8] to-white">
            <img src={avatarImg} alt="Your wardrobe avatar" className="h-40 object-contain" />
              <div className="w-full mt-5">
              <div className="flex items-center justify-between mb-2"><p className="text-[11px] font-bold tracking-[.1em] text-[#777] uppercase">Current fit</p><button onClick={onShuffleFit} disabled={!outfitItems.length} className="text-[11px] font-bold text-[#1b4332] disabled:text-[#bbb]">↻ Shuffle Fit</button></div>
              {outfitItems.length ? <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(outfitItems.length, 4)}, minmax(0, 1fr))` }}>{outfitItems.map(item => <div key={item.id} className="bg-white/80 border border-[#edebe6] rounded-xl p-2 text-center min-w-0"><div className="h-11 flex items-center justify-center"><img src={item.image} alt={item.name} className="max-h-10 max-w-full object-contain" /></div><p className="text-[9px] font-semibold text-[#333] truncate mt-1">{item.name}</p></div>)}</div> : <p className="text-xs text-[#999]">Add a few pieces to build your first fit.</p>}
              <button onClick={onWearThis} disabled={!outfitItems.length} className="w-full mt-4 bg-[#1b4332] text-white font-bold text-sm py-3.5 rounded-2xl disabled:bg-[#b7c8bf] active:scale-[.98] transition-transform">✓ I Wore This</button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-5 mb-6">
        <div className="flex items-center justify-between mb-3"><h2 className="text-[17px] font-bold text-[#111]">Active challenges</h2><span className="text-[11px] text-[#888]">Earn while you rewear</span></div>
        <div className="space-y-2">
          {challenges.slice(0, 3).map(challenge => <div key={challenge.id} className="bg-white border border-[#edebe6] rounded-2xl p-3.5 shadow-sm"><div className="flex justify-between gap-3"><div><p className="font-bold text-[13px] text-[#111]">{challenge.title}</p><p className="text-[11px] text-[#888] mt-0.5">{challenge.description}</p></div><span className="shrink-0 text-[11px] font-bold text-[#c9973a]">+{challenge.xpReward} XP</span></div><div className="flex items-center gap-2 mt-2"><div className="h-1.5 flex-1 rounded-full bg-[#f0ede8] overflow-hidden"><div className="h-full bg-[#1b4332]" style={{ width: `${Math.min((challenge.progress / challenge.target) * 100, 100)}%` }} /></div><span className="text-[10px] text-[#888]">{challenge.progress}/{challenge.target}</span></div></div>)}
          {!challenges.length && <div className="bg-white border border-[#edebe6] rounded-2xl p-4 text-sm text-[#888]">Add an item to start a wardrobe challenge.</div>}
        </div>
      </div>

      {/* Wardrobe section */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[17px] font-bold text-[#111]">My Wardrobe</h2>
          <button onClick={() => onNavigate('wardrobe')} className="text-xs text-[#888] font-medium">View all →</button>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-[#111] text-white shadow-sm'
                  : 'bg-white border border-[#edebe6] text-[#555]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Clothing grid */}
        <div className="grid grid-cols-2 gap-3">
          {shownItems.map((item, index) => {
            const selected = homeOutfitHasItem(outfit, item)
            return <button
              key={item.id ?? `${item.name}-${index}`}
              onClick={() => onSelectOutfitItem(item)}
              className={`text-left bg-white rounded-[20px] border shadow-sm overflow-hidden transition-transform active:scale-[.98] ${selected ? 'border-[#1b4332] ring-2 ring-[#b7c8bf]' : 'border-[#edebe6]'}`}
            >
              <div className="aspect-[4/3] bg-[#fafaf8] flex items-center justify-center px-4 pt-4 pb-2">
                <img
                  src={item.image}
                  alt={item.name}
                  className="max-h-24 object-contain"
                />
              </div>
              <div className="px-3 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-[#111] leading-tight">{item.name}</p>
                  <p className={`text-[11px] ${selected ? 'text-[#1b4332] font-semibold' : 'text-[#aaa]'}`}>{selected ? 'In current fit' : `Worn ${item.worn ?? 0}×`}</p>
                </div>
              </div>
            </button>
          })}
        </div>
        {shownItems.length === 0 && <div className="bg-white border border-[#edebe6] rounded-[20px] p-5 text-center text-sm text-[#888]">No {activeCategory.toLowerCase()} in your wardrobe yet.</div>}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 backdrop-blur-sm border-t border-[#edebe6] z-10">
        <div className="flex items-center justify-around px-6 pb-6 pt-3">
          <button className="flex flex-col items-center gap-1">
            <div className="size-6 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22V12h6v10" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-[10px] text-[#111] font-semibold">Home</span>
          </button>

          <button
            onClick={() => onNavigate('add-wardrobe')}
            className="bg-[#111] rounded-full size-[56px] flex items-center justify-center shadow-lg -mt-6 active:scale-95 transition-transform"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>

          <button onClick={() => onNavigate('wardrobe')} className="flex flex-col items-center gap-1">
            <div className="size-6 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="#aaa" strokeWidth="2"/>
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="#aaa" strokeWidth="2"/>
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="#aaa" strokeWidth="2"/>
                <rect x="14" y="14" width="7" height="7" rx="1" stroke="#aaa" strokeWidth="2"/>
              </svg>
            </div>
            <span className="text-[10px] text-[#aaa] font-medium">Wardrobe</span>
          </button>
        </div>
      </div>
    </div>
  )
}
