import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BottomSheet from './BottomSheet'
import SegmentTable from './SegmentTable'
import db from '../lib/db'
import { pathTotalFt, applyRangeEdit } from '../lib/pipeUtils'
import { parsePipeSheet } from '../lib/parseSheet'

export default function EditRunSheet({ run, drawnPath, onDrawRequest, onAddTeeRequest, onAddRunFromTee, onMarkHolesRequest, markedSegs, onRangeEditRequest, rangeEditResult, onClose, onSaved }) {
  const existingSegments = useLiveQuery(
    () => db.segments.where('runId').equals(run.id).toArray(),
    [run.id]
  )
  const tees = useLiveQuery(
    () => db.tees.where('runId').equals(run.id).toArray(),
    [run.id]
  )

  const [path, setPath]                   = useState(run.path ?? null)
  const [name, setName]                   = useState(run.name ?? '')
  const [furrowPattern, setFurrowPattern] = useState(run.furrowPattern ?? null)
  const [lines, setLines]                 = useState(null)
  const [saving, setSaving]               = useState(false)
  const [importing, setImporting]         = useState(false)
  const [importError, setImportError]     = useState(null)
  const [importedRuns, setImportedRuns]   = useState(null)

  // Sync when parent passes back a newly drawn path
  useEffect(() => {
    if (drawnPath?.length) setPath(drawnPath)
  }, [drawnPath])

  // Sync when parent passes back segments marked on the map for a specific line
  useEffect(() => {
    if (!markedSegs) return
    setLines(prev => {
      if (!prev || !prev[markedSegs.lineIndex]) return prev
      const updated = [...prev]
      updated[markedSegs.lineIndex] = { ...updated[markedSegs.lineIndex], segs: markedSegs.segs }
      return updated
    })
  }, [markedSegs])

  // Apply range edit result from map interaction
  useEffect(() => {
    if (!rangeEditResult) return
    setLines(prev => {
      if (!prev) return prev
      const updated = [...prev]
      const line = updated[rangeEditResult.lineIdx]
      if (!line) return prev
      updated[rangeEditResult.lineIdx] = {
        ...line,
        segs: applyRangeEdit(line.segs, rangeEditResult.startFt, rangeEditResult.endFt, rangeEditResult.holeSize, rangeEditResult.furrowPattern),
      }
      return updated
    })
  }, [rangeEditResult?.at])

  useEffect(() => {
    if (!existingSegments || lines !== null) return
    if (existingSegments.length === 0) {
      const ft = Math.round(pathTotalFt(run.path ?? []))
      setLines([{ name: 'Line 1', segs: [{ holeSize: 'Supply', endFt: ft, furrowCount: null }] }])
      return
    }
    const grouped = {}
    existingSegments.forEach(s => {
      const lineName = s.line || 'Line 1'
      if (!grouped[lineName]) grouped[lineName] = []
      grouped[lineName].push(s)
    })
    const lineArr = Object.entries(grouped).map(([lineName, segs]) => ({
      name: lineName,
      segs: [...segs].sort((a, b) => a.sortOrder - b.sortOrder).map(s => ({
        holeSize:      s.holeSize,
        endFt:         s.endFt,
        furrowCount:   s.furrowCount ?? null,
        furrowPattern: s.furrowPattern ?? null,
      })),
    }))
    setLines(lineArr)
  }, [existingSegments])

  const totalFt = Math.round(pathTotalFt(path ?? []))

  function applyRun(r) {
    setLines(prev => {
      const updated = [...(prev ?? [])]
      updated[0] = {
        name: updated[0]?.name ?? 'Line 1',
        segs: r.segments.map(s => ({
          holeSize:    s.holeSize,
          endFt:       s.endFt,
          furrowCount: s.furrowCount ?? null,
        })),
      }
      return updated
    })
    setImportedRuns(null)
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setImportError(null)
    setImporting(true)
    try {
      const result = await parsePipeSheet(file)
      if (!result.runs?.length) throw new Error('No runs found')
      if (result.runs.length === 1) {
        applyRun(result.runs[0])
      } else {
        setImportedRuns(result.runs)
      }
    } catch (err) {
      setImportError('Could not read schematic — try a clearer screenshot.')
      console.error(err)
    } finally {
      setImporting(false)
    }
  }

  function addLine() {
    const ft = Math.round(pathTotalFt(path ?? []))
    setLines(prev => [...(prev ?? []), {
      name: `Line ${(prev?.length ?? 0) + 1}`,
      segs: [
        { holeSize: 'Supply', endFt: 0,         furrowCount: null },
        { holeSize: '5/8"',   endFt: ft || 1000, furrowCount: null },
      ],
    }])
  }
  function removeLine(i) {
    setLines(prev => prev.filter((_, idx) => idx !== i))
  }
  function renameLine(i, lineName) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, name: lineName } : l))
  }
  function setLineSegs(i, updater) {
    setLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l
      const segs = typeof updater === 'function' ? updater(l.segs) : updater
      return { ...l, segs }
    }))
  }

  async function handleSave() {
    if (!name.trim() || !lines) return
    setSaving(true)
    const update = { name: name.trim(), furrowPattern: furrowPattern ?? null }
    if (path?.length) update.path = path
    await db.runs.update(run.id, update)
    await db.segments.where('runId').equals(run.id).delete()
    for (const line of lines) {
      for (let i = 0; i < line.segs.length; i++) {
        const seg     = line.segs[i]
        const startFt = i === 0 ? 0 : line.segs[i - 1].endFt
        await db.segments.add({
          runId:       run.id,
          line:        line.name,
          startFt,
          endFt:         seg.endFt,
          holeSize:      seg.holeSize,
          furrowCount:   seg.holeSize === 'Supply' ? null : (parseInt(seg.furrowCount) || null),
          furrowPattern: seg.holeSize === 'Supply' ? null : (seg.furrowPattern ?? null),
          sortOrder:     i,
        })
      }
    }
    onSaved()
  }

  async function handleDelete() {
    if (!confirm(`Delete run "${run.name}"? This cannot be undone.`)) return
    await db.waterLogs.where('runId').equals(run.id).delete()
    await db.segments.where('runId').equals(run.id).delete()
    await db.tees.where('runId').equals(run.id).delete()
    await db.runs.delete(run.id)
    onSaved()
  }

  if (!lines) {
    return (
      <BottomSheet title={`Edit: ${run.name}`} onClose={onClose}>
        <div className="text-center text-gray-500 py-6 text-sm">Loading…</div>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet title={`Edit: ${run.name}`} onClose={onClose}>
      <div className="flex flex-col gap-4">

        <div>
          <label className="text-sm text-gray-400 mb-1 block">Run name</label>
          <input
            className="w-full rounded-lg px-4 py-3 text-white text-base outline-none border border-white/10 focus:border-green-500"
            style={{ background: '#0f1923' }}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Furrow pattern */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Furrow pattern <span className="text-gray-600">(optional)</span></label>
          <div className="flex gap-2">
            {[
              { value: 'every',     label: 'Every furrow',      color: '#22c55e' },
              { value: 'alternate', label: 'Every other furrow', color: '#f97316' },
            ].map(opt => (
              <button key={opt.value}
                      onClick={() => setFurrowPattern(furrowPattern === opt.value ? null : opt.value)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all"
                      style={{
                        borderColor: furrowPattern === opt.value ? opt.color : 'rgba(255,255,255,0.1)',
                        background:  furrowPattern === opt.value ? `${opt.color}20` : 'transparent',
                        color:       furrowPattern === opt.value ? opt.color : '#6b7280',
                      }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Path */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Path
            {totalFt > 0 && (
              <span className="text-gray-300 tabular-nums ml-2">~{totalFt.toLocaleString()} ft</span>
            )}
          </div>
          <button
            onClick={onDrawRequest}
            className="px-4 py-2.5 rounded-xl border border-green-500/40 text-green-400 text-sm font-medium hover:bg-green-500/10 active:bg-green-500/20 transition-all">
            Edit path
          </button>
        </div>

        {/* Inline tees on this run */}
        <div className="flex flex-col gap-2">
          {tees?.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {tees.map(tee => (
                <div key={tee.id} className="flex items-center gap-2 px-3 py-3"
                     style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-green-500 text-base flex-shrink-0">⊢</span>
                  <span className="text-gray-300 text-sm flex-1 truncate">{tee.name}</span>
                  <span className="text-gray-600 text-xs tabular-nums flex-shrink-0">{tee.atFt} ft</span>
                  <button
                    onClick={() => onAddRunFromTee(tee)}
                    className="px-3 py-1.5 rounded-lg border border-green-500/40 text-green-400 text-xs font-medium hover:bg-green-500/10 flex-shrink-0 ml-1">
                    + Run
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => onAddTeeRequest({ ...run, path })}
            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border border-green-500/40 text-green-400 text-sm font-medium hover:bg-green-500/10 active:bg-green-500/20 transition-all">
            ⊢ Add Inline Tee
          </button>
        </div>

        {/* Segment re-import */}
        <div className="flex gap-1.5">
          <label className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-all ${
            importing ? 'text-gray-500 border-white/10 cursor-not-allowed' : 'border-blue-500/40 text-blue-400 cursor-pointer hover:bg-blue-500/10'
          }`}>
            {importing ? '⏳' : '📷 Snap schematic'}
            <input type="file" accept="image/*" capture="environment" className="hidden" disabled={importing} onChange={handleImport} />
          </label>
          <label className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-all ${
            importing ? 'text-gray-500 border-white/10 cursor-not-allowed' : 'border-blue-500/40 text-blue-400 cursor-pointer hover:bg-blue-500/10'
          }`}>
            {importing ? '⏳' : '📁 File / PDF'}
            <input type="file" accept="image/*,application/pdf" className="hidden" disabled={importing} onChange={handleImport} />
          </label>
        </div>
        {importError && (
          <div className="text-xs text-red-400 -mt-3 text-center">{importError}</div>
        )}

        {/* Multi-run picker */}
        {importedRuns && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
            <div className="px-3 py-2 text-xs text-blue-400" style={{ background: 'rgba(59,130,246,0.1)' }}>
              Multiple runs found — pick one:
            </div>
            {importedRuns.map((r, i) => (
              <button key={i} onClick={() => applyRun(r)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {r.name || `Run ${i + 1}`}
                <span className="text-gray-600 text-xs ml-2">{r.segments.length} segments</span>
              </button>
            ))}
            <button onClick={() => setImportedRuns(null)}
                    className="w-full text-center text-xs text-gray-600 py-2 hover:text-gray-400 transition-colors"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              Cancel
            </button>
          </div>
        )}

        {/* One segment table per physical line sharing this path */}
        {lines.map((line, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <input
                value={line.name}
                onChange={e => renameLine(i, e.target.value)}
                className="text-base text-gray-200 font-medium bg-transparent border-b border-white/10 focus:border-green-500 outline-none px-0.5 py-1"
              />
              {lines.length > 1 && (
                <button onClick={() => removeLine(i)}
                        className="text-red-700 hover:text-red-500 text-xs transition-colors">
                  Remove line
                </button>
              )}
            </div>
            <button
              onClick={() => onMarkHolesRequest(path, i)}
              disabled={!path?.length}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border border-green-500/40 text-green-400 text-sm font-medium hover:bg-green-500/10 active:bg-green-500/20 disabled:opacity-30 transition-all">
              📍 Mark hole sizes on map
            </button>
            <button
              onClick={() => onRangeEditRequest(path, i)}
              disabled={!path?.length}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border border-orange-500/40 text-orange-400 text-sm font-medium hover:bg-orange-500/10 active:bg-orange-500/20 disabled:opacity-30 transition-all">
              ✏️ Edit range on map
            </button>
            <SegmentTable segs={line.segs} setSegs={(u) => setLineSegs(i, u)} totalFt={totalFt} />
          </div>
        ))}

        <button
          onClick={addLine}
          className="w-full py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/25 text-sm font-medium transition-all">
          + Add line <span className="text-gray-600">(same pipe, punched the other side too)</span>
        </button>

        <button
          disabled={!name.trim() || saving}
          onClick={handleSave}
          className="w-full py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-400 disabled:opacity-40 transition-all">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        <button
          onClick={handleDelete}
          className="w-full py-2 rounded-xl text-sm text-red-700 hover:text-red-500 border border-red-900/40 hover:border-red-700/40 transition-all">
          Delete Run
        </button>
      </div>
    </BottomSheet>
  )
}
