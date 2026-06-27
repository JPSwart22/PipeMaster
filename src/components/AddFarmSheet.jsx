import { useState } from 'react'
import BottomSheet from './BottomSheet'
import db from '../lib/db'

export default function AddFarmSheet({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const id = await db.farms.add({ name: name.trim(), createdAt: Date.now() })
    onCreated({ id, name: name.trim() })
  }

  return (
    <BottomSheet title="New Farm" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="text-sm text-gray-400">Farm name</label>
        <input
          autoFocus
          className="w-full rounded-lg px-4 py-3 text-white text-base outline-none border border-white/10 focus:border-green-500"
          style={{ background: '#0f1923' }}
          placeholder="e.g. Home Place, North Farm"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />
        <button
          disabled={!name.trim() || saving}
          onClick={handleSave}
          className="w-full py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-400 disabled:opacity-40 transition-all"
        >
          {saving ? 'Saving…' : 'Create Farm'}
        </button>
      </div>
    </BottomSheet>
  )
}
