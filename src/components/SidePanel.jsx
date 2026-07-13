import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import db from '../lib/db'
import { CROPS, cropColor } from '../lib/cropColors'
import EditableText from './EditableText'
import SettingsSheet, { SyncStatusDot } from './SettingsSheet'

// ── Tee row: a T-fitting marker on a run, with its own child runs ────────────
function TeeRow({ tee, onAddRunFromTee, onOpenRunLog, onEditRun, onDeleteTee }) {
  const teeRuns = useLiveQuery(
    () => db.runs.where('teeId').equals(tee.id).toArray(),
    [tee.id]
  )
  return (
    <div className="pl-4">
      <div className="flex items-center gap-2 py-1.5 group">
        <span className="text-green-500 text-sm flex-shrink-0">⊢</span>
        <span className="text-gray-500 text-sm truncate flex-1">{tee.name}</span>
        <button
          onClick={() => onAddRunFromTee(tee)}
          className="text-green-600 hover:text-green-400 text-xs transition-colors px-1 flex-shrink-0">
          + Run
        </button>
        <button
          onClick={() => onDeleteTee(tee)}
          className="opacity-0 group-hover:opacity-100 text-red-700 hover:text-red-500 text-xs leading-none transition-all px-1 flex-shrink-0">
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
    <div>
      <div className="flex items-center gap-1 py-1.5">
        {run.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 animate-pulse" />}
        <button onClick={() => onOpenRunLog(run)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left py-1 hover:opacity-80 transition-opacity">
          <span className="text-orange-400 text-sm flex-shrink-0">→</span>
          <span className="text-gray-300 text-sm truncate">{run.name}</span>
        </button>
        {run.linkedRunId && (
          <span className="text-blue-400 text-xs flex-shrink-0" title="Linked run — waters simultaneously">⛓</span>
        )}
        <button
          onClick={() => onEditRun(run)}
          className="text-gray-500 hover:text-blue-400 active:text-blue-300 text-base transition-all px-2 py-1 flex-shrink-0">
          ⚙
        </button>
      </div>
      {tees?.map(tee => (
        <TeeRow key={tee.id} tee={tee} onAddRunFromTee={onAddRunFromTee} onOpenRunLog={onOpenRunLog} onEditRun={onEditRun} onDeleteTee={onDeleteTee} />
      ))}
    </div>
  )
}

// ── Riser row with its runs ───────────────────────────────────────────────────
// Collapsed by default — a field with several risers, each with several runs,
// would otherwise dump everything open at once and fill the whole panel.
function RiserRow({ riser, well, onDeleteRiser, onAddRun, onAddRunFromTee, onOpenRunLog, onEditRun, onDeleteTee }) {
  const [open, setOpen] = useState(false)
  const runs = useLiveQuery(
    () => open ? db.runs.where('riserId').equals(riser.id).filter(r => !r.teeId).toArray() : Promise.resolve(null),
    [riser.id, open]
  )
  const runCount = useLiveQuery(
    () => db.runs.where('riserId').equals(riser.id).filter(r => !r.teeId).count(),
    [riser.id]
  )

  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 py-1.5 group">
        <button onClick={() => setOpen(o => !o)} className="text-gray-600 text-[10px] w-3 flex-shrink-0">
          {open ? '▼' : '▶'}
        </button>
        <span className="text-gray-500 text-xs flex-shrink-0">◆</span>
        <EditableText
          value={riser.name}
          onSave={(name) => db.risers.update(riser.id, { name })}
          className="text-gray-300 text-xs truncate flex-1"
          inputClassName="text-gray-300 text-xs flex-1"
        />
        {!open && runCount > 0 && (
          <span className="text-gray-600 text-xs flex-shrink-0">{runCount} run{runCount !== 1 ? 's' : ''}</span>
        )}
        {well && (
          <span className="text-gray-600 text-xs truncate shrink-0">
            {well.type === 'electric' ? '⚡' : '⛽'} {well.name}
          </span>
        )}
        <button onClick={() => onDeleteRiser(riser)}
                className="opacity-0 group-hover:opacity-100 text-red-700 hover:text-red-500 text-xs leading-none transition-all px-1 flex-shrink-0">
          ×
        </button>
      </div>

      {open && (
        <div className="pl-4 mb-2">
          {runs?.map(run => (
            <RunWithTees key={run.id} run={run} onAddRunFromTee={onAddRunFromTee} onOpenRunLog={onOpenRunLog} onEditRun={onEditRun} onDeleteTee={onDeleteTee} />
          ))}
          <button
            onClick={() => onAddRun(riser)}
            className="mt-1 w-full flex items-center justify-center gap-1 py-1 rounded-md text-xs font-medium transition-all active:opacity-70"
            style={{ border: '1px dashed rgba(249,115,22,0.4)', color: '#f97316', background: 'transparent' }}>
            + Add run
          </button>
        </div>
      )}
    </div>
  )
}

// ── Inline risers shown when a field row is expanded ─────────────────────────
function FieldInlineRows({ field, onDeleteRiser, onAddRiserToField, onAddRun, onAddRunFromTee, onOpenRunLog, onEditRun, onDeleteTee }) {
  const fieldRisers = useLiveQuery(() => db.risers.where('fieldId').equals(field.id).toArray(), [field.id])
  const allWells    = useLiveQuery(() => db.wells.toArray(), [])

  const wellById = {}
  allWells?.forEach(w => { wellById[w.id] = w })

  return (
    <div className="pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="pl-8 pr-4">
        {!fieldRisers?.length && (
          <div className="text-xs text-gray-700 italic py-1">No risers linked yet</div>
        )}
        {fieldRisers?.map(riser => (
          <RiserRow
            key={riser.id}
            riser={riser}
            well={wellById[riser.wellId]}
            onDeleteRiser={onDeleteRiser}
            onAddRun={onAddRun}
            onAddRunFromTee={onAddRunFromTee}
            onOpenRunLog={onOpenRunLog}
            onEditRun={onEditRun}
            onDeleteTee={onDeleteTee}
          />
        ))}
        <button
          onClick={() => onAddRiserToField(field)}
          className="w-full flex items-center justify-center gap-1 py-1 rounded-md text-xs font-medium transition-all active:opacity-70"
          style={{ border: '1px dashed rgba(59,130,246,0.4)', color: '#60a5fa', background: 'transparent' }}>
          + Add riser
        </button>
      </div>
    </div>
  )
}

// ── Field detail (full view — opened via ⚙ icon or map tap) ──────────────────
function FieldDetail({ field, onBack, onEditBoundary, onAddRiserToField, onDeleteRiser, onAddRun, onAddRunFromTee, onOpenRunLog, onEditRun, onDeleteTee }) {
  const fieldRisers = useLiveQuery(() => db.risers.where('fieldId').equals(field.id).toArray(), [field.id])
  const allWells    = useLiveQuery(() => db.wells.toArray(), [])
  const [cropOpen, setCropOpen] = useState(false)

  const wellById = {}
  allWells?.forEach(w => { wellById[w.id] = w })

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
            <span className="text-xs text-gray-500 uppercase tracking-wider">Risers & Runs</span>
          </div>

          {!fieldRisers?.length && (
            <div className="text-xs text-gray-700 italic py-1">No risers yet</div>
          )}

          {fieldRisers?.map(riser => (
            <RiserRow
              key={riser.id}
              riser={riser}
              well={wellById[riser.wellId]}
              onDeleteRiser={onDeleteRiser}
              onAddRun={onAddRun}
              onAddRunFromTee={onAddRunFromTee}
              onOpenRunLog={onOpenRunLog}
              onEditRun={onEditRun}
              onDeleteTee={onDeleteTee}
            />
          ))}

          <button
            onClick={() => onAddRiserToField(field)}
            className="w-full flex items-center justify-center gap-1 py-1 rounded-md text-xs font-medium transition-all active:opacity-70 mt-1"
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

// ── Main panel ────────────────────────────────────────────────────────────────
export default function SidePanel({ selectedField, onSelectField, onFlyToField, onFlyToFarm, onAddField, onAddFarm, onAddWell, onAddRiser, onAddRiserToField, onEditBoundary, onAddRun, onAddRunFromTee, onOpenRunLog, onEditRun, onEditWell, onClose }) {
  const farms  = useLiveQuery(() => db.farms.toArray(), [])
  const fields = useLiveQuery(() => db.fields.toArray(), [])
  const wells  = useLiveQuery(() => db.wells.toArray(), [])
  const risers = useLiveQuery(() => db.risers.toArray(), [])

  const [expanded, setExpanded] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pipemaster-farm-expanded') || '{}') } catch { return {} }
  })
  const [expandedWells, setExpandedWells] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pipemaster-well-expanded') || '{}') } catch { return {} }
  })
  const [expandedFields, setExpandedFields] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pipemaster-field-expanded') || '{}') } catch { return {} }
  })
  const [showSettings, setShowSettings] = useState(false)

  // Wrap action handlers so the panel closes on mobile after the action fires
  function handleEditRun(run) { onEditRun(run); onClose?.() }
  function handleOpenRunLog(run) { onOpenRunLog(run); onClose?.() }
  function handleAddRun(riser) { onAddRun(riser); onClose?.() }

  function toggleFarm(id) {
    setExpanded(prev => {
      const next = { ...prev, [id]: !isOpen(id) }
      localStorage.setItem('pipemaster-farm-expanded', JSON.stringify(next))
      return next
    })
  }
  function isOpen(id) { return expanded[id] === true }

  function toggleWell(id) {
    setExpandedWells(prev => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem('pipemaster-well-expanded', JSON.stringify(next))
      return next
    })
  }

  function toggleField(id) {
    setExpandedFields(prev => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem('pipemaster-field-expanded', JSON.stringify(next))
      return next
    })
  }

  const wellsByFarm = {}
  wells?.forEach(w => {
    if (!wellsByFarm[w.farmId]) wellsByFarm[w.farmId] = []
    wellsByFarm[w.farmId].push(w)
  })

  const risersByWell = {}
  risers?.forEach(r => {
    if (!risersByWell[r.wellId]) risersByWell[r.wellId] = []
    risersByWell[r.wellId].push(r)
  })

  const fieldsByFarm = {}
  fields?.forEach(f => {
    if (!fieldsByFarm[f.farmId]) fieldsByFarm[f.farmId] = []
    fieldsByFarm[f.farmId].push(f)
  })

  const farmById = {}
  farms?.forEach(f => { farmById[f.id] = f })

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
    if (!confirm(`Delete "${riser.name}" and all its runs and history?`)) return
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

  // FieldDetail mode — triggered by ⚙ icon on a field row, or by tapping a field polygon on the map
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

  return (
    <div className="h-full flex flex-col overflow-hidden"
         style={{ width: '100%', background: '#111c2a', borderRight: '1px solid rgba(255,255,255,0.07)' }}>

      <div id="pm-panel-header" className="flex items-center justify-between px-4 py-3"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span className="text-green-400 font-semibold text-sm uppercase tracking-wider">Farms & Fields</span>
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
          const farmFields = fieldsByFarm[farm.id] || []
          const open = isOpen(farm.id)
          return (
            <div key={farm.id} className="mb-0.5">
              {/* Farm header */}
              <div className="flex items-center group hover:bg-white/5 transition-all">
                <button onClick={() => { if (!open) onFlyToFarm?.(farm.id); toggleFarm(farm.id) }}
                        className="flex items-center gap-2 px-4 py-2.5 text-left flex-1 min-w-0">
                  <span className="text-gray-500 text-xs w-3">{open ? '▼' : '▶'}</span>
                  <span className="text-white font-medium text-sm flex-1 truncate">{farm.name}</span>
                  <span className="text-gray-600 text-xs">{farmFields.length}</span>
                </button>
                <button onClick={() => deleteFarm(farm)}
                        className="opacity-0 group-hover:opacity-100 text-red-800 hover:text-red-500 text-sm leading-none transition-all px-3 py-2.5 flex-shrink-0">
                  ×
                </button>
              </div>

              {open && (
                <div className="pb-1">

                  {/* Fields */}
                  {farmFields.length === 0 && (
                    <div className="pl-10 pr-4 py-1 text-gray-600 text-xs italic">No fields yet</div>
                  )}

                  {farmFields.map(field => {
                    const fieldOpen = expandedFields[field.id] === true
                    return (
                      <div key={field.id}>
                        {/* Field row */}
                        <div className="flex items-center gap-0 hover:bg-white/5 transition-all group">
                          {/* Expand toggle + name — click to expand inline */}
                          <button
                            onClick={() => { toggleField(field.id); onFlyToField(field) }}
                            className="flex items-center gap-2 flex-1 min-w-0 pl-8 pr-1 py-2 text-left">
                            <span className="text-gray-600 text-[10px] w-3 flex-shrink-0">
                              {fieldOpen ? '▼' : '▶'}
                            </span>
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ background: field.color || '#94a3b8' }} />
                            <span className="text-gray-200 text-sm flex-1 truncate group-hover:text-white transition-colors">
                              {field.name}
                            </span>
                            {field.crop && (
                              <span className="text-gray-600 text-xs truncate">{field.crop}</span>
                            )}
                          </button>
                          {/* ⚙ → open full FieldDetail view */}
                          <button
                            onClick={() => { onFlyToField(field); onSelectField(field) }}
                            title="Field details"
                            className="text-gray-500 hover:text-blue-400 active:text-blue-300 text-base transition-all px-2 py-1 flex-shrink-0">
                            ⚙
                          </button>
                        </div>

                        {/* Inline risers when field is expanded */}
                        {fieldOpen && (
                          <FieldInlineRows
                            field={field}
                            onDeleteRiser={deleteRiser}
                            onAddRiserToField={onAddRiserToField}
                            onAddRun={handleAddRun}
                            onAddRunFromTee={onAddRunFromTee}
                            onOpenRunLog={handleOpenRunLog}
                            onEditRun={handleEditRun}
                            onDeleteTee={deleteTee}
                          />
                        )}
                      </div>
                    )
                  })}

                  <div className="pl-8 pr-4 mt-1 mb-2">
                    <button onClick={() => onAddField(farm)}
                            className="w-full flex items-center justify-center gap-1 py-1 rounded-md text-xs font-medium transition-all active:opacity-70"
                            style={{ border: '1px dashed rgba(34,197,94,0.4)', color: '#4ade80', background: 'transparent' }}>
                      + Add field
                    </button>
                  </div>

                </div>
              )}
            </div>
          )
        })}

        {/* ── Wells section ─────────────────────────────────────────────── */}
        {farms?.length > 0 && (
          <div className="mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-blue-400 font-semibold text-xs uppercase tracking-wider">Wells</span>
              <button onClick={() => onAddWell(null)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium transition-all active:scale-95"
                      style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.35)', color: '#60a5fa' }}>
                + Add well
              </button>
            </div>

            {!wells?.length && (
              <div className="px-4 pb-3 text-gray-700 text-xs italic">No wells yet</div>
            )}

            {wells?.map(well => {
              const wellOpen = expandedWells[well.id] === true
              const wellRisers = risersByWell[well.id] || []
              const farmName = farmById[well.farmId]?.name
              return (
                <div key={well.id} className="mb-0.5">
                  <div className="flex items-center gap-1 px-3 py-1.5 group hover:bg-white/5 transition-all">
                    <button onClick={() => toggleWell(well.id)}
                            className="flex items-center gap-2 flex-1 min-w-0 text-left">
                      <span className="text-gray-600 text-[10px] w-2.5 flex-shrink-0">{wellOpen ? '▼' : '▶'}</span>
                      <span className="text-base leading-none flex-shrink-0">{well.type === 'electric' ? '⚡' : '⛽'}</span>
                      <span className="text-gray-300 text-sm truncate flex-1">{well.name}</span>
                      {well.gpm && <span className="text-gray-600 text-xs flex-shrink-0">{well.gpm}gpm</span>}
                      {farmName && <span className="text-gray-700 text-xs truncate flex-shrink-0 max-w-[60px]">{farmName}</span>}
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
          </div>
        )}
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
