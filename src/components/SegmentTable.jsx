import { useState, Fragment } from 'react'
import { HOLE_SIZES, HOLE_COLOR } from '../lib/pipeUtils'

function SegRow({ seg, index, prevEndFt, onChange, onRemove }) {
  const color = HOLE_COLOR[seg.holeSize] ?? '#64748b'
  return (
    <div className="flex items-center gap-2 px-3 py-3"
         style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

      {/* Hole size */}
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
      <select
        value={seg.holeSize}
        onChange={e => onChange(index, 'holeSize', e.target.value)}
        className="text-sm text-white border-0 outline-none bg-transparent flex-shrink-0 cursor-pointer"
        style={{ minWidth: 58 }}>
        {HOLE_SIZES.map(s => <option key={s} value={s} style={{ background: '#0f1923' }}>{s}</option>)}
      </select>

      {/* Distance */}
      <span className="text-gray-600 text-xs flex-shrink-0 tabular-nums">{prevEndFt}–</span>
      <input
        type="number"
        value={seg.endFt || ''}
        onChange={e => onChange(index, 'endFt', parseInt(e.target.value) || 0)}
        className="w-16 text-sm text-white text-right bg-transparent border-b border-white/15 outline-none tabular-nums"
        style={{ appearance: 'textfield', MozAppearance: 'textfield' }}
        placeholder="ft"
      />
      <span className="text-gray-600 text-xs flex-shrink-0">ft</span>

      {/* Furrow count */}
      {seg.holeSize !== 'Supply' ? (
        <>
          <span className="text-gray-700 text-xs flex-shrink-0 ml-1">|</span>
          <input
            type="number"
            value={seg.furrowCount || ''}
            onChange={e => onChange(index, 'furrowCount', parseInt(e.target.value) || null)}
            className="w-12 text-sm text-white text-right bg-transparent border-b border-white/15 outline-none tabular-nums"
            style={{ appearance: 'textfield', MozAppearance: 'textfield' }}
            placeholder="0"
          />
          <span className="text-gray-500 text-xs flex-shrink-0">fur</span>
          <button
            onClick={() => onChange(index, 'furrowPattern',
              seg.furrowPattern === 'every' ? 'alternate' : seg.furrowPattern === 'alternate' ? null : 'every')}
            className="text-xs flex-shrink-0 px-1.5 py-0.5 rounded transition-colors ml-1"
            style={{
              color: seg.furrowPattern ? '#4ade80' : '#4b5563',
              border: `1px solid ${seg.furrowPattern ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)'}`,
            }}
            title="Tap to cycle: every furrow / every other / unset">
            {seg.furrowPattern === 'alternate' ? 'alt' : seg.furrowPattern === 'every' ? 'ea' : '–'}
          </button>
        </>
      ) : (
        <span className="flex-1" />
      )}

      <button
        onClick={() => onRemove(index)}
        className="text-red-800 hover:text-red-500 text-base leading-none ml-auto flex-shrink-0 px-1 transition-colors">
        ×
      </button>
    </div>
  )
}

export default function SegmentTable({ segs, setSegs, totalFt }) {
  const [mergeAt, setMergeAt] = useState(null)

  function updateSeg(i, field, val) {
    setSegs(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))
  }

  function removeSeg(i) {
    setSegs(prev => prev.filter((_, idx) => idx !== i))
    if (mergeAt !== null) setMergeAt(null)
  }

  function addSeg() {
    const lastEndFt = segs[segs.length - 1]?.endFt ?? 0
    setSegs(prev => [...prev, { holeSize: '5/8"', endFt: totalFt || lastEndFt, furrowCount: null }])
  }

  function startMerge(i) {
    if (segs[i].holeSize === segs[i + 1].holeSize) {
      doMerge(i, segs[i].holeSize)
    } else {
      setMergeAt(i)
    }
  }

  function doMerge(i, holeSize) {
    const curr = segs[i]
    const next = segs[i + 1]
    const combinedFurrows = (parseInt(curr.furrowCount) || 0) + (parseInt(next.furrowCount) || 0)
    const keptPattern = holeSize === curr.holeSize ? curr.furrowPattern : next.furrowPattern
    setSegs(prev => {
      const updated = [...prev]
      updated[i] = {
        holeSize,
        endFt:         next.endFt,
        furrowCount:   holeSize === 'Supply' ? null : (combinedFurrows || null),
        furrowPattern: holeSize === 'Supply' ? null : (keptPattern ?? null),
      }
      return updated.filter((_, idx) => idx !== i + 1)
    })
    setMergeAt(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">Segments</span>
        <div className="flex items-center gap-2.5">
          {totalFt > 0 && (
            <span className="text-xs font-mono tabular-nums font-semibold" style={{ color: '#fdba74' }}>
              {totalFt.toLocaleString()} ft
            </span>
          )}
          <span className="text-xs text-gray-600">hole · end ft · furrows</span>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        {segs.map((seg, i) => (
          <Fragment key={i}>
            <SegRow
              seg={seg} index={i}
              prevEndFt={i === 0 ? 0 : segs[i - 1].endFt}
              onChange={updateSeg}
              onRemove={removeSeg}
            />

            {/* Between-row merge button */}
            {i < segs.length - 1 && (
              mergeAt === i ? (
                <div className="flex items-center gap-2 px-3 py-2"
                     style={{ background: 'rgba(59,130,246,0.08)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-xs text-blue-400 flex-shrink-0">Keep hole size:</span>
                  <button
                    onClick={() => doMerge(i, segs[i].holeSize)}
                    className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{ background: `${HOLE_COLOR[segs[i].holeSize]}25`, border: `1px solid ${HOLE_COLOR[segs[i].holeSize]}60`, color: HOLE_COLOR[segs[i].holeSize] }}>
                    {segs[i].holeSize}
                  </button>
                  <button
                    onClick={() => doMerge(i, segs[i + 1].holeSize)}
                    className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{ background: `${HOLE_COLOR[segs[i+1].holeSize]}25`, border: `1px solid ${HOLE_COLOR[segs[i+1].holeSize]}60`, color: HOLE_COLOR[segs[i+1].holeSize] }}>
                    {segs[i + 1].holeSize}
                  </button>
                  <button
                    onClick={() => setMergeAt(null)}
                    className="text-gray-600 hover:text-gray-400 text-xs ml-auto transition-colors">
                    cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startMerge(i)}
                  className="w-full py-1 text-xs text-gray-700 hover:text-gray-400 hover:bg-white/3 transition-all"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  ⊞ merge
                </button>
              )
            )}
          </Fragment>
        ))}

        <button
          onClick={addSeg}
          className="w-full py-2.5 text-xs text-blue-500 hover:text-blue-400 transition-colors">
          + Add segment
        </button>
      </div>
    </div>
  )
}
