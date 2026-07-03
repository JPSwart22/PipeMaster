import { useState, useEffect } from 'react'

const SLIDES = [
  {
    id: 'welcome',
    visual: 'welcome',
    title: 'Welcome to Pipemaster',
    body: 'The field irrigation manager built for the Mississippi Delta. A quick look at everything it can do.',
  },
  {
    id: 'fields',
    visual: 'fields',
    title: 'Draw Your Fields',
    body: 'In Dev Mode, tap corners on the live satellite map to outline any field shape. Drag corners to adjust. Desktop is easiest with a mouse for precise boundaries.',
  },
  {
    id: 'wells',
    visual: 'wells',
    title: 'Add Wells & Risers',
    body: 'Drop a well marker, choose electric or diesel, and enter pump details like flow rate and depth. Then add risers — one per surface point. Risers are the starting point for every pipe run.',
  },
  {
    id: 'runs',
    visual: 'runs',
    title: 'Pipe Runs Start from the Riser',
    body: 'In the panel, expand a farm → expand a well → expand a riser → tap + Add Run. Then draw the pipe route on the satellite map. The orange counter shows real-time footage as you tap along the pipe.',
  },
  {
    id: 'tees',
    visual: 'tees',
    title: "Inline T's & Both Sides",
    body: "Add an inline T anywhere along a run to branch flow in a second direction. When polypipe runs through the center of a field, mark it as punching both sides — holes are tracked independently for left and right furrows.",
  },
  {
    id: 'schematic',
    visual: 'schematic',
    title: 'Snap a Schematic — AI Does the Rest',
    body: 'Photo your Delta Plastics pipe planner sheet or upload a PDF. AI reads every hole size, distance, and furrow count — fills in the segment table automatically.',
  },
  {
    id: 'fieldmode',
    visual: 'fieldmode',
    title: 'Field Mode — For the Crew',
    body: 'Simple start/stop for your workers. Tap a run, it starts timing and tracks water. Tap again to stop. No training needed.',
  },
  {
    id: 'punching',
    visual: 'punching',
    title: 'Punching Mode',
    body: 'Follow the pipe on live GPS. The app shows which hole size is coming up before you get there — no guessing, no measuring.',
  },
  {
    id: 'flags',
    visual: 'flags',
    title: 'Drop a Flag Anywhere',
    body: 'Spot a broken pipe or wet spot? Tap 🚩 to drop a flag right at your GPS location with a note. Your whole team sees it instantly on their map.',
  },
  {
    id: 'sync',
    visual: 'sync',
    title: 'Every Phone Stays in Sync',
    body: 'Share your 6-letter farm code from Settings. Any change on one phone shows up on every phone — live. Works offline too, syncs when back online.',
  },
]

