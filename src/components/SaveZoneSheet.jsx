import { useState } from 'react'
import BottomSheet from './BottomSheet'
import db from '../lib/db'
import { CROPS, cropColor } from '../lib/cropColors'

export default function SaveZoneSheet({ fieldId, boundary, onClose, onSaved }) {
  const [crop, setCrop]   = useState('')
  const [saving, setSaving] = useState(false)

  const color = cropColor(crop)

  async function handleSave() {
    if (!crop) return
    setSaving(true)
    const id = await db.zones.add({
      fieldId,
      name: crop,
      crop,
      color,
      boundary,
      createdAt: Date.now(),
    })
    onSaved({ id, fieldId, name: crop, crop, color, boundary })
  }

  return (
    <BottomSheet title="Add Crop Split" onClose={onClose}>
      <div className="flex flex-col gap-4">

        <div>
          <label className="text-sm text-gray-400 mb-2 block">What crop is in this area?</label>
          <div className="flex flex-wrap gap-2">
            {CROPS.map(c => {
              const col = cropColor(c)
              const selected = crop === c
              return (
                <button
                  key={c}
                  onClick={() => setCrop(c)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition-all"
                  style={{
                    borderColor: selected ? col : 'rgba(255,255,255,0.1)',
                    background:  selected ? `${col}25` : 'transparent',
                    color:       selected ? col : '#9ca3af',
                    fontWeight:  selected ? 600 : 400,
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: col }} />
                  {c}
                </button>
              )
            })}
          </div>
        </div>

        {/* Color preview */}
        {crop && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
               style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
            <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-sm" style={{ color }}>
              {crop} will show as this color on the map
            </span>
          </div>
        )}

        <button
          disabled={!crop || saving}
          onClick={handleSave}
          className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-40 transition-all"
          style={{ background: crop ? color : '#374151' }}>
          {saving ? 'Saving…' : 'Save Crop Split'}
        </button>
      </div>
    </BottomSheet>
  )
}
