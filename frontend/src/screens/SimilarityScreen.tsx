import type { NavProps, SimilarityResult, SimilarityClassification } from '../types'

interface Props extends NavProps {
  result: SimilarityResult
}

interface ClassConfig {
  headline: string
  emoji: string
  body: string
  messageBg: string
  messageBorder: string
  scoreTextColor: string
  scoreBadgeBg: string
  scoreBadgeBorder: string
  barFrom: string
  barTo: string
}

function getClassConfig(c: SimilarityClassification): ClassConfig {
  switch (c) {
    case 'high':
      return {
        headline: "This one's looking a little familiar",
        emoji: '👀',
        body: "You already own something very similar. Let's see what you can create with what you've got.",
        messageBg: '#fff8ee',
        messageBorder: '#ffe4a3',
        scoreTextColor: '#d97706',
        scoreBadgeBg: '#fef3c7',
        scoreBadgeBorder: '#f0d98a',
        barFrom: '#d97706',
        barTo: '#f59e0b',
      }
    case 'medium':
      return {
        headline: "You've got something similar-ish",
        emoji: '🤔',
        body: "There's a reasonable overlap with what you own. Worth seeing if you can style your way around it.",
        messageBg: '#eff6ff',
        messageBorder: '#bfdbfe',
        scoreTextColor: '#2563eb',
        scoreBadgeBg: '#dbeafe',
        scoreBadgeBorder: '#bfdbfe',
        barFrom: '#2563eb',
        barTo: '#60a5fa',
      }
    case 'low':
      return {
        headline: "This one looks pretty unique",
        emoji: '🙌',
        body: "We couldn't find a close match in your wardrobe — this might genuinely add something new.",
        messageBg: '#f0fdf4',
        messageBorder: '#86efac',
        scoreTextColor: '#16a34a',
        scoreBadgeBg: '#dcfce7',
        scoreBadgeBorder: '#86efac',
        barFrom: '#16a34a',
        barTo: '#4ade80',
      }
  }
}

