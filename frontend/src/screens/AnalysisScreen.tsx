import type { NavProps } from '../types'

const STEPS = [
  { label: 'Looking for similar items' },
  { label: 'Finding better alternatives' },
  { label: 'Checking outfit compatibility' },
]

interface Props extends NavProps {
  status: 'idle' | 'analyzing' | 'error'
  errorMessage: string | null
  onRetry: () => void
}

export default function AnalysisScreen({ onNavigate, status, errorMessage, onRetry }: Props) {
  const isError = status === 'error'

  return (
    <div className="bg-[#f7f5f2] min-h-screen flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-[340px] flex flex-col items-center">
        {/* Heading */}
        <h2
          className="text-[38px] font-bold text-[#111] text-center leading-tight mb-10"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          {isError ? <>We couldn't check<br />that item</> : <>Checking your<br />wardrobe…</>}
        </h2>

        {isError ? (
          <div className="w-full text-center">
            <p className="text-[#888] text-[14px] mb-8">{errorMessage}</p>
            <button onClick={onRetry} className="w-full bg-[#111] text-white font-bold text-[15px] py-4 rounded-[18px] mb-3">Try again</button>
            <button onClick={() => onNavigate('upload')} className="w-full text-[#888] text-[13px] font-medium py-2">Choose another image</button>
          </div>
        ) : <>

        {/* Steps */}
        <div className="flex flex-col gap-4 mb-12 w-full">
          {STEPS.map((step, i) => {
            const isDone = false
            const isActive = i === 0

            return (
              <div
                key={step.label}
                className={`flex items-center gap-3 transition-all duration-300 ${
                  isDone || isActive ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <div
                  className={`size-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isDone
                      ? 'bg-[#111]'
                      : isActive
                        ? 'border-2 border-[#111]'
                        : 'border-2 border-[#ccc]'
                  }`}
                >
                  {isDone && (
                    <svg
                      className="animate-step-check"
                      width="10"
                      height="10"
                      viewBox="0 0 12 10"
                      fill="none"
                    >
                      <path
                        d="M1 5l4 4 6-8"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-[14px] font-medium transition-colors duration-300 ${
                    isDone ? 'text-[#111]' : isActive ? 'text-[#333]' : 'text-[#aaa]'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Spinner */}
        <div
          className="size-[52px] rounded-full border-[3px] animate-spin mb-10"
          style={{
            borderColor: '#edebe6',
            borderTopColor: '#111',
          }}
        />

        <p
          className="text-[#888] text-[14px] text-center animate-fade-up"
          style={{ fontWeight: 200 }}
        >
          Analyzing the item and checking your wardrobe…
        </p>
        </>}
      </div>
    </div>
  )
}