// ── Animated slide illustrations ───────────────────────────────────────────────
function Visual({ id, active }) {

  if (id === 'welcome') return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="font-black tracking-widest text-3xl"
           style={{ color: '#22c55e', textShadow: '0 0 40px rgba(34,197,94,0.8)',
                    animation: active ? 'tutPulseGlow 2s ease-in-out infinite' : 'none' }}>
        PIPEMASTER
      </div>
      <div className="flex gap-4">
        {[['🌾','Farms'],['💧','Irrigation'],['🚜','Field crew']].map(([e, label], i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-2xl"
                  style={{ animation: active ? `tutBounce 1.6s ease-in-out ${i * 0.3}s infinite` : 'none' }}>
              {e}
            </span>
            <span className="text-[10px] text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )

  if (id === 'fields') return (
    <div className="flex items-start gap-2 w-full">
      {/* Mini side panel */}
      <div className="flex flex-col gap-1 rounded-lg p-2 flex-shrink-0"
           style={{ background: '#0f1923', border: '1px solid rgba(255,255,255,0.12)', width: 88 }}>
        <div className="text-[9px] text-gray-500 uppercase tracking-wide">Farms &amp; Fields</div>
        <div className="h-px my-0.5" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="text-[10px] text-gray-300 font-semibold py-0.5">🚜 Home Farm</div>
        {[['North 40','#22c55e'],['South 20','#3b82f6'],['West Pivot','#f97316']].map(([name, color], i) => (
          <div key={name} className="flex items-center gap-1.5 pl-2 py-0.5"
               style={{ animation: active ? `tutFadeIn 0.35s ${0.6 + i * 0.5}s both` : 'none', opacity: 0 }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-[10px] text-gray-400 truncate">{name}</span>
          </div>
        ))}
        <button className="mt-1.5 text-[9px] text-green-400 text-center rounded py-0.5"
                style={{ border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.08)',
                         animation: active ? 'tutFadeIn 0.3s 2.2s both' : 'none', opacity: 0 }}>
          + Add field
        </button>
      </div>

      {/* Satellite map with fields drawing */}
      <div className="relative rounded-lg overflow-hidden flex-1"
           style={{ height: 120, background: '#192e1e', border: '1px solid rgba(34,197,94,0.25)' }}>
        <div className="absolute inset-0 opacity-20"
             style={{ background: 'repeating-linear-gradient(45deg,#2d5a3d 0,#2d5a3d 2px,transparent 2px,transparent 10px)' }} />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 150 120">
          {/* Field 1 - green */}
          <polygon points="8,10 88,8 90,58 6,60"
                   fill="rgba(34,197,94,0.22)" stroke="#22c55e" strokeWidth="1.5"
                   strokeDasharray="350" strokeDashoffset="350"
                   style={{ animation: active ? 'tutDrawPoly 1.6s 0.2s ease-out forwards' : 'none' }} />
          {/* Field 2 - blue */}
          <polygon points="95,8 142,10 140,58 93,58"
                   fill="rgba(59,130,246,0.22)" stroke="#3b82f6" strokeWidth="1.5"
                   strokeDasharray="230" strokeDashoffset="230"
                   style={{ animation: active ? 'tutDrawPoly 1.2s 1.6s ease-out forwards' : 'none' }} />
          {[[8,10],[88,8],[90,58],[6,60]].map(([x,y],i) => (
            <circle key={`c1-${i}`} cx={x} cy={y} r="3.5" fill="#22c55e"
                    style={{ animation: active ? `tutFadeIn 0.2s ${0.2 + i * 0.38}s both` : 'none', opacity: 0 }} />
          ))}
          {[[95,8],[142,10],[140,58],[93,58]].map(([x,y],i) => (
            <circle key={`c2-${i}`} cx={x} cy={y} r="3.5" fill="#3b82f6"
                    style={{ animation: active ? `tutFadeIn 0.2s ${1.6 + i * 0.28}s both` : 'none', opacity: 0 }} />
          ))}
          <circle cx="90" cy="58" r="5" fill="white" fillOpacity="0.85"
                  style={{ animation: active ? 'tutCursor 3s 0.2s ease-in-out' : 'none' }} />
        </svg>
        <div className="absolute text-[9px] text-green-300 font-medium"
             style={{ left: 28, top: 30, animation: active ? 'tutFadeIn 0.3s 1.4s both' : 'none', opacity: 0 }}>
          North 40
        </div>
        <div className="absolute text-[9px] text-blue-300 font-medium"
             style={{ left: 100, top: 30, animation: active ? 'tutFadeIn 0.3s 2.6s both' : 'none', opacity: 0 }}>
          South 20
        </div>
      </div>
    </div>
  )

  if (id === 'wells') return (
    <div className="flex items-start gap-3 w-full" style={{ maxWidth: 340 }}>
      {/* Map: well → underground → risers */}
      <div className="relative rounded-xl overflow-hidden flex-shrink-0"
           style={{ width: 162, height: 130, background: '#192e1e', border: '1px solid rgba(59,130,246,0.3)' }}>
        <div className="absolute inset-0 opacity-20"
             style={{ background: 'repeating-linear-gradient(45deg,#2d5a3d 0,#2d5a3d 2px,transparent 2px,transparent 12px)' }} />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 162 130">
          <circle cx="38" cy="62" r="20" fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0"
                  style={{ animation: active ? 'tutRippleCircle 2s 1.2s ease-out infinite' : 'none' }} />
          <circle cx="38" cy="62" r="16" fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth="2"
                  style={{ animation: active ? 'tutDropIn 0.7s 0.2s cubic-bezier(0.34,1.56,0.64,1) both' : 'none', opacity: 0 }} />
          <line x1="54" y1="62" x2="106" y2="62"
                stroke="#60a5fa" strokeWidth="2" strokeDasharray="7 4" opacity="0.7"
                strokeDashoffset="65"
                style={{ animation: active ? 'tutDrawDash 1.3s 1.6s ease-out forwards' : 'none' }} />
          <polygon points="118,51 130,62 118,73 106,62"
                   fill="rgba(34,197,94,0.2)" stroke="#22c55e" strokeWidth="2"
                   style={{ animation: active ? 'tutDropIn 0.5s 2.9s cubic-bezier(0.34,1.56,0.64,1) both' : 'none', opacity: 0 }} />
          <polygon points="150,51 162,62 150,73 138,62"
                   fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth="1.5"
                   style={{ animation: active ? 'tutDropIn 0.5s 3.5s cubic-bezier(0.34,1.56,0.64,1) both' : 'none', opacity: 0 }} />
          <line x1="130" y1="62" x2="138" y2="62"
                stroke="#60a5fa" strokeWidth="2" strokeDasharray="5 2" opacity="0.5"
                strokeDashoffset="10"
                style={{ animation: active ? 'tutDrawDash 0.4s 3.2s ease-out forwards' : 'none' }} />
        </svg>
        <div className="absolute flex items-center justify-center text-sm font-bold"
             style={{ left: 26, top: 52,
                      animation: active ? 'tutDropIn 0.7s 0.2s cubic-bezier(0.34,1.56,0.64,1) both' : 'none', opacity: 0 }}>
          ⚡
        </div>
        <div className="absolute text-[8px] text-blue-300 font-medium"
             style={{ left: 6, top: 88, animation: active ? 'tutFadeIn 0.3s 0.9s both' : 'none', opacity: 0 }}>
          Well #1
        </div>
        <div className="absolute text-[8px] text-gray-400 italic"
             style={{ left: 60, top: 50, animation: active ? 'tutFadeIn 0.3s 2.2s both' : 'none', opacity: 0 }}>
          supply
        </div>
        <div className="absolute text-[8px] text-green-300 font-medium"
             style={{ left: 104, top: 88, animation: active ? 'tutFadeIn 0.3s 3.1s both' : 'none', opacity: 0 }}>
          R1
        </div>
        <div className="absolute text-[8px] text-green-300 font-medium"
             style={{ left: 137, top: 88, animation: active ? 'tutFadeIn 0.3s 3.7s both' : 'none', opacity: 0 }}>
          R2
        </div>
      </div>

      {/* Info card */}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {/* Pump type toggle */}
        <div className="flex gap-1.5"
             style={{ animation: active ? 'tutFadeIn 0.35s 1s both' : 'none', opacity: 0 }}>
          <div className="flex-1 text-center py-1.5 rounded-lg text-xs font-semibold"
               style={{ background: 'rgba(59,130,246,0.18)', border: '1px solid #3b82f6', color: '#93c5fd' }}>
            ⚡ Electric
          </div>
          <div className="flex-1 text-center py-1.5 rounded-lg text-xs"
               style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#6b7280' }}>
            🔧 Diesel
          </div>
        </div>
        {/* Well stats */}
        {[['Flow','850 GPM'],['Depth','120 ft'],['HP','75 hp']].map(([label, val], i) => (
          <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs"
               style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        animation: active ? `tutFadeIn 0.3s ${1.5 + i * 0.3}s both` : 'none', opacity: 0 }}>
            <span className="text-gray-500">{label}</span>
            <span className="text-white font-semibold">{val}</span>
          </div>
        ))}
      </div>
    </div>
  )

  if (id === 'runs') return (
    <div className="flex items-start gap-2 w-full" style={{ maxWidth: 340 }}>
      {/* Mini panel showing hierarchy */}
      <div className="flex flex-col gap-0.5 rounded-lg p-2 flex-shrink-0"
           style={{ background: '#0f1923', border: '1px solid rgba(255,255,255,0.12)', width: 118, fontSize: 10 }}>
        <div className="flex items-center gap-1 py-0.5 text-gray-300 font-semibold">
          <span>🚜</span><span>Home Farm</span>
        </div>
        <div className="flex items-center gap-1 py-0.5 pl-2 text-blue-300"
             style={{ animation: active ? 'tutFadeIn 0.3s 0.4s both' : 'none', opacity: 0 }}>
          <span>⚡</span><span>Well #1</span>
        </div>
        <div className="flex items-center gap-1 py-0.5 pl-4 text-green-300"
             style={{ animation: active ? 'tutFadeIn 0.3s 0.9s both' : 'none', opacity: 0 }}>
          <span style={{ color: '#22c55e' }}>◆</span><span>Riser 1</span>
        </div>
        <div className="flex items-center gap-1 py-0.5 pl-6 text-gray-400"
             style={{ animation: active ? 'tutFadeIn 0.3s 1.3s both' : 'none', opacity: 0 }}>
          <span>—</span><span>Row 1</span>
        </div>
        <div className="flex items-center gap-1 py-1 pl-6 mt-0.5 rounded font-semibold"
             style={{ color: '#4ade80', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
                      animation: active ? 'tutFadeIn 0.35s 1.8s both' : 'none', opacity: 0 }}>
          <span>+</span><span>Add Run</span>
        </div>
      </div>

      {/* Map with run drawing from riser */}
      <div className="relative rounded-lg overflow-hidden flex-1"
           style={{ height: 128, background: '#192e1e', border: '1px solid rgba(249,115,22,0.3)' }}>
        <div className="absolute inset-0 opacity-20"
             style={{ background: 'repeating-linear-gradient(45deg,#2d5a3d 0,#2d5a3d 2px,transparent 2px,transparent 10px)' }} />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 128">
          <polygon points="18,64 28,54 38,64 28,74"
                   fill="rgba(34,197,94,0.25)" stroke="#22c55e" strokeWidth="2"
                   style={{ animation: active ? 'tutDropIn 0.5s 2.2s both' : 'none', opacity: 0 }} />
          <polyline points="28,64 75,64 100,40 140,40"
                    fill="none" stroke="#f97316" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray="200" strokeDashoffset="200"
                    style={{ animation: active ? 'tutDrawPoly 1.8s 2.6s ease-out forwards' : 'none' }} />
          {[[28,64],[75,64],[100,40],[140,40]].map(([x,y], i) => (
            <circle key={i} cx={x} cy={y} r="4" fill="white" fillOpacity="0.9"
                    style={{ animation: active ? `tutFadeIn 0.2s ${2.5 + i * 0.45}s both` : 'none', opacity: 0 }} />
          ))}
        </svg>
        <div className="absolute text-[9px] text-green-400 font-medium"
             style={{ left: 6, top: 80, animation: active ? 'tutFadeIn 0.3s 2.4s both' : 'none', opacity: 0 }}>
          Riser 1
        </div>
        <div className="absolute px-2 py-1 rounded-full text-xs font-mono font-bold"
             style={{ top: 6, right: 6,
                      background: 'rgba(124,45,18,0.9)', border: '1px solid rgba(249,115,22,0.5)',
                      color: '#fdba74',
                      animation: active ? 'tutFadeIn 0.4s 3s both' : 'none', opacity: 0 }}>
          ~1,240 ft
        </div>
        <div className="absolute text-[9px] text-orange-400/80"
             style={{ bottom: 6, left: 6, animation: active ? 'tutFadeIn 0.3s 3.5s both' : 'none', opacity: 0 }}>
          tap along the pipe route
        </div>
      </div>
    </div>
  )

  if (id === 'tees') return (
    <div className="relative" style={{ width: 300, height: 130 }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 130">
        {/* Faint furrow rows background */}
        {[28, 44, 86, 102].map((y, i) => (
          <line key={i} x1="0" y1={y} x2="300" y2={y}
                stroke="rgba(34,197,94,0.06)" strokeWidth="10" />
        ))}
        {/* Main polypipe */}
        <line x1="10" y1="65" x2="220" y2="65"
              stroke="#334155" strokeWidth="13" strokeLinecap="round"
              style={{ animation: active ? 'tutFadeIn 0.5s 0.2s both' : 'none', opacity: 0 }} />
        <line x1="10" y1="65" x2="220" y2="65"
              stroke="#475569" strokeWidth="10" strokeLinecap="round"
              style={{ animation: active ? 'tutFadeIn 0.5s 0.2s both' : 'none', opacity: 0 }} />
        {/* Holes — top side */}
        {[35,60,85,110,135,160,185].map((x, i) => (
          <line key={`t${i}`} x1={x} y1="60" x2={x} y2="40"
                stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"
                style={{ animation: active ? `tutFadeIn 0.2s ${0.8 + i * 0.1}s both` : 'none', opacity: 0 }} />
        ))}
        {/* Holes — bottom side */}
        {[35,60,85,110,135,160,185].map((x, i) => (
          <line key={`b${i}`} x1={x} y1="70" x2={x} y2="90"
                stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"
                style={{ animation: active ? `tutFadeIn 0.2s ${0.8 + i * 0.1}s both` : 'none', opacity: 0 }} />
        ))}
        {/* Inline T marker */}
        <circle cx="228" cy="65" r="13" fill="rgba(249,115,22,0.15)" stroke="#f97316" strokeWidth="2"
                style={{ animation: active ? 'tutDropIn 0.5s 2.2s both' : 'none', opacity: 0 }} />
        <text x="228" y="69.5" textAnchor="middle" fill="#f97316" fontSize="11" fontWeight="bold"
              style={{ animation: active ? 'tutDropIn 0.5s 2.2s both' : 'none', opacity: 0 }}>T</text>
        {/* Branch pipe (Line B) */}
        <line x1="241" y1="65" x2="292" y2="65"
              stroke="#a855f7" strokeWidth="10" strokeLinecap="round"
              style={{ animation: active ? 'tutFadeIn 0.5s 2.7s both' : 'none', opacity: 0 }} />
        {/* Branch pipe inner highlight */}
        <line x1="241" y1="65" x2="292" y2="65"
              stroke="#c084fc" strokeWidth="6" strokeLinecap="round"
              style={{ animation: active ? 'tutFadeIn 0.5s 2.7s both' : 'none', opacity: 0 }} />
      </svg>

      {/* Labels */}
      <div className="absolute text-[9px] text-green-400 font-medium whitespace-nowrap"
           style={{ top: 18, left: 44, animation: active ? 'tutFadeIn 0.3s 1.4s both' : 'none', opacity: 0 }}>
        ↑ top-side furrows
      </div>
      <div className="absolute text-[9px] text-green-400 font-medium whitespace-nowrap"
           style={{ top: 99, left: 44, animation: active ? 'tutFadeIn 0.3s 1.4s both' : 'none', opacity: 0 }}>
        ↓ bottom-side furrows
      </div>
      <div className="absolute text-[9px] text-orange-400 font-semibold whitespace-nowrap"
           style={{ top: 36, left: 214, animation: active ? 'tutFadeIn 0.3s 2.4s both' : 'none', opacity: 0 }}>
        Inline T
      </div>
      <div className="absolute text-[9px] text-purple-400 font-medium whitespace-nowrap"
           style={{ top: 99, left: 244, animation: active ? 'tutFadeIn 0.3s 2.9s both' : 'none', opacity: 0 }}>
        Line B →
      </div>
    </div>
  )

  if (id === 'schematic') return (
    <div className="flex flex-col gap-2.5 w-full" style={{ maxWidth: 300 }}>
      <div className="flex items-center gap-2 justify-center">
        <div className="flex flex-col gap-1 p-2 rounded-lg flex-shrink-0"
             style={{ background: '#f5f0e0', border: '1px solid #d4c090', width: 46 }}>
          {[85,65,90,70,55].map((w, i) => (
            <div key={i} className="h-1 rounded-sm" style={{ width: `${w}%`, background: '#888' }} />
          ))}
          <div className="text-[6px] text-gray-500 mt-0.5 text-center">planner</div>
        </div>
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <span className="text-lg" style={{ animation: active ? 'tutShake 0.4s 0.5s ease-in-out' : 'none' }}>📷</span>
          <div className="text-green-400 font-bold text-sm"
               style={{ animation: active ? 'tutSlideRight 0.7s 0.8s ease-in-out infinite alternate' : 'none' }}>→</div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ color: '#4ade80', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
                         animation: active ? 'tutPulseGlow 1.2s 1s ease-in-out infinite' : 'none' }}>
            AI
          </span>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0"
             style={{ animation: active ? 'tutFadeIn 0.5s 1.5s both' : 'none', opacity: 0 }}>
          <svg width="80" height="14" viewBox="0 0 80 14">
            <rect x="0"  y="3" width="32" height="8" rx="4" fill="#22c55e" />
            <rect x="32" y="3" width="26" height="8" rx="0" fill="#ef4444" />
            <rect x="58" y="3" width="22" height="8" rx="4" fill="#f97316" />
          </svg>
          <div className="flex gap-2 text-[8px] font-mono">
            <span style={{ color: '#22c55e' }}>5/8"</span>
            <span style={{ color: '#ef4444' }}>1/2"</span>
            <span style={{ color: '#f97316' }}>3/8"</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {[
          { size: '5/8"', range: '0 – 216 ft',  count: '68 furrows', color: '#22c55e' },
          { size: '1/2"', range: '216 – 438 ft', count: '52 furrows', color: '#ef4444' },
          { size: '3/8"', range: '438 – 640 ft', count: '44 furrows', color: '#f97316' },
        ].map(({ size, range, count, color }, i) => (
          <div key={size} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs"
               style={{ background: `${color}10`, border: `1px solid ${color}35`,
                        animation: active ? `tutFadeIn 0.35s ${2 + i * 0.55}s both` : 'none', opacity: 0 }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="font-mono font-bold w-8 flex-shrink-0" style={{ color }}>{size}</span>
            <span className="text-gray-400 flex-1">{range}</span>
            <span className="text-gray-600 flex-shrink-0">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )

  if (id === 'fieldmode') return (
    <div className="flex flex-col gap-1.5 w-56">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
           style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
        <span className="text-sm font-semibold text-white">North 40</span>
      </div>
      {[
        { name: 'Row 1 — Riser A', running: true,  time: '02:14:37' },
        { name: 'Row 2 — Riser A', running: false, time: null },
        { name: 'Row 3 — Riser B', running: false, time: null },
      ].map((run, i) => (
        <div key={run.name} className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
             style={{
               background: run.running ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
               border: `1px solid ${run.running ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`,
               animation: active ? `tutFadeIn 0.3s ${0.3 + i * 0.3}s both` : 'none', opacity: 0,
             }}>
          {run.running
            ? <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"
                   style={{ animation: 'tutPulseGlow 0.9s ease-in-out infinite' }} />
            : <div className="w-2 h-2 rounded-full bg-gray-700 flex-shrink-0" />
          }
          <span className="text-xs text-white flex-1 truncate">{run.name}</span>
          {run.running
            ? <span className="text-green-400 font-mono text-xs flex-shrink-0"
                    style={{ animation: 'tutPulseGlow 1.5s ease-in-out infinite' }}>{run.time}</span>
            : <span className="text-gray-700 text-xs flex-shrink-0">Tap to start</span>
          }
        </div>
      ))}
    </div>
  )

  if (id === 'punching') return (
    <div className="relative" style={{ width: 280, height: 120 }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 120">
        <line x1="16" y1="60" x2="264" y2="60" stroke="#1f2937" strokeWidth="10" strokeLinecap="round" />
        <line x1="16" y1="60" x2="104" y2="60" stroke="#22c55e" strokeWidth="10" strokeLinecap="round"
              strokeDasharray="90" strokeDashoffset="90"
              style={{ animation: active ? 'tutDrawSeg 0.9s 0.3s ease-out forwards' : 'none' }} />
        <line x1="104" y1="60" x2="190" y2="60" stroke="#ef4444" strokeWidth="10" strokeLinecap="round"
              strokeDasharray="88" strokeDashoffset="88"
              style={{ animation: active ? 'tutDrawSeg 0.9s 1.1s ease-out forwards' : 'none' }} />
        <line x1="190" y1="60" x2="264" y2="60" stroke="#f97316" strokeWidth="10" strokeLinecap="round"
              strokeDasharray="76" strokeDashoffset="76"
              style={{ animation: active ? 'tutDrawSeg 0.7s 1.9s ease-out forwards' : 'none' }} />
        {[40,65,90].map(x => (
          <line key={x} x1={x} y1="52" x2={x} y2="68" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        ))}
        <circle cx="16" cy="60" r="9" fill="#3b82f6" stroke="white" strokeWidth="2.5"
                style={{ animation: active ? 'tutMoveAlongPipe 5s 0.5s ease-in-out infinite' : 'none' }} />
        <circle cx="16" cy="60" r="15" fill="none" stroke="#3b82f680" strokeWidth="1"
                style={{ animation: active ? 'tutMoveAlongPipe 5s 0.5s ease-in-out infinite' : 'none' }} />
      </svg>
      <div className="absolute px-2 py-1.5 rounded-lg text-xs font-bold"
           style={{ top: 4, right: 4, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.5)',
                    color: '#4ade80', animation: active ? 'tutFadeIn 0.4s 0.5s both' : 'none', opacity: 0 }}>
        5/8" — 216 ft ahead
      </div>
      <div className="absolute flex gap-3 bottom-2 left-4"
           style={{ animation: active ? 'tutFadeIn 0.4s 1.5s both' : 'none', opacity: 0 }}>
        {[['#22c55e','5/8"'],['#ef4444','1/2"'],['#f97316','3/8"']].map(([c,s]) => (
          <div key={s} className="flex items-center gap-1">
            <div className="w-4 h-2 rounded-full" style={{ background: c }} />
            <span className="text-[10px] font-mono" style={{ color: c }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  )

  if (id === 'flags') return (
    <div className="relative rounded-xl overflow-hidden"
         style={{ width: 260, height: 130, background: '#192e1e', border: '1px solid rgba(234,179,8,0.25)' }}>
      <div className="absolute inset-0 opacity-20"
           style={{ background: 'repeating-linear-gradient(45deg,#2d5a3d 0,#2d5a3d 2px,transparent 2px,transparent 14px)' }} />
      {[[40,30,'Wet spot'],[190,80,'Check valve']].map(([x,y,label], i) => (
        <div key={i} className="absolute"
             style={{ left: x, top: y, animation: active ? `tutFadeIn 0.4s ${0.2 + i * 0.3}s both` : 'none', opacity: 0 }}>
          <span className="text-lg" style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))' }}>🚩</span>
          <div className="absolute text-[8px] text-yellow-300 whitespace-nowrap px-1 rounded"
               style={{ top: -14, left: 18, background: 'rgba(0,0,0,0.7)' }}>{label}</div>
        </div>
      ))}
      <div className="absolute"
           style={{ left: 118, top: 44,
                    animation: active ? 'tutDropFlag 0.8s 1.2s cubic-bezier(0.34,1.56,0.64,1) both' : 'none', opacity: 0 }}>
        <span className="text-2xl" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))' }}>🚩</span>
      </div>
      <div className="absolute rounded-full"
           style={{ left: 128, top: 68, width: 16, height: 16,
                    border: '2px solid rgba(234,179,8,0.7)', transform: 'translate(-50%,-50%)',
                    animation: active ? 'tutRipple 1.2s 2s ease-out both' : 'none', opacity: 0 }} />
      <div className="absolute rounded-lg px-2 py-1.5 text-xs"
           style={{ left: 136, top: 30, background: '#0f1923',
                    border: '1px solid rgba(234,179,8,0.5)',
                    animation: active ? 'tutFadeIn 0.4s 2.3s both' : 'none', opacity: 0 }}>
        <div className="text-white font-semibold">Broken pipe</div>
        <div className="text-gray-500 text-[9px]">Tap to see details</div>
      </div>
      <div className="absolute text-[10px] text-blue-400"
           style={{ left: 106, top: 96, animation: active ? 'tutFadeIn 0.3s 1s both' : 'none', opacity: 0 }}>
        📍 At your location
      </div>
    </div>
  )

  if (id === 'sync') return (
    <div className="flex items-center gap-5">
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-24 rounded-2xl flex flex-col items-center justify-center gap-1"
             style={{ background: '#0f1923', border: '2px solid #22c55e',
                      boxShadow: active ? '0 0 20px rgba(34,197,94,0.4)' : 'none',
                      animation: active ? 'tutPulseGlow 2s ease-in-out infinite' : 'none' }}>
          <span className="text-xl">📱</span>
          <span className="text-[8px] text-green-400 font-bold">OWNER</span>
        </div>
        <div className="text-[9px] text-gray-500">Dev Mode</div>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <div className="text-green-400 text-base font-bold"
             style={{ animation: active ? 'tutArrowRight 1.2s 0.3s ease-in-out infinite' : 'none' }}>→</div>
        <div className="px-3 py-1 rounded-lg text-xs font-mono font-bold text-center"
             style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0' }}>
          V7A76S
        </div>
        <div className="text-gray-600 text-[9px] text-center">farm code</div>
        <div className="text-blue-400 text-base font-bold"
             style={{ animation: active ? 'tutArrowLeft 1.2s 0.6s ease-in-out infinite' : 'none' }}>←</div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-24 rounded-2xl flex flex-col items-center justify-center gap-1"
             style={{ background: '#0f1923', border: '2px solid #3b82f6',
                      boxShadow: active ? '0 0 20px rgba(59,130,246,0.35)' : 'none',
                      animation: active ? 'tutPulseGlow 2s 0.5s ease-in-out infinite' : 'none' }}>
          <span className="text-xl">📱</span>
          <span className="text-[8px] text-blue-400 font-bold">CREW</span>
        </div>
        <div className="text-[9px] text-gray-500">Field Mode</div>
      </div>
    </div>
  )

  return null
}

// ── Keyframes ──────────────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes tutPulseGlow {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.55; }
}
@keyframes tutBounce {
  0%,100% { transform: translateY(0); }
  50%      { transform: translateY(-10px); }
}
@keyframes tutFadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes tutDropIn {
  from { opacity: 0; transform: translateY(-30px) scale(0.8); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes tutDropFlag {
  from { opacity: 0; transform: translateY(-50px) rotate(-15deg); }
  to   { opacity: 1; transform: translateY(0) rotate(0deg); }
}
@keyframes tutDrawPoly {
  to { stroke-dashoffset: 0; }
}
@keyframes tutDrawDash {
  to { stroke-dashoffset: 0; }
}
@keyframes tutDrawSeg {
  to { stroke-dashoffset: 0; }
}
@keyframes tutShake {
  0%,100% { transform: rotate(0deg); }
  25%      { transform: rotate(-8deg); }
  75%      { transform: rotate(8deg); }
}
@keyframes tutSlideRight {
  from { transform: translateX(-5px); opacity: 0.3; }
  to   { transform: translateX(5px);  opacity: 1; }
}
@keyframes tutArrowRight {
  0%,100% { transform: translateX(0); opacity: 0.4; }
  50%      { transform: translateX(6px); opacity: 1; }
}
@keyframes tutArrowLeft {
  0%,100% { transform: translateX(0); opacity: 0.4; }
  50%      { transform: translateX(-6px); opacity: 1; }
}
@keyframes tutMoveAlongPipe {
  0%   { transform: translateX(0); }
  100% { transform: translateX(248px); }
}
@keyframes tutCursor {
  0%   { cx: 8; cy: 10; opacity: 1; }
  20%  { cx: 88; cy: 8;  opacity: 1; }
  40%  { cx: 90; cy: 58; opacity: 1; }
  60%  { cx: 6;  cy: 60; opacity: 1; }
  80%  { cx: 8;  cy: 10; opacity: 1; }
  100% { cx: 8;  cy: 10; opacity: 0; }
}
@keyframes tutRippleCircle {
  0%   { r: 20; opacity: 0.6; }
  100% { r: 40; opacity: 0; }
}
@keyframes tutRipple {
  from { transform: translate(-50%,-50%) scale(0.3); opacity: 0.9; }
  to   { transform: translate(-50%,-50%) scale(4);   opacity: 0; }
}
`

export default function TutorialMode({ onDone }) {
  const [idx, setIdx]         = useState(0)
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = KEYFRAMES
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])

  function advance() {
    if (idx >= SLIDES.length - 1) { onDone(); return }
    setIdx(i => i + 1)
    setAnimKey(k => k + 1)
  }

  const slide  = SLIDES[idx]
  const isLast = idx === SLIDES.length - 1

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center"
         style={{ zIndex: 3000, background: 'rgba(6,12,20,0.97)', backdropFilter: 'blur(8px)' }}
         onClick={advance}>

      {/* Progress dots + skip */}
      <div className="absolute top-5 left-0 right-0 flex items-center justify-between px-5">
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-300"
                 style={{
                   width:      i === idx ? 22 : 7,
                   height:     7,
                   background: i < idx ? '#22c55e' : i === idx ? '#f97316' : 'rgba(255,255,255,0.13)',
                 }} />
          ))}
        </div>
        <button onClick={e => { e.stopPropagation(); onDone() }}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
          Skip
        </button>
      </div>

      {/* Slide */}
      <div key={idx} className="flex flex-col items-center gap-5 px-5 text-center"
           style={{ maxWidth: 380, width: '100%', animation: 'tutFadeIn 0.4s ease-out' }}>

        {/* Visual */}
        <div className="flex items-center justify-center" style={{ minHeight: 130 }}>
          <Visual id={slide.visual} active key={animKey} />
        </div>

        {/* Text */}
        <div className="flex flex-col gap-2">
          <h2 className="text-white font-bold text-xl leading-tight">{slide.title}</h2>
          <p className="text-gray-400 text-sm leading-relaxed">{slide.body}</p>
        </div>

        {isLast && (
          <button onClick={e => { e.stopPropagation(); onDone() }}
                  className="px-10 py-3 rounded-xl font-bold text-white text-base"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                           boxShadow: '0 4px 20px rgba(34,197,94,0.4)' }}>
            Get Started →
          </button>
        )}
      </div>

      {!isLast && (
        <div className="absolute bottom-5 text-[11px] text-gray-600">tap anywhere to continue</div>
      )}
    </div>
  )
}
