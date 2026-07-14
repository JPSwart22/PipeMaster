import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import db from '../lib/db'
import { CROPS, cropColor } from '../lib/cropColors'
import EditableText from './EditableText'
import SettingsSheet, { SyncStatusDot } from './SettingsSheet'
import { useBackClose } from '../lib/backButtonStack'

// ── Tee row: a T-fitting marker on a run, with its own child runs ────────────
function TeeRow({ tee, onAddRunFromTee, onOpenRunLog, onEditRun, onDeleteTee }) {
  const teeRuns = useLiveQuery(
    () => db.runs.where('teeId').equals(tee.id).toArray(),
    [tee.id]
  )
  return (
    <div className="pl-4 mt-1.5" style={{ borderLeft: '2px solid rgba(34,197,94,0.25)' }}>
      <div className="flex items-center gap-2 py-2 pl-3 group">
        <span className="text-green-500 flex-shrink-0">⊢</span>
        <span className="text-gray-400 text-sm truncate flex-1">{tee.name}</span>
        <button
          onClick={() => onAddRunFromTee(tee)}
          className="text-green-600 hover:text-green-400 text-xs font-medium transition-colors px-2 py-1 flex-shrink-0">
          + Run
        </button>
        <button
          onClick={() => onDeleteTee(tee)}
          className="opacity-0 group-hover:opacity-100 text-red-700 hover:text-red-500 text-sm leading-none transition-all px-1 flex-shrink-0">
          ×
        </button>
      </div>
      {teeRuns?.map(tr => (
        <RunWithTees key={tr.id} run={tr} onAddRunFromTee={onAddRunFromTee} onOpenRunLog={onOpenRunLog} onEditRun={onEditRun} onDeleteTee={onDeleteTee} />
      ))}
    </div>
  )
}