export default function SimilarityScreen({ onNavigate, result }: Props) {
  const { uploadedItem, closestMatch, similarityScore, classification } = result
  const cfg = getClassConfig(classification)
  const isLow = classification === 'low'
  const isHigh = classification === 'high'
  const isEmpty = Boolean(result.wardrobeEmpty)
  const closestMatchDetails = [closestMatch?.category, closestMatch?.color].filter(Boolean).join(' · ')
  const headline = isEmpty ? 'Your wardrobe is ready for its first item' : cfg.headline
  const body = isEmpty ? 'Add a few pieces to your wardrobe, then check how future finds compare.' : cfg.body

  return (
    <div className="bg-[#f7f5f2] min-h-screen pb-10">
      <div className="h-12" />

      {/* Header */}
      <div className="flex items-center px-5 mb-5">
        <button
          onClick={() => onNavigate('upload')}
          className="flex items-center gap-1.5 text-[#888] text-sm font-medium active:text-[#111] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
      </div>

      <div className="px-5">
        <h1 className="text-[30px] font-bold text-[#111] mb-1" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          Wardrobe Check
        </h1>
        <p className="text-[#888] text-[14px] mb-5">Here's what we found in your wardrobe</p>

        {/* ─── HIGH / MEDIUM: side-by-side comparison card ─── */}
        {!isLow && closestMatch && (
          <div className="bg-white rounded-[24px] border border-[#edebe6] shadow-sm overflow-hidden mb-4">
            <div className="px-4 pt-5 pb-4">
              <div className="flex items-center gap-2 mb-5">
                {/* Uploaded item */}
                <div className="flex-1">
                  <div className="bg-[#f7f5f2] rounded-[18px] overflow-hidden aspect-square flex items-center justify-center mb-2.5 relative">
                    <img
                      src={uploadedItem.image}
                      alt={uploadedItem.name}
                      className="max-h-[110px] object-contain p-3"
                    />
                    <div className="absolute top-2 left-2 bg-[#111] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                      NEW
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[12px] font-semibold text-[#111] leading-tight">{uploadedItem.name}</p>
                    <p className="text-[11px] text-[#bbb]">Want to buy</p>
                  </div>
                </div>

                {/* Similarity connector */}
                <div className="flex flex-col items-center gap-1.5 px-1">
                  <div
                    className="px-2.5 py-1.5 rounded-xl border"
                    style={{ backgroundColor: cfg.scoreBadgeBg, borderColor: cfg.scoreBadgeBorder }}
                  >
                    <p className="text-[16px] font-black leading-none" style={{ color: cfg.scoreTextColor }}>
                      {similarityScore}%
                    </p>
                  </div>
                  <div className="flex flex-col gap-0.5 items-center">
                    <div className="w-[1px] h-3 bg-[#edebe6]" />
                    <div className="size-1.5 rounded-full bg-[#edebe6]" />
                    <div className="w-[1px] h-3 bg-[#edebe6]" />
                  </div>
                </div>

                {/* Owned item */}
                <div className="flex-1">
                  <div className="bg-[#f7f5f2] rounded-[18px] overflow-hidden aspect-square flex items-center justify-center mb-2.5 relative">
                    <img
                      src={closestMatch.image}
                      alt={closestMatch.name}
                      className="max-h-[110px] object-contain p-3"
                    />
                    <div className="absolute top-2 right-2 bg-[#1b4332] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                      OWNED
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[12px] font-semibold text-[#111] leading-tight">{closestMatch.name}</p>
                    <p className="text-[11px] text-[#bbb]">{closestMatchDetails ? `You own this · ${closestMatchDetails}` : 'You own this'}</p>
                  </div>
                </div>
              </div>

              {/* Similarity bar */}
              <div>
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="text-[#888] font-medium">Similarity score</span>
                  <span className="font-bold" style={{ color: cfg.scoreTextColor }}>{similarityScore}% match</span>
                </div>
                <div className="h-2.5 bg-[#f0ede8] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${similarityScore}%`,
                      background: `linear-gradient(to right, ${cfg.barFrom}, ${cfg.barTo})`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── LOW: single uploaded item card, no comparison ─── */}
        {isLow && (
          <div className="bg-white rounded-[24px] border border-[#edebe6] shadow-sm overflow-hidden mb-4">
            <div className="px-4 pt-5 pb-4">
              <div className="flex flex-col items-center mb-4">
                <div className="bg-[#f7f5f2] rounded-[18px] overflow-hidden w-40 aspect-square flex items-center justify-center mb-3 relative">
                  <img
                    src={uploadedItem.image}
                    alt={uploadedItem.name}
                    className="max-h-[110px] object-contain p-3"
                  />
                  <div className="absolute top-2 left-2 bg-[#111] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    NEW
                  </div>
                </div>
                <p className="text-[14px] font-semibold text-[#111]">{uploadedItem.name}</p>
                {closestMatch && !isEmpty && <p className="text-[11px] text-[#aaa] mt-1">Closest item checked: {closestMatch.name}{closestMatchDetails ? ` · ${closestMatchDetails}` : ''}</p>}
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="text-[#888] font-medium">{isEmpty ? 'Your wardrobe is empty' : 'No close match found'}</span>
                  <span className="font-bold" style={{ color: cfg.scoreTextColor }}>{similarityScore}% similar</span>
                </div>
                <div className="h-2.5 bg-[#f0ede8] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${similarityScore}%`,
                      background: `linear-gradient(to right, ${cfg.barFrom}, ${cfg.barTo})`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message card */}
        <div
          className="rounded-[20px] px-4 py-4 mb-6 border"
          style={{ backgroundColor: cfg.messageBg, borderColor: cfg.messageBorder }}
        >
          <p className="text-[#111] font-bold text-[17px] mb-1">
            {headline} {cfg.emoji}
          </p>
          <p className="text-[#666] text-[13px] leading-relaxed">{body}</p>
        </div>

        {/* ─── CTAs ─── */}

        {/* Style What I Own — HIGH and MEDIUM only */}
        {!isLow && (
          <button
            onClick={() => onNavigate('style')}
            className="w-full bg-[#1b4332] text-white font-bold text-[15px] py-4 rounded-[18px] mb-3 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-sm"
          >
            <span>👕</span>
            {isHigh ? 'Style What I Own' : 'Style What I Own'}
          </button>
        )}

        {/* Find Pre-Loved — always shown */}
        <button disabled title="Pre-loved listings are not available in this prototype yet" className="w-full bg-white border-2 border-[#b7c8bf] text-[#789083] font-semibold text-[15px] py-3.5 rounded-[18px] mb-5 flex items-center justify-center gap-2 cursor-not-allowed" aria-describedby="preloved-note">
          <span>♻️</span>
          Find Pre-Loved
        </button>
        <p id="preloved-note" className="sr-only">Pre-loved listings are not available in this prototype yet.</p>

        {/* Buy / Continue — phrasing varies */}
        {isLow ? (
          <button
            onClick={() => onNavigate('home')}
            className="w-full bg-white border border-[#edebe6] text-[#555] font-semibold text-[14px] py-3.5 rounded-[18px] active:scale-[0.98] transition-transform"
          >
            Continue
          </button>
        ) : (
          <button onClick={() => onNavigate('home')} className="w-full text-[#888] text-[13px] font-medium py-2 text-center active:text-[#111]">
            Buy new anyway
          </button>
        )}
      </div>
    </div>
  )
}
