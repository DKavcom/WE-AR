import { useRef } from 'react'
import type { NavProps } from '../types'

interface Props extends NavProps {
  selectedImage: string | null
  onImageSelected: (file: File, previewUrl: string) => void
}

export default function UploadScreen({ onNavigate, selectedImage, onImageSelected }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onImageSelected(file, URL.createObjectURL(file))
    e.target.value = ''
  }
  const openPicker = () => fileInputRef.current?.click()

  return (
    <div className="bg-[#f7f5f2] min-h-screen flex flex-col">
      <div className="h-12" />
      <div className="flex items-center px-5 mb-5">
        <button onClick={() => onNavigate('home')} className="flex items-center gap-1.5 text-[#888] text-sm font-medium">← Back</button>
      </div>

      {/* Clean hero: the previous plus-icon asset was accidentally used as a hero image. */}
      <div className="mx-5 mb-6 rounded-[28px] bg-gradient-to-br from-[#e8e4de] via-[#f3efe9] to-[#fffaf2] min-h-[190px] p-6 flex flex-col justify-end border border-[#e4dfd7]">
        <p className="text-[#8c7c68] text-[10px] font-bold tracking-[0.12em] uppercase mb-2">Smart wardrobe check</p>
        <h1 className="text-[30px] font-bold text-[#111] leading-[1.05]">Check Before<br/>You Buy</h1>
        <p className="text-[#746e66] text-[13px] mt-3 max-w-[280px]">See whether something new actually adds to your wardrobe before you spend.</p>
      </div>

      <div className="flex flex-col flex-1 px-5">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <button onClick={openPicker} className="w-full aspect-[4/3] max-h-64 bg-white border-2 border-dashed border-[#d5d2cc] rounded-[28px] overflow-hidden cursor-pointer relative" style={selectedImage ? { borderStyle: 'solid', borderColor: '#111' } : undefined}>
          {selectedImage ? <><img src={selectedImage} alt="Item to compare with your wardrobe" className="absolute inset-0 w-full h-full object-contain p-4"/><div className="absolute bottom-3 right-3 bg-black/60 text-white text-[11px] font-semibold px-3 py-1 rounded-full">Change</div></> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"><div className="size-[60px] bg-[#f0ede8] rounded-[18px] flex items-center justify-center text-3xl text-[#555]">+</div><div className="text-center"><p className="text-[#111] font-semibold text-[15px]">Upload a photo</p><p className="text-[#aaa] text-[13px] mt-0.5">or choose a screenshot</p></div></div>}
        </button>
        <div className="h-9 flex items-center justify-center">{selectedImage && <button onClick={openPicker} className="text-[#888] text-[12px] font-medium underline underline-offset-2">Change image</button>}</div>
        <button onClick={() => onNavigate('analysis')} disabled={!selectedImage} className="w-full font-bold text-[16px] py-4 rounded-[18px] mb-3" style={{backgroundColor:selectedImage?'#111':'#d5d2cc',color:selectedImage?'#fff':'#aaa',cursor:selectedImage?'pointer':'not-allowed'}}>Check My Wardrobe</button>
        <p className="text-center text-[#bbb] text-xs">{selectedImage ? 'Ready to compare' : 'Upload a photo first to continue'}</p>
      </div>
      <div className="h-10" />
    </div>
  )
}
