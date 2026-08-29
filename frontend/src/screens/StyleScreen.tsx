import { useEffect, useMemo, useState } from 'react'
import type { NavProps, Outfit, SavedFit, StyleEntryPoint, WardrobeItem } from '../types'
import avatarImg from '@/imports/1Home/d0dc5bfef11f2172c1ab7437f3dd356890372cbc.png'

interface Props extends NavProps {
  onWearThis: (outfit: Outfit | undefined) => void
  entryPoint: StyleEntryPoint
  initialOutfit?: Outfit
  initialSavedFitId?: string
  savedFits: SavedFit[]
  recommendations: Outfit[]
  recommendationsLoading: boolean
  onRequestMore: (excludedItemCombinations: string[][]) => Promise<Outfit[]>
  onSaveFit: (fit: SavedFit) => void
  onRemoveSavedFit: (id: string) => void
}

function outfitItems(outfit: Outfit) {
  return outfit.items ?? [outfit.top, outfit.outerwear, outfit.bottom, outfit.shoes].filter((item): item is WardrobeItem => Boolean(item))
}

function combination(outfit: Outfit) {
  return outfitItems(outfit).map(item => item.id).sort()
}

function itemLabel(item: WardrobeItem) {
  if (item.category === 'bottom') return 'Bottoms'
  return item.category[0].toUpperCase() + item.category.slice(1)
}

