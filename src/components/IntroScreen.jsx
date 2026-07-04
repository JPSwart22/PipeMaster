import { useState } from 'react'

const SLIDES = [
  {
    icon: '💧',
    title: 'Welcome to Pipemaster',
    body: 'The irrigation management tool built for the Mississippi Delta. Map your pipe runs, track water usage, and guide your crew — all from your phone.',
    color: '#22c55e',
  },
  {
    icon: '🗺️',
    title: 'Set Up Your Farm',
    body: 'In Edit Mode, tap + to add a Farm, then draw your Field boundaries on the satellite map. Add Wells and Risers to match your physical setup.',
    color: '#3b82f6',
  },
  {
    icon: '📎',
    title: 'Import Pipe Schematics',
    body: 'Take a photo of your Delta Plastics pipe schematic. The AI reads hole sizes and furrow patterns automatically — no manual entry needed.',
    color: '#f97316',
  },
  {
    icon: '📍',
    title: 'Punching Mode',
    body: 'In Field Mode, tap a run and hit Punching Mode. Walk the pipe and the app shows the correct hole size for where you are — with a tone and vibration when it changes.',
    color: '#a855f7',
  },
  {
    icon: '🔄',
    title: 'Works Offline',
    body: 'Everything is stored on your device. Use the farm sync code to share with your crew — data syncs automatically when you\'re back online.',
    color: '#22c55e',
  },
]

export default function IntroScreen({ onDone }) {
  const [idx, setIdx] = useState(0)
  const slide = SLIDES[idx]
  const isLast = idx === SLIDES.length - 1

  function next() {
    if (isLast) {
      localStorage.setItem('pipemaster-intro-seen', '1')
      onDone()
    } else {
      setIdx(i => i + 1)
    }
  }

  function skip() {
    localStorage.setItem('pipemaster-intro-seen', '1')
    onDone()
  }

  return (
    <div className="fixed inset-0 z-[9000] flex flex-col" style={{ background: '#0b141f' }}>

      {/* Skip */}
      {!isLast && (
        <button onClick={skip}
                className="absolute top-5 right-5 text-gray-500 hover:text-gray-300 text-sm transition-colors">
          Skip
        </button>
      )}

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
             style={{ background: `${slide.color}18`, border: `1.5px solid ${slide.color}40` }}>
          {slide.icon}
        </div>

        <div className="flex flex-col gap-3 max-w-sm">
          <h1 className="text-white font-bold text-2xl leading-tight">{slide.title}</h1>
          <p className="text-gray-400 text-base leading-relaxed">{slide.body}</p>
        </div>
      </div>

      {/* Dots + button */}
      <div className="flex flex-col items-center gap-6 px-8 pb-12">
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
                    className="rounded-full transition-all"
                    style={{
                      width: i === idx ? 24 : 8,
                      height: 8,
                      background: i === idx ? slide.color : 'rgba(255,255,255,0.15)',
                    }} />
          ))}
        </div>

        <button onClick={next}
                className="w-full max-w-sm py-4 rounded-2xl font-semibold text-white text-lg transition-all active:scale-95"
                style={{ background: slide.color }}>
          {isLast ? "Let's Go" : 'Next'}
        </button>
      </div>
    </div>
  )
}
