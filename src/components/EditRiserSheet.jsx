import { useState } from 'react'
import BottomSheet from './BottomSheet'
import db from '../lib/db'

export default function EditRiserSheet({ riser, onClose, onSaved }) {
  const [name, setName]   = useState(riser.name ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await db.risers.update(riser.id, { name: name.trim() })
    onSaved()
  }

  async function handleDelete() {
    if (!confirm(`Delete "${riser.name}"? This will also delete all runs and logs tied to this riser.`)) return
    const runs = await db.runs.where('riserId').equals(riser.id).toArray()
    const runIds = runs.map(r => r.id)
    if (runIds.length) {
      await db.waterLogs.where('runId').anyOf(runIds).delete()
      await db.segments.where('runId').anyOf(runIds).delete()
      await db.tees.where('runId').anyOf(runIds).delete()
      await db.runs.where('id').anyOf(runIds).delete()
    }
    await db.undergrounds.where('riserId').equals(riser.id).delete()
    await db.undergrounds.where('fromId').equals(riser.id).delete()
    await db.risers.delete(riser.id)
    onSaved()
  }

  return (
    <BottomSheet title={`Riser: ${riser.name}`} onClose={onClose}>
      <div className="flex flex-col gap-4">

        <div>
          <label className="text-sm text-gray-400 mb-1 block">Riser name</label>
          <input
            className="w-full rounded-lg px-4 py-3 text-white text-base outline-none border border-white/10 focus:border-green-500"
            style={{ background: '#0f1923' }}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>

        <button
          disabled={!name.trim() || saving}
          onClick={handleSave}
          className="w-full py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-400 disabled:opacity-40 transition-all">
          {saving ? 'Saving…' : 'Save Riser'}
        </button>

        <button
          onClick={handleDelete}
          className="w-full py-2 rounded-xl text-sm text-red-700 hover:text-red-500 border border-red-900/40 hover:border-red-700/40 transition-all">
          Delete Riser
        </button>

      </div>
    </BottomSheet>
  )
}
