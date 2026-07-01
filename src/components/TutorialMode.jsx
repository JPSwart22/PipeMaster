import { useState, useEffect, useRef } from 'react'

const SLIDE_DURATION = 5500 // ms per slide

const SLIDES = [
  {
    id: 'welcome',
    visual: 'welcome',
    title: 'Welcome to Pipemaster',
    body: 'The field irrigation manager built for the Mississippi Delta. Here\'s a 30-second look at what it does.',
  },
  {
    id: 'devmode',
    visual: 'devmode',
    title: 'Map Your Farm in Dev Mode',
    body: 'Draw field boundaries on live satellite imagery. Drop wells, risers, and map every pipe run exactly where it lies in the ground.',
  },
  {
    id: 'schematic',
    visual: 'schematic',
    title: 'Snap a Schematic — AI Does the Rest',
    body: 'Photo your Delta Plastics pipe planner sheet or upload a PDF. The AI reads hole sizes, distances, and furrow counts automatically.',
  },
  {
    id: 'fieldmode',
    visual: 'fieldmode',
    title: 'Field Mode — For the Crew',
    body: 'Simple start/stop interface for your workers. Tap a run to start, the timer ticks, tap to stop. No training needed.',
  },
  {
    id: 'punching',
    visual: 'punching',
    title: 'Punching Mode',
    body: 'Follow the pipe on live GPS. The app shows which hole sizes are coming up so you\'re always punching the right size at the right spot.',
  },
  {
    id: 'flags',
    visual: 'flags',
    title: 'Drop a Flag Anywhere',
    body: 'Spot a broken pipe or wet spot? Tap 🚩 and drop a flag right at your GPS location. Your whole team sees it instantly.',
  },
  {
    id: 'sync',
    visual: 'sync',
    title: 'Every Phone Stays in Sync',
    body: 'Share your 6-letter farm code from Settings. Every device updates the moment someone makes a change — no Wi-Fi needed to work, syncs when you\'re back online.',
  },
]

