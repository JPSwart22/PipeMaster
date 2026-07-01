import { useState, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { MapContainer, TileLayer, CircleMarker, Circle, Polyline, useMap } from 'react-leaflet'
import db from '../lib/db'
import { nearestFtOnPath, segmentAtFt, pathTotalFt, HOLE_COLOR } from '../lib/pipeUtils'

// Centers on the first GPS fix, then smoothly pans (without fighting any zoom
// the user has set) on every update after — feels like turn-by-turn nav apps
function FollowPosition({ position }) {
  const map = useMap()
  const initialized = useRef(false)
  useEffect(() => {
    if (!position) return
    if (!initialized.current) {
      map.setView(position, 18)
      initialized.current = true
    } else {
      map.panTo(position, { animate: true, duration: 0.5 })
    }
  }, [position]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function furrowPatternLabel(pattern) {
  if (pattern === 'alternate') return 'Every other furrow'
  if (pattern === 'every') return 'Every furrow'
  return 'Furrow pattern not set'
}

const PUNCH_PATTERNS = [
  { value: 'every',     label: 'Every furrow',      color: '#22c55e' },
  { value: 'alternate', label: 'Every other furrow', color: '#f97316' },
]

export default function PunchingMode({ run, onExit }) {
  const allSegments = useLiveQuery(
    () => db.segments.where('runId').equals(run.id).toArray(),
    [run.id]
  )
  const lineNames = [...new Set((allSegments ?? []).map(s => s.line || 'Line 1'))]

  // Restore from localStorage if the phone reloaded mid-session
  const [selectedPattern, setSelectedPattern] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('pipemaster-punching') || 'null')
      return s?.runId === run.id ? (s.pattern ?? run.furrowPattern ?? null) : (run.furrowPattern ?? null)
    } catch { return run.furrowPattern ?? null }
  })
  const [selectedLine, setSelectedLine] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('pipemaster-punching') || 'null')
      return s?.runId === run.id ? (s.line ?? null) : null
    } catch { return null }
  })
  const [gearConfirmed, setGearConfirmed] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('pipemaster-punching') || 'null')
      return s?.runId === run.id ? (s.gearConfirmed ?? false) : false
    } catch { return false }
  })
  const [position, setPosition] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [currentSeg, setCurrentSeg] = useState(null)
  const [currentFt, setCurrentFt] = useState(null)
  const [gpsError, setGpsError] = useState(null)
  const lastHoleSizeRef = useRef(null)
  const audioCtxRef = useRef(null)

  function playChime() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      // Two-tone alert: high beep then lower beep
      [[880, 0, 0.15], [660, 0.2, 0.15]].forEach(([freq, start, dur]) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.5, ctx.currentTime + start)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
        osc.start(ctx.currentTime + start)
        osc.stop(ctx.currentTime + start + dur + 0.05)
      })
    } catch { /* AudioContext not available */ }
  }

  // Auto-select line when there's only one option — skip the picker entirely
  useEffect(() => {
    if (selectedLine || lineNames.length !== 1) return
    setSelectedLine(lineNames[0])
  }, [lineNames, selectedLine])

  // Persist punching state so a page reload restores straight back here
  useEffect(() => {
    if (!selectedPattern && !selectedLine && !gearConfirmed) return
    try {
      localStorage.setItem('pipemaster-punching', JSON.stringify({
        runId: run.id,
        pattern: selectedPattern,
        line: selectedLine,
        gearConfirmed,
      }))
    } catch { /* storage quota exceeded — degrade silently */ }
  }, [run.id, selectedPattern, selectedLine])

  function handleExit() {
    try { localStorage.removeItem('pipemaster-punching') } catch { }
    onExit()
  }

  // Keep the screen awake from the moment the user enters punching mode — not
  // just after they've picked a line — so the phone can't lock during the
  // pattern/line picker steps either
  useEffect(() => {
    let lock = null
    async function requestLock() {
      try { lock = await navigator.wakeLock?.request('screen') } catch { /* unsupported or denied — degrade silently */ }
    }
    requestLock()
    function handleVisibility() {
      if (document.visibilityState === 'visible' && !lock) requestLock()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      lock?.release?.()
    }
  }, [])

  // Live GPS → nearest point on the path → which segment that falls in
  useEffect(() => {
    if (!selectedLine || !run.path?.length) return
    if (!navigator.geolocation) { setGpsError('GPS not available on this device'); return }
    const lineSegs = (allSegments ?? []).filter(s => (s.line || 'Line 1') === selectedLine)

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords
        const latlng = [latitude, longitude]
        setPosition(latlng)
        setAccuracy(acc)
        const ft = nearestFtOnPath(run.path, latlng)
        const seg = segmentAtFt(lineSegs, ft)
        setCurrentFt(ft)
        setCurrentSeg(seg)
        if (seg && seg.holeSize !== lastHoleSizeRef.current) {
          if (lastHoleSizeRef.current !== null) {
            navigator.vibrate?.([200, 100, 200, 100, 200])
            playChime()
          }
          lastHoleSizeRef.current = seg.holeSize
        }
      },
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, maximumAge: 1000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [selectedLine, run.path, allSegments])

  const totalFt = Math.round(pathTotalFt(run.path ?? []))
  const color = currentSeg ? (HOLE_COLOR[currentSeg.holeSize] ?? '#64748b') : '#1a2535'
  const accuracyFt = accuracy != null ? Math.round(accuracy / 0.3048) : null

  // ── Step 1: pick line (skipped when only one) ────────────────────────────────
  if (!selectedLine) {
    return (
      <div className="fixed inset-0 z-[3000] flex flex-col" style={{ background: '#0f1923' }}>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-white font-semibold text-lg truncate">{run.name}</span>
          <button onClick={handleExit} className="text-gray-400 hover:text-white text-2xl leading-none flex-shrink-0">✕</button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
          <div className="text-gray-400 text-sm mb-2">Which line are you punching?</div>
          {lineNames.map(name => (
            <button key={name} onClick={() => setSelectedLine(name)}
                    className="w-full max-w-xs py-4 rounded-xl text-white text-lg font-medium border border-white/20 active:border-green-500/60 transition-all">
              {name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Step 2: pick furrow pattern (skipped if run already has one tagged) ──────
  if (!selectedPattern) {
    return (
      <div className="fixed inset-0 z-[3000] flex flex-col" style={{ background: '#0f1923' }}>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-white font-semibold text-lg truncate">{run.name}</span>
          <button onClick={handleExit} className="text-gray-400 hover:text-white text-2xl leading-none flex-shrink-0">✕</button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="text-gray-400 text-sm mb-1">Which pattern are you punching today?</div>
          {PUNCH_PATTERNS.map(opt => (
            <button key={opt.value} onClick={() => setSelectedPattern(opt.value)}
                    className="w-full max-w-xs py-5 rounded-2xl font-semibold text-xl border-2 transition-all"
                    style={{ borderColor: opt.color, color: opt.color, background: `${opt.color}12` }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Step 3: gear list — required punchers for this line ──────────────────────
  if (!gearConfirmed) {
    const lineSegs = (allSegments ?? []).filter(s => (s.line || 'Line 1') === selectedLine)
    const sizes = []
    lineSegs.forEach(s => { if (s.holeSize && s.holeSize !== 'Supply' && !sizes.includes(s.holeSize)) sizes.push(s.holeSize) })
    return (
      <div className="fixed inset-0 z-[3000] flex flex-col" style={{ background: '#0f1923' }}>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-white font-semibold text-lg truncate">{run.name}</span>
          <button onClick={handleExit} className="text-gray-400 hover:text-white text-2xl leading-none flex-shrink-0">✕</button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6">
          <div className="text-center">
            <div className="text-white font-bold text-xl mb-1">Grab your punchers</div>
            <div className="text-gray-500 text-sm">{selectedLine} · {furrowPatternLabel(selectedPattern)}</div>
          </div>
          <div className="w-full max-w-xs flex flex-col gap-2">
            {sizes.length === 0 ? (
              <div className="text-gray-500 text-sm text-center">No hole sizes defined for this line.</div>
            ) : sizes.map(size => (
              <div key={size} className="flex items-center gap-3 rounded-xl px-4 py-3"
                   style={{ background: `${HOLE_COLOR[size] ?? '#64748b'}18`, border: `1px solid ${HOLE_COLOR[size] ?? '#64748b'}44` }}>
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: HOLE_COLOR[size] ?? '#64748b' }} />
                <span className="text-white font-semibold text-lg">{size}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setGearConfirmed(true)}
                  className="w-full max-w-xs py-4 rounded-2xl font-bold text-white text-base active:scale-95 transition-all mt-2"
                  style={{ background: 'linear-gradient(135deg, #f97316, #dc2626)' }}>
            Start punching →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col" style={{ background: '#0f1923' }}>

      {/* Top 2/3 — live map */}
      <div style={{ flex: 2, position: 'relative', minHeight: 0 }}>
        <MapContainer center={position ?? run.path[0]} zoom={18} zoomControl={false}
                      style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={19} maxZoom={22} />
          <Polyline positions={run.path} pathOptions={{ color: '#94a3b8', weight: 4, opacity: 0.75 }} />
          {position && (
            <>
              <Circle center={position} radius={accuracy ?? 0}
                      pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.12, weight: 1 }} />
              <CircleMarker center={position} radius={9}
                            pathOptions={{ fillColor: '#3b82f6', fillOpacity: 1, color: 'white', weight: 2 }} />
              <FollowPosition position={position} />
            </>
          )}
        </MapContainer>

        <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between pointer-events-none">
          <button onClick={handleExit}
                  className="pointer-events-auto text-white flex items-center justify-center text-xl leading-none rounded-full"
                  style={{ width: 40, height: 40, background: 'rgba(0,0,0,0.5)' }}>
            ✕
          </button>
          {accuracyFt != null && (
            <span className="pointer-events-auto text-white text-xs rounded-full px-3 py-2"
                  style={{ background: 'rgba(0,0,0,0.5)' }}>
              📍 GPS ±{accuracyFt} ft
            </span>
          )}
        </div>
      </div>

      {/* Bottom 1/3 — hole size + furrow pattern */}
      <div className="flex flex-col items-center justify-center gap-1.5 px-6 transition-colors duration-500"
           style={{ flex: 1, background: color, minHeight: 0 }}>
        {gpsError ? (
          <div className="text-white text-base text-center">⚠ {gpsError}</div>
        ) : currentSeg ? (
          <>
            <div className="text-white/80 text-xs uppercase tracking-wider truncate max-w-full">
              {run.name} — {selectedLine}
            </div>
            <div className="text-white font-bold" style={{ fontSize: '3.25rem', lineHeight: 1 }}>
              {currentSeg.holeSize}
            </div>
            {/* Show the session pattern prominently — overrides per-segment label */}
            <div className="text-white font-semibold text-lg text-center">
              {selectedPattern === 'every' ? 'Every furrow' : 'Every other furrow'}
            </div>
            {currentFt != null && totalFt > 0 && (
              <div className="text-white/70 text-xs tabular-nums mt-1">
                {Math.round(currentFt).toLocaleString()} / {totalFt.toLocaleString()} ft
                {' · '}{Math.max(0, totalFt - Math.round(currentFt)).toLocaleString()} ft to go
              </div>
            )}
          </>
        ) : (
          <div className="text-white text-base">📡 Finding your position…</div>
        )}
      </div>
    </div>
  )
}
