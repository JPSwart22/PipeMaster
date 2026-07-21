import { useState, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { MapContainer, TileLayer, CircleMarker, Circle, useMap } from 'react-leaflet'
import { ForegroundService, ServiceType } from '@capawesome-team/capacitor-android-foreground-service'
import { TextToSpeech } from '@capacitor-community/text-to-speech'
import db from '../lib/db'
import { nearestFtOnPath, segmentAtFt, pathTotalFt, HOLE_COLOR } from '../lib/pipeUtils'
import { useBackClose } from '../lib/backButtonStack'
import PipeRunLine from './PipeRunLine'

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

const HOLE_FRACTIONS = {
  '1/4"':  'one quarter',
  '5/16"': 'five sixteenths',
  '3/8"':  'three eighths',
  '7/16"': 'seven sixteenths',
  '1/2"':  'one half',
  '9/16"': 'nine sixteenths',
  '5/8"':  'five eighths',
  '11/16"':'eleven sixteenths',
  '3/4"':  'three quarters',
  '13/16"':'thirteen sixteenths',
  '7/8"':  'seven eighths',
  '15/16"':'fifteen sixteenths',
  '1"':    'one inch',
}

function buildVoiceText(holeSize, pattern) {
  if (holeSize === 'Supply') return 'Supply line. No holes.'
  const fraction = HOLE_FRACTIONS[holeSize] ?? holeSize
  const patternText = pattern === 'every'     ? 'every furrow'
                    : pattern === 'alternate' ? 'alternating'
                    : ''
  return patternText ? `Switch to ${fraction}. ${patternText}.` : `Switch to ${fraction}.`
}

export default function PunchingMode({ run, onExit }) {
  const allSegments = useLiveQuery(
    () => db.segments.where('runId').equals(run.id).toArray(),
    [run.id]
  )
  const lineNames = [...new Set((allSegments ?? []).map(s => s.line || 'Line 1'))]

  // Named schematics available for the selected line — each schematic is a complete,
  // independent way of punching that same physical line (its own hole sizes + furrow
  // pattern), set up ahead of time in Edit Mode.
  const schematicNames = selectedLineForSchematics => [...new Set(
    (allSegments ?? [])
      .filter(s => (s.line || 'Line 1') === selectedLineForSchematics)
      .map(s => s.schematic || 'A')
  )]

  const [selectedLine, setSelectedLine] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('pipemaster-punching') || 'null')
      return s?.runId === run.id ? (s.line ?? null) : null
    } catch { return null }
  })
  // Restore from localStorage if the phone reloaded mid-session
  const [selectedSchematic, setSelectedSchematic] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('pipemaster-punching') || 'null')
      return s?.runId === run.id ? (s.schematic ?? null) : null
    } catch { return null }
  })
  const [gearConfirmed, setGearConfirmed] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('pipemaster-punching') || 'null')
      return s?.runId === run.id ? (s.gearConfirmed ?? false) : false
    } catch { return false }
  })

  const availableSchematics = selectedLine ? schematicNames(selectedLine) : []
  // Auto-select if the line only has one schematic and nothing is selected yet
  useEffect(() => {
    if (selectedSchematic || !selectedLine) return
    if (availableSchematics.length === 1) setSelectedSchematic(availableSchematics[0])
  }, [allSegments, selectedLine]) // eslint-disable-line

  // Computed once here (not just inside the GPS effect) so it can also be handed to the native
  // foreground service, which does its own segment matching while the screen is locked.
  const lineSegs = (selectedLine && selectedSchematic)
    ? (allSegments ?? []).filter(s => (s.line || 'Line 1') === selectedLine && (s.schematic || 'A') === selectedSchematic)
    : []
  // Furrow pattern now lives on the schematic (all its non-Supply segments share one value,
  // set together in Edit Mode) rather than being asked separately here.
  const selectedPattern = lineSegs.find(s => s.holeSize !== 'Supply')?.furrowPattern ?? null
  const [position, setPosition] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [currentSeg, setCurrentSeg] = useState(null)
  const [currentFt, setCurrentFt] = useState(null)
  const [gpsError, setGpsError] = useState(null)
  const [showBatteryPrompt, setShowBatteryPrompt] = useState(false)
  // serviceReadyRef alone won't cause the tracking-data-refresh effect below to re-check once
  // it flips true — refs don't trigger re-renders. This tick makes that transition observable.
  const [serviceReadyTick, setServiceReadyTick] = useState(0)
  // Screen-locked tracking depends on OS settings (background location, battery unrestricted)
  // that a one-time dismissible prompt is too easy to skip and never revisit — checked fresh
  // every time punching mode opens instead.
  const [readiness, setReadiness] = useState(null)
  const [checkingReadiness, setCheckingReadiness] = useState(true)
  const lastHoleSizeRef = useRef(null)
  const lastDistanceBucketRef = useRef(null)
  const hasGpsFixRef = useRef(false)
  const audioCtxRef = useRef(null)
  // GPS watch can start (and get a fix) before the foreground service has finished starting —
  // updateForegroundService() internally calls Context.startForegroundService() too, which arms
  // Android's "must call startForeground() in time" timer. If that fires before the real start
  // has created the notification channel and called startForeground(), the app crashes with
  // ForegroundServiceDidNotStartInTimeException. Gate all updates on the real start completing.
  const serviceReadyRef = useRef(false)
  // If a hole-size update arrives before the service finishes starting, remember it here and
  // flush it once ready — otherwise that segment's notification would be silently lost forever,
  // since lastHoleSizeRef already records it as "shown" the moment GPS resolves it.
  const pendingUpdateRef = useRef(null)

  async function refreshReadiness() {
    try {
      const result = await ForegroundService.checkTrackingReadiness()
      setReadiness(result)
    } catch {
      // Not Android, or the call failed — don't block non-Android platforms on Android-only checks
      setReadiness({ fineLocation: true, backgroundLocation: true, notifications: true, batteryUnrestricted: true })
    }
    setCheckingReadiness(false)
  }

  useEffect(() => {
    refreshReadiness()
    // Re-check whenever the app regains focus — covers the case where the user backs out
    // to Settings mid-checklist, fixes something, and returns.
    function handleVisibility() {
      if (document.visibilityState === 'visible') refreshReadiness()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  async function requestLocationPermission() {
    try {
      await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(resolve, resolve, { timeout: 8000 })
      })
    } catch { /* ignore */ }
    refreshReadiness()
  }

  async function requestNotificationPermission() {
    try { await ForegroundService.requestPermissions() } catch { /* ignore */ }
    refreshReadiness()
  }

  async function requestBatteryUnrestricted() {
    try { await ForegroundService.requestIgnoreBatteryOptimization() } catch { /* ignore */ }
    refreshReadiness()
  }

  async function openAppSettings() {
    try { await ForegroundService.openAppSettings() } catch { /* ignore */ }
  }

  async function speakHoleSize(holeSize, pattern) {
    const text = buildVoiceText(holeSize, pattern)
    try {
      try { await TextToSpeech.stop() } catch { /* nothing playing yet */ }
      await TextToSpeech.speak({
        text,
        lang: 'en-US',
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0,
      })
    } catch {
      try {
        window.speechSynthesis?.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.95
        utterance.volume = 1.0
        window.speechSynthesis.speak(utterance)
      } catch { /* speech not available */ }
    }
  }

  async function startForegroundService(runName) {
    serviceReadyRef.current = false
    try {
      // AndroidManifest hardcodes foregroundServiceType="location" on this service, so Android
      // requires ACCESS_FINE_LOCATION/COARSE_LOCATION to already be granted before ANY start —
      // otherwise it throws a fatal SecurityException inside the native service lifecycle that
      // no JS try/catch can reach, crashing the whole app. Force the permission prompt to
      // resolve first so we never call startForegroundService() while it's still unresolved.
      const hasLocationPermission = await new Promise((resolve) => {
        if (!navigator.geolocation) { resolve(false); return }
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
          { maximumAge: 60000, timeout: 8000 }
        )
      })
      if (!hasLocationPermission) return

      await ForegroundService.requestPermissions()
      // Delete before recreate — Android ignores createNotificationChannel for existing channels,
      // so VISIBILITY_PUBLIC would never apply unless we force a fresh creation each time.
      await ForegroundService.deleteNotificationChannel({ id: 'pipemaster_punching' }).catch(() => {})
      await ForegroundService.createNotificationChannel({
        id: 'pipemaster_punching',
        name: 'Punching Mode',
        description: 'Shows your current hole size while punching',
        importance: 4,
      })
      await ForegroundService.startForegroundService({
        title: 'Punching Mode Active',
        body: runName,
        id: 1001,
        smallIcon: 'ic_stat_notify',
        notificationChannelId: 'pipemaster_punching',
        serviceType: ServiceType.Location,
        silent: true,
        // Lets the native service track GPS and match segments entirely on its own —
        // Chromium suppresses navigator.geolocation.watchPosition() once the screen is
        // locked (document.visibilityState 'hidden'), so JS can't be relied on for this.
        path: JSON.stringify(run.path ?? []),
        segments: JSON.stringify(lineSegs.map(s => ({ startFt: s.startFt, endFt: s.endFt, holeSize: s.holeSize }))),
      })
      serviceReadyRef.current = true
      setServiceReadyTick(t => t + 1)
      if (pendingUpdateRef.current) {
        const pending = pendingUpdateRef.current
        pendingUpdateRef.current = null
        updateForegroundNotification(pending.holeSize, pending.distanceFt)
      }
    } catch { /* not Android or permission denied */ }
  }

  async function updateForegroundNotification(holeSize, distanceFt) {
    if (!serviceReadyRef.current) {
      pendingUpdateRef.current = { holeSize, distanceFt }
      return
    }
    const distanceText = distanceFt != null ? `${Math.round(distanceFt).toLocaleString()} ft to next size` : ''
    try {
      await ForegroundService.updateForegroundService({
        title: holeSize === 'Supply' ? 'Supply Line — no holes' : `${holeSize} holes`,
        body: distanceText,
        id: 1001,
        smallIcon: 'ic_stat_notify',
        notificationChannelId: 'pipemaster_punching',
        silent: true,
      })
    } catch { /* service not running */ }
  }

  async function stopForegroundService() {
    serviceReadyRef.current = false
    pendingUpdateRef.current = null
    lastDistanceBucketRef.current = null
    try {
      await ForegroundService.stopForegroundService()
    } catch { /* not Android */ }
  }

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
    if (!selectedSchematic && !selectedLine && !gearConfirmed) return
    try {
      localStorage.setItem('pipemaster-punching', JSON.stringify({
        runId: run.id,
        schematic: selectedSchematic,
        line: selectedLine,
        gearConfirmed,
        savedAt: Date.now(),
      }))
    } catch { /* storage quota exceeded — degrade silently */ }
  }, [run.id, selectedSchematic, selectedLine, gearConfirmed])

  // Start (or restore) foreground service the moment gearConfirmed goes true.
  // Also re-starts it if the process was killed while locked and restores from localStorage.
  // Cleanup on unmount dismisses the notification when the user exits.
  useEffect(() => {
    if (!gearConfirmed) return
    startForegroundService(run.name)
    // One-time check: if Samsung battery optimizer hasn't been asked to exempt us, prompt the user
    if (!localStorage.getItem('pipemaster-battery-checked')) {
      ForegroundService.isIgnoringBatteryOptimizations()
        .then(({ isIgnoring }) => {
          localStorage.setItem('pipemaster-battery-checked', '1')
          if (!isIgnoring) setShowBatteryPrompt(true)
        })
        .catch(() => {})
    }
    return () => stopForegroundService()
  }, [gearConfirmed, run.name]) // eslint-disable-line

  useBackClose(() => handleExit())

  function handleExit() {
    try { localStorage.removeItem('pipemaster-punching') } catch { }
    stopForegroundService()
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

  // Keeps the live map in sync with the native service's own GPS tracking (which runs
  // regardless of screen state) — without this, reopening the app after a locked stretch
  // would show a stale position until a fresh JS-side GPS fix happened to arrive.
  useEffect(() => {
    const listener = ForegroundService.addListener('positionUpdate', ({ lat, lon, ft, holeSize, segStartFt, segEndFt }) => {
      setPosition([lat, lon])
      setCurrentFt(ft)
      setCurrentSeg(prev => (
        prev && prev.startFt === segStartFt && prev.endFt === segEndFt && prev.holeSize === holeSize
          ? prev
          : (lineSegs.find(s => s.startFt === segStartFt && s.endFt === segEndFt) ?? prev)
      ))
    })
    return () => { listener.remove() }
  }, [lineSegs]) // eslint-disable-line

  // The native service only gets path/segments once, at the moment it starts — if the DB
  // query backing lineSegs hadn't resolved yet at that exact instant (a real timing race,
  // since useLiveQuery is async), native would be stuck permanently tracking against an
  // empty segment list and silently never fire. Resend whenever the real data shows up.
  useEffect(() => {
    if (!gearConfirmed || !serviceReadyRef.current || !lineSegs.length || !run.path?.length) return
    ForegroundService.updateTrackingData({
      path: JSON.stringify(run.path),
      segments: JSON.stringify(lineSegs.map(s => ({ startFt: s.startFt, endFt: s.endFt, holeSize: s.holeSize }))),
    }).catch(() => {})
  }, [gearConfirmed, lineSegs, run.path, serviceReadyTick]) // eslint-disable-line

  // Live GPS → nearest point on the path → which segment that falls in
  useEffect(() => {
    if (!selectedLine || !run.path?.length) return
    if (!navigator.geolocation) { setGpsError('GPS not available on this device'); return }

    hasGpsFixRef.current = false
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords
        // Reject coarse fixes (cell/Wi-Fi triangulation) once we already have a real position —
        // without this the marker jumps hundreds of yards away and snaps back a moment later.
        // Always accept the very first fix so the user isn't left with nothing on screen.
        if (hasGpsFixRef.current && acc > 50) return
        hasGpsFixRef.current = true
        const latlng = [latitude, longitude]
        setPosition(latlng)
        setAccuracy(acc)
        const ft = nearestFtOnPath(run.path, latlng)
        const seg = segmentAtFt(lineSegs, ft)
        setCurrentFt(ft)
        setCurrentSeg(seg)
        if (seg) {
          const holeSizeChanged = seg.holeSize !== lastHoleSizeRef.current
          if (holeSizeChanged) {
            if (lastHoleSizeRef.current !== null) {
              // Only use JS audio/vibration when the screen is on — the native foreground
              // service handles TTS and vibration when the screen is locked.
              if (document.visibilityState === 'visible') {
                navigator.vibrate?.([200, 100, 200, 100, 200])
                playChime()
                speakHoleSize(seg.holeSize, selectedPattern).catch(() => {})
              }
            }
            lastHoleSizeRef.current = seg.holeSize
          }
          // Round to the nearest 25ft so the lock-screen distance updates as you walk without
          // reposting the notification on every single GPS fix.
          const distanceFt = Math.max(0, seg.endFt - ft)
          const distanceBucket = Math.round(distanceFt / 25) * 25
          if (holeSizeChanged || distanceBucket !== lastDistanceBucketRef.current) {
            lastDistanceBucketRef.current = distanceBucket
            // Update lock-screen notification; native service speaks + vibrates if screen is off
            updateForegroundNotification(seg.holeSize, distanceFt)
          }
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

  // ── Step 0: permissions/settings checklist — screen-locked tracking silently fails
  // without these, and they're easy to dismiss/forget, so check fresh every time instead
  // of relying on a one-time prompt. Skipped entirely once everything checks out.
  const readinessOk = readiness && readiness.fineLocation && readiness.backgroundLocation
    && readiness.notifications && readiness.batteryUnrestricted
  const [skipReadiness, setSkipReadiness] = useState(false)

  if (checkingReadiness) {
    return (
      <div className="fixed inset-0 z-[3000] flex items-center justify-center" style={{ background: '#0f1923' }}>
        <span className="text-gray-500 text-sm">Checking settings…</span>
      </div>
    )
  }

  if (readiness && !readinessOk && !skipReadiness) {
    const items = [
      {
        key: 'fineLocation',
        ok: readiness.fineLocation,
        label: 'Location access',
        desc: 'Needed to find you on the map at all.',
        action: requestLocationPermission,
        actionLabel: 'Grant',
      },
      {
        key: 'backgroundLocation',
        ok: readiness.backgroundLocation,
        label: 'Location: "Allow all the time"',
        desc: 'Without this, GPS stops the moment your screen locks. Tap below, then Permissions → Location → Allow all the time.',
        action: openAppSettings,
        actionLabel: 'Open Settings',
      },
      {
        key: 'notifications',
        ok: readiness.notifications,
        label: 'Notifications',
        desc: 'Shows your current hole size on the lock screen.',
        action: requestNotificationPermission,
        actionLabel: 'Grant',
      },
      {
        key: 'batteryUnrestricted',
        ok: readiness.batteryUnrestricted,
        label: 'Battery: Unrestricted',
        desc: 'Stops Android from pausing tracking while your screen is locked.',
        action: requestBatteryUnrestricted,
        actionLabel: 'Fix it',
      },
    ]
    return (
      <div className="fixed inset-0 z-[3000] flex flex-col" style={{ background: '#0f1923' }}>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-white font-semibold text-lg truncate">{run.name}</span>
          <button onClick={handleExit} className="text-gray-400 hover:text-white text-2xl leading-none flex-shrink-0">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-6 py-4">
          <div>
            <div className="text-white font-bold text-xl mb-1">Before you start punching</div>
            <div className="text-gray-500 text-sm">These keep tracking, voice alerts, and vibration working while your screen is locked.</div>
          </div>
          <div className="flex flex-col gap-2.5">
            {items.map(item => (
              <div key={item.key} className="flex items-start gap-3 rounded-xl px-4 py-3"
                   style={{ background: item.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${item.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                <span className="text-lg leading-none mt-0.5">{item.ok ? '✅' : '⚠️'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm">{item.label}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{item.desc}</div>
                </div>
                {!item.ok && (
                  <button onClick={item.action}
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-500 active:bg-blue-400">
                    {item.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="text-gray-600 text-xs leading-relaxed rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span className="font-semibold text-gray-500">Samsung phones:</span> also check Settings → Battery and device care → Background usage limits, and make sure Pipemaster isn't listed under "Sleeping apps."
          </div>
          <button onClick={refreshReadiness}
                  className="w-full py-3 rounded-xl font-semibold text-white text-sm border border-white/15 active:bg-white/5">
            Recheck
          </button>
          <button onClick={() => setSkipReadiness(true)}
                  className="text-gray-600 hover:text-gray-400 text-xs text-center transition-colors">
            Continue anyway
          </button>
        </div>
      </div>
    )
  }

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

  // ── Step 2: pick schematic (skipped if the line only has one) ────────────────
  if (!selectedSchematic) {
    const lineAllSegs = (allSegments ?? []).filter(s => (s.line || 'Line 1') === selectedLine)
    return (
      <div className="fixed inset-0 z-[3000] flex flex-col" style={{ background: '#0f1923' }}>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-white font-semibold text-lg truncate">{run.name}</span>
          <button onClick={handleExit} className="text-gray-400 hover:text-white text-2xl leading-none flex-shrink-0">✕</button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
          <div className="text-gray-400 text-sm mb-2">Which schematic are you punching today?</div>
          {availableSchematics.map(schematicName => {
            const segs = lineAllSegs.filter(s => (s.schematic || 'A') === schematicName)
            const pattern = segs.find(s => s.holeSize !== 'Supply')?.furrowPattern ?? null
            const sizeCount = new Set(segs.filter(s => s.holeSize !== 'Supply').map(s => s.holeSize)).size
            return (
              <button key={schematicName} onClick={() => setSelectedSchematic(schematicName)}
                      className="w-full max-w-xs py-4 rounded-xl text-white text-lg font-medium border border-white/20 active:border-green-500/60 transition-all">
                {schematicName}
                <div className="text-gray-500 text-xs font-normal mt-0.5">
                  {sizeCount} hole size{sizeCount !== 1 ? 's' : ''}{pattern ? ` · ${furrowPatternLabel(pattern)}` : ''}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Step 3: gear list — required punchers for this line ──────────────────────
  if (!gearConfirmed) {
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
            <div className="text-gray-500 text-sm">{selectedLine} · Schematic {selectedSchematic} · {furrowPatternLabel(selectedPattern)}</div>
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
          <div className="text-gray-600 text-xs text-center max-w-xs leading-relaxed">
            If voice stops when screen locks, go to{' '}
            <span className="text-gray-500">Settings → Battery → App battery usage → Pipemaster → Unrestricted</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="fixed inset-0 z-[3000] flex flex-col" style={{ background: '#0f1923' }}>

      {/* Top 2/3 — live map */}
      <div style={{ flex: 2, position: 'relative', minHeight: 0 }}>
        <MapContainer center={position ?? run.path?.[0] ?? [33.0, -90.0]} zoom={18} zoomControl={false}
                      style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={19} maxZoom={22} />
          <PipeRunLine run={run} segments={lineSegs} selectable={false} />
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
            {selectedPattern && (
              <div className="text-white font-semibold text-lg text-center">
                {selectedPattern === 'every' ? 'Every furrow' : 'Every other furrow'}
              </div>
            )}
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

    {/* Battery optimization prompt — shown once if Samsung Device Care isn't exempting us */}
    {showBatteryPrompt && (
      <div className="fixed inset-0 z-[4000] flex items-end justify-center p-5"
           style={{ background: 'rgba(0,0,0,0.7)' }}>
        <div className="w-full max-w-sm rounded-2xl p-5 flex flex-col gap-3"
             style={{ background: '#1a2535', border: '1px solid rgba(255,165,0,0.3)' }}>
          <div className="text-white font-semibold">Samsung may pause Pipemaster</div>
          <div className="text-sm text-gray-400">
            Samsung's battery optimizer can stop GPS and voice alerts while you work. Tap Fix to exempt Pipemaster — you'll see a system prompt.
          </div>
          <div className="flex gap-2 mt-1">
            <button onClick={() => setShowBatteryPrompt(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10">
              Later
            </button>
            <button onClick={() => {
              ForegroundService.requestIgnoreBatteryOptimization().catch(() => {})
              setShowBatteryPrompt(false)
            }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-500">
              Fix it
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
