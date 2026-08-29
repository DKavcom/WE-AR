import { useMemo, useState } from 'react'
import type { ClothingItem, NavProps, SustainableAction } from '../types'

interface Props extends NavProps { items: ClothingItem[]; onSustainableAction: (itemId: string, action: SustainableAction) => void; onRemoveItem: (itemId: string) => void; onListItem: (item: ClothingItem, action: Extract<SustainableAction, 'sell' | 'trade'>, details: { price?: number; size: string; condition: string; tradePreference?: string }) => void }

export default function WardrobeScreen({ onNavigate, items, onSustainableAction, onRemoveItem, onListItem }: Props) {
  const [filter, setFilter] = useState<'all'|'top'|'outerwear'|'bottom'|'shoes'|'accessory'>('all')
  const activeItems = useMemo(() => items.filter(item => item.isActive !== false), [items])
  const shown = useMemo(() => filter === 'all' ? activeItems : activeItems.filter(i => i.category === filter), [filter, activeItems])
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null)
  const [pendingAction, setPendingAction] = useState<SustainableAction | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [listingAction, setListingAction] = useState<Extract<SustainableAction, 'sell' | 'trade'> | null>(null)
  const [price, setPrice] = useState('20')
  const [size, setSize] = useState('')
  const [condition, setCondition] = useState('Good condition')
  const [tradePreference, setTradePreference] = useState('Open to offers')
  const confirmAction = () => { if (selectedItem && pendingAction) { if (pendingAction === 'sell' || pendingAction === 'trade') { setListingAction(pendingAction); setPendingAction(null); return } onSustainableAction(selectedItem.id, pendingAction) }; setPendingAction(null); setSelectedItem(null) }
  return (
    <div className="bg-[#f7f5f2] min-h-screen pb-28">
      <div className="h-12" />
      <div className="px-5">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => onNavigate('home')} className="text-[#888] text-sm">← Back</button>
          <button onClick={() => onNavigate('add-wardrobe')} className="bg-[#111] text-white text-xs font-bold px-4 py-2 rounded-full">+ Add item</button>
        </div>
        <h1 className="text-[30px] font-bold mb-1">My Wardrobe</h1>
        <p className="text-[#888] text-sm mb-5">{activeItems.length} pieces ready to style{items.length > activeItems.length ? ` · ${items.length - activeItems.length} archived` : ''}</p>
        <div className="flex gap-2 overflow-x-auto mb-5 pb-1">
          {(['all','top','outerwear','bottom','shoes','accessory'] as const).map(f => <button key={f} onClick={()=>setFilter(f)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold capitalize ${filter===f?'bg-[#111] text-white':'bg-white border border-[#e5e1da] text-[#666]'}`}>{f}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {shown.map((item, idx) => (
            <button key={item.id ?? `${item.name}-${idx}`} onClick={() => setSelectedItem(item)} className="text-left bg-white rounded-[20px] border border-[#edebe6] overflow-hidden shadow-sm active:scale-[.98] transition-transform">
              <div className="aspect-square bg-[#faf9f6] flex items-center justify-center p-4"><img src={item.image} alt={item.name} className="max-h-28 object-contain" /></div>
              <div className="p-3"><p className="font-semibold text-[13px] text-[#111]">{item.name}</p><p className="text-[11px] text-[#aaa] mt-1">Worn {item.worn ?? 0}×</p></div>
            </button>
          ))}
        </div>
        {shown.length === 0 && <div className="bg-white border border-[#edebe6] rounded-[20px] p-6 text-center text-sm text-[#888]">No {filter === 'all' ? 'items' : `${filter} items`} yet. Add one to start styling.</div>}
        {selectedItem && <div className="fixed inset-0 z-30 bg-black/30 flex items-end justify-center" onClick={()=>setSelectedItem(null)}><div className="w-full max-w-[430px] bg-[#f7f5f2] rounded-t-[28px] p-5" onClick={event=>event.stopPropagation()}><div className="flex items-center gap-3 mb-4"><img src={selectedItem.image} alt="" className="size-12 object-contain bg-white rounded-xl"/><div><p className="font-bold">{selectedItem.name}</p><p className="text-xs text-[#888]">Choose a circular action you have actually completed.</p></div></div><div className="grid grid-cols-2 gap-2">{(['repurpose','donate'] as SustainableAction[]).map(action=><button key={action} onClick={()=>setPendingAction(action)} className="bg-white border border-[#edebe6] rounded-xl py-3 text-sm font-semibold capitalize">{action}</button>)}<button onClick={()=>{onListItem(selectedItem,'sell',{size:selectedItem.size ?? '',condition:'Good condition'});setSelectedItem(null)}} className="col-span-2 bg-[#1b4332] text-white rounded-xl py-3 text-sm font-semibold">List on Market</button></div><button onClick={()=>setConfirmRemove(true)} className="w-full mt-3 py-2 text-sm font-semibold text-[#a33]">Remove item</button><button onClick={()=>setSelectedItem(null)} className="w-full py-2 text-sm text-[#888]">Cancel</button></div></div>}
        {pendingAction && <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center px-5"><div className="bg-white rounded-[24px] p-6 text-center max-w-[330px]"><p className="font-bold text-lg">{pendingAction === 'sell' ? 'Mark as sold?' : pendingAction === 'trade' ? 'Confirm trade?' : `Confirm ${pendingAction}?`}</p><p className="text-sm text-[#777] mt-2">{pendingAction === 'sell' ? 'Confirm only after this item has found a new owner.' : pendingAction === 'trade' ? 'Continue when you are ready to list this item for trade.' : `Only continue if you have actually ${pendingAction === 'repurpose' ? 'repurposed' : `${pendingAction}d`} this item.`}</p><div className="flex gap-2 mt-5"><button onClick={()=>setPendingAction(null)} className="flex-1 border border-[#ddd] rounded-xl py-3 text-sm font-semibold">Not yet</button><button onClick={confirmAction} className="flex-1 bg-[#1b4332] text-white rounded-xl py-3 text-sm font-bold">{pendingAction === 'sell' ? 'Mark as sold' : pendingAction === 'trade' ? 'List for trade' : 'Confirm'}</button></div></div></div>}
        {listingAction && selectedItem && <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center"><div className="w-full max-w-[430px] bg-[#f7f5f2] rounded-t-[28px] p-5"><p className="font-bold text-lg">{listingAction === 'sell' ? 'List for sale' : 'List for trade'}</p><div className="flex items-center gap-3 mt-3"><img src={selectedItem.image} alt="" className="size-14 bg-white rounded-xl object-contain"/><div><p className="font-semibold text-sm">{selectedItem.name}</p><p className="text-xs text-[#888] capitalize">{selectedItem.category}{selectedItem.color ? ` · ${selectedItem.color}` : ''}</p></div></div><div className="grid grid-cols-2 gap-2 mt-4">{listingAction === 'sell' && <label className="text-xs text-[#666]">Price<input value={price} onChange={event=>setPrice(event.target.value)} inputMode="numeric" className="mt-1 w-full bg-white border border-[#edebe6] rounded-xl p-2"/></label>}<label className="text-xs text-[#666]">Size<input value={size} onChange={event=>setSize(event.target.value)} placeholder="e.g. M" className="mt-1 w-full bg-white border border-[#edebe6] rounded-xl p-2"/></label><label className="text-xs text-[#666]">Condition<input value={condition} onChange={event=>setCondition(event.target.value)} className="mt-1 w-full bg-white border border-[#edebe6] rounded-xl p-2"/></label>{listingAction === 'trade' && <label className="col-span-2 text-xs text-[#666]">Looking for<input value={tradePreference} onChange={event=>setTradePreference(event.target.value)} className="mt-1 w-full bg-white border border-[#edebe6] rounded-xl p-2"/></label>}</div><button onClick={()=>{onListItem(selectedItem, listingAction, { price: listingAction === 'sell' ? Number(price) || undefined : undefined, size: size || 'One size', condition, tradePreference: listingAction === 'trade' ? tradePreference : undefined });setListingAction(null);setSelectedItem(null)}} className="w-full mt-5 bg-[#1b4332] text-white rounded-2xl py-3.5 font-bold">{listingAction === 'sell' ? 'List for Sale' : 'List for Trade'}</button><button onClick={()=>setListingAction(null)} className="w-full py-3 text-sm text-[#888]">Cancel</button></div></div>}
        {confirmRemove && selectedItem && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-5"><div className="bg-white rounded-[24px] p-6 text-center max-w-[340px]"><p className="font-bold text-lg">Remove this item?</p><p className="text-sm text-[#777] mt-2">Remove this item from your wardrobe? This is for duplicates or items added by mistake. Any Saved Fits containing it will also be removed.</p><div className="flex gap-2 mt-5"><button onClick={()=>setConfirmRemove(false)} className="flex-1 border border-[#ddd] rounded-xl py-3 text-sm font-semibold">Cancel</button><button onClick={()=>{onRemoveItem(selectedItem.id);setConfirmRemove(false);setSelectedItem(null)}} className="flex-1 bg-[#9b2c2c] text-white rounded-xl py-3 text-sm font-bold">Remove</button></div></div></div>}
      </div>
    </div>
  )
}
