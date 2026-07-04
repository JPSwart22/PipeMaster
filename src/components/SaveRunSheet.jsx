import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import SegmentTable from './SegmentTable'
import db from '../lib/db'
import { pathTotalFt } from '../lib/pipeUtils'
import { parsePipeSheet } from '../lib/parseSheet'

export default function SaveRunSheet({ path: initialPath, riserId, fieldId, teeId, riser, field, onClose, onSaved, onDrawRequest, onMarkHolesRequest, markedSegs }) {
  const [path, setPath]                   = useState(initialPath ?? null)
  const [name, setName]                   = useState('')
  const [saving, setSaving]               = useState(false)
  const [importing, setImporting]         = useState(false)
  const [importError, setImportError]     = useState(null)
  const [importedRuns, setImportedRuns]   = useState(null)
  const [importedFlowRate, setImportedFlowRate] = useState(null)
  // When AI can't detect pattern, store the run here and prompt user to pick
  const [pendingPatternPick, setPendingPatternPick] = useState(null)
  const [lines, setLines] = useState([
    { name: 'Line 1', segs: [
      { holeSize: 'Supply', endFt: 0, furrowCount: null },
    ]},
  ])

  // Sync when parent passes back a newly drawn path; extend the simple single-line default to cover it
  useEffect(() => {
    if (!initialPath?.length) return
    setPath(initialPath)
    const ft = Math.round(pathTotalFt(initialPath))
    if (ft > 0) {
      setLines(prev => {
        if (prev.length !== 1) return prev // multiple lines: farmer manages each end point explicitly
        const line = { ...prev[0], segs: [...prev[0].segs] }
        const last = { ...line.segs[line.segs.length - 1] }
        if (last.endFt < ft) last.endFt = ft
        line.segs[line.segs.length - 1] = last
        return [line]
      })
    }
  }, [initialPath])

  // Sync when parent passes back segments marked on the map for a specific line
  useEffect(() => {
    if (!markedSegs) return
    setLines(prev => {
      if (!prev[markedSegs.lineIndex]) return prev
      const updated = [...prev]
      updated[markedSegs.lineIndex] = { ...updated[markedSegs.lineIndex], segs: markedSegs.segs }
      return updated
    })
  }, [markedSegs])

  const totalFt = Math.round(pathTotalFt(path ?? []))

  function applyRun(run, waypoints, flowRateGPM) {
    // Name the line by its pattern so PunchingMode can auto-select the right segments
    const lineName = run.furrowPattern === 'every'     ? 'Every furrow'
                   : run.furrowPattern === 'alternate' ? 'Every other furrow'
                   : null

    const newLineSegs = run.segments.map(s => ({
      holeSize:    s.holeSize,
      endFt:       s.endFt,
      furrowCount: s.furrowCount ?? null,
    }))

    setLines(prev => {
      if (lineName) {
        // Replace matching pattern line if it exists, otherwise add
        const existingIdx = prev.findIndex(l => l.name === lineName)
        if (existingIdx >= 0) {
          const updated = [...prev]
          updated[existingIdx] = { name: lineName, segs: newLineSegs }
          return updated
        }
        // First import: replace the blank default; second import: add alongside
        if (prev.length === 1 && prev[0].name === 'Line 1') {
          return [{ name: lineName, segs: newLineSegs }]
        }
        return [...prev, { name: lineName, segs: newLineSegs }]
      }
      // No pattern detected — replace line 0 as before
      const updated = [...prev]
      updated[0] = { name: updated[0]?.name ?? 'Line 1', segs: newLineSegs }
      return updated
    })

    if (!path?.length && waypoints?.length >= 2) setPath(waypoints)
    setImportedRuns(null)
    if (!name.trim() && run.name) setName(run.name)
    if (flowRateGPM) setImportedFlowRate(flowRateGPM)
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setImportError(null)
    setImporting(true)
    try {
      const geoContext = (field?.boundary?.length && riser)
        ? { fieldBoundary: field.boundary, riserLat: riser.lat, riserLon: riser.lon }
        : null

      const result = await parsePipeSheet(file, geoContext)
      if (!result.runs?.length) throw new Error('No runs found')

      const waypoints   = result.pathWaypoints ?? null
      const flowRateGPM = result.flowRateGPM   ?? null

      if (result.runs.length === 1) {
        const run = result.runs[0]
        if (!run.furrowPattern) {
          // AI couldn't detect pattern — ask the user
          setPendingPatternPick({ run, waypoints, flowRateGPM })
        } else {
          applyRun(run, waypoints, flowRateGPM)
        }
      } else {
        setImportedRuns({ runs: result.runs, waypoints, flowRateGPM })
      }
    } catch (err) {
      setImportError('Could not read schematic — try a clearer screenshot.')
      console.error(err)
    } finally {
      setImporting(false)
    }
  }

  function pickPatternAndApply(pattern) {
    if (!pendingPatternPick) return
    const { run, waypoints, flowRateGPM } = pendingPatternPick
    applyRun({ ...run, furrowPattern: pattern }, waypoints, flowRateGPM)
    setPendingPatternPick(null)
  }

  function addLine() {
    const ft = Math.round(pathTotalFt(path ?? []))
    setLines(prev => [...prev, {
      name: `Line ${prev.length + 1}`,
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
    if (!name.trim() || !path?.length) return
    setSaving(true)
    // Derive run-level pattern from line names (null if both patterns present)
    const hasEvery     = lines.some(l => /every furrow/i.test(l.name) && !/other/i.test(l.name))
    const hasAlternate = lines.some(l => /every other|alternate/i.test(l.name))
    const derivedPattern = hasEvery && !hasAlternate ? 'every'
                         : hasAlternate && !hasEvery ? 'alternate'
                         : null
    const runId = await db.runs.add({
      fieldId:      fieldId ?? null,
      riserId:      riserId ?? null,
      wellId:       null,
      teeId:        teeId ?? null,
      furrowPattern: derivedPattern,
      name:         name.trim(),
      path,
      status:       'idle',
      createdAt:    Date.now(),
    })
    for (const line of lines) {
      for (let i = 0; i < line.segs.length; i++) {
        const seg     = line.segs[i]
        const startFt = i === 0 ? 0 : line.segs[i - 1].endFt
        await db.segments.add({
          runId,
          line:        line.name,
          startFt,
          endFt:         seg.endFt,
          holeSize:      seg.holeSize,
          furrowCount:   seg.holeSize === 'Supply' ? null : (seg.furrowCount ?? null),
          furrowPattern: seg.holeSize === 'Supply' ? null : (seg.furrowPattern ?? null),
          sortOrder:     i,
        })
      }
    }
    onSaved()
  }

  return (
    <BottomSheet title={teeId ? 'Add Run From Tee' : 'Add Run'} onClose={onClose}>
      <div className="flex flex-col gap-4">

        <div>
          <label className="text-sm text-gray-400 mb-1 block">Run name</label>
          <input
            autoFocus
            className="w-full rounded-lg px-4 py-3 text-white text-base outline-none border border-white/10 focus:border-green-500"
            style={{ background: '#0f1923' }}
            placeholder="e.g. Main Run, Inline Tee Left, North Pad"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Path + schematic import */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Pipe path</span>
            {path?.length >= 2
              ? <span className="text-green-400 tabular-nums">✓ {totalFt.toLocaleString()} ft</span>
              : <span className="text-yellow-600">Not set</span>
            }
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onDrawRequest}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-green-500/40 text-green-400 text-sm font-medium hover:bg-green-500/10 active:bg-green-500/20 transition-all">
              Draw on map
            </button>
            <div className="flex gap-1.5">
              <label className={`flex-1 flex items-center justify-center gap-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                importing ? 'text-gray-500 border-white/10 cursor-not-allowed' : 'border-blue-500/40 text-blue-400 cursor-pointer hover:bg-blue-500/10 active:bg-blue-500/20'
              }`}>
                {importing ? '⏳' : '📷'}
                <input type="file" accept="image/*" capture="environment" className="hidden" disabled={importing} onChange={handleImport} />
              </label>
              <label className={`flex-1 flex items-center justify-center gap-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                importing ? 'text-gray-500 border-white/10 cursor-not-allowed' : 'border-blue-500/40 text-blue-400 cursor-pointer hover:bg-blue-500/10 active:bg-blue-500/20'
              }`}>
                {importing ? '⏳' : '📁 Sheet'}
                <input type="file" accept="image/*,application/pdf" className="hidden" disabled={importing} onChange={handleImport} />
              </label>
            </div>
          </div>

          {field?.boundary?.length && riser && (
            <div className="text-xs text-gray-600 text-center">Import auto-places path from field boundary</div>
          )}
          {importError && <div className="text-xs text-red-400 text-center">{importError}</div>}
          {importedFlowRate && (
            <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#93c5fd' }}>
              💧 Sheet shows <strong>{importedFlowRate} GPM</strong> — tap the well ⚙ to save this to the well record
            </div>
          )}
        </div>

        {/* Pattern prompt — when AI can't detect every/alternate */}
        {pendingPatternPick && (
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="text-sm text-gray-300 font-medium">Which pattern is this schematic?</div>
            {[
              { value: 'every',     label: 'Every furrow',      color: '#22c55e' },
              { value: 'alternate', label: 'Every other furrow', color: '#f97316' },
            ].map(opt => (
              <button key={opt.value} onClick={() => pickPatternAndApply(opt.value)}
                      className="w-full py-3 rounded-xl font-semibold text-base border-2 transition-all active:scale-95"
                      style={{ borderColor: opt.color, color: opt.color, background: `${opt.color}12` }}>
                {opt.label}
              </button>
            ))}
            <button onClick={() => { applyRun(pendingPatternPick.run, pendingPatternPick.waypoints, pendingPatternPick.flowRateGPM); setPendingPatternPick(null) }}
                    className="text-xs text-gray-600 py-1 text-center">
              Skip — no pattern
            </button>
          </div>
        )}

        {/* Second schematic import — shown after first pattern line is imported */}
        {!pendingPatternPick && lines.some(l => /every furrow|every other|alternate/i.test(l.name)) && lines.length < 2 && (
          <div className="flex gap-1.5">
            <label className={`flex-1 flex items-center justify-center gap-1 py-3 rounded-xl border text-sm font-medium transition-all ${
              importing ? 'text-gray-500 border-white/10 cursor-not-allowed' : 'border-orange-500/40 text-orange-400 cursor-pointer hover:bg-orange-500/10 active:bg-orange-500/20'
            }`}>
              {importing ? '⏳' : '📷 Second sheet'}
              <input type="file" accept="image/*" capture="environment" className="hidden" disabled={importing} onChange={handleImport} />
            </label>
            <label className={`flex-1 flex items-center justify-center gap-1 py-3 rounded-xl border text-sm font-medium transition-all ${
              importing ? 'text-gray-500 border-white/10 cursor-not-allowed' : 'border-orange-500/40 text-orange-400 cursor-pointer hover:bg-orange-500/10 active:bg-orange-500/20'
            }`}>
              {importing ? '⏳' : '📁 Second sheet'}
              <input type="file" accept="image/*,application/pdf" className="hidden" disabled={importing} onChange={handleImport} />
            </label>
          </div>
        )}

        {/* Multi-run picker */}
        {importedRuns && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
            <div className="px-3 py-2 text-xs text-blue-400" style={{ background: 'rgba(59,130,246,0.1)' }}>
              Multiple runs found — which one is this pipe?
            </div>
            {importedRuns.runs.map((r, i) => (
              <button key={i} onClick={() => applyRun(r, importedRuns.waypoints, importedRuns.flowRateGPM)}
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
            <SegmentTable segs={line.segs} setSegs={(u) => setLineSegs(i, u)} totalFt={totalFt} />
          </div>
        ))}

        <button
          onClick={addLine}
          className="w-full py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/25 text-sm transition-all">
          + Add line <span className="text-gray-600">(same pipe, punched the other side too)</span>
        </button>

        <button
          disabled={!name.trim() || !path?.length || saving}
          onClick={handleSave}
          className="w-full py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-400 disabled:opacity-40 transition-all">
          {saving ? 'Saving…' : !path?.length ? 'Import schematic to place run' : 'Save Run'}
        </button>
      </div>
    </BottomSheet>
  )
}
