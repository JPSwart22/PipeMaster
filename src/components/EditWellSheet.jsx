import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BottomSheet from './BottomSheet'
import db from '../lib/db'
import { formatDuration, formatDateTime } from '../lib/format'

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="text-sm text-gray-400 mb-1 block">
        {label}
        {hint && <span className="text-gray-600 ml-1.5">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      inputMode={type === 'number' ? 'decimal' : 'text'}
      className="w-full rounded-lg px-4 py-3 text-white text-base outline-none border border-white/10 focus:border-green-500"
      style={{ background: '#0f1923' }}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}

function Divider({ label, color = 'rgba(249,115,22,0.2)', textColor = 'rgba(249,115,22,0.7)' }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px" style={{ background: color }} />
      <span className="text-xs uppercase tracking-wider flex-shrink-0" style={{ color: textColor }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: color }} />
    </div>
  )
}

// ── Usage history sub-component — queries via well → risers → runs → waterLogs ─
function WellUsageHistory({ wellId }) {
  const risers  = useLiveQuery(() => db.risers.where('wellId').equals(wellId).toArray(), [wellId])
  const riserIds = risers?.map(r => r.id) ?? []

  const runs = useLiveQuery(
    () => riserIds.length ? db.runs.where('riserId').anyOf(riserIds).toArray() : Promise.resolve([]),
    [riserIds.join(',')]
  )
  const runIds = runs?.map(r => r.id) ?? []

  const logs = useLiveQuery(
    () => runIds.length ? db.waterLogs.where('runId').anyOf(runIds).reverse().sortBy('startTime') : Promise.resolve([]),
    [runIds.join(',')]
  )

  const runById = {}
  runs?.forEach(r => { runById[r.id] = r })

  const totalGallons = logs?.reduce((acc, l) => acc + (l.gallons ?? 0), 0) ?? 0

  return (
    <div className="flex flex-col gap-2">
      <Divider label="Usage History" color="rgba(59,130,246,0.2)" textColor="rgba(96,165,250,0.7)" />

      {totalGallons > 0 && (
        <div className="flex justify-between px-1 text-xs text-gray-500">
          <span>{logs?.length} session{logs?.length !== 1 ? 's' : ''} logged</span>
          <span>~{totalGallons.toLocaleString()} gal total</span>
        </div>
      )}

      {!logs?.length && (
        <div className="text-xs text-gray-700 italic text-center py-3">No irrigation logged yet from this well</div>
      )}

      {logs?.slice(0, 12).map(log => (
        <div key={log.id} className="flex items-center gap-3 py-2 px-3 rounded-lg"
             style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-300 truncate">{runById[log.runId]?.name ?? 'Unknown run'}</div>
            <div className="text-xs text-gray-600">
              {formatDateTime(log.startTime)}
              {log.endTime ? ` · ${formatDuration(log.endTime - log.startTime)}` : ' · still running'}
            </div>
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            {log.gpm   && <span className="text-xs text-blue-400">{log.gpm} gpm</span>}
            {log.gallons && <span className="text-xs text-gray-500">{log.gallons.toLocaleString()} gal</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main sheet ────────────────────────────────────────────────────────────────
export default function EditWellSheet({ well, onClose, onSaved, fieldMode = false }) {
  const [name,        setName]        = useState(well.name ?? '')
  const [type,        setType]        = useState(well.type ?? 'diesel')
  const [gpm,         setGpm]         = useState(well.gpm != null ? String(well.gpm) : '')
  const [motorModel,  setMotorModel]  = useState(well.motorModel ?? '')
  const [rpm,         setRpm]         = useState(well.rpm != null ? String(well.rpm) : '')
  const [airFilter,   setAirFilter]   = useState(well.airFilter ?? '')
  const [fuelFilter,  setFuelFilter]  = useState(well.fuelFilter ?? '')
  const [oilFilter,   setOilFilter]   = useState(well.oilFilter ?? '')
  const [saving,      setSaving]      = useState(false)

  const isDiesel = type === 'diesel'
  const typeColor = type === 'electric' ? '#3b82f6' : '#f97316'

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await db.wells.update(well.id, {
      name: name.trim(),
      type,
      gpm:        gpm  !== '' ? parseFloat(gpm)  : null,
      rpm:        rpm  !== '' ? parseInt(rpm)     : null,
      motorModel: motorModel.trim() || null,
      airFilter:  isDiesel ? (airFilter.trim()  || null) : null,
      fuelFilter: isDiesel ? (fuelFilter.trim() || null) : null,
      oilFilter:  isDiesel ? (oilFilter.trim()  || null) : null,
    })
    onSaved()
  }

  return (
    <BottomSheet title={fieldMode ? well.name : `Edit: ${well.name}`} onClose={onClose}>
      <div className="flex flex-col gap-4">

        {/* Well name — editable in both modes */}
        <Field label="Well name">
          <TextInput value={name} onChange={setName} placeholder="e.g. Well 7, North Diesel" />
        </Field>

        {/* Power source — toggle in dev mode, badge in field mode */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Power source</label>
          {fieldMode ? (
            <div className="flex items-center gap-2 py-1">
              <span className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
                    style={{ background: `${typeColor}18`, border: `1.5px solid ${typeColor}50`, color: typeColor }}>
                <span className="text-lg">{type === 'electric' ? '⚡' : '⛽'}</span>
                {type === 'electric' ? 'Electric' : 'Diesel'}
              </span>
            </div>
          ) : (
            <div className="flex gap-3">
              {[
                { value: 'electric', icon: '⚡', label: 'Electric', color: '#3b82f6' },
                { value: 'diesel',   icon: '⛽', label: 'Diesel',   color: '#f97316' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setType(opt.value)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all"
                        style={{
                          borderColor: type === opt.value ? opt.color : 'rgba(255,255,255,0.1)',
                          background:  type === opt.value ? `${opt.color}20` : 'transparent',
                          color:       type === opt.value ? opt.color : '#9ca3af',
                        }}>
                  <span className="text-xl">{opt.icon}</span>
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Flow rate — always editable */}
        <Field label="Flow rate" hint="(optional — GPM)">
          <TextInput value={gpm} onChange={setGpm} placeholder="e.g. 820" type="number" />
        </Field>

        {/* Diesel-specific fields */}
        {isDiesel && (
          <>
            <Divider label="Engine" />

            <Field label="Motor model" hint="(optional)">
              <TextInput value={motorModel} onChange={setMotorModel} placeholder="e.g. John Deere 4045T" />
            </Field>

            <Field label="RPM setting" hint="(optional)">
              <TextInput value={rpm} onChange={setRpm} placeholder="e.g. 1800" type="number" />
            </Field>

            <Divider label="Filters" />

            <Field label="Air filter" hint="(optional — part number or brand)">
              <TextInput value={airFilter} onChange={setAirFilter} placeholder="e.g. Donaldson P822686" />
            </Field>

            <Field label="Fuel filter" hint="(optional)">
              <TextInput value={fuelFilter} onChange={setFuelFilter} placeholder="e.g. Donaldson P550248" />
            </Field>

            <Field label="Oil filter" hint="(optional)">
              <TextInput value={oilFilter} onChange={setOilFilter} placeholder="e.g. Fleetguard LF3000" />
            </Field>
          </>
        )}

        <button
          disabled={!name.trim() || saving}
          onClick={handleSave}
          className="w-full py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-400 disabled:opacity-40 transition-all">
          {saving ? 'Saving…' : 'Save Well'}
        </button>

        {/* Usage history — field mode only */}
        {fieldMode && <WellUsageHistory wellId={well.id} />}

      </div>
    </BottomSheet>
  )
}
