import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Circle, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet'
import { useLiveQuery } from 'dexie-react-hooks'
import L from 'leaflet'
import '../lib/leafletIcons'
import db from '../lib/db'
import { getPointAtFt, nearestFtOnPath, pathTotalFt, slicePath, HOLE_SIZES, HOLE_COLOR } from '../lib/pipeUtils'
import DrawMode, { nextColor } from './DrawMode'
import FieldPolygon from './FieldPolygon'
import WellMarker from './WellMarker'
import RiserMarker from './RiserMarker'
import TeeMarker from './TeeMarker'
import UndergroundLine from './UndergroundLine'
import PipeRunLine from './PipeRunLine'
import { startTour } from '../lib/appTour'
import AddFarmSheet from './AddFarmSheet'
import SaveFieldSheet from './SaveFieldSheet'
import SaveWellSheet from './SaveWellSheet'
import SaveRiserSheet from './SaveRiserSheet'
import SaveRunSheet from './SaveRunSheet'
import EditRunSheet from './EditRunSheet'
import RunLogSheet from './RunLogSheet'
import SidePanel from './SidePanel'
import EditWellSheet from './EditWellSheet'
import FlagSheet from './FlagSheet'

// ── Single-tap catcher for placing a tee marker ───────────────────────────────
function TeePlacementCatcher({ onPlace }) {
  useMapEvents({
    click(e) { onPlace([e.latlng.lat, e.latlng.lng]) },
  })
  return null
}

// ── Repeated-tap catcher for marking hole sizes along a run ──────────────────
function HoleMarkCatcher({ onTap }) {
  useMapEvents({
    click(e) { onTap([e.latlng.lat, e.latlng.lng]) },
  })
  return null
}

// ── Single-tap catcher for dropping a flag ────────────────────────────────────
function FlagPlacementCatcher({ onPlace }) {
  useMapEvents({
    click(e) { onPlace([e.latlng.lat, e.latlng.lng]) },
  })
  return null
}

const FLAG_ICON = L.divIcon({
  className: '',
  html: '<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 4px rgba(0,0,0,0.9))">🚩</div>',
  iconSize: [22, 22],
  iconAnchor: [2, 22],
})

const DELTA_CENTER = [33.45, -90.95]

const DRAW_LABELS = {
  field: ['Tap corners to outline your field', 'Keep tapping corners…', 'One more point to close the shape'],
  edit:  ['Drag existing corners or tap to add new ones', 'Drag to adjust…', 'Tap to add more points'],
  well:  ['Tap the map to place this well', '', ''],
  riser: ['Tap the map to place this riser', '', ''],
  run:   ['Starting at riser — tap along the pipe route', 'Keep tapping along the route…', 'Tap Finish when done'],
}
function drawBanner(mode, count) {
  const labels = DRAW_LABELS[mode] || DRAW_LABELS.field
  if (count === 0) return labels[0]
  if (count === 1) return labels[1]
  if (count === 2) return labels[2]
  return `${count} points — tap Finish when done`
}

