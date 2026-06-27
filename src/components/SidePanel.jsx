import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import db from '../lib/db'
import { CROPS, cropColor } from '../lib/cropColors'
import EditableText from './EditableText'
import SettingsSheet, { SyncStatusDot } from './SettingsSheet'

// ── Tee row: a T-fitting marker on a run, with its own child runs ────────────
function TeeRow({ tee, onAddRunFromTee, onOpenRunLog, onEditRun }) {
  const teeRuns = useLiveQuery(
    () => db.runs.filter(r => r.teeId === tee.id).toArray(),
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
      </div>
      {teeRuns?.map(tr => (
        <RunWithTees key={tr.id} run={tr} onAddRunFromTee={onAddRunFromTee} onOpenRunLog={onOpenRunLog} onEditRun={onEditRun} />
      ))}
    </div>
  )
}

// ── Run row with nested tee markers ───────────────────────────────────────────
function RunWithTees({ run, onAddRunFromTee, onOpenRunLog, onEditRun }) {
  const tees = useLiveQuery(
    () => db.tees.where('runId').equals(run.id).toArray(),
    [run.id]
  )
  return (
    <div>
      <div className="flex items-center gap-1 py-1 group">
        {run.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 animate-pulse" />}
        <button onClick={() => onOpenRunLog(run)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left py-0.5 hover:opacity-80 transition-opacity">
          <span className="text-orange-400 text-sm flex-shrink-0">→</span>
          <span className="text-gray-300 text-sm truncate">{run.name}</span>
        </button>
        <button
          onClick={() => onEditRun(run)}
          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-blue-400 text-sm transition-all px-1.5 flex-shrink-0">
          ⚙
        </button>
      </div>
      {tees?.map(tee => (
        <TeeRow key={tee.id} tee={tee} onAddRunFromTee={onAddRunFromTee} onOpenRunLog={onOpenRunLog} onEditRun={onEditRun} />
      ))}
    </div>
  )
}

// ── Riser row with its runs ───────────────────────────────────────────────────
function RiserRow({ riser, well, onDeleteRiser, onAddRun, onAddRunFromTee, onOpenRunLog, onEditRun }) {
  const runs = useLiveQuery(
    () => db.runs.where('riserId').equals(riser.id).toArray(),
    [riser.id]
  )

  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 py-1.5 group">
        <span className="text-gray-500 text-xs flex-shrink-0">◆</span>
        <EditableText
          value={riser.name}
          onSave={(name) => db.risers.update(riser.id, { name })}
          className="text-gray-300 text-xs truncate flex-1"
          inputClassName="text-gray-300 text-xs flex-1"
        />
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

      <div className="pl-4 mb-2">
        {runs?.map(run => (
          <RunWithTees key={run.id} run={run} onAddRunFromTee={onAddRunFromTee} onOpenRunLog={onOpenRunLog} onEditRun={onEditRun} />
        ))}
        <button
          onClick={() => onAddRun(riser)}
          className="mt-1 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
          style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.4)', color: '#f97316' }}>
          + Add run
        </button>
      </div>
    </div>
  )
}

// ── Inline risers shown when a field row is expanded ─────────────────────────
function FieldInlineRows({ field, onDeleteRiser, onAddRiserToField, onAddRun, onAddRunFromTee, onOpenRunLog, onEditRun }) {
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
          />
        ))}
        <button
          onClick={() => onAddRiserToField(field)}
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa' }}>
          + Add riser
        </button>
      </div>
    </div>
  )
}

