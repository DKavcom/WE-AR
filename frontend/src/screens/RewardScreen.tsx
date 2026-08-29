import { useState, useEffect, useRef } from 'react'
import type { NavProps, RewardData } from '../types'

interface Props extends NavProps {
  rewardData: RewardData
}

const CONFETTI_COLORS = [
  '#c9973a', '#1b4332', '#f97316', '#8b5cf6',
  '#ec4899', '#06b6d4', '#fbbf24', '#34d399',
  '#f87171', '#818cf8',
]

interface ConfettiPiece {
  id: number
  color: string
  left: number
  delay: number
  duration: number
  width: number
  height: number
  rotate: number
}

const CONFETTI: ConfettiPiece[] = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: (i / 24) * 100 + (Math.random() - 0.5) * 8,
  delay: Math.random() * 0.8,
  duration: 2 + Math.random() * 1.2,
  width: 6 + Math.random() * 6,
  height: 8 + Math.random() * 8,
  rotate: Math.random() * 360,
}))

/** Compute progress percentage within the current level band (0–100). */
function levelProgress(xp: number, threshold: number) {
  return Math.min((xp / threshold) * 100, 100)
}

export default function RewardScreen({ onNavigate, rewardData }: Props) {
  const { currentXP, xpEarned, currentLevel, nextLevelThreshold, newXP, newLevel } = rewardData

  const [xpVisible, setXpVisible] = useState(false)
  const [barProgress, setBarProgress] = useState(levelProgress(currentXP, nextLevelThreshold))
  const [showLevelUp, setShowLevelUp] = useState(false)

  const navigateRef = useRef(onNavigate)
  useEffect(() => { navigateRef.current = onNavigate })

  useEffect(() => {
    const t1 = setTimeout(() => setXpVisible(true), 300)
    const t2 = setTimeout(() => {
      setBarProgress(levelProgress(newXP, nextLevelThreshold))
    }, 700)
    const t3 = setTimeout(() => {
      if (newLevel > currentLevel) setShowLevelUp(true)
    }, 1400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [currentLevel, newLevel, newXP, nextLevelThreshold])

  const hasStreakUpdate = rewardData.streakBefore !== undefined && rewardData.streakAfter !== undefined

  return (
    <div className="bg-[#f7f5f2] min-h-screen flex flex-col overflow-hidden relative">
      {/* Confetti layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {CONFETTI.map((p) => (
          <div
            key={p.id}
            className="absolute top-0 rounded-sm animate-confetti-fall"
            style={{
              left: `${p.left}%`,
              width: p.width,
              height: p.height,
              backgroundColor: p.color,
              transform: `rotate(${p.rotate}deg)`,
              '--duration': `${p.duration}s`,
              '--delay': `${p.delay}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="h-12 relative z-10" />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center relative z-10">
        {/* Celebration emoji */}
        <div className="text-[56px] mb-4">🎉</div>

        <h1
          className="text-[36px] font-bold text-[#111] mb-2"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          Smart Choice!
        </h1>
        <p className="text-[#666] text-[15px] leading-relaxed mb-8 max-w-[260px]">
          {rewardData.messages?.[0] ?? 'You made a new fit using clothes you already own.'}
        </p>

        {/* XP earned badge */}
        <div
          className="mb-8 transition-all duration-500"
          style={{
            opacity: xpVisible ? 1 : 0,
            transform: xpVisible ? 'scale(1)' : 'scale(0.75)',
          }}
        >
          <div className="bg-[#fef9ec] border-2 border-[#c9973a] rounded-[24px] px-10 py-5 shadow-sm">
            <p className="text-[52px] font-black text-[#c9973a] leading-none tracking-tight">
              +{xpEarned} XP
            </p>
          </div>
        </div>

        {rewardData.messages && rewardData.messages.length > 1 && <div className="w-full max-w-[300px] bg-[#fef9ec] border border-[#f0d98a] rounded-[16px] p-3 mb-3 text-left">
          {rewardData.messages.slice(1).map(message => <p key={message} className="text-[12px] text-[#8a6200] font-semibold">✦ {message}</p>)}
        </div>}

        {/* Level progress */}
        <div className="w-full max-w-[300px] bg-white border border-[#edebe6] rounded-[20px] p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-bold text-[#111]">
              Level {currentLevel} → {newLevel}
            </span>
            <span className="text-[13px] text-[#888]">
              {currentXP} → {newXP} XP
            </span>
          </div>
          <div className="h-3 bg-[#f0ede8] rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full"
              style={{
                width: `${barProgress}%`,
                background: 'linear-gradient(to right, #c9973a, #f0c060)',
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
          {showLevelUp && (
            <p className="text-[11px] text-[#c9973a] font-semibold text-center animate-fade-up">
              ⭐ Level {newLevel} unlocked!
            </p>
          )}
        </div>

        {hasStreakUpdate && <div className="flex items-center gap-3 bg-white border border-[#edebe6] rounded-[18px] px-5 py-3 shadow-sm mb-2">
          <span className="text-xl">🔥</span>
          <p className="text-[14px] font-medium text-[#111]">
            SmartChoice Streak: {rewardData.streakBefore} →{' '}
            <span className="font-black text-[#d97706]">{rewardData.streakAfter}</span>
          </p>
        </div>}
      </div>

      {/* Action buttons */}
      <div className="px-5 pb-10 flex flex-col gap-3 relative z-10">
        <button
          onClick={() => onNavigate('style')}
          className="w-full bg-white border-2 border-[#111] text-[#111] font-semibold text-[15px] py-4 rounded-[18px] active:scale-[0.98] transition-transform"
        >
          View / Save This Fit
        </button>
        <button
          onClick={() => onNavigate('home')}
          className="w-full bg-[#111] text-white font-bold text-[15px] py-4 rounded-[18px] active:scale-[0.98] transition-transform shadow-sm"
        >
          Back to Wardrobe
        </button>
      </div>
    </div>
  )
}
