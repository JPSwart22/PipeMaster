import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BottomSheet from './BottomSheet'
import db from '../lib/db'
import { startRun, stopRun } from '../lib/runOps'
import { formatDuration, formatDateTime } from '../lib/format'

export default function RunLogSheet({ run, onClose, onEditDetails }) {
  const logs = useLiveQuery(
    () => db.waterLogs.where('runId').equals(run.id).reverse().sortBy('startTime'),
    [run.id]
  )
  const [gpmInput, setGpmInput] = useState('')
  const isRunning = run.status === 'running'

  async function handleStart() {
    await startRun(run)
  }

  async function handleStop() {
    await stopRun(run, parseFloat(gpmInput) || null)
    setGpmInput('')
  }

  async function handleDeleteLog(id) {
    if (!confirm('Delete this log entry?')) return
    await db.waterLogs.delete(id)
  }

  return (
    <BottomSheet title={run.name} onClose={onClose}>
      <div className="flex flex-col gap-4">

        {isRunning ? (
          <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <div className="text-green-400 text-sm font-medium">● Running since {formatDateTime(run.startTime)}</div>
            <input
              type="number"
              value={gpmInput}
              onChange={e => setGpmInput(e.target.value)}
              placeholder="GPM reading (optional)"
              className="w-full rounded-lg px-4 py-3 text-white text-base outline-none border border-white/10 focus:border-green-500"
              style={{ background: '#0f1923' }}
            />
            <button onClick={handleStop}
                    className="w-full py-4 rounded-xl font-semibold text-white text-lg bg-red-500 hover:bg-red-400 transition-all">
              ⏹ Stop Run
            </button>
          </div>
        ) : (
          <button onClick={handleStart}
                  className="w-full py-4 rounded-xl font-semibold text-white text-lg bg-green-500 hover:bg-green-400 transition-all">
            ▶ Start Run
          </button>
        )}

        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">History</div>
          {!logs?.length && (
            <div className="text-sm text-gray-600 italic py-4 text-center">No runs logged yet</div>
          )}
          {logs?.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {logs.map(log => (
                <div key={log.id} className="flex items-center gap-3 px-4 py-3 group"
                     style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex-1">
                    <div className="text-sm text-gray-200">{formatDateTime(log.startTime)}</div>
                    <div className="text-xs text-gray-500">
                      {formatDuration((log.endTime ?? Date.now()) - log.startTime)}
                      {log.gpm ? ` · ${log.gpm} gpm` : ''}
                      {log.gallons ? ` · ~${log.gallons.toLocaleString()} gal` : ''}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteLog(log.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-700 hover:text-red-500 text-sm transition-all px-1">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={onEditDetails}
                className="w-full py-3 rounded-xl text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/25 transition-all">
          ⚙ Edit hole sizes & details
        </button>
      </div>
    </BottomSheet>
  )
}
