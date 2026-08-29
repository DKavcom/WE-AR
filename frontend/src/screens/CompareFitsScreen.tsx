import { useMemo, useState } from 'react'
import type { NavProps, Outfit, WardrobeCategory, WardrobeItem } from '../types'
import avatarImg from '@/imports/1Home/d0dc5bfef11f2172c1ab7437f3dd356890372cbc.png'

type LookKey = 'A' | 'B'
type LookSlots = Partial<Record<WardrobeCategory, WardrobeItem>>

interface Props extends NavProps {
  items: WardrobeItem[]
  onPreference: (options: [Outfit, Outfit], selectedOutfitId: string) => void
  onStyleLook: (outfit: Outfit) => void
}

const coreSlots: WardrobeCategory[] = ['top','bottom','shoes']

function initialLook(items: WardrobeItem[], alternateTop: boolean): LookSlots {
  const tops = items.filter(item => item.category === 'top')
  return {
    ...(tops.length ? { top: tops[alternateTop && tops.length > 1 ? 1 : 0] } : {}),
    ...(items.find(item => item.category === 'bottom') ? { bottom: items.find(item => item.category === 'bottom')! } : {}),
    ...(items.find(item => item.category === 'shoes') ? { shoes: items.find(item => item.category === 'shoes')! } : {}),
  }
}

function asOutfit(look: LookSlots, key: LookKey): Outfit {
  const items = [...coreSlots, 'outerwear' as const, 'accessory' as const].map(category => look[category]).filter((item): item is WardrobeItem => Boolean(item))
  return {
    id: `compare-${key.toLowerCase()}-${items.map(item => item.id).join('-') || 'empty'}`,
    name: items.length ? items.map(item => item.name).join(' + ') : `Look ${key}`,
    items,
    ...(look.top ? { top: look.top } : {}),
    ...(look.outerwear ? { outerwear: look.outerwear } : {}),
    ...(look.bottom ? { bottom: look.bottom } : {}),
    ...(look.shoes ? { shoes: look.shoes } : {}),
  }
}

function slotLabel(category: WardrobeCategory) {
  return category === 'bottom' ? 'Bottom' : category[0].toUpperCase() + category.slice(1)
}

