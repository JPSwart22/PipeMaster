import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Circle, useMap } from 'react-leaflet'
import { useLiveQuery } from 'dexie-react-hooks'
import L from 'leaflet'
import '../lib/leafletIcons'
import db from '../lib/db'
import { getPointAtFt } from '../lib/pipeUtils'
import { startRun, stopRun } from '../lib/runOps'
import FieldPolygon from './FieldPolygon'
import WellMarker from './WellMarker'
import RiserMarker from './RiserMarker'
import TeeMarker from './TeeMarker'
import UndergroundLine from './UndergroundLine'
import PipeRunLine from './PipeRunLine'
import PunchingMode from './PunchingMode'
import FieldHistorySheet from './FieldHistorySheet'

const DELTA_CENTER = [33.45, -90.95]

// ── GPS dot — same behavior as Dev Mode's map ──────────────────────────────
function UserLocation() {
  const map = useMap()
  const [position, setPosition] = useState(null)
  const [accuracy, setAccuracy] = useState(0)
  const centered = useRef(false)

  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        const latlng = [latitude, longitude]
        setPosition(latlng)
        setAccuracy(accuracy)
        if (!centered.current) { centered.current = true; map.setView(latlng, 15) }
      },
      (err) => console.warn('GPS:', err.message),
      { enableHighAccuracy: true, maximumAge: 0 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [map])

  if (!position) return null
  return (
    <>
      <Circle center={position} radius={accuracy}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1 }} />
      <CircleMarker center={position} radius={9}
                    pathOptions={{ fillColor: '#3b82f6', fillOpacity: 1, color: 'white', weight: 2 }} />
    </>
  )
}

// ── A real on/off toggle, not just a relabeled button ──────────────────────
function StartStopToggle({ isRunning, onToggle }) {
  return (
    <button onClick={onToggle}
            className="w-full flex items-center justify-between px-5 py-4 rounded-xl transition-all"
            style={{
              background: isRunning ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
              border: `2px solid ${isRunning ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)'}`,
            }}>
      <span className="text-lg font-semibold" style={{ color: isRunning ? '#f87171' : '#4ade80' }}>
        {isRunning ? 'Running — tap to stop' : 'Stopped — tap to start'}
      </span>
      <span className="relative inline-block flex-shrink-0 rounded-full transition-colors"
            style={{ width: 56, height: 32, background: isRunning ? '#ef4444' : '#22c55e' }}>
        <span className="absolute rounded-full bg-white transition-all"
              style={{ width: 24, height: 24, top: 4, left: isRunning ? 28 : 4 }} />
      </span>
    </button>
  )
}

