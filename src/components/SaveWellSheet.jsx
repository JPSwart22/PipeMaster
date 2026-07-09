import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BottomSheet from './BottomSheet'
import db from '../lib/db'

function distSq(lat1, lon1, lat2, lon2) {
  return (lat1 - lat2) ** 2 + (lon1 - lon2) ** 2
}

export default function SaveWellSheet({ farmId: initialFarmId, lat, lon, onClose, onSaved }) {
  const farms   = useLiveQuery(() => db.farms.toArray(), [])
  const fields  = useLiveQuery(() => db.fields.toArray(), [])
  const [farmId, setFarmId] = useState(initialFarmId ?? null)
  const [name, setName]     = useState('')
  const [type, setType]     = useState('')
  const [saving, setSaving] = useState(false)

  // Auto-select the nearest farm when opening from the FAB (no initialFarmId)
  useEffect(() => {
    if (initialFarmId || !lat || !lon || !farms?.length) return
    // Single farm → always pick it
    if (farms.length === 1) { setFarmId(farms[0].id); return }
    // Multiple farms: find nearest by distance to field boundary centroids
    if (fields?.length) {
      let nearestFarmId = null
      let nearestDist = Infinity
      for (const field of fields) {
        const pts = field.boundary
        if (!pts?.length) continue
        const cLat = pts.reduce((s, p) => s + p[0], 0) / pts.length
        const cLon = pts.reduce((s, p) => s + p[1], 0) / pts.length
        const d = distSq(lat, lon, cLat, cLon)
        if (d < nearestDist) { nearestDist = d; nearestFarmId = field.farmId }
      }
      if (nearestFarmId) setFarmId(nearestFarmId)
    }
  }, [farms, fields, lat, lon, initialFarmId])

  async function handleSave() {
    if (!name.trim() || !type || !farmId) return
    setSaving(true)
    const id = await db.wells.add({
      farmId,
      name: name.trim(), type,
      lat, lon,
      gpm: null, hp: null,
      createdAt: Date.now(),
    })
    onSaved({ id, farmId, name: name.trim(), type, lat, lon })
  }

  return (
    <BottomSheet title="Add Well" onClose={onClose}>
      <div className="flex flex-col gap-4">

        {/* Farm picker — only shown when opened from FAB with no farm context */}
        {!initialFarmId && (
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Farm</label>
            <div className="flex flex-col gap-2">
              {farms?.map(farm => (
                <button key={farm.id} onClick={() => setFarmId(farm.id)}
                        className="w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium"
                        style={{
                          borderColor: farmId === farm.id ? '#22c55e' : 'rgba(255,255,255,0.1)',
                          background:  farmId === farm.id ? '#22c55e20' : 'transparent',
                          color:       farmId === farm.id ? '#4ade80' : '#9ca3af',
                        }}>
                  {farm.name}
                </button>
              ))}
            </div>
          </div>
        )}

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
            <button onClick={() => setType('electric')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: type === 'electric' ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                      background:  type === 'electric' ? '#3b82f620' : 'transparent',
                      color:       type === 'electric' ? '#3b82f6' : '#9ca3af',
                    }}>
              <span className="text-xl">⚡</span>
              <span className="font-medium">Electric</span>
            </button>
            <button onClick={() => setType('diesel')}
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

        <button disabled={!name.trim() || !type || !farmId || saving}
                onClick={handleSave}
                className="w-full py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-400 disabled:opacity-40 transition-all">
          {saving ? 'Saving…' : 'Save Well'}
        </button>
      </div>
    </BottomSheet>
  )
}
