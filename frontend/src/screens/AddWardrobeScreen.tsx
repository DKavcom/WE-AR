import { useRef, useState } from 'react'
import type { NavProps, WardrobeCategory, WardrobeItem, WardrobeMetadata } from '../types'
import { attributeExtractionService, generateWardrobeItemName } from '../services/attributeExtractionService'

interface Props extends NavProps {
  onAddItem: (item: WardrobeItem) => Promise<string | null>
}

const categories: WardrobeCategory[] = ['top','outerwear','bottom','shoes','accessory']

function readable(value: string) {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}

async function createDisplayImage(file: File) {
  const sourceUrl = URL.createObjectURL(file)
  try {
    const source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Could not prepare this image for saving.'))
      image.src = sourceUrl
    })
    const largestSide = Math.max(source.naturalWidth, source.naturalHeight)
    const scale = largestSide > 1000 ? 1000 / largestSide : 1
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(source.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(source.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not prepare this image for saving.')
    context.drawImage(source, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/webp', 0.82)
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}

export default function AddWardrobeScreen({ onNavigate, onAddItem }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const requestId = useRef(0)
  const [file, setFile] = useState<File | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('')
  const [category, setCategory] = useState<WardrobeCategory>('top')
  const [metadata, setMetadata] = useState<WardrobeMetadata>()
  const [brand, setBrand] = useState('')
  const [size, setSize] = useState('')
  const [notes, setNotes] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle')
  const [extractionMessage, setExtractionMessage] = useState('')
  const [extractionSource, setExtractionSource] = useState<'api' | 'local' | null>(null)
  const [analysisRunId, setAnalysisRunId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const choose = () => inputRef.current?.click()
  const analyze = (selectedFile: File) => {
    const currentRequest = ++requestId.current
    setExtractionStatus('analyzing')
    setExtractionMessage('Analyzing clothing…')
    void attributeExtractionService.extract(selectedFile).then(result => {
      if (currentRequest !== requestId.current) return
      if (!result.data) {
        setExtractionSource(null)
        setAnalysisRunId(null)
        setExtractionStatus('error')
        setExtractionMessage("We couldn't identify everything automatically. Add or correct the details below.")
        setShowEditor(true)
        return
      }
      const detected = result.data
      setExtractionSource(detected.source)
      setAnalysisRunId(detected.analysisRunId)
      setName(generateWardrobeItemName(detected))
      setColor(detected.color ?? '')
      if (detected.category) setCategory(detected.category)
      setMetadata(detected.metadata)
      setExtractionStatus('success')
      setExtractionMessage('AI-detected details — review them or add the item now.')
    })
  }

  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return
    setFile(selectedFile)
    setName('')
    setColor('')
    setCategory('top')
    setMetadata(undefined)
    setExtractionSource(null)
    setAnalysisRunId(null)
    setBrand('')
    setSize('')
    setNotes('')
    setSaveError('')
    setShowEditor(false)
    const reader = new FileReader()
    reader.onload = () => setImage(typeof reader.result === 'string' ? reader.result : null)
    reader.readAsDataURL(selectedFile)
    analyze(selectedFile)
    event.target.value = ''
  }

  const save = async () => {
    if (!image || !file || !name.trim() || extractionStatus === 'analyzing') return
    setSaveError('')
    setIsSaving(true)
    try {
      const displayImage = await createDisplayImage(file)
      const error = await onAddItem({
        id: crypto.randomUUID(),
        name: name.trim(),
        image: displayImage,
        category,
        color: color.trim() || undefined,
        metadata,
        brand: brand.trim() || undefined,
        size: size.trim() || undefined,
        notes: notes.trim() || undefined,
        worn: 0,
      })
      if (error) {
        setSaveError(error)
        return
      }
      onNavigate('wardrobe')
    } catch {
      setSaveError('Could not prepare this image for saving. Try a different image.')
    } finally {
      setIsSaving(false)
    }
  }

  const summary = [
    ['Type', metadata?.subcategory],
    ['Category', category],
    ['Color', color],
    ['Also', metadata?.secondaryColors?.join(', ')],
    ['Pattern', metadata?.pattern],
    ['Fit', metadata?.fit],
    ['Material', metadata?.materialGuess],
    ['Formality', metadata?.formalityScore ? `${metadata.formalityScore}/5` : undefined],
    ['Season', metadata?.seasons?.join(', ')],
    ['Condition', metadata?.conditionNotes],
  ].filter((entry): entry is [string,string] => Boolean(entry[1]))

  return <div className="bg-[#f7f5f2] min-h-screen pb-10"><div className="h-12"/><div className="px-5">
    <button onClick={()=>onNavigate('home')} className="text-[#888] text-sm mb-5">← Back</button>
    <h1 className="text-[30px] font-bold text-[#111] mb-1">Add to Wardrobe</h1>
    <p className="text-[#888] text-[14px] mb-6">Upload a photo and we’ll identify the item for you. You can correct anything before saving.</p>

    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile}/>
    <button onClick={choose} className="w-full aspect-[4/3] bg-white border-2 border-dashed border-[#d5d2cc] rounded-[26px] overflow-hidden relative mb-3">
      {image ? <img src={image} alt="Wardrobe item preview" className="absolute inset-0 w-full h-full object-contain p-4"/> : <div className="absolute inset-0 grid place-items-center"><div className="text-center"><div className="mx-auto size-14 rounded-2xl bg-[#f0ede8] grid place-items-center text-3xl mb-3">+</div><p className="font-semibold text-[#111]">Add a clothing photo</p><p className="text-xs text-[#aaa] mt-1">Front-facing works best</p></div></div>}
      {image && <span className="absolute right-3 bottom-3 bg-black/65 text-white text-[11px] px-3 py-1 rounded-full">Change</span>}
    </button>

    {extractionStatus==='analyzing'&&<div className="bg-white border border-[#edebe6] rounded-[20px] p-4 mb-4" aria-live="polite"><p className="text-sm font-semibold text-[#111]">✦ Analyzing clothing…</p><p className="text-xs text-[#999] mt-1">Finding the garment type, color, pattern, and style details.</p></div>}

    {extractionStatus==='success'&&<div className="bg-white border border-[#dfe8e2] rounded-[22px] p-4 mb-4" aria-live="polite">
      <p className="text-[10px] font-bold tracking-[.12em] uppercase text-[#6e8a7a] mb-1">AI detected</p>
      <h2 className="text-lg font-bold text-[#111] mb-3">{name}</h2>
      <div className="grid grid-cols-2 gap-2 mb-3">{summary.map(([label,value])=><div key={label} className="bg-[#f7f5f2] rounded-xl px-3 py-2"><p className="text-[9px] uppercase tracking-wider text-[#aaa] font-bold">{label}</p><p className="text-xs text-[#333] mt-0.5">{readable(value)}</p></div>)}</div>
      {metadata?.styleTags?.length&&<div className="flex flex-wrap gap-1.5 mb-3">{metadata.styleTags.map(tag=><span key={tag} className="bg-[#edf3ef] text-[#496456] text-[11px] px-2.5 py-1 rounded-full">{tag}</span>)}</div>}
      {metadata?.dominantHex&&<div className="flex items-center gap-2 text-xs text-[#777]"><span className="size-4 rounded-full border border-black/10" style={{backgroundColor:metadata.dominantHex}}/><span>{metadata.dominantHex}</span></div>}
      <p className="text-xs text-[#6e8a7a] mt-3">{extractionMessage}</p>
      {import.meta.env.DEV && extractionSource && <p className="text-[10px] text-[#9aa6a0] mt-2">dev · source: {extractionSource} · run: {analysisRunId?.slice(0, 8)}</p>}
    </div>}

    {extractionStatus==='error'&&<div className="bg-[#fff8ee] border border-[#ffe4a3] rounded-[20px] p-4 mb-4" aria-live="polite"><p className="font-semibold text-sm">We couldn’t identify everything automatically.</p><p className="text-xs text-[#7c6c50] mt-1">{extractionMessage}</p>{file&&<button onClick={()=>analyze(file)} className="text-xs font-bold text-[#7c6c50] mt-3 underline underline-offset-2">Try AI analysis again</button>}</div>}

    {image&&extractionStatus!=='analyzing'&&<button onClick={()=>setShowEditor(open=>!open)} className="w-full text-[#666] text-sm font-semibold py-2.5 mb-3">{showEditor?'Hide details':'Edit details'}</button>}

    {showEditor&&<div className="bg-white border border-[#edebe6] rounded-[22px] p-4 mb-5">
      <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wider mb-1.5">Item name</label><input value={name} onChange={event=>setName(event.target.value)} className="w-full bg-[#f7f5f2] border border-[#dedbd5] rounded-xl px-3 py-3 text-sm mb-4 outline-none focus:border-[#111]"/>
      <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wider mb-1.5">Color</label><input value={color} onChange={event=>setColor(event.target.value)} placeholder="Optional" className="w-full bg-[#f7f5f2] border border-[#dedbd5] rounded-xl px-3 py-3 text-sm mb-4 outline-none focus:border-[#111]"/>
      <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wider mb-1.5">Category</label><div className="grid grid-cols-4 gap-1.5 mb-4">{categories.map(item=><button key={item} onClick={()=>setCategory(item)} className={`py-2.5 rounded-xl text-[11px] font-semibold capitalize ${category===item?'bg-[#111] text-white':'bg-[#f7f5f2] border border-[#dedbd5] text-[#555]'}`}>{item}</button>)}</div>
      <div className="grid grid-cols-2 gap-2"><div><label className="block text-[10px] font-bold text-[#888] uppercase tracking-wider mb-1.5">Brand</label><input value={brand} onChange={event=>setBrand(event.target.value)} placeholder="Optional" className="w-full bg-[#f7f5f2] border border-[#dedbd5] rounded-xl px-3 py-3 text-sm mb-4"/></div><div><label className="block text-[10px] font-bold text-[#888] uppercase tracking-wider mb-1.5">Size</label><input value={size} onChange={event=>setSize(event.target.value)} placeholder="Optional" className="w-full bg-[#f7f5f2] border border-[#dedbd5] rounded-xl px-3 py-3 text-sm mb-4"/></div></div>
      <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wider mb-1.5">Notes</label><textarea value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Optional" rows={2} className="w-full bg-[#f7f5f2] border border-[#dedbd5] rounded-xl px-3 py-3 text-sm resize-none"/>
    </div>}

    {saveError&&<p className="text-sm text-[#a33] text-center mb-3" role="alert">{saveError}</p>}
    {image&&<button disabled={!name.trim()||extractionStatus==='analyzing'||isSaving} onClick={()=>void save()} className="w-full py-4 rounded-[18px] font-bold" style={{background:name.trim()&&extractionStatus!=='analyzing'&&!isSaving?'#111':'#d5d2cc',color:name.trim()&&extractionStatus!=='analyzing'&&!isSaving?'#fff':'#aaa'}}>{isSaving ? 'Saving…' : 'Add to My Wardrobe'}</button>}
  </div></div>
}