// ── Action sheet for whichever run was tapped ───────────────────────────────
function RunActionSheet({ run, onClose }) {
  const [punching, setPunching] = useState(false)
  const isRunning = run.status === 'running'

  async function handleToggle() {
    if (isRunning) await stopRun(run)
    else await startRun(run)
  }

  if (punching) {
    return <PunchingMode run={run} onExit={() => setPunching(false)} />
  }

  return (
    <div className="fixed inset-0 z-[2500] flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="rounded-t-2xl p-5 flex flex-col gap-3" style={{ background: '#1a2535' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-white font-semibold text-lg truncate">{run.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none flex-shrink-0">✕</button>
        </div>
        <StartStopToggle isRunning={isRunning} onToggle={handleToggle} />
        <button onClick={() => setPunching(true)}
                className="w-full py-5 rounded-xl font-semibold text-white text-xl border-2 border-blue-500 active:bg-blue-500/20 transition-all">
          📍 Punching Mode
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function FieldModeHome({ onSwitchToDevMode }) {
  const fields       = useLiveQuery(() => db.fields.toArray(), [])
  const wells        = useLiveQuery(() => db.wells.toArray(), [])
  const risers       = useLiveQuery(() => db.risers.toArray(), [])
  const undergrounds = useLiveQuery(() => db.undergrounds.toArray(), [])
  const runs         = useLiveQuery(() => db.runs.toArray(), [])
  const allSegments  = useLiveQuery(() => db.segments.toArray(), [])
  const tees         = useLiveQuery(() => db.tees.toArray(), [])
  const mapRef = useRef(null)

  const [selectedFieldId, setSelectedFieldId] = useState(null)
  const [actionRun, setActionRun] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [dayPattern, setDayPattern] = useState('all') // 'all' | 'every' | 'alternate'

  const selectedField = fields?.find(f => f.id === selectedFieldId) ?? null
  const fieldRisers = selectedField ? (risers?.filter(r => r.fieldId === selectedField.id) ?? []) : []
  const allFieldRuns = selectedField ? (runs?.filter(r => r.fieldId === selectedField.id) ?? []) : []

  // Filter runs by today's selected pattern — untagged runs always show
  const fieldRuns = dayPattern === 'all'
    ? allFieldRuns
    : allFieldRuns.filter(r => !r.furrowPattern || r.furrowPattern === dayPattern)

  function flyTo(boundary) {
    if (!mapRef.current || !boundary?.length) return
    mapRef.current.flyToBounds(L.latLngBounds(boundary), { padding: [60, 60], maxZoom: 17 })
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer ref={mapRef} center={DELTA_CENTER} zoom={10} zoomControl={false}
                    doubleClickZoom={false}
                    style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" maxNativeZoom={19} maxZoom={22} />
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={19} maxZoom={22} opacity={0.8} />
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={19} maxZoom={22} opacity={0.9} />

        {fields?.map(f => (
          <FieldPolygon key={f.id} field={f} isSelected={f.id === selectedFieldId}
            onClick={(field) => { flyTo(field.boundary); setSelectedFieldId(field.id); setDayPattern('all') }} />
        ))}

        {undergrounds?.map(u => {
          const from = u.fromType === 'well'
            ? wells?.find(w => w.id === u.fromId)
            : risers?.find(r => r.id === u.fromId)
          const to = risers?.find(r => r.id === u.riserId)
          return <UndergroundLine key={u.id} from={from} to={to} />
        })}

        {/* Pipe lines only become tappable once a field is selected — at the
            zoomed-out farm view their wide tap-targets would otherwise swallow
            clicks meant for the field polygons underneath */}
        {runs?.map(run => {
          const segs = allSegments?.filter(s => s.runId === run.id) ?? []
          return (
            <PipeRunLine
              key={run.id}
              run={run}
              segments={segs}
              onSelect={setActionRun}
              selectable={!!selectedFieldId}
              statusColor
            />
          )
        })}

        {/* Risers and tees only clutter the overview at farm-wide zoom — show them
            once a field's selected. Wells stay visible always as farm landmarks. */}
        {selectedFieldId && tees?.filter(t => t.fieldId === selectedFieldId).map(tee => {
          const parentRun = runs?.find(r => r.id === tee.runId)
          if (!parentRun?.path?.length) return null
          const pos = getPointAtFt(parentRun.path, tee.atFt)
          if (!pos) return null
          return <TeeMarker key={tee.id} position={pos} name={tee.name} />
        })}

        {wells?.map(w => <WellMarker key={w.id} well={w} />)}
        {selectedFieldId && risers?.filter(r => r.fieldId === selectedFieldId).map(r => (
          <RiserMarker key={r.id} riser={r} />
        ))}

        <UserLocation />
      </MapContainer>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-4 py-3"
           style={{ background: 'linear-gradient(to bottom, rgba(15,25,35,0.95), transparent)' }}>
        <span className="text-green-400 font-bold text-xl tracking-wide">PIPEMASTER</span>
        <button onClick={onSwitchToDevMode}
                className="text-sm font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 transition-colors">
          ⚙ Dev Mode
        </button>
      </div>

      {/* Half-height field panel */}
      {selectedField && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] rounded-t-2xl shadow-2xl flex flex-col field-panel-h"
             style={{ background: 'rgba(11,20,31,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
               style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: selectedField.color || '#94a3b8' }} />
              <span className="text-white font-semibold text-lg truncate">{selectedField.name}</span>
              {selectedField.crop && <span className="text-gray-500 text-sm flex-shrink-0">{selectedField.crop}</span>}
            </div>
            <button onClick={() => setSelectedFieldId(null)}
                    className="text-gray-500 hover:text-white text-2xl leading-none flex-shrink-0 ml-2">×</button>
          </div>

          {/* Day pattern filter */}
          <div className="flex gap-2 px-4 pt-3 pb-1 flex-shrink-0">
            {[
              { value: 'all',       label: 'All runs',        color: '#94a3b8' },
              { value: 'every',     label: 'Every furrow',    color: '#22c55e' },
              { value: 'alternate', label: 'Every other',     color: '#f97316' },
            ].map(opt => (
              <button key={opt.value}
                      onClick={() => setDayPattern(opt.value)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all"
                      style={{
                        borderColor: dayPattern === opt.value ? opt.color : 'rgba(255,255,255,0.1)',
                        background:  dayPattern === opt.value ? `${opt.color}20` : 'transparent',
                        color:       dayPattern === opt.value ? opt.color : '#6b7280',
                      }}>
                {opt.label}
              </button>
            ))}
          </div>

          <button onClick={() => setShowHistory(true)}
                  className="mx-4 mt-1 flex-shrink-0 py-2.5 rounded-xl text-sm font-medium text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 transition-all">
            📋 Irrigation History
          </button>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {!fieldRisers.length && (
              <div className="text-gray-600 text-sm italic text-center py-6">No risers set up on this field yet</div>
            )}
            {fieldRisers.map(riser => {
              const riserRuns = fieldRuns.filter(r => r.riserId === riser.id)
              return (
                <div key={riser.id} className="mb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-gray-500 text-sm">◆</span>
                    <span className="text-gray-300 text-sm font-medium">{riser.name}</span>
                  </div>
                  <div className="flex flex-col gap-2 pl-4">
                    {riserRuns.map(run => {
                      const patCol = run.furrowPattern === 'every' ? '#22c55e' : run.furrowPattern === 'alternate' ? '#f97316' : null
                      return (
                        <button key={run.id} onClick={() => setActionRun(run)}
                                className="flex items-center gap-2 py-3 px-3 rounded-xl text-left transition-all"
                                style={{
                                  background: run.status === 'running' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                                  border: run.status === 'running' ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                }}>
                          {run.status === 'running' && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />}
                          <span className="text-white text-sm flex-1 truncate">{run.name}</span>
                          {patCol && (
                            <span className="text-xs flex-shrink-0 px-1.5 py-0.5 rounded-full"
                                  style={{ background: `${patCol}20`, color: patCol }}>
                              {run.furrowPattern === 'every' ? 'Every' : 'Ev. other'}
                            </span>
                          )}
                          {run.status === 'running' && <span className="text-green-400 text-xs flex-shrink-0">Running</span>}
                        </button>
                      )
                    })}
                    {!riserRuns.length && <div className="text-gray-700 text-xs italic">No runs yet</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showHistory && selectedField && (
        <FieldHistorySheet field={selectedField} runs={fieldRuns} onClose={() => setShowHistory(false)} />
      )}

      {actionRun && (
        <RunActionSheet
          run={runs?.find(r => r.id === actionRun.id) ?? actionRun}
          onClose={() => setActionRun(null)}
        />
      )}
    </div>
  )
}