export default function StyleScreen({ onNavigate, onWearThis, entryPoint, initialOutfit, initialSavedFitId, savedFits, recommendations, recommendationsLoading, onRequestMore, onSaveFit, onRemoveSavedFit }: Props) {
  const [outfits,setOutfits]=useState<Outfit[]>(recommendations)
  const [outfitIndex,setOutfitIndex]=useState(initialOutfit ? -1 : 0)
  const [savedFitId,setSavedFitId]=useState<string | null>(initialSavedFitId ?? null)
  const [isTransitioning,setIsTransitioning]=useState(false)

  useEffect(() => {
    setOutfits(current => {
      const known = new Set(current.map(outfit => combination(outfit).join('|')))
      return [...current, ...recommendations.filter(outfit => !known.has(combination(outfit).join('|')))]
    })
  }, [recommendations])

  const outfit = outfitIndex === -1 ? initialOutfit : outfits[outfitIndex]
  const items = useMemo(() => outfit ? outfitItems(outfit) : [], [outfit])
  const outfitId = outfit?.id

  useEffect(() => {
    setSavedFitId(outfitId ? ((outfitIndex === -1 ? initialSavedFitId : undefined) ?? savedFits.find(fit => fit.outfitId === outfitId)?.id ?? null) : null)
  }, [outfitId, outfitIndex, initialSavedFitId, savedFits])

  const next = async () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    if (outfitIndex === -1 && outfits.length) setOutfitIndex(0)
    else if (outfitIndex + 1 < outfits.length) setOutfitIndex(outfitIndex + 1)
    else {
      const more = await onRequestMore(outfits.map(combination))
      const known = new Set(outfits.map(candidate => combination(candidate).join('|')))
      const additions = more.filter(candidate => !known.has(combination(candidate).join('|')))
      if (additions.length) {
        setOutfits(current => [...current, ...additions])
        setOutfitIndex(outfits.length)
      } else if (outfits.length) setOutfitIndex(0)
    }
    setSavedFitId(null)
    window.setTimeout(() => setIsTransitioning(false), 180)
  }

  const save = () => {
    if (!outfit) return
    if (savedFitId) {
      onRemoveSavedFit(savedFitId)
      setSavedFitId(null)
      return
    }
    const id = crypto.randomUUID()
    onSaveFit({ ...outfit, id, createdAt:new Date().toISOString(), outfitId:outfit.id })
    setSavedFitId(id)
  }

  const backScreen = entryPoint==='similarity' ? 'similarity' : entryPoint==='saved-fit' ? 'saved' : entryPoint==='comparison' ? 'compare' : 'home'
  const copy = entryPoint==='similarity'
    ? { heading:'Style What You Own', body:"You already own something similar — let's make it work" }
    : entryPoint==='saved-fit'
      ? { heading:'Your Saved Fit', body:'Here’s the exact look you saved.' }
      : entryPoint==='comparison'
        ? { heading:'Style This Direction', body:'Starting with the direction you picked.' }
        : { heading:'Try On Your Wardrobe', body:'Welcome back — mix what you own and discover a fit that feels right.' }

  return <div className="bg-[#f7f5f2] min-h-screen pb-10"><div className="h-12"/><div className="px-5">
    <button onClick={()=>onNavigate(backScreen)} className="text-[#888] text-sm mb-4">← Back</button>
    <h1 className="text-[28px] font-bold text-[#111] mb-1">{copy.heading}</h1>
    <p className="text-[#888] text-[14px] mb-5">{copy.body}</p>

    {!outfit ? <div className="bg-white rounded-[24px] border border-[#edebe6] p-8 text-center">
      <div className="text-4xl mb-3">👕</div>
      <p className="font-semibold">{recommendationsLoading ? 'Styling your wardrobe…' : 'Add something to style'}</p>
      <p className="text-sm text-[#999] mt-1 mb-5">{recommendationsLoading ? 'Finding combinations from items you own.' : 'Your recommendations will appear once your wardrobe has an item.'}</p>
      {!recommendationsLoading && <button onClick={()=>onNavigate('add-wardrobe')} className="bg-[#111] text-white px-5 py-3 rounded-2xl font-bold text-sm">Add to Wardrobe</button>}
    </div> : <>
      <div className="bg-white rounded-[24px] border border-[#edebe6] shadow-sm overflow-hidden mb-4">
        <div className="flex flex-col items-center py-8 px-4 transition-all duration-300 bg-gradient-to-b from-[#f0ede8] to-white">
          <img src={avatarImg} alt="Your styled avatar" className="h-52 object-contain transition-all duration-300" style={{opacity:isTransitioning?0:1,transform:isTransitioning?'scale(.94)':'scale(1)'}}/>
          <div className="mt-3 bg-white/70 border border-[#edebe6] rounded-full px-4 py-1.5"><p className="text-[11px] text-[#888] font-medium">{outfit.name}</p></div>
        </div>
      </div>

      <div className="grid gap-2.5 mb-3 transition-all duration-300" style={{opacity:isTransitioning?0:1,transform:isTransitioning?'scale(.97)':'scale(1)',gridTemplateColumns:`repeat(${Math.min(items.length,3)},minmax(0,1fr))`}}>
        {items.map(item=><div key={item.id} className="bg-white rounded-[18px] border border-[#edebe6] overflow-hidden"><div className="aspect-square bg-[#f7f5f2] flex items-center justify-center p-3"><img src={item.image} alt={item.name} className="max-h-[62px] object-contain"/></div><div className="px-2.5 py-2"><p className="text-[9px] font-bold text-[#bbb] uppercase tracking-wider">{itemLabel(item)}</p><p className="text-[12px] font-semibold text-[#111] leading-tight mt-0.5">{item.name}</p></div></div>)}
      </div>
      {outfit.rationale && <p className="text-[#888] text-xs text-center leading-relaxed mb-2">{outfit.rationale}</p>}

      <button onClick={()=>void next()} disabled={isTransitioning || recommendationsLoading} className="w-full text-[#555] text-[13px] font-semibold py-3 mb-2">{recommendationsLoading ? 'Styling another fit…' : '↻ Show me another fit'}</button>
      <button onClick={()=>onWearThis(outfit)} className="w-full bg-[#1b4332] text-white font-bold text-[15px] py-4 rounded-[18px] mb-3 active:scale-[.98] transition-transform">I'll Wear This</button>
      <button onClick={save} className="w-full text-[13px] font-medium py-2" style={{color:savedFitId?'#c9973a':'#888'}}>{savedFitId?'♥ Saved!':'♡ Save this fit'}</button>
    </>}
  </div></div>
}