// ── Run row with nested tee markers ───────────────────────────────────────────
function RunWithTees({ run, onAddRunFromTee, onOpenRunLog, onEditRun, onDeleteTee }) {
  const tees = useLiveQuery(
    () => db.tees.where('runId').equals(run.id).toArray(),
    [run.id]
  )
  return (
    <div className="mb-1.5">
      <div className="flex items-center gap-2 rounded-lg px-3 py-2.5"
           style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {run.status === 'running' && <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 animate-pulse" />}
        <button onClick={() => onOpenRunLog(run)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
          <span className="text-gray-200 text-sm truncate">{run.name}</span>
        </button>
        {run.linkedRunId && (
          <span className="text-blue-400 text-sm flex-shrink-0" title="Linked run — waters simultaneously">⛓</span>
        )}
        <button
          onClick={() => onEditRun(run)}
          className="text-gray-500 hover:text-blue-400 active:text-blue-300 text-base transition-all px-2 py-1 -my-1 flex-shrink-0">
          ⚙
        </button>
      </div>
      {tees?.map(tee => (
        <TeeRow key={tee.id} tee={tee} onAddRunFromTee={onAddRunFromTee} onOpenRunLog={onOpenRunLog} onEditRun={onEditRun} onDeleteTee={onDeleteTee} />
      ))}
    </div>
  )
}

// ── Riser list row — clean, clickable, drills into RiserDetailScreen ─────────
function RiserListRow({ riser, well, onSelect }) {
  const runCount = useLiveQuery(
    () => db.runs.where('riserId').equals(riser.id).filter(r => !r.teeId).count(),
    [riser.id]
  )
  return (
    <button onClick={() => onSelect(riser)}
            className="w-full flex items-center gap-2.5 px-3 py-3 rounded-lg mb-1.5 hover:bg-white/5 transition-all text-left"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#64748b' }} />
      <span className="text-gray-200 text-sm truncate flex-1">{riser.name}</span>
      {well && (
        <span className="text-gray-500 text-xs truncate flex-shrink-0">
          {well.type === 'electric' ? '⚡' : '⛽'} {well.name}
        </span>
      )}
      <span className="text-gray-600 text-xs flex-shrink-0">{runCount ?? 0} run{runCount !== 1 ? 's' : ''}</span>
      <span className="text-gray-600 text-sm flex-shrink-0">›</span>
    </button>
  )
}

// ── Riser detail — full screen for one riser's runs, reached by drilling in
// from the field's risers list instead of expanding inline with tiny icons ──
function RiserDetailScreen({ riser, well, onBack, onDeleteRiser, onAddRun, onAddRunFromTee, onOpenRunLog, onEditRun, onDeleteTee }) {
  useBackClose(onBack)
  const runs = useLiveQuery(
    () => db.runs.where('riserId').equals(riser.id).filter(r => !r.teeId).toArray(),
    [riser.id]
  )

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={onBack} className="text-gray-400 hover:text-white text-xl leading-none transition-colors">‹</button>
        <EditableText
          value={riser.name}
          onSave={(name) => db.risers.update(riser.id, { name })}
          className="text-white font-semibold text-sm flex-1 truncate"
          inputClassName="text-white font-semibold text-sm flex-1"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {well && (
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
            <span className="text-base">{well.type === 'electric' ? '⚡' : '⛽'}</span>
            {well.name}
          </div>
        )}

        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Runs</div>
        {!runs?.length && (
          <div className="text-xs text-gray-700 italic py-1 mb-2">No runs yet</div>
        )}
        {runs?.map(run => (
          <RunWithTees key={run.id} run={run} onAddRunFromTee={onAddRunFromTee} onOpenRunLog={onOpenRunLog} onEditRun={onEditRun} onDeleteTee={onDeleteTee} />
        ))}
        <button
          onClick={() => onAddRun(riser)}
          className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl text-sm font-medium transition-all active:opacity-70 mt-2"
          style={{ border: '1px dashed rgba(249,115,22,0.4)', color: '#f97316', background: 'transparent' }}>
          + Add run
        </button>

        <button
          onClick={async () => { if (await onDeleteRiser(riser)) onBack() }}
          className="w-full py-2.5 rounded-xl text-sm text-red-700 hover:text-red-500 border border-red-900/40 hover:border-red-700/40 transition-all mt-6">
          Delete Riser
        </button>
      </div>
    </div>
  )
}

// ── Field detail (drill-down from the Fields list) ───────────────────────────
function FieldDetail({ field, onBack, onEditBoundary, onAddRiserToField, onDeleteRiser, onAddRun, onAddRunFromTee, onOpenRunLog, onEditRun, onDeleteTee }) {
  useBackClose(onBack)
  const fieldRisers = useLiveQuery(() => db.risers.where('fieldId').equals(field.id).toArray(), [field.id])
  const allWells    = useLiveQuery(() => db.wells.toArray(), [])
  const [cropOpen, setCropOpen] = useState(false)
  const [selectedRiser, setSelectedRiser] = useState(null)

  const wellById = {}
  allWells?.forEach(w => { wellById[w.id] = w })

  if (selectedRiser) {
    return (
      <RiserDetailScreen
        riser={selectedRiser}
        well={wellById[selectedRiser.wellId]}
        onBack={() => setSelectedRiser(null)}
        onDeleteRiser={onDeleteRiser}
        onAddRun={onAddRun}
        onAddRunFromTee={onAddRunFromTee}
        onOpenRunLog={onOpenRunLog}
        onEditRun={onEditRun}
        onDeleteTee={onDeleteTee}
      />
    )
  }

  async function handleCropChange(crop) {
    await db.fields.update(field.id, { crop, color: cropColor(crop) })
    setCropOpen(false)
  }

  async function handleDeleteField() {
    if (!confirm(`Delete "${field.name}" and all its risers, runs, and segments? This cannot be undone.`)) return
    const runs = await db.runs.where('fieldId').equals(field.id).toArray()
    const runIds = runs.map(r => r.id)
    if (runIds.length) {
      await db.waterLogs.where('runId').anyOf(runIds).delete()
      await db.segments.where('runId').anyOf(runIds).delete()
      await db.tees.where('runId').anyOf(runIds).delete()
      await db.runs.where('fieldId').equals(field.id).delete()
    }
    await db.undergrounds.where('fieldId').equals(field.id).delete()
    await db.risers.where('fieldId').equals(field.id).delete()
    await db.fields.delete(field.id)
    onBack()
  }

  return (
    <div className="h-full flex flex-col">

      <div className="flex items-center gap-2 px-4 py-3"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={onBack}
                className="text-gray-400 hover:text-white text-xl leading-none transition-colors">‹</button>
        <span className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: field.color || '#94a3b8' }} />
        <EditableText
          value={field.name}
          onSave={(name) => db.fields.update(field.id, { name })}
          className="text-white font-semibold text-sm flex-1 truncate"
          inputClassName="text-white font-semibold text-sm flex-1"
        />
      </div>

      <div className="flex-1 overflow-y-auto">

        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={() => setCropOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-white/10 hover:border-white/20 transition-all"
            style={{ background: '#0f1923' }}>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: cropColor(field.crop || 'Other') }} />
              <span className="text-gray-200 text-sm">{field.crop || 'Select crop type'}</span>
            </div>
            <span className="text-gray-500 text-xs">{cropOpen ? '▲' : '▼'}</span>
          </button>
          {cropOpen && (
            <div className="mt-2 flex flex-wrap gap-2">
              {CROPS.map(c => {
                const col = cropColor(c)
                const selected = field.crop === c
                return (
                  <button
                    key={c}
                    onClick={() => handleCropChange(c)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all"
                    style={{
                      borderColor: selected ? col : 'rgba(255,255,255,0.1)',
                      background:  selected ? `${col}25` : 'transparent',
                      color:       selected ? col : '#9ca3af',
                      fontWeight:  selected ? 600 : 400,
                    }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col }} />
                    {c}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={() => onEditBoundary(field)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 hover:border-white/25 text-gray-300 hover:text-white text-sm font-medium transition-all">
            ✏️  Edit Boundary
          </button>
        </div>

        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Risers</span>
          </div>

          {!fieldRisers?.length && (
            <div className="text-xs text-gray-700 italic py-1">No risers yet</div>
          )}

          {fieldRisers?.map(riser => (
            <RiserListRow
              key={riser.id}
              riser={riser}
              well={wellById[riser.wellId]}
              onSelect={setSelectedRiser}
            />
          ))}

          <button
            onClick={() => onAddRiserToField(field)}
            className="w-full flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium transition-all active:opacity-70 mt-1"
            style={{ border: '1px dashed rgba(59,130,246,0.4)', color: '#60a5fa', background: 'transparent' }}>
            + Add riser
          </button>
        </div>

        <div className="px-4 py-3">
          <button
            onClick={handleDeleteField}
            className="w-full py-2 rounded-lg text-xs text-red-700 hover:text-red-500 border border-red-900/40 hover:border-red-700/40 transition-all">
            Delete Field
          </button>
        </div>

      </div>

    </div>
  )
}

// ── Fields list for one farm ──────────────────────────────────────────────────
function FieldsListScreen({ farm, onBack, onSelectField, onFlyToField, onAddField }) {
  useBackClose(onBack)
  const fields = useLiveQuery(() => db.fields.where('farmId').equals(farm.id).toArray(), [farm.id])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={onBack} className="text-gray-400 hover:text-white text-xl leading-none transition-colors">‹</button>
        <span className="text-white font-semibold text-sm flex-1 truncate">{farm.name} · Fields</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {!fields?.length && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">No fields yet</div>
        )}
        {fields?.map(field => (
          <button key={field.id}
                  onClick={() => { onFlyToField(field); onSelectField(field) }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/5 transition-all">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: field.color || '#94a3b8' }} />
            <span className="text-gray-200 text-sm flex-1 truncate">{field.name}</span>
            {field.crop && <span className="text-gray-600 text-xs truncate">{field.crop}</span>}
            <span className="text-gray-600 text-sm">›</span>
          </button>
        ))}
        <div className="px-4 mt-2">
          <button onClick={() => onAddField(farm)}
                  className="w-full flex items-center justify-center gap-1 py-2 rounded-md text-xs font-medium transition-all active:opacity-70"
                  style={{ border: '1px dashed rgba(34,197,94,0.4)', color: '#4ade80', background: 'transparent' }}>
            + Add field
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Wells list for one farm ────────────────────────────────────────────────────
function WellsListScreen({ farm, onBack, onAddWell, onEditWell, onAddRiser, deleteWell, deleteRiser }) {
  useBackClose(onBack)
  const wells  = useLiveQuery(() => db.wells.where('farmId').equals(farm.id).toArray(), [farm.id])
  const risers = useLiveQuery(() => db.risers.where('farmId').equals(farm.id).toArray(), [farm.id])
  const [expandedWells, setExpandedWells] = useState({})

  const risersByWell = {}
  risers?.forEach(r => {
    if (!risersByWell[r.wellId]) risersByWell[r.wellId] = []
    risersByWell[r.wellId].push(r)
  })

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={onBack} className="text-gray-400 hover:text-white text-xl leading-none transition-colors">‹</button>
        <span className="text-white font-semibold text-sm flex-1 truncate">{farm.name} · Wells</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {!wells?.length && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">No wells yet</div>
        )}
        {wells?.map(well => {
          const wellOpen = expandedWells[well.id] === true
          const wellRisers = risersByWell[well.id] || []
          return (
            <div key={well.id} className="mb-0.5">
              <div className="flex items-center gap-1 px-4 py-1.5 group hover:bg-white/5 transition-all">
                <button onClick={() => setExpandedWells(prev => ({ ...prev, [well.id]: !prev[well.id] }))}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left">
                  <span className="text-gray-600 text-[10px] w-2.5 flex-shrink-0">{wellOpen ? '▼' : '▶'}</span>
                  <span className="text-base leading-none flex-shrink-0">{well.type === 'electric' ? '⚡' : '⛽'}</span>
                  <span className="text-gray-300 text-sm truncate flex-1">{well.name}</span>
                  {well.gpm && <span className="text-gray-600 text-xs flex-shrink-0">{well.gpm}gpm</span>}
                </button>
                <button onClick={() => onEditWell?.(well)}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-blue-400 text-sm transition-all px-1 flex-shrink-0">
                  ⚙
                </button>
                <button onClick={() => deleteWell(well)}
                        className="opacity-0 group-hover:opacity-100 text-red-700 hover:text-red-500 text-xs leading-none transition-all px-1 flex-shrink-0">
                  ×
                </button>
              </div>

              {wellOpen && (
                <div className="pl-8 pr-4 pb-2">
                  {(well.motorModel || well.rpm || well.airFilter || well.fuelFilter || well.oilFilter) && (
                    <div className="mb-2 flex flex-col gap-0.5 py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {well.motorModel && <span className="text-xs text-gray-500">⚙ {well.motorModel}{well.rpm ? ` · ${well.rpm} rpm` : ''}</span>}
                      {!well.motorModel && well.rpm && <span className="text-xs text-gray-500">{well.rpm} rpm</span>}
                      {well.airFilter  && <span className="text-xs text-gray-600">Air: {well.airFilter}</span>}
                      {well.fuelFilter && <span className="text-xs text-gray-600">Fuel: {well.fuelFilter}</span>}
                      {well.oilFilter  && <span className="text-xs text-gray-600">Oil: {well.oilFilter}</span>}
                    </div>
                  )}
                  {wellRisers.map(riser => (
                    <div key={riser.id} className="flex items-center gap-2 py-1 group">
                      <span className="text-gray-500 text-xs">◆</span>
                      <span className="text-gray-400 text-xs truncate flex-1">{riser.name}</span>
                      <button onClick={() => deleteRiser(riser)}
                              className="opacity-0 group-hover:opacity-100 text-red-700 hover:text-red-500 text-xs leading-none transition-all px-1">
                        ×
                      </button>
                    </div>
                  ))}
                  {!wellRisers.length && <div className="text-gray-700 text-xs italic py-1">No risers yet</div>}
                  <button onClick={() => onAddRiser(well)}
                          className="mt-1 w-full flex items-center justify-center gap-1 py-1 rounded-md text-xs font-medium transition-all active:opacity-70"
                          style={{ border: '1px dashed rgba(59,130,246,0.4)', color: '#60a5fa', background: 'transparent' }}>
                    + Add riser
                  </button>
                </div>
              )}
            </div>
          )
        })}
        <div className="px-4 mt-2">
          <button onClick={() => onAddWell(farm)}
                  className="w-full flex items-center justify-center gap-1 py-2 rounded-md text-xs font-medium transition-all active:opacity-70"
                  style={{ border: '1px dashed rgba(59,130,246,0.4)', color: '#60a5fa', background: 'transparent' }}>
            + Add well
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Farm category screen — the Fields vs Wells split ──────────────────────────
function FarmCategoryScreen({ farm, onBack, onPickCategory, fieldCount, wellCount }) {
  useBackClose(onBack)
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={onBack} className="text-gray-400 hover:text-white text-xl leading-none transition-colors">‹</button>
        <span className="text-white font-semibold text-sm flex-1 truncate">{farm.name}</span>
      </div>
      <div className="flex-1 flex flex-col gap-3 p-4">
        <button onClick={() => onPickCategory('fields')}
                className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-white/10 hover:border-green-500/40 transition-all"
                style={{ background: 'rgba(34,197,94,0.06)' }}>
          <span className="flex items-center gap-2.5">
            <span className="text-xl">🌾</span>
            <span className="text-white font-medium text-sm">Fields</span>
          </span>
          <span className="flex items-center gap-2 text-gray-500 text-xs">
            {fieldCount}
            <span className="text-gray-600">›</span>
          </span>
        </button>
        <button onClick={() => onPickCategory('wells')}
                className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-white/10 hover:border-blue-500/40 transition-all"
                style={{ background: 'rgba(59,130,246,0.06)' }}>
          <span className="flex items-center gap-2.5">
            <span className="text-xl">💧</span>
            <span className="text-white font-medium text-sm">Wells</span>
          </span>
          <span className="flex items-center gap-2 text-gray-500 text-xs">
            {wellCount}
            <span className="text-gray-600">›</span>
          </span>
        </button>
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function SidePanel({ selectedField, onSelectField, onFlyToField, onFlyToFarm, onAddField, onAddFarm, onAddWell, onAddRiser, onAddRiserToField, onEditBoundary, onAddRun, onAddRunFromTee, onOpenRunLog, onEditRun, onEditWell, onClose }) {
  const farms  = useLiveQuery(() => db.farms.toArray(), [])
  const fields = useLiveQuery(() => db.fields.toArray(), [])
  const wells  = useLiveQuery(() => db.wells.toArray(), [])

  const [selectedFarmId, setSelectedFarmId] = useState(null)
  const [farmCategory, setFarmCategory]     = useState(null) // 'fields' | 'wells' | null
  const [showSettings, setShowSettings]     = useState(false)

  // Wrap action handlers so the panel closes on mobile after the action fires
  function handleEditRun(run) { onEditRun(run); onClose?.() }
  function handleOpenRunLog(run) { onOpenRunLog(run); onClose?.() }
  function handleAddRun(riser) { onAddRun(riser); onClose?.() }

  const fieldsByFarm = {}
  fields?.forEach(f => {
    if (!fieldsByFarm[f.farmId]) fieldsByFarm[f.farmId] = []
    fieldsByFarm[f.farmId].push(f)
  })
  const wellsByFarm = {}
  wells?.forEach(w => {
    if (!wellsByFarm[w.farmId]) wellsByFarm[w.farmId] = []
    wellsByFarm[w.farmId].push(w)
  })

  async function deleteWell(well) {
    if (!confirm(`Delete "${well.name}" and all its risers, runs, and history?`)) return
    const wellRisers = await db.risers.where('wellId').equals(well.id).toArray()
    const riserIds = wellRisers.map(r => r.id)
    if (riserIds.length) {
      const riserRuns = await db.runs.where('riserId').anyOf(riserIds).toArray()
      const runIds = riserRuns.map(r => r.id)
      if (runIds.length) {
        await db.waterLogs.where('runId').anyOf(runIds).delete()
        await db.segments.where('runId').anyOf(runIds).delete()
        await db.tees.where('runId').anyOf(runIds).delete()
        await db.runs.where('riserId').anyOf(riserIds).delete()
      }
      await db.undergrounds.where('fromType').equals('riser').and(u => riserIds.includes(u.fromId)).delete()
      await db.undergrounds.where('riserId').anyOf(riserIds).delete()
      await db.risers.where('wellId').equals(well.id).delete()
    }
    await db.undergrounds.where('fromType').equals('well').and(u => u.fromId === well.id).delete()
    await db.wells.delete(well.id)
  }

  async function deleteRiser(riser) {
    if (!confirm(`Delete "${riser.name}" and all its runs and history?`)) return false
    const riserRuns = await db.runs.where('riserId').equals(riser.id).toArray()
    const runIds = riserRuns.map(r => r.id)
    if (runIds.length) {
      await db.waterLogs.where('runId').anyOf(runIds).delete()
      await db.segments.where('runId').anyOf(runIds).delete()
      await db.tees.where('runId').anyOf(runIds).delete()
      await db.runs.where('riserId').equals(riser.id).delete()
    }
    await db.undergrounds.where('riserId').equals(riser.id).delete()
    await db.undergrounds.where('fromType').equals('riser').and(u => u.fromId === riser.id).delete()
    await db.risers.delete(riser.id)
    return true
  }

  async function deleteTee(tee) {
    if (!confirm(`Delete tee "${tee.name}"?`)) return
    const teeRuns = await db.runs.where('teeId').equals(tee.id).toArray()
    const runIds = teeRuns.map(r => r.id)
    if (runIds.length) {
      await db.waterLogs.where('runId').anyOf(runIds).delete()
      await db.segments.where('runId').anyOf(runIds).delete()
      await db.tees.where('runId').anyOf(runIds).delete()
      await db.runs.where('teeId').equals(tee.id).delete()
    }
    await db.tees.delete(tee.id)
  }

  async function deleteFarm(farm) {
    if (!confirm(`Delete "${farm.name}" and everything in it? This cannot be undone.`)) return
    const farmFields = await db.fields.where('farmId').equals(farm.id).toArray()
    const fieldIds = farmFields.map(f => f.id)
    if (fieldIds.length) {
      const fieldRuns = await db.runs.where('fieldId').anyOf(fieldIds).toArray()
      const runIds = fieldRuns.map(r => r.id)
      if (runIds.length) {
        await db.waterLogs.where('runId').anyOf(runIds).delete()
        await db.segments.where('runId').anyOf(runIds).delete()
        await db.tees.where('runId').anyOf(runIds).delete()
        await db.runs.where('fieldId').anyOf(fieldIds).delete()
      }
      await db.undergrounds.where('fieldId').anyOf(fieldIds).delete()
      await db.risers.where('fieldId').anyOf(fieldIds).delete()
      await db.fields.where('farmId').equals(farm.id).delete()
    }
    await db.wells.where('farmId').equals(farm.id).delete()
    await db.farms.delete(farm.id)
  }

  const selectedFarm = farms?.find(f => f.id === selectedFarmId) ?? null

  // Field detail (drill-down from the Fields list, or from tapping a field polygon on the map)
  if (selectedField) {
    return (
      <div className="h-full flex flex-col overflow-hidden"
           style={{ width: '100%', background: '#111c2a', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
        <FieldDetail
          field={selectedField}
          onBack={() => onSelectField(null)}
          onEditBoundary={(f) => { onSelectField(null); onEditBoundary(f) }}
          onAddRiserToField={onAddRiserToField}
          onDeleteRiser={deleteRiser}
          onAddRun={handleAddRun}
          onAddRunFromTee={onAddRunFromTee}
          onOpenRunLog={handleOpenRunLog}
          onEditRun={handleEditRun}
          onDeleteTee={deleteTee}
        />
      </div>
    )
  }

  // Wells list for a farm
  if (selectedFarm && farmCategory === 'wells') {
    return (
      <div className="h-full flex flex-col overflow-hidden"
           style={{ width: '100%', background: '#111c2a', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
        <WellsListScreen
          farm={selectedFarm}
          onBack={() => setFarmCategory(null)}
          onAddWell={onAddWell}
          onEditWell={onEditWell}
          onAddRiser={onAddRiser}
          deleteWell={deleteWell}
          deleteRiser={deleteRiser}
        />
      </div>
    )
  }

  // Fields list for a farm
  if (selectedFarm && farmCategory === 'fields') {
    return (
      <div className="h-full flex flex-col overflow-hidden"
           style={{ width: '100%', background: '#111c2a', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
        <FieldsListScreen
          farm={selectedFarm}
          onBack={() => setFarmCategory(null)}
          onSelectField={onSelectField}
          onFlyToField={onFlyToField}
          onAddField={onAddField}
        />
      </div>
    )
  }

  // Farm category split (Fields vs Wells)
  if (selectedFarm) {
    return (
      <div className="h-full flex flex-col overflow-hidden"
           style={{ width: '100%', background: '#111c2a', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
        <FarmCategoryScreen
          farm={selectedFarm}
          onBack={() => setSelectedFarmId(null)}
          onPickCategory={setFarmCategory}
          fieldCount={fieldsByFarm[selectedFarm.id]?.length ?? 0}
          wellCount={wellsByFarm[selectedFarm.id]?.length ?? 0}
        />
      </div>
    )
  }

  // Root — list of farms
  return (
    <div className="h-full flex flex-col overflow-hidden"
         style={{ width: '100%', background: '#111c2a', borderRight: '1px solid rgba(255,255,255,0.07)' }}>

      <div id="pm-panel-header" className="flex items-center justify-between px-4 py-3"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span className="text-green-400 font-semibold text-sm uppercase tracking-wider">Farms</span>
        <button id="pm-add-farm-btn" onClick={onAddFarm}
                className="w-7 h-7 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center text-white text-lg font-light leading-none transition-all">
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {!farms?.length && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm leading-relaxed">
            No farms yet.<br />
            <button onClick={onAddFarm} className="mt-3 text-green-500 hover:text-green-400">
              + Add your first farm
            </button>
          </div>
        )}

        {farms?.map(farm => {
          const fieldCount = fieldsByFarm[farm.id]?.length ?? 0
          const wellCount  = wellsByFarm[farm.id]?.length ?? 0
          return (
            <div key={farm.id} className="flex items-center group hover:bg-white/5 transition-all">
              <button onClick={() => { onFlyToFarm?.(farm.id); setSelectedFarmId(farm.id) }}
                      className="flex items-center gap-2 px-4 py-3 text-left flex-1 min-w-0">
                <span className="text-white font-medium text-sm flex-1 truncate">{farm.name}</span>
                <span className="text-gray-600 text-xs">{fieldCount} field{fieldCount !== 1 ? 's' : ''} · {wellCount} well{wellCount !== 1 ? 's' : ''}</span>
                <span className="text-gray-600 text-sm">›</span>
              </button>
              <button onClick={() => deleteFarm(farm)}
                      className="opacity-0 group-hover:opacity-100 text-red-800 hover:text-red-500 text-sm leading-none transition-all px-3 py-3 flex-shrink-0">
                ×
              </button>
            </div>
          )
        })}
      </div>

      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button id="pm-panel-settings" onClick={() => setShowSettings(true)}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg text-sm text-gray-300 hover:text-white border border-white/10 hover:border-white/25 transition-all">
          <span className="flex items-center gap-2">⚙ Settings</span>
          <SyncStatusDot />
        </button>
      </div>

      {showSettings && <SettingsSheet onClose={() => setShowSettings(false)} />}
    </div>
  )
}
