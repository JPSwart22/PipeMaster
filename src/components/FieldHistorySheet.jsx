import { useLiveQuery } from 'dexie-react-hooks'
import BottomSheet from './BottomSheet'
import db from '../lib/db'
import { formatDuration, formatDateTime } from '../lib/format'

export default function FieldHistorySheet({ field, runs, onClose }) {
  const runIds = runs.map(r => r.id)
  const logs = useLiveQuery(
    () => runIds.length ? db.waterLogs.where('runId').anyOf(runIds).reverse().sortBy('startTime') : [],
    [runIds.join(',')]
  )
  const runById = {}
  runs.forEach(r => { runById[r.id] = r })

  return (
    <BottomSheet title={`${field.name} — History`} onClose={onClose}>
      <div className="flex flex-col gap-2">
        {!logs?.length && (
          <div className="text-sm text-gray-600 italic py-6 text-center">No irrigation logged yet for this field</div>
        )}
        {logs?.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {logs.map(log => (
              <div key={log.id} className="px-4 py-3"
                   style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-sm text-gray-200">{runById[log.runId]?.name ?? 'Unknown run'}</div>
                <div className="text-xs text-gray-500">
                  {formatDateTime(log.startTime)} · {formatDuration((log.endTime ?? Date.now()) - log.startTime)}
                  {log.gpm ? ` · ${log.gpm} gpm` : ''}
                  {log.gallons ? ` · ~${log.gallons.toLocaleString()} gal` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
