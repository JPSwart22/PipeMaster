import { useState } from 'react'
import BottomSheet from './BottomSheet'
import db from '../lib/db'

export default function SaveWellSheet({ farmId, fieldId, lat, lon, onClose, onSaved }) {
  const [name, setName]   = useState('')
  const [type, setType]   = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim() || !type) return
    setSaving(true)
    const id = await db.wells.add({
      farmId, fieldId: fieldId ?? null,
      name: name.trim(), type,
      lat, lon,
      gpm: null, hp: null,
      createdAt: Date.now(),
    })
    onSaved({ id, farmId, fieldId: fieldId ?? null, name: name.trim(), type, lat, lon })
  }

  return (
    <BottomSheet title="Add Well" onClose={onClose}>
      <div className="flex flex-col gap-4">

        <div>
          <label className="text-sm text-gray-400 mb-2 block">Well name</label>
          <input
            autoFocus
            className="w-full rounded-lg px-4 py-3 text-white text-base outline-none border border-white/10 focus:border-green-500"
            style={{ background: '#0f1923' }}
            placeholder="e.g. Well 7, North Electric, Back Diesel"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-2 block">Power source</label>
          <div className="flex gap-3">
            <button
              onClick={() => setType('electric')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all"
              style={{
                borderColor: type === 'electric' ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                background:  type === 'electric' ? '#3b82f620' : 'transparent',
                color:       type === 'electric' ? '#3b82f6' : '#9ca3af',
              }}>
              <span className="text-xl">⚡</span>
              <span className="font-medium">Electric</span>
            </button>
            <button
              onClick={() => setType('diesel')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all"
              style={{
                borderColor: type === 'diesel' ? '#f97316' : 'rgba(255,255,255,0.1)',
                background:  type === 'diesel' ? '#f9731620' : 'transparent',
                color:       type === 'diesel' ? '#f97316' : '#9ca3af',
              }}>
              <span className="text-xl">⛽</span>
              <span className="font-medium">Diesel</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-600 text-center">
          Flow rate can be added later once you check the meter
        </div>

        <button
          disabled={!name.trim() || !type || saving}
          onClick={handleSave}
          className="w-full py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-400 disabled:opacity-40 transition-all">
          {saving ? 'Saving…' : 'Save Well'}
        </button>
      </div>
    </BottomSheet>
  )
}
