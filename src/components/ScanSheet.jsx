import { useRef, useState } from 'react'
import { parsePipeSheet } from '../lib/parseSheet'
import { holeColor } from '../lib/holeColors'
import BottomSheet from './BottomSheet'

export default function ScanSheet({ onRunSelected, onClose }) {
  const inputRef  = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setError(null)
    setResult(null)
    try {
      const data = await parsePipeSheet(file)
      setResult(data)
    } catch (err) {
      setError('Could not read the sheet. Try a clearer photo — lay it flat with good lighting.')
      console.error(err)
    } finally {
      setScanning(false)
    }
  }

  return (
    <BottomSheet title="Scan Pipe Planner Sheet" onClose={onClose}>
      <div className="flex flex-col gap-4">

        {/* Scan button */}
        {!result && !scanning && (
          <>
            <div className="text-sm text-gray-400 leading-relaxed">
              Take a photo of your Delta Plastics Pipe Planner sheet.
              Claude will read the hole sizes and distances automatically.
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFile}
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full py-4 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-400 transition-all flex items-center justify-center gap-2">
              📷  Take Photo of Sheet
            </button>
            <button
              onClick={() => { if(inputRef.current) { inputRef.current.removeAttribute('capture'); inputRef.current.click() }}}
              className="w-full py-3 rounded-xl text-sm text-gray-400 border border-white/10 hover:border-white/25 transition-all">
              Or choose a photo from library
            </button>
          </>
        )}

        {/* Scanning */}
        {scanning && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-gray-400 text-sm">Reading sheet…</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex flex-col gap-3">
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-900/40 rounded-lg px-4 py-3">
              {error}
            </div>
            <button onClick={() => { setError(null); inputRef.current?.click() }}
                    className="w-full py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-400 transition-all">
              Try Again
            </button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="flex flex-col gap-3">
            {result.farm && (
              <div className="text-xs text-gray-500">
                {result.farm} — {result.field} &nbsp;•&nbsp;
                {result.flowRateGPM ? `${result.flowRateGPM} GPM` : ''}
                {result.pipeLengthFt ? ` • ${result.pipeLengthFt} ft` : ''}
              </div>
            )}

            <div className="text-sm text-gray-400 font-medium">
              Found {result.runs?.length ?? 0} run{result.runs?.length !== 1 ? 's' : ''} — tap one to use it:
            </div>

            {result.runs?.map((run, i) => (
              <button key={i} onClick={() => onRunSelected(run)}
                      className="w-full text-left rounded-xl border border-white/10 hover:border-green-500/50 hover:bg-green-500/5 transition-all overflow-hidden">
                <div className="px-4 py-2.5 flex items-center justify-between"
                     style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-white font-medium text-sm">{run.name}</span>
                  <span className="text-gray-500 text-xs">{run.segments?.length} segments</span>
                </div>
                {/* Segment color strip */}
                <div className="flex h-3">
                  {run.segments?.map((seg, j) => {
                    const total = run.segments.reduce((s, x) => s + (x.endFt - x.startFt), 0)
                    const width = ((seg.endFt - seg.startFt) / total) * 100
                    return (
                      <div key={j} style={{ width: `${width}%`, background: holeColor(seg.holeSize) }} />
                    )
                  })}
                </div>
                <div className="px-4 py-2 flex flex-wrap gap-2">
                  {run.segments?.map((seg, j) => (
                    <span key={j} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: `${holeColor(seg.holeSize)}25`, color: holeColor(seg.holeSize) }}>
                      {seg.holeSize} {seg.startFt}–{seg.endFt}ft
                    </span>
                  ))}
                </div>
              </button>
            ))}

            <button onClick={() => setResult(null)}
                    className="text-gray-600 text-sm hover:text-gray-400 transition-colors text-center">
              Scan a different sheet
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
