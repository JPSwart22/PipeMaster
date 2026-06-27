import { useState } from 'react'
import BottomSheet from './BottomSheet'
import db from '../lib/db'
import { CROPS, cropColor } from '../lib/cropColors'

export default function SaveFieldSheet({ farmId, boundary, onClose, onSaved }) {
  const [name, setName] = useState('')
  const [crop, setCrop] = useState('')
  const [saving, setSaving] = useState(false)

  const color = cropColor(crop)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const id = await db.fields.add({
      farmId,
      name: name.trim(),
      crop,
      color,
      boundary,
      createdAt: Date.now(),
    })
    onSaved({ id, farmId, name: name.trim(), crop, color, boundary })
  }

  return (
    <BottomSheet title="Save Field" onClose={onClose}>
      <div className="flex flex-col gap-3">

        <div>
          <label className="text-sm text-gray-400">Field name</label>
          <input
            autoFocus
            className="mt-1 w-full rounded-lg px-4 py-3 text-white text-base outline-none border border-white/10 focus:border-green-500"
            style={{ background: '#0f1923' }}
            placeholder="e.g. North 40, Back Field, River Bottom"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-gray-400">Crop</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {CROPS.map(c => {
              const col = cropColor(c)
              const selected = crop === c
              return (
                <button
                  key={c}
                  onClick={() => setCrop(c)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-all"
                  style={{
                    borderColor: selected ? col : 'rgba(255,255,255,0.1)',
                    background:  selected ? `${col}25` : 'transparent',
                    color:       selected ? col : '#9ca3af',
                    fontWeight:  selected ? 600 : 400,
                  }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: col }} />
                  {c}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          {crop && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />}
          {crop ? `${crop} • ` : ''}{boundary.length} boundary points
        </div>

        <button
          disabled={!name.trim() || saving}
          onClick={handleSave}
          className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-40 transition-all"
          style={{ background: name.trim() ? color : '#374151' }}
        >
          {saving ? 'Saving…' : 'Save Field'}
        </button>
      </div>
    </BottomSheet>
  )
}
