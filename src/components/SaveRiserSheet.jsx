import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BottomSheet from './BottomSheet'
import db from '../lib/db'
import { haversineMeters } from '../lib/pipeUtils'

export default function SaveRiserSheet({ wellId, farmId, fieldId, lat, lon, onClose, onSaved }) {
  const [name, setName]                   = useState('')
  const [saving, setSaving]               = useState(false)
  const [selectedWellId, setSelectedWellId] = useState(wellId ?? null)
  const [selectedFieldId, setSelectedFieldId] = useState(fieldId ?? null)
  const [fromType, setFromType]           = useState('well')
  const [fromId, setFromId]               = useState(wellId ?? null)

  const allFarmWells   = useLiveQuery(() => db.wells.where('farmId').equals(farmId).toArray(), [farmId])
  const allFarmFields  = useLiveQuery(() => db.fields.where('farmId').equals(farmId).toArray(), [farmId])

  const riserPos = [lat, lon]

  const farmWells = useMemo(() => {
    if (!allFarmWells) return undefined
    return [...allFarmWells]
      .filter(w => w.lat != null && w.lon != null)
      .sort((a, b) => haversineMeters(riserPos, [a.lat, a.lon]) - haversineMeters(riserPos, [b.lat, b.lon]))
      .slice(0, 4)
  }, [allFarmWells, lat, lon])

  const farmFields = useMemo(() => {
    if (!allFarmFields) return undefined
    return [...allFarmFields]
      .map(f => {
        const b = f.boundary
        if (!b?.length) return null
        const center = [
          b.reduce((s, p) => s + p[0], 0) / b.length,
          b.reduce((s, p) => s + p[1], 0) / b.length,
        ]
        return { ...f, _center: center }
      })
      .filter(Boolean)
      .sort((a, b) => haversineMeters(riserPos, a._center) - haversineMeters(riserPos, b._center))
      .slice(0, 4)
  }, [allFarmFields, lat, lon])
  const existingRisers = useLiveQuery(
    () => selectedWellId ? db.risers.where('wellId').equals(selectedWellId).toArray() : Promise.resolve([]),
    [selectedWellId]
  )

  function pickWell(well) {
    setSelectedWellId(well.id)
    setFromType('well')
    setFromId(well.id)
  }

  function pickSource(type, id) {
    setFromType(type)
    setFromId(id)
  }

  async function handleSave() {
    if (!selectedWellId) return
    setSaving(true)
    // Auto-name if left blank: "Riser 1", "Riser 2", etc. based on existing count for this well
    let finalName = name.trim()
    if (!finalName) {
      const count = await db.risers.where('wellId').equals(selectedWellId).count()
      finalName = `Riser ${count + 1}`
    }
    const id = await db.risers.add({
      wellId: selectedWellId, farmId, fieldId: selectedFieldId ?? null,
      name: finalName, lat, lon,
      createdAt: Date.now(),
    })
    await db.undergrounds.add({
      fromType, fromId,
      riserId: id,
      farmId, fieldId: selectedFieldId ?? null,
      createdAt: Date.now(),
    })
    onSaved({ id, wellId: selectedWellId, farmId, fieldId: selectedFieldId, name: finalName, lat, lon })
  }

  const needsWellPick = !wellId
  const hasChain = existingRisers?.length > 0
  const selectedWell = farmWells?.find(w => w.id === selectedWellId)

  return (
    <BottomSheet title="Add Riser" onClose={onClose}>
      <div className="flex flex-col gap-4">

        <div className="text-xs text-gray-500 leading-relaxed">
          A riser is where underground supply comes out of the ground and connects to polypipe.
        </div>

        {/* Well picker — shown when coming from field view (no pre-selected well) */}
        {needsWellPick && (
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Fed by well <span className="text-gray-600">(4 closest)</span></label>
            {!farmWells?.length && (
              <div className="text-xs text-gray-600 italic">No wells on this farm yet — add a well first.</div>
            )}
            <div className="flex flex-wrap gap-2">
              {farmWells?.map(w => (
                <button
                  key={w.id}
                  onClick={() => pickWell(w)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all"
                  style={{
                    borderColor: selectedWellId === w.id ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                    background:  selectedWellId === w.id ? '#3b82f620' : 'transparent',
                    color:       selectedWellId === w.id ? '#3b82f6' : '#9ca3af',
                  }}>
                  {w.type === 'electric' ? '⚡' : '⛽'} {w.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chain source picker — shown once well is chosen and existing risers exist */}
        {selectedWellId && hasChain && (
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Connect from</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => pickSource('well', selectedWellId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all"
                style={{
                  borderColor: fromType === 'well' ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                  background:  fromType === 'well' ? '#3b82f620' : 'transparent',
                  color:       fromType === 'well' ? '#3b82f6' : '#9ca3af',
                }}>
                {selectedWell?.type === 'electric' ? '⚡' : '⛽'} {selectedWell?.name ?? 'Well'}
              </button>
              {existingRisers.map(r => (
                <button
                  key={r.id}
                  onClick={() => pickSource('riser', r.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all"
                  style={{
                    borderColor: fromType === 'riser' && fromId === r.id ? '#22c55e' : 'rgba(255,255,255,0.1)',
                    background:  fromType === 'riser' && fromId === r.id ? '#22c55e20' : 'transparent',
                    color:       fromType === 'riser' && fromId === r.id ? '#22c55e' : '#9ca3af',
                  }}>
                  ◆ {r.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No chain picker needed — just show what it connects to */}
        {selectedWellId && !hasChain && !needsWellPick && (
          <div className="text-xs text-gray-500">
            Connected to: <span className="text-gray-300">{selectedWell?.type === 'electric' ? '⚡' : '⛽'} {selectedWell?.name ?? 'Well'}</span>
          </div>
        )}

        {/* Field picker — always shown so the riser is linked to the right field */}
        {farmFields && farmFields.length > 0 && (
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Serves field <span className="text-gray-600">(4 closest)</span></label>
            <div className="flex flex-wrap gap-2">
              {farmFields.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFieldId(selectedFieldId === f.id ? null : f.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all"
                  style={{
                    borderColor: selectedFieldId === f.id ? (f.color || '#22c55e') : 'rgba(255,255,255,0.1)',
                    background:  selectedFieldId === f.id ? `${f.color || '#22c55e'}25` : 'transparent',
                    color:       selectedFieldId === f.id ? (f.color || '#22c55e') : '#9ca3af',
                  }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: f.color || '#94a3b8' }} />
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm text-gray-400 mb-1 block">Riser name <span className="text-gray-600">(optional)</span></label>
          <input
            className="w-full rounded-lg px-4 py-3 text-white text-base outline-none border border-white/10 focus:border-green-500"
            style={{ background: '#0f1923' }}
            placeholder="Leave blank to auto-number"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>

        <button
          disabled={!selectedWellId || saving}
          onClick={handleSave}
          className="w-full py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-400 disabled:opacity-40 transition-all">
          {saving ? 'Saving…' : 'Save Riser'}
        </button>
      </div>
    </BottomSheet>
  )
}