// ── Field detail (full view — opened via ⚙ icon or map tap) ──────────────────
function FieldDetail({ field, onBack, onEditBoundary, onAddRiserToField, onDeleteRiser, onAddRun, onAddRunFromTee, onOpenRunLog, onEditRun }) {
  const fieldRisers = useLiveQuery(() => db.risers.where('fieldId').equals(field.id).toArray(), [field.id])
  const allWells    = useLiveQuery(() => db.wells.toArray(), [])

  const wellById = {}
  allWells?.forEach(w => { wellById[w.id] = w })

  async function handleCropChange(crop) {
    await db.fields.update(field.id, { crop, color: cropColor(crop) })
  }

  async function handleDeleteField() {
    if (!confirm(`Delete "${field.name}"? This cannot be undone.`)) return
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

        <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Crop</div>
          <div className="flex flex-wrap gap-2">
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
                  }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col }} />
                  {c}
                </button>
              )
            })}
          </div>
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
            />
          ))}

          <button
            onClick={() => onAddRiserToField(field)}
            className="w-full flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 mt-1"
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa' }}>
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
export default function SidePanel({ selectedField, onSelectField, onFlyToField, onAddField, onAddFarm, onAddWell, onAddRiser, onAddRiserToField, onEditBoundary, onAddRun, onAddRunFromTee, onOpenRunLog, onEditRun }) {
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

  async function deleteWell(well) {
    if (!confirm(`Delete "${well.name}"?`)) return
    const wellRisers = await db.risers.where('wellId').equals(well.id).toArray()
    const riserIds = wellRisers.map(r => r.id)
    await db.undergrounds.where('fromType').equals('well').and(u => u.fromId === well.id).delete()
    if (riserIds.length) {
      await db.undergrounds.where('fromType').equals('riser').and(u => riserIds.includes(u.fromId)).delete()
      await db.undergrounds.where('riserId').anyOf(riserIds).delete()
      await db.risers.where('wellId').equals(well.id).delete()
    }
    await db.wells.delete(well.id)
  }

  async function deleteRiser(riser) {
    if (!confirm(`Delete "${riser.name}"?`)) return
    await db.undergrounds.where('riserId').equals(riser.id).delete()
    await db.undergrounds.where('fromType').equals('riser').and(u => u.fromId === riser.id).delete()
    await db.risers.delete(riser.id)
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
          onAddRun={onAddRun}
          onAddRunFromTee={onAddRunFromTee}
          onOpenRunLog={onOpenRunLog}
          onEditRun={onEditRun}
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden"
         style={{ width: '100%', background: '#111c2a', borderRight: '1px solid rgba(255,255,255,0.07)' }}>

      <div className="flex items-center justify-between px-4 py-3"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span className="text-green-400 font-semibold text-sm uppercase tracking-wider">Farms & Fields</span>
        <button onClick={onAddFarm}
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
              <button onClick={() => toggleFarm(farm.id)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 transition-all text-left">
                <span className="text-gray-500 text-xs w-3">{open ? '▼' : '▶'}</span>
                <span className="text-white font-medium text-sm flex-1 truncate">{farm.name}</span>
                <span className="text-gray-600 text-xs">{farmFields.length}</span>
              </button>

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
                            className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-blue-400 text-sm transition-all px-2 py-2 flex-shrink-0">
                            ⚙
                          </button>
                        </div>

                        {/* Inline risers when field is expanded */}
                        {fieldOpen && (
                          <FieldInlineRows
                            field={field}
                            onDeleteRiser={deleteRiser}
                            onAddRiserToField={onAddRiserToField}
                            onAddRun={onAddRun}
                            onAddRunFromTee={onAddRunFromTee}
                            onOpenRunLog={onOpenRunLog}
                            onEditRun={onEditRun}
                          />
                        )}
                      </div>
                    )
                  })}

                  <div className="pl-8 pr-4 mt-1 mb-2">
                    <button onClick={() => onAddField(farm)}
                            className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80' }}>
                      + Add field
                    </button>
                  </div>

                  {/* Wells */}
                  <div className="mt-1 pl-9 pr-4 pb-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-gray-600 text-xs uppercase tracking-wider">Wells</span>
                      <button onClick={() => onAddWell(farm)}
                              className="px-2.5 py-1 rounded-md text-xs font-medium transition-all active:scale-95"
                              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.35)', color: '#60a5fa' }}>
                        + Add well
                      </button>
                    </div>
                    {(wellsByFarm[farm.id] || []).map(well => {
                      const wellOpen = expandedWells[well.id] === true
                      const wellRisers = risersByWell[well.id] || []
                      return (
                        <div key={well.id}>
                          {/* Well row */}
                          <button onClick={() => toggleWell(well.id)}
                                  className="w-full flex items-center gap-2 py-1.5 group text-left">
                            <span className="text-gray-600 text-[10px] w-2.5 flex-shrink-0">{wellOpen ? '▼' : '▶'}</span>
                            <span className="text-base leading-none flex-shrink-0">
                              {well.type === 'electric' ? '⚡' : '⛽'}
                            </span>
                            <span className="text-gray-300 text-sm truncate flex-1">{well.name}</span>
                            <span className="text-gray-600 text-xs flex-shrink-0">{wellRisers.length}</span>
                            <span className="text-xs flex-shrink-0"
                                  style={{ color: well.type === 'electric' ? '#3b82f6' : '#f97316' }}>
                              {well.type === 'electric' ? 'Elec' : 'Diesel'}
                            </span>
                            <span
                              onClick={(e) => { e.stopPropagation(); deleteWell(well) }}
                              className="opacity-0 group-hover:opacity-100 text-red-700 hover:text-red-500 text-xs leading-none transition-all px-1 flex-shrink-0">
                              ×
                            </span>
                          </button>
                          {/* Risers under this well */}
                          {wellOpen && (
                            <div className="pl-4 mb-1">
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
                              {!wellRisers.length && (
                                <div className="text-gray-700 text-xs italic py-1">No risers yet</div>
                              )}
                              <button onClick={() => onAddRiser(well)}
                                      className="mt-1 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                                      style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa' }}>
                                + Add riser
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {!(wellsByFarm[farm.id]?.length) && (
                      <div className="text-gray-700 text-xs italic py-1">No wells yet</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {farms?.length > 0 && (
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={onAddFarm}
                  className="w-full py-2 rounded-lg text-sm text-green-500 hover:text-green-400 border border-green-500/20 hover:border-green-500/40 transition-all">
            + New Farm
          </button>
        </div>
      )}

      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={() => setShowSettings(true)}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg text-sm text-gray-300 hover:text-white border border-white/10 hover:border-white/25 transition-all">
          <span className="flex items-center gap-2">⚙ Settings</span>
          <SyncStatusDot />
        </button>
      </div>

      {showSettings && <SettingsSheet onClose={() => setShowSettings(false)} />}
    </div>
  )
}