// ── GPS dot ───────────────────────────────────────────────────────────────────
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
        if (!centered.current) { centered.current = true; map.setView(latlng, 13) }
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MapHome({ onSwitchToFieldMode }) {
  const fields       = useLiveQuery(() => db.fields.toArray(), [])
  const farms        = useLiveQuery(() => db.farms.toArray(), [])
  const wells        = useLiveQuery(() => db.wells.toArray(), [])
  const risers       = useLiveQuery(() => db.risers.toArray(), [])
  const undergrounds = useLiveQuery(() => db.undergrounds.toArray(), [])
  const runs        = useLiveQuery(() => db.runs.toArray(), [])
  const allSegments = useLiveQuery(() => db.segments.toArray(), [])
  const tees        = useLiveQuery(() => db.tees.toArray(), [])
  const flags       = useLiveQuery(() => db.flags.toArray(), [])
  const mapRef = useRef(null)

  const [drawMode, setDrawMode]               = useState(null)
  const [points, setPoints]                   = useState([])
  const [activeFarm, setActiveFarm]           = useState(null)
  const [activeField, setActiveField]         = useState(null)
  const [selectedFieldId, setSelectedFieldId] = useState(null)  // map highlight + QuickBar
  const [detailFieldId,   setDetailFieldId]   = useState(null)  // SidePanel FieldDetail only
  const [pendingWell, setPendingWell]             = useState(null)
  const [pendingRiser, setPendingRiser]           = useState(null)
  const [pendingRunPath, setPendingRunPath]       = useState(null)
  const [activeWell, setActiveWell]               = useState(null)
  const [activeRiserForRun, setActiveRiserForRun]     = useState(null)
  const [editingRun, setEditingRun]                   = useState(null)
  const [loggingRun, setLoggingRun]                   = useState(null)
  const [editingWell, setEditingWell]                 = useState(null)
  const [sheet, setSheet]                             = useState(null)
  const [panelOpen, setPanelOpen]                 = useState(true)
  const [drawingForRun, setDrawingForRun]         = useState(false)
  const [drawingForEditRun, setDrawingForEditRun] = useState(false)
  const [pendingEditPath, setPendingEditPath]     = useState(null)
  const [fabMenuOpen, setFabMenuOpen]             = useState(false)
  const [activeTeeMarker, setActiveTeeMarker]     = useState(null)
  const [placingTeeForRun, setPlacingTeeForRun]   = useState(null)
  const [markingHoles, setMarkingHoles]           = useState(null) // { run, lineIndex, segs }
  const [markingPendingFt, setMarkingPendingFt]   = useState(null)
  const [markingFurrowPattern, setMarkingFurrowPattern] = useState('every')
  const [markedSegsResult, setMarkedSegsResult]   = useState(null) // { lineIndex, segs, at }
  const [placingFlag, setPlacingFlag]             = useState(false)
  const [flagSheetData, setFlagSheetData]         = useState(null) // { lat, lon } for new, or flag object for viewing

  const selectedField = fields?.find(f => f.id === selectedFieldId) ?? null
  const detailField   = fields?.find(f => f.id === detailFieldId)   ?? null
  const isDrawing = drawMode !== null
  const suppressFieldClick = isDrawing || !!placingTeeForRun || !!markingHoles || placingFlag

  function handleStartTour() {
    setFabMenuOpen(false)
    setSheet(null)
    setDetailFieldId(null)
    startTour({ setPanelOpen })
  }

  function flyTo(boundary) {
    if (!mapRef.current || !boundary?.length) return
    mapRef.current.flyToBounds(L.latLngBounds(boundary), { padding: [60, 60], maxZoom: 17 })
  }

  function handleFlyToFarm(farmId) {
    if (!mapRef.current || !fields?.length) return
    const farmFields = fields.filter(f => f.farmId === farmId && f.boundary?.length)
    if (!farmFields.length) return
    const allPoints = farmFields.flatMap(f => f.boundary)
    mapRef.current.flyToBounds(L.latLngBounds(allPoints), { padding: [60, 60], maxZoom: 16 })
  }

  // ── FAB ───────────────────────────────────────────────────────────────────
  function handleFAB() {
    setFabMenuOpen(o => !o)
  }

  // Best-guess farm/field context for a quick-add triggered from the FAB,
  // rather than from a specific riser/field row that already has context.
  function quickAddTarget() {
    const farm = farms?.[0] ?? null
    const field = selectedField ?? fields?.find(f => f.farmId === farm?.id) ?? fields?.[0] ?? null
    return { farm, field }
  }

  function handleQuickAdd(type) {
    setFabMenuOpen(false)
    if (type === 'farm') { setSheet('addFarm'); return }
    if (type === 'flag') { setPlacingFlag(true); setPanelOpen(false); return }
    if (!farms?.length) { setSheet('addFarm'); return }
    if (type === 'well') {
      handleAddWell(null) // no farm context — SaveWellSheet will show farm picker
    }
  }

  function handleFarmCreated(farm) {
    setActiveFarm(farm)
    setSheet(null)
    setDrawMode('field')
    setPoints([])
    setPanelOpen(false)
  }

  // ── Drawing ───────────────────────────────────────────────────────────────
  function handleMapTap(latlng) {
    if (drawMode === 'well') {
      setPendingWell({ farmId: activeFarm?.id ?? null, lat: latlng[0], lon: latlng[1] })
      setDrawMode(null)
      setSheet('saveWell')
      return
    }
    if (drawMode === 'riser') {
      setPendingRiser({ wellId: activeWell?.id, farmId: activeWell?.farmId, fieldId: activeWell?._riserFieldId ?? null, lat: latlng[0], lon: latlng[1] })
      setDrawMode(null)
      setSheet('saveRiser')
      return
    }
    setPoints(prev => [...prev, latlng])
  }
  function handlePointDrag(index, latlng) {
    setPoints(prev => { const u = [...prev]; u[index] = latlng; return u })
  }
  function handleInsertPoint(afterIndex, latlng) {
    setPoints(prev => {
      const u = [...prev]
      u.splice(afterIndex + 1, 0, latlng)
      return u
    })
  }

  function handleFinish() {
    if (points.length < (drawMode === 'run' ? 2 : 3)) return
    if (drawMode === 'field') { setDrawMode(null); setSheet('saveField') }
    if (drawMode === 'edit')  { saveEditedBoundary() }
    if (drawMode === 'run')   {
      if (drawingForEditRun) {
        setPendingEditPath([...points])
        setDrawMode(null)
        setPoints([])
        setDrawingForEditRun(false)
      } else {
        setPendingRunPath([...points])
        setDrawMode(null)
        setPoints([])
        setDrawingForRun(false)
      }
    }
  }

  function handleCancelDraw() {
    setDrawMode(null); setPoints([]); setActiveField(null)
    if (drawingForRun) {
      setDrawingForRun(false)
    } else if (drawingForEditRun) {
      setDrawingForEditRun(false)
    } else {
      setPanelOpen(true)
    }
  }

  function handleFieldSaved() {
    setSheet(null); setPoints([]); setActiveFarm(null); setPanelOpen(true)
  }

  // ── Edit boundary ─────────────────────────────────────────────────────────
  function handleEditBoundary(field) {
    setActiveField(field)
    setPoints(field.boundary || [])
    setDrawMode('edit')
    setSelectedFieldId(null)
    setPanelOpen(false)
    flyTo(field.boundary)
  }

  // ── Well placement ────────────────────────────────────────────────────────
  function handleAddWell(farm) {
    setActiveFarm(farm ?? null)
    setDrawMode('well')
    setPanelOpen(false)
  }

  // ── Riser placement (from farm panel — well pre-selected) ────────────────
  function handleAddRiser(well, field) {
    setActiveWell({ ...well, _riserFieldId: field?.id ?? null })
    setDrawMode('riser')
    setPanelOpen(false)
  }

  // ── Riser placement (from field detail — user picks well in sheet) ────────
  function handleAddRiserToField(field) {
    setActiveWell({ id: null, farmId: field.farmId, _riserFieldId: field.id })
    setDrawMode('riser')
    setPanelOpen(false)
  }

  // ── Run placement ─────────────────────────────────────────────────────────
  function handleAddRun(riser) {
    setActiveRiserForRun(riser)
    setActiveTeeMarker(null)
    setPendingRunPath(null)
    setMarkedSegsResult(null)
    setSheet('saveRun')
    setPanelOpen(false)
  }

  function handleAddRunFromTee(tee) {
    const parentRun = runs?.find(r => r.id === tee.runId)
    if (!parentRun?.path?.length) return
    const pos = getPointAtFt(parentRun.path, tee.atFt)
    if (!pos) return
    setActiveTeeMarker({ id: tee.id, lat: pos[0], lon: pos[1], fieldId: tee.fieldId })
    setActiveRiserForRun(null)
    setPendingRunPath(null)
    setMarkedSegsResult(null)
    setSheet('saveRun')
    setPanelOpen(false)
  }

  function handleRunDrawRequest() {
    setDrawingForRun(true)
    setDrawMode('run')
    // Pre-seed riser or tee marker position if available
    const seed = activeRiserForRun?.lat != null
      ? [activeRiserForRun.lat, activeRiserForRun.lon]
      : activeTeeMarker?.lat != null
        ? [activeTeeMarker.lat, activeTeeMarker.lon]
        : null
    setPoints(seed ? [seed] : [])
  }

  // ── Tee marker placement ──────────────────────────────────────────────────
  function handleAddTeeRequest(run) {
    setPlacingTeeForRun(run)
  }

  async function handlePlaceTee(latlng) {
    const run = placingTeeForRun
    setPlacingTeeForRun(null)
    if (!run?.path?.length) return
    const atFt = nearestFtOnPath(run.path, latlng)
    const existingCount = await db.tees.where('runId').equals(run.id).count()
    await db.tees.add({
      runId:     run.id,
      fieldId:   run.fieldId,
      atFt,
      name:      `T${existingCount + 1}`,
      createdAt: Date.now(),
    })
  }

  // ── Mark hole sizes along a run, point by point ───────────────────────────
  function handleMarkHolesRequest(path, lineIndex) {
    if (!path?.length) return
    setMarkingHoles({ path, lineIndex, segs: [] })
    setMarkingPendingFt(null)
    setMarkingFurrowPattern('every')
  }

  function handleMarkTap(latlng) {
    if (!markingHoles) return
    setMarkingPendingFt(nearestFtOnPath(markingHoles.path, latlng))
  }

  function handlePickMarkSize(holeSize) {
    if (!markingHoles || markingPendingFt == null) return
    setMarkingHoles(prev => ({
      ...prev,
      segs: [...prev.segs, {
        endFt: markingPendingFt,
        holeSize,
        furrowCount: null,
        furrowPattern: holeSize === 'Supply' ? null : markingFurrowPattern,
      }],
    }))
    setMarkingPendingFt(null)
  }

  function handleMarkDone() {
    if (!markingHoles || markingHoles.segs.length === 0) { handleMarkCancel(); return }
    const ft = Math.round(pathTotalFt(markingHoles.path))
    const segs = [...markingHoles.segs]
    const last = { ...segs[segs.length - 1] }
    if (last.endFt < ft) last.endFt = ft
    segs[segs.length - 1] = last
    setMarkedSegsResult({ lineIndex: markingHoles.lineIndex, segs, at: Date.now() })
    setMarkingHoles(null)
    setMarkingPendingFt(null)
  }

  function handleMarkCancel() {
    setMarkingHoles(null)
    setMarkingPendingFt(null)
  }

  function handleEditRun(run) {
    setEditingRun(run)
    setPendingEditPath(null)
    setMarkedSegsResult(null)
    setSheet('editRun')
  }

  function handleOpenRunLog(run) {
    setLoggingRun(run)
    setSheet('runLog')
  }

  function handleEditRunDrawRequest() {
    setDrawingForEditRun(true)
    setDrawMode('run')
    setPoints(editingRun.path?.length ? [...editingRun.path] : [[editingRun.lat, editingRun.lon]])
  }


  async function saveEditedBoundary() {
    if (!activeField || points.length < 3) return
    await db.fields.update(activeField.id, { boundary: points })
    setDrawMode(null); setPoints([]); setActiveField(null); setPanelOpen(true)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app-root" style={{ position: 'relative', overflow: 'hidden' }}>

      <div style={{ position: 'absolute', inset: 0 }}>
        <MapContainer ref={mapRef} center={DELTA_CENTER} zoom={10} zoomControl={false}
                      doubleClickZoom={false}
                      style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" maxNativeZoom={19} maxZoom={22} />
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={19} maxZoom={22} opacity={0.8} />
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={19} maxZoom={22} opacity={0.9} />

          {fields?.map(f => (
            <FieldPolygon key={f.id} field={f} isSelected={f.id === selectedFieldId}
              onClick={suppressFieldClick ? null : (field) => { flyTo(field.boundary); setSelectedFieldId(field.id); setDetailFieldId(field.id); setPanelOpen(true) }} />
          ))}

          {/* Underground lines */}
          {undergrounds?.map(u => {
            const from = u.fromType === 'well'
              ? wells?.find(w => w.id === u.fromId)
              : risers?.find(r => r.id === u.fromId)
            const to = risers?.find(r => r.id === u.riserId)
            return <UndergroundLine key={u.id} from={from} to={to} />
          })}

          {/* Pipe runs */}
          {runs?.map(run => {
            const segs = allSegments?.filter(s => s.runId === run.id) ?? []
            return (
              <PipeRunLine
                key={run.id}
                run={run}
                segments={segs}
                onSelect={handleEditRun}
                selectable={!isDrawing && !placingTeeForRun}
              />
            )
          })}

          {/* Inline tee markers */}
          {tees?.map(tee => {
            const parentRun = runs?.find(r => r.id === tee.runId)
            if (!parentRun?.path?.length) return null
            const pos = getPointAtFt(parentRun.path, tee.atFt)
            if (!pos) return null
            return (
              <TeeMarker
                key={tee.id}
                position={pos}
                name={tee.name}
                onClick={(!isDrawing && !placingTeeForRun && !markingHoles) ? () => handleAddRunFromTee(tee) : undefined}
              />
            )
          })}

          {wells?.map(w => <WellMarker key={w.id} well={w} onClick={well => setEditingWell(well)} />)}
          {risers?.map(r => <RiserMarker key={r.id} riser={r} />)}

          {flags?.map(flag => (
            <Marker key={flag.id} position={[flag.lat, flag.lon]} icon={FLAG_ICON}
                    eventHandlers={{ click: () => setFlagSheetData(flag) }} />
          ))}
          {placingFlag && <FlagPlacementCatcher onPlace={pos => { setPlacingFlag(false); setFlagSheetData({ lat: pos[0], lon: pos[1] }) }} />}

          {isDrawing && (
            <DrawMode points={points} onMapClick={handleMapTap} onPointDrag={handlePointDrag} onInsertPoint={handleInsertPoint}
                      color={drawMode === 'edit' ? (activeField?.color ?? '#22c55e') : drawMode === 'run' ? '#f97316' : '#22c55e'}
                      forcePolyline={drawMode === 'run'} />
          )}

          {placingTeeForRun && <TeePlacementCatcher onPlace={handlePlaceTee} />}

          {/* Hole-marking-in-progress preview */}
          {markingHoles?.segs.map((seg, i) => {
            const startFt = i === 0 ? 0 : markingHoles.segs[i - 1].endFt
            const pts = slicePath(markingHoles.path, startFt, seg.endFt)
            if (pts.length < 2) return null
            return (
              <Polyline key={`mark-${i}`} positions={pts}
                        pathOptions={{ color: HOLE_COLOR[seg.holeSize] ?? '#64748b', weight: 5, opacity: 0.95 }} />
            )
          })}
          {markingHoles && <HoleMarkCatcher onTap={handleMarkTap} />}

          <UserLocation />
        </MapContainer>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-4 py-3"
             style={{ background: 'linear-gradient(to bottom, rgba(15,25,35,0.95), transparent)' }}>
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button id="pm-hamburger" onClick={() => setPanelOpen(o => !o)}
                    className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl text-gray-300 active:bg-white/10 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-lg">☰</span>
            </button>
            <span className="text-green-400 font-bold text-lg tracking-wide">PIPEMASTER</span>
            <span className="text-xs text-gray-600 uppercase tracking-widest border border-white/10 rounded px-2 py-0.5 hidden md:inline">Dev Mode</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 uppercase tracking-widest">
              {placingFlag ? 'Drop Flag' : drawMode === 'edit' ? 'Edit Boundary' : drawMode === 'field' ? 'Draw Field' : drawMode === 'well' ? 'Place Well' : drawMode === 'riser' ? 'Place Riser' : drawMode === 'run' ? 'Draw Run' : 'Map View'}
            </span>
            <button id="pm-tour-btn" onClick={() => handleStartTour()}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white text-sm font-bold transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    title="Take a tour">
              ?
            </button>
            {onSwitchToFieldMode && (
              <button id="pm-fieldmode-btn" onClick={onSwitchToFieldMode}
                      className="flex items-center gap-1.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-500 active:bg-green-700 rounded-xl px-4 py-2.5 transition-colors shadow-lg">
                📍 Field Mode
              </button>
            )}
          </div>
        </div>

        {/* Flag placement banner */}
        {placingFlag && (
          <>
            <div className="absolute top-14 left-0 right-0 z-[1000] flex justify-center pointer-events-none">
              <div className="border text-sm px-4 py-2 rounded-full"
                   style={{ background: 'rgba(120,70,0,0.85)', borderColor: 'rgba(234,179,8,0.5)', color: '#fde68a' }}>
                Tap the map to drop your flag
              </div>
            </div>
            <div className="absolute bottom-8 left-0 right-0 z-[1000] flex justify-center px-6">
              <button onClick={() => setPlacingFlag(false)}
                      className="flex-1 py-3 rounded-xl font-semibold text-gray-300 border border-white/20 hover:border-white/40 transition-all"
                      style={{ background: 'rgba(15,25,35,0.9)' }}>
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Tee placement banner */}
        {placingTeeForRun && (
          <>
            <div className="absolute top-14 left-0 right-0 z-[1000] flex justify-center pointer-events-none">
              <div className="border text-sm px-4 py-2 rounded-full bg-green-900/80 border-green-500/40 text-green-300">
                Tap on "{placingTeeForRun.name}" where the T-fitting is
              </div>
            </div>
            <div className="absolute bottom-8 left-0 right-0 z-[1000] flex justify-center px-6">
              <button onClick={() => setPlacingTeeForRun(null)}
                      className="flex-1 py-3 rounded-xl font-semibold text-gray-300 border border-white/20 hover:border-white/40 transition-all"
                      style={{ background: 'rgba(15,25,35,0.9)' }}>
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Mark hole sizes banner + picker */}
        {markingHoles && (
          <>
            <div className="absolute top-14 left-0 right-0 z-[1000] flex justify-center pointer-events-none">
              <div className="border text-sm px-4 py-2 rounded-full bg-green-900/80 border-green-500/40 text-green-300">
                {markingPendingFt != null ? 'Pick the hole size for that stretch' : 'Tap where this hole size ends'}
              </div>
            </div>

            {markingPendingFt != null && (
              <div className="absolute bottom-24 left-0 right-0 z-[1000] flex justify-center px-6">
                <div className="flex flex-col gap-2 p-3 rounded-2xl max-w-sm"
                     style={{ background: 'rgba(11,20,31,0.97)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => setMarkingFurrowPattern('every')}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{
                              background: markingFurrowPattern === 'every' ? 'rgba(34,197,94,0.2)' : 'transparent',
                              border: `1px solid ${markingFurrowPattern === 'every' ? '#22c55e' : 'rgba(255,255,255,0.15)'}`,
                              color: markingFurrowPattern === 'every' ? '#4ade80' : '#9ca3af',
                            }}>
                      Every furrow
                    </button>
                    <button onClick={() => setMarkingFurrowPattern('alternate')}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{
                              background: markingFurrowPattern === 'alternate' ? 'rgba(34,197,94,0.2)' : 'transparent',
                              border: `1px solid ${markingFurrowPattern === 'alternate' ? '#22c55e' : 'rgba(255,255,255,0.15)'}`,
                              color: markingFurrowPattern === 'alternate' ? '#4ade80' : '#9ca3af',
                            }}>
                      Every other
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {HOLE_SIZES.map(size => (
                      <button key={size} onClick={() => handlePickMarkSize(size)}
                              className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                              style={{ background: `${HOLE_COLOR[size]}25`, border: `1px solid ${HOLE_COLOR[size]}60`, color: HOLE_COLOR[size] }}>
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="absolute bottom-8 left-0 right-0 z-[1000] flex justify-center gap-3 px-6">
              <button onClick={handleMarkCancel}
                      className="flex-1 py-3 rounded-xl font-semibold text-gray-300 border border-white/20 hover:border-white/40 transition-all"
                      style={{ background: 'rgba(15,25,35,0.9)' }}>
                Cancel
              </button>
              <button onClick={handleMarkDone} disabled={markingHoles.segs.length === 0}
                      className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-40 transition-all bg-green-500 hover:bg-green-400">
                Done
              </button>
            </div>
          </>
        )}

        {/* Draw banner */}
        {isDrawing && (
          <div className="absolute top-14 left-0 right-0 z-[1000] flex justify-center pointer-events-none">
            <div className={`border text-sm px-4 py-2 rounded-full ${
              drawMode === 'edit'
                ? 'bg-blue-900/80 border-blue-500/40 text-blue-300'
                : 'bg-green-900/80 border-green-500/40 text-green-300'
            }`}>
              {drawBanner(drawMode, points.length)}
            </div>
          </div>
        )}

        {/* Live distance counter while drawing a run */}
        {isDrawing && drawMode === 'run' && points.length >= 2 && (
          <div className="absolute bottom-24 left-0 right-0 z-[1000] flex justify-center pointer-events-none">
            <div id="pm-draw-distance" className="border text-base px-5 py-2 rounded-full font-mono tabular-nums font-semibold"
                 style={{ background: 'rgba(124,45,18,0.92)', borderColor: 'rgba(249,115,22,0.55)', color: '#fdba74', backdropFilter: 'blur(4px)' }}>
              {Math.round(pathTotalFt(points)).toLocaleString()} ft
            </div>
          </div>
        )}

        {/* Draw controls */}
        {isDrawing && (drawMode === 'well' || drawMode === 'riser') && (
          <div className="absolute bottom-8 left-0 right-0 z-[1000] flex justify-center px-6">
            <button onClick={handleCancelDraw}
                    className="flex-1 py-3 rounded-xl font-semibold text-gray-300 border border-white/20 hover:border-white/40 transition-all"
                    style={{ background: 'rgba(15,25,35,0.9)' }}>
              Cancel
            </button>
          </div>
        )}
        {isDrawing && drawMode !== 'well' && drawMode !== 'riser' && (
          <div className="absolute bottom-8 left-0 right-0 z-[1000] flex justify-center gap-3 px-6">
            <button onClick={handleCancelDraw}
                    className="flex-1 py-3 rounded-xl font-semibold text-gray-300 border border-white/20 hover:border-white/40 transition-all"
                    style={{ background: 'rgba(15,25,35,0.9)' }}>
              Cancel
            </button>
            <button onClick={() => setPoints(p => p.slice(0, -1))} disabled={points.length === 0}
                    className="flex-1 py-3 rounded-xl font-semibold text-gray-300 border border-white/20 disabled:opacity-30 transition-all"
                    style={{ background: 'rgba(15,25,35,0.9)' }}>
              Undo
            </button>
            <button onClick={handleFinish} disabled={points.length < (drawMode === 'run' ? 2 : 3)}
                    className={`flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-40 transition-all ${
                      drawMode === 'edit' ? 'bg-blue-500 hover:bg-blue-400' : drawMode === 'run' ? 'bg-orange-500 hover:bg-orange-400' : 'bg-green-500 hover:bg-green-400'
                    }`}>
              {drawMode === 'edit' ? 'Save' : 'Finish'}
            </button>
          </div>
        )}

        {/* FAB + quick-add menu */}
        {!isDrawing && !sheet && (
          <>
            {fabMenuOpen && (
              <div className="absolute inset-0 z-[999]" onClick={() => setFabMenuOpen(false)} />
            )}
            {fabMenuOpen && (
              <div className="absolute bottom-28 right-5 z-[1000] flex flex-col items-end gap-2.5">
                {[
                  { type: 'farm',  label: 'Farm',  icon: '🚜', color: '#22c55e' },
                  { type: 'well',  label: 'Well',  icon: '⚡', color: '#3b82f6' },
                  { type: 'flag',  label: 'Flag',  icon: '🚩', color: '#eab308' },
                ].map(item => (
                  <button key={item.type} onClick={() => handleQuickAdd(item.type)}
                          className="flex items-center gap-2.5 pl-4 pr-3 py-2.5 rounded-full shadow-lg transition-all active:scale-95"
                          style={{ background: '#16212f', border: `1px solid ${item.color}55` }}>
                    <span className="text-white text-sm font-medium">{item.label}</span>
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                          style={{ background: `${item.color}25`, color: item.color }}>
                      {item.icon}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button id="pm-fab" onClick={handleFAB}
                    className="absolute bottom-8 right-5 z-[1000] w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 active:scale-95 transition-all shadow-lg flex items-center justify-center text-white"
                    style={{ fontSize: 30, fontWeight: 300, transform: fabMenuOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>
              +
            </button>
          </>
        )}

        {/* Panel toggle — desktop edge strip only; mobile uses the top-bar hamburger */}
        <button onClick={() => setPanelOpen(o => !o)}
                className="absolute top-1/2 z-[1000] hidden md:flex items-center justify-center text-gray-400 hover:text-white transition-all"
                style={{ left: 0, transform: 'translateY(-50%)', background: '#111c2a', border: '1px solid rgba(255,255,255,0.07)', borderLeft: 'none', borderRadius: '0 6px 6px 0', width: 20, height: 48, fontSize: 10 }}>
          {panelOpen ? '‹' : '›'}
        </button>

        {/* Sheets */}
        {sheet === 'addFarm' && <AddFarmSheet onClose={() => setSheet(null)} onCreated={handleFarmCreated} />}
        {sheet === 'saveField' && (
          <SaveFieldSheet farmId={activeFarm?.id} boundary={points}
                          onClose={() => { setSheet(null); setPoints([]) }} onSaved={handleFieldSaved} />
        )}
        {sheet === 'saveWell' && pendingWell && (
          <SaveWellSheet
            farmId={pendingWell.farmId}
            lat={pendingWell.lat} lon={pendingWell.lon}
            onClose={() => { setSheet(null); setPendingWell(null); setPanelOpen(true) }}
            onSaved={() => { setSheet(null); setPendingWell(null); setPanelOpen(true) }}
          />
        )}
        {sheet === 'saveRiser' && pendingRiser && (
          <SaveRiserSheet
            wellId={pendingRiser.wellId} farmId={pendingRiser.farmId} fieldId={pendingRiser.fieldId}
            lat={pendingRiser.lat} lon={pendingRiser.lon}
            onClose={() => { setSheet(null); setPendingRiser(null); setPanelOpen(true) }}
            onSaved={() => { setSheet(null); setPendingRiser(null); setPanelOpen(true) }}
          />
        )}
        {sheet === 'saveRun' && (activeRiserForRun || activeTeeMarker) && (
          <div style={(drawingForRun || markingHoles) ? { display: 'none' } : {}}>
            <SaveRunSheet
              path={pendingRunPath}
              riserId={activeRiserForRun?.id ?? null}
              fieldId={activeRiserForRun?.fieldId ?? activeTeeMarker?.fieldId}
              farmId={activeRiserForRun?.farmId ?? null}
              teeId={activeTeeMarker?.id ?? null}
              riser={activeRiserForRun ?? null}
              field={selectedField ?? fields?.find(f => f.id === (activeRiserForRun?.fieldId ?? activeTeeMarker?.fieldId))}
              onDrawRequest={handleRunDrawRequest}
              onMarkHolesRequest={handleMarkHolesRequest}
              markedSegs={markedSegsResult}
              onClose={() => { setSheet(null); setPendingRunPath(null); setActiveRiserForRun(null); setActiveTeeMarker(null); setMarkedSegsResult(null); setPanelOpen(true) }}
              onSaved={() => { setSheet(null); setPendingRunPath(null); setActiveRiserForRun(null); setActiveTeeMarker(null); setMarkedSegsResult(null); setPanelOpen(true) }}
            />
          </div>
        )}
        {sheet === 'editRun' && editingRun && (
          <div style={(drawingForEditRun || placingTeeForRun || markingHoles) ? { display: 'none' } : {}}>
            <EditRunSheet
              run={editingRun}
              drawnPath={pendingEditPath}
              onDrawRequest={handleEditRunDrawRequest}
              onAddTeeRequest={handleAddTeeRequest}
              onAddRunFromTee={handleAddRunFromTee}
              onMarkHolesRequest={handleMarkHolesRequest}
              markedSegs={markedSegsResult}
              onClose={() => { setSheet(null); setEditingRun(null); setPendingEditPath(null); setMarkedSegsResult(null) }}
              onSaved={() => { setSheet(null); setEditingRun(null); setPendingEditPath(null); setMarkedSegsResult(null) }}
            />
          </div>
        )}
        {sheet === 'runLog' && loggingRun && (
          <RunLogSheet
            run={runs?.find(r => r.id === loggingRun.id) ?? loggingRun}
            onClose={() => { setSheet(null); setLoggingRun(null) }}
            onEditDetails={() => handleEditRun(loggingRun)}
          />
        )}
        {editingWell && (
          <EditWellSheet
            well={wells?.find(w => w.id === editingWell.id) ?? editingWell}
            onClose={() => setEditingWell(null)}
            onSaved={() => setEditingWell(null)}
          />
        )}
        {flagSheetData && (
          <FlagSheet
            flag={flagSheetData.id ? flagSheetData : null}
            lat={flagSheetData.lat}
            lon={flagSheetData.lon}
            onClose={() => setFlagSheetData(null)}
            onSaved={() => { setFlagSheetData(null); setPanelOpen(true) }}
            onDeleted={() => setFlagSheetData(null)}
          />
        )}
      </div>

      {panelOpen && (
        <>
          {/* Backdrop — lets a tap outside the panel close it. Mobile-only: on desktop the
              panel is narrow and the map underneath should stay fully clickable. */}
          <div className="absolute inset-0 z-[1400] md:hidden" style={{ background: 'rgba(0,0,0,0.35)' }}
               onClick={() => setPanelOpen(false)} />
          <div className="absolute top-0 left-0 z-[1500]" style={{ height: '100%', width: '100vw', maxWidth: 300 }}>
            <SidePanel
              selectedField={detailField}
              onSelectField={(f) => { setDetailFieldId(f?.id ?? null); setSelectedFieldId(f?.id ?? null); if (f) { flyTo(f.boundary) } }}
              onFlyToField={(f) => flyTo(f.boundary)}
              onFlyToFarm={handleFlyToFarm}
              onAddField={(farm) => { setActiveFarm(farm); setDrawMode('field'); setPoints([]); setPanelOpen(false) }}
              onAddFarm={() => setSheet('addFarm')}
              onAddWell={handleAddWell}
              onAddRiser={handleAddRiser}
              onAddRiserToField={handleAddRiserToField}
              onEditBoundary={handleEditBoundary}
              onAddRun={handleAddRun}
              onAddRunFromTee={handleAddRunFromTee}
              onEditRun={handleEditRun}
              onOpenRunLog={handleOpenRunLog}
              onEditWell={(well) => setEditingWell(well)}
              onClose={() => setPanelOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  )
}
