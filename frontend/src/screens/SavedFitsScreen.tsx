import type { NavProps, SavedFit } from '../types'

interface Props extends NavProps {
  fits: SavedFit[]
  activeItemIds: string[]
  onOpenFit: (fit: SavedFit) => void
  onRemoveFit: (id: string) => void
}

export default function SavedFitsScreen({ onNavigate, fits, activeItemIds, onOpenFit, onRemoveFit }: Props) {
  return (
    <div className="bg-[#f7f5f2] min-h-screen pb-10">
      <div className="h-12" />
      <div className="px-5">
        <button onClick={() => onNavigate('home')} className="text-[#888] text-sm mb-5">← Back</button>
        <h1 className="text-[30px] font-bold mb-1">Saved Fits</h1>
        <p className="text-[#888] text-sm mb-6">Looks you liked enough to keep around.</p>
        {fits.length === 0 ? (
          <div className="bg-white border border-[#edebe6] rounded-[24px] p-8 text-center"><div className="text-4xl mb-3">♡</div><p className="font-semibold">No saved fits yet</p><p className="text-sm text-[#999] mt-1 mb-5">Style your avatar and save a look you like.</p><button onClick={()=>onNavigate('style')} className="bg-[#111] text-white px-5 py-3 rounded-2xl font-bold text-sm">Make a fit</button></div>
        ) : fits.map(f => {
          const items = f.items ?? [f.top,f.outerwear,f.bottom,f.shoes].filter(Boolean)
          const hasUnavailableItems = items.some(item => item && !activeItemIds.includes(item.id))
          return <div key={f.id} className="w-full bg-white border border-[#edebe6] rounded-[22px] p-3 mb-3 text-left">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {items.map((x,i)=><div key={x?.id ?? i} className="aspect-square bg-[#f7f5f2] rounded-2xl flex items-center justify-center">{x && <img src={x.image} alt={x.name} className="max-h-16 object-contain p-2" />}</div>)}
            </div>
            <div className="flex items-center justify-between"><button onClick={()=>onOpenFit(f)} className="min-w-0 text-left"><p className="font-semibold text-sm">{f.name}</p><p className="text-[11px] text-[#aaa]">Saved {f.createdAt}</p>{hasUnavailableItems&&<p className="text-[11px] text-[#a33] mt-1">Some pieces are unavailable</p>}</button><div className="flex items-center gap-3"><button onClick={()=>onRemoveFit(f.id)} className="text-xs font-semibold text-[#a33]">Remove</button><button onClick={()=>onOpenFit(f)} className="text-[#999]">→</button></div></div>
          </div>
        })}
      </div>
    </div>
  )
}
