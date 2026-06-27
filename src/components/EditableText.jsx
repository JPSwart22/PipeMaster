import { useState } from 'react'

export default function EditableText({ value, onSave, className, inputClassName }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onSave(trimmed)
    else setDraft(value)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        onClick={e => e.stopPropagation()}
        className={inputClassName ?? className}
        style={{ background: 'transparent', outline: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.3)' }}
      />
    )
  }

  return (
    <span
      onClick={e => { e.stopPropagation(); setDraft(value); setEditing(true) }}
      className={className}
      style={{ cursor: 'text' }}
      title="Tap to rename"
    >
      {value}
    </span>
  )
}