// ── Animated slide illustrations ──────────────────────────────────────────────
function Visual({ id, active }) {
  const cls = active ? 'tut-anim' : ''

  if (id === 'welcome') return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`text-green-400 font-black tracking-widest text-3xl ${cls}`}
           style={{ animation: active ? 'tutPulseGlow 2s ease-in-out infinite' : 'none',
                    textShadow: '0 0 30px rgba(34,197,94,0.7)' }}>
        PIPEMASTER
      </div>
      <div className="flex gap-3 mt-2">
        {['🌾','💧','🚜'].map((e, i) => (
          <span key={i} className="text-3xl"
                style={{ animation: active ? `tutBounce 1.4s ease-in-out ${i * 0.3}s infinite` : 'none' }}>
            {e}
          </span>
        ))}
      </div>
    </div>
  )

  if (id === 'devmode') return (
    <div className="relative w-52 h-32 rounded-xl overflow-hidden"
         style={{ background: '#1a3a2a', border: '1px solid rgba(34,197,94,0.3)' }}>
      {/* Satellite imagery feel */}
      <div className="absolute inset-0 opacity-30"
           style={{ background: 'repeating-linear-gradient(45deg,#2d5a3d 0px,#2d5a3d 2px,transparent 2px,transparent 12px)' }} />
      {/* Animated field polygon */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 208 128">
        <polygon points="30,20 170,25 180,100 20,105"
                 fill="rgba(34,197,94,0.2)" stroke="#22c55e" strokeWidth="2"
                 strokeDasharray="600" strokeDashoffset="0"
                 style={{ animation: active ? 'tutDraw 2s ease-out forwards' : 'none' }} />
        {[30,170,180,20].map((x, i) => (
          <circle key={i} cx={x} cy={[20,25,100,105][i]} r="4" fill="#22c55e"
                  style={{ animation: active ? `tutFadeIn 0.3s ${0.4 + i * 0.4}s both` : 'none' }} />
        ))}
      </svg>
      {/* Well marker */}
      <div className="absolute" style={{ left: 90, top: 55, animation: active ? 'tutFadeIn 0.5s 2s both' : 'none' }}>
        <div className="w-6 h-6 rounded-full border-2 border-blue-400 bg-blue-500/30 flex items-center justify-center text-xs">⚡</div>
      </div>
    </div>
  )

  if (id === 'schematic') return (
    <div className="flex items-center gap-4">
      {/* Phone with camera */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-24 rounded-xl border-2 border-gray-600 bg-gray-800 flex flex-col items-center justify-center gap-1"
             style={{ animation: active ? 'tutShake 0.5s 1s ease-in-out' : 'none' }}>
          <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-lg">📷</div>
          <div className="w-6 h-1 rounded-full bg-gray-600" />
        </div>
        <div className="text-xs text-gray-500">Snap it</div>
      </div>
      {/* Arrow */}
      <div className="text-green-400 text-2xl" style={{ animation: active ? 'tutSlideRight 0.8s 1.8s both' : 'none' }}>→</div>
      {/* Data table */}
      <div className="flex flex-col gap-1" style={{ animation: active ? 'tutFadeIn 0.6s 2.2s both' : 'none', opacity: active ? undefined : 0 }}>
        {[['5/8"','216 ft'],['1/2"','438 ft'],['3/8"','640 ft']].map(([size, ft]) => (
          <div key={size} className="flex gap-2 text-xs px-2 py-1 rounded"
               style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <span className="text-green-400 font-mono">{size}</span>
            <span className="text-gray-400">{ft}</span>
          </div>
        ))}
      </div>
    </div>
  )

  if (id === 'fieldmode') return (
    <div className="flex flex-col items-center gap-4 w-52">
      <div className="text-sm text-gray-400 font-medium">North 40 — Row 3</div>
      {/* Start/stop toggle */}
      <div className="w-full py-4 rounded-2xl flex items-center justify-between px-5 cursor-default"
           style={{
             background: active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
             border: `2px solid ${active ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.4)'}`,
             animation: active ? 'tutToggle 4s ease-in-out infinite' : 'none',
           }}>
        <span className="font-semibold text-sm" style={{ color: '#4ade80' }}>Running</span>
        <span className="relative inline-block rounded-full"
              style={{ width: 48, height: 28, background: '#22c55e' }}>
          <span className="absolute rounded-full bg-white"
                style={{ width: 20, height: 20, top: 4, left: 24, transition: 'left 0.3s' }} />
        </span>
      </div>
      {/* Timer */}
      <div className="font-mono text-2xl text-green-400"
           style={{ animation: active ? 'tutPulseGlow 1s ease-in-out infinite' : 'none' }}>
        02:14:37
      </div>
    </div>
  )

  if (id === 'punching') return (
    <div className="relative w-52 h-32">
      {/* Pipe line */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 208 128">
        <line x1="10" y1="64" x2="198" y2="64" stroke="#374151" strokeWidth="6" strokeLinecap="round" />
        {/* Colored segments */}
        <line x1="10" y1="64" x2="80" y2="64" stroke="#22c55e" strokeWidth="6"
              style={{ animation: active ? 'tutDrawLine 1s 0.3s both' : 'none', strokeDasharray: 70, strokeDashoffset: active ? 0 : 70 }} />
        <line x1="80" y1="64" x2="150" y2="64" stroke="#ef4444" strokeWidth="6"
              style={{ animation: active ? 'tutDrawLine 1s 1.2s both' : 'none', strokeDasharray: 70, strokeDashoffset: active ? 0 : 70 }} />
        <line x1="150" y1="64" x2="198" y2="64" stroke="#f97316" strokeWidth="6"
              style={{ animation: active ? 'tutDrawLine 0.8s 2s both' : 'none', strokeDasharray: 48, strokeDashoffset: active ? 0 : 48 }} />
        {/* GPS dot moving */}
        <circle cx="10" cy="64" r="7" fill="#3b82f6" stroke="white" strokeWidth="2"
                style={{ animation: active ? 'tutMoveAlongPipe 4s 0.5s ease-in-out infinite' : 'none' }} />
      </svg>
      {/* Size label that updates */}
      <div className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold"
           style={{ background: '#22c55e20', border: '1px solid #22c55e60', color: '#22c55e',
                    animation: active ? 'tutFadeIn 0.5s 0.5s both' : 'none' }}>
        5/8" ahead
      </div>
      {/* Size dots legend */}
      <div className="absolute bottom-2 left-2 flex gap-1.5">
        {[['#22c55e','5/8"'],['#ef4444','1/2"'],['#f97316','3/8"']].map(([c, s]) => (
          <div key={s} className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded-full" style={{ background: c }} />
            <span className="text-xs" style={{ color: c }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  )

  if (id === 'flags') return (
    <div className="relative w-44 h-32">
      {/* Map background */}
      <div className="absolute inset-0 rounded-xl opacity-25"
           style={{ background: 'repeating-linear-gradient(45deg,#2d5a3d 0px,#2d5a3d 2px,transparent 2px,transparent 14px)' }} />
      {/* Dropping flag */}
      <div className="absolute" style={{ left: '45%', top: '20%',
                                         animation: active ? 'tutDropFlag 0.7s 0.8s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
                                         opacity: active ? undefined : 0 }}>
        <span className="text-3xl" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.8))' }}>🚩</span>
      </div>
      {/* Ripple at flag base */}
      <div className="absolute rounded-full"
           style={{ left: 'calc(45% + 10px)', top: 'calc(20% + 26px)', width: 20, height: 20,
                    border: '2px solid rgba(234,179,8,0.6)', transform: 'translate(-50%,-50%)',
                    animation: active ? 'tutRipple 1s 1.5s ease-out both' : 'none', opacity: 0 }} />
      {/* Note popup */}
      <div className="absolute px-2 py-1 rounded-lg text-xs text-white"
           style={{ left: '55%', top: '15%', background: '#0f1923', border: '1px solid rgba(234,179,8,0.4)',
                    animation: active ? 'tutFadeIn 0.4s 1.8s both' : 'none', opacity: active ? undefined : 0 }}>
        Broken pipe here
      </div>
    </div>
  )

  if (id === 'sync') return (
    <div className="flex items-center gap-4">
      {/* Phone 1 */}
      <div className="w-12 h-20 rounded-xl border-2 border-green-500 bg-green-500/10 flex items-center justify-center"
           style={{ animation: active ? 'tutPulseGlow 1.5s ease-in-out infinite' : 'none' }}>
        <span className="text-xl">📱</span>
      </div>
      {/* Sync arrows */}
      <div className="flex flex-col gap-2">
        <div className="text-green-400 text-sm font-mono"
             style={{ animation: active ? 'tutSlideRight 0.8s 0.5s ease-in-out infinite alternate' : 'none' }}>→</div>
        <div className="text-blue-400 text-sm font-mono"
             style={{ animation: active ? 'tutSlideRight 0.8s 0.9s ease-in-out infinite alternate-reverse' : 'none' }}>←</div>
        <div className="text-xs text-gray-500 text-center">live</div>
      </div>
      {/* Phone 2 */}
      <div className="w-12 h-20 rounded-xl border-2 border-blue-500 bg-blue-500/10 flex items-center justify-center"
           style={{ animation: active ? 'tutPulseGlow 1.5s 0.4s ease-in-out infinite' : 'none' }}>
        <span className="text-xl">📱</span>
      </div>
    </div>
  )

  return null
}

// ── Keyframe CSS injected once ────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes tutPulseGlow {
  0%,100% { opacity: 1; }
  50% { opacity: 0.65; }
}
@keyframes tutBounce {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes tutDraw {
  from { stroke-dashoffset: 600; }
  to { stroke-dashoffset: 0; }
}
@keyframes tutFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes tutSlideRight {
  from { transform: translateX(-4px); opacity: 0.4; }
  to   { transform: translateX(4px);  opacity: 1; }
}
@keyframes tutShake {
  0%,100% { transform: rotate(0deg); }
  25% { transform: rotate(-6deg); }
  75% { transform: rotate(6deg); }
}
@keyframes tutToggle {
  0%,45%,100% { background: rgba(34,197,94,0.15); border-color: rgba(34,197,94,0.5); }
  50%,95% { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.4); }
}
@keyframes tutDrawLine {
  to { stroke-dashoffset: 0; }
}
@keyframes tutMoveAlongPipe {
  0%   { transform: translateX(0); }
  100% { transform: translateX(188px); }
}
@keyframes tutDropFlag {
  from { transform: translateY(-40px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
@keyframes tutRipple {
  from { transform: translate(-50%,-50%) scale(0.5); opacity: 0.8; }
  to   { transform: translate(-50%,-50%) scale(3);   opacity: 0; }
}
@keyframes tutProgress {
  from { width: 0%; }
  to   { width: 100%; }
}
`

export default function TutorialMode({ onDone, onSwitchToFieldMode }) {
  const [idx, setIdx] = useState(0)
  const [animKey, setAnimKey] = useState(0) // bump to restart animations on each slide
  const timerRef = useRef(null)

  // Inject keyframes once
  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = KEYFRAMES
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])

  function advance() {
    if (idx >= SLIDES.length - 1) {
      finish()
    } else {
      setIdx(i => i + 1)
      setAnimKey(k => k + 1)
    }
  }

  function finish() {
    onDone()
  }

  // Auto-advance timer
  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(advance, SLIDE_DURATION)
    return () => clearTimeout(timerRef.current)
  }, [idx])

  const slide = SLIDES[idx]
  const isLast = idx === SLIDES.length - 1

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ zIndex: 3000, background: 'rgba(8,16,26,0.97)', backdropFilter: 'blur(8px)' }}
      onClick={advance}
    >
      {/* Progress dots + skip */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-5">
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-300"
                 style={{
                   width:  i === idx ? 20 : 7,
                   height: 7,
                   background: i < idx ? '#22c55e' : i === idx ? '#f97316' : 'rgba(255,255,255,0.15)',
                 }} />
          ))}
        </div>
        <button
          onClick={e => { e.stopPropagation(); finish() }}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div key={idx} className="flex flex-col items-center gap-6 px-6 text-center"
           style={{ maxWidth: 360, animation: 'tutFadeIn 0.4s ease-out' }}>

        {/* Illustration */}
        <div className="flex items-center justify-center h-36">
          <Visual id={slide.visual} active key={animKey} />
        </div>

        {/* Text */}
        <div className="flex flex-col gap-2">
          <h2 className="text-white font-bold text-xl leading-tight">{slide.title}</h2>
          <p className="text-gray-400 text-sm leading-relaxed">{slide.body}</p>
        </div>

        {/* CTA on last slide */}
        {isLast && (
          <button
            onClick={e => { e.stopPropagation(); finish() }}
            className="px-8 py-3 rounded-xl font-bold text-white text-base"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
            Get Started →
          </button>
        )}
      </div>

      {/* Auto-advance progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div key={`prog-${idx}`} className="h-full"
             style={{
               background: 'linear-gradient(90deg, #f97316, #22c55e)',
               animation: `tutProgress ${SLIDE_DURATION}ms linear forwards`,
             }} />
      </div>

      {/* Tap hint */}
      {!isLast && (
        <div className="absolute bottom-4 text-xs text-gray-700">tap to advance</div>
      )}
    </div>
  )
}