export default function CompareFitsScreen({ onNavigate, items, onPreference, onStyleLook }: Props) {
  const [lookA,setLookA]=useState<LookSlots>(()=>initialLook(items,false))
  const [lookB,setLookB]=useState<LookSlots>(()=>initialLook(items,true))
  const [selector,setSelector]=useState<{look:LookKey;category:WardrobeCategory}|null>(null)
  const [feedback,setFeedback]=useState('')
  const slots = [
    ...coreSlots,
    ...(items.some(item => item.category === 'outerwear') ? ['outerwear' as const] : []),
    ...(items.some(item => item.category === 'accessory') ? ['accessory' as const] : []),
  ]
  const outfitA=useMemo(()=>asOutfit(lookA,'A'),[lookA])
  const outfitB=useMemo(()=>asOutfit(lookB,'B'),[lookB])
  const selectorItems=selector ? items.filter(item=>item.category===selector.category) : []

  const updateSlot=(look:LookKey,category:WardrobeCategory,item:WardrobeItem)=>{
    if(look==='A')setLookA(current=>({...current,[category]:item}))
    else setLookB(current=>({...current,[category]:item}))
    setSelector(null)
    setFeedback('')
  }
  const prefer=(selected:Outfit)=>{
    if(!outfitA.items?.length||!outfitB.items?.length)return
    onPreference([outfitA,outfitB],selected.id)
    setFeedback(`Preference saved — Look ${selected.id.startsWith('compare-a')?'A':'B'}`)
  }

  const LookCard=({lookKey,look,outfit}:{lookKey:LookKey;look:LookSlots;outfit:Outfit})=><div className="bg-white rounded-[22px] border border-[#edebe6] overflow-hidden min-w-0">
    <div className="bg-gradient-to-b from-[#ede9e2] to-white px-2 pt-3 pb-2 text-center"><p className="text-[10px] font-black tracking-[.12em] mb-1">LOOK {lookKey}</p><img src={avatarImg} alt={`Model preview for Look ${lookKey}`} className="h-28 mx-auto object-contain"/></div>
    <div className="p-2.5 space-y-1.5">{slots.map(category=>{const item=look[category];return <button key={category} onClick={()=>setSelector({look:lookKey,category})} className="w-full bg-[#f7f5f2] rounded-xl p-2 text-left flex items-center gap-2 min-h-12"><div className="size-9 rounded-lg bg-white flex items-center justify-center shrink-0">{item?<img src={item.image} alt="" className="max-h-8 max-w-8 object-contain"/>:<span className="text-[#bbb]">+</span>}</div><div className="min-w-0"><p className="text-[8px] font-bold uppercase tracking-wider text-[#aaa]">{slotLabel(category)}</p><p className="text-[10px] font-semibold truncate text-[#222]">{item?.name??'Choose item'}</p></div></button>})}</div>
    <button disabled={!outfit.items?.length} onClick={()=>onStyleLook(outfit)} className="w-full border-t border-[#edebe6] py-2.5 text-[11px] font-semibold text-[#666] disabled:text-[#bbb]">Style Look {lookKey}</button>
  </div>

  if(!items.length)return <div className="bg-[#f7f5f2] min-h-screen pb-10"><div className="h-12"/><div className="px-5"><button onClick={()=>onNavigate('home')} className="text-[#888] text-sm mb-5">← Back</button><h1 className="text-[29px] font-bold mb-1">Compare Outfits</h1><p className="text-[#888] text-sm mb-6">Build two looks from clothes you own and compare them side by side.</p><div className="bg-white border border-[#edebe6] rounded-[24px] p-8 text-center"><div className="text-4xl mb-3">👕</div><p className="font-semibold">Your wardrobe is empty</p><p className="text-sm text-[#999] mt-1 mb-5">Add an item before building looks to compare.</p><button onClick={()=>onNavigate('add-wardrobe')} className="bg-[#111] text-white px-5 py-3 rounded-2xl font-bold text-sm">Add to Wardrobe</button></div></div></div>

  return <div className="bg-[#f7f5f2] min-h-screen pb-10"><div className="h-12"/><div className="px-5">
    <button onClick={()=>onNavigate('home')} className="text-[#888] text-sm mb-5">← Back</button>
    <h1 className="text-[29px] font-bold mb-1">Compare Outfits</h1>
    <p className="text-[#888] text-sm mb-5">Build two looks from your wardrobe, then choose the one you prefer.</p>

    <div className="grid grid-cols-2 gap-3 mb-3"><LookCard lookKey="A" look={lookA} outfit={outfitA}/><LookCard lookKey="B" look={lookB} outfit={outfitB}/></div>
    <button onClick={()=>{setLookB({...lookA});setFeedback('Look A copied to Look B');setSelector(null)}} className="w-full bg-white border border-[#dcd8d1] rounded-2xl py-3 text-sm font-semibold text-[#555] mb-4">Duplicate A → B</button>

    {selector&&<div className="bg-white border border-[#edebe6] rounded-[22px] p-4 mb-4"><div className="flex items-center justify-between mb-3"><div><p className="text-xs font-bold">Look {selector.look} · {slotLabel(selector.category)}</p><p className="text-[11px] text-[#999]">Choose from your wardrobe</p></div><button onClick={()=>setSelector(null)} className="text-[#999] text-lg">×</button></div>{selectorItems.length?<div className="grid grid-cols-3 gap-2">{selectorItems.map(item=><button key={item.id} onClick={()=>updateSlot(selector.look,selector.category,item)} className="bg-[#f7f5f2] rounded-xl p-2 text-center"><div className="h-14 flex items-center justify-center"><img src={item.image} alt={item.name} className="max-h-12 max-w-full object-contain"/></div><p className="text-[10px] font-semibold truncate mt-1">{item.name}</p></button>)}</div>:<div className="text-center py-4"><p className="text-xs text-[#999]">No owned {selector.category} items yet.</p><button onClick={()=>onNavigate('add-wardrobe')} className="text-xs font-bold underline mt-2">Add one</button></div>}</div>}

    <div className="grid grid-cols-2 gap-3"><button disabled={!outfitA.items?.length||!outfitB.items?.length} onClick={()=>prefer(outfitA)} className="bg-[#1b4332] text-white rounded-[18px] py-3.5 text-sm font-bold disabled:bg-[#d5d2cc]">Prefer A</button><button disabled={!outfitA.items?.length||!outfitB.items?.length} onClick={()=>prefer(outfitB)} className="bg-[#1b4332] text-white rounded-[18px] py-3.5 text-sm font-bold disabled:bg-[#d5d2cc]">Prefer B</button></div>
    <div className="min-h-8 text-center pt-2" aria-live="polite">{feedback&&<p className="text-xs text-[#6e8a7a] font-semibold">✓ {feedback}</p>}</div>
  </div></div>
}
