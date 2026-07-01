import { useState } from 'react'
import BottomSheet from './BottomSheet'
import db from '../lib/db'

export default function FlagSheet({ flag, lat, lon, farmId, onClose, onSaved, onDeleted }) {
  const [title, setTitle]       = useState(flag?.title ?? '')
  const [description, setDesc]  = useState(flag?.description ?? '')
  const [saving, setSaving]     = useState(false)

  const isNew = !flag

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    if (isNew) {
      await db.flags.add({
        lat, lon,
        farmId: farmId ?? null,
        title: title.trim(),
        description: description.trim(),
        createdAt: Date.now(),
      })
    } else {
      await db.flags.update(flag.id, { title: title.trim(), description: description.trim() })
    }
    onSaved?.()
  }

  async function handleDelete() {
    if (!confirm(`Delete flag "${flag.title}"?`)) return
    await db.flags.delete(flag.id)
    onDeleted?.()
  }

  return (
    <BottomSheet title={isNew ? 'Drop Flag' : flag.title} onClose={onClose}>
      <div className="flex flex-col gap-4">

        {isNew ? (
          <>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Title</label>
              <input
                autoFocus
                className="w-full rounded-lg px-4 py-3 text-white text-base outline-none border border-white/10 focus:border-yellow-500"
                style={{ background: '#0f1923' }}
                placeholder="e.g. Broken pipe, Wet spot, Check here"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !saving && title.trim() && handleSave()}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                Notes <span className="text-gray-600">(optional)</span>
              </label>
              <textarea
                className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none border border-white/10 focus:border-yellow-500 resize-none"
                style={{ background: '#0f1923' }}
                rows={3}
                placeholder="More detail…"
                value={description}
                onChange={e => setDesc(e.target.value)}
              />
            </div>
            <button
              disabled={!title.trim() || saving}
              onClick={handleSave}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-40 transition-all"
              style={{ background: saving ? '#92400e' : 'linear-gradient(135deg, #eab308, #f97316)' }}>
              {saving ? 'Saving…' : '🚩 Drop Flag'}
            </button>
          </>
        ) : (
          <>
            {flag.description && (
              <p className="text-gray-300 text-sm leading-relaxed">{flag.description}</p>
            )}
            <div className="text-xs text-gray-600">
              {new Date(flag.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <button
              onClick={handleDelete}
              className="w-full py-2 rounded-lg text-sm text-red-700 hover:text-red-500 border border-red-900/40 hover:border-red-700/40 transition-all">
              Delete Flag
            </button>
          </>
        )}

      </div>
    </BottomSheet>
  )
}
