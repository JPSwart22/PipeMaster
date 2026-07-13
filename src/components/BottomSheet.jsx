import { useState, useEffect } from 'react'
import { useBackClose } from '../lib/backButtonStack'

export default function BottomSheet({ title, onClose, children }) {
  const [kbOffset, setKbOffset] = useState(0)
  useBackClose(onClose)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop
      setKbOffset(Math.max(0, Math.round(offset)))
    }
    vv.addEventListener('resize', update)
    return () => vv.removeEventListener('resize', update)
  }, [])

  // When keyboard opens, scroll the focused input into the visible area
  useEffect(() => {
    if (kbOffset > 0) {
      setTimeout(() => document.activeElement?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 80)
    }
  }, [kbOffset])

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-t-2xl p-5 flex flex-col gap-4 overflow-y-auto bottom-sheet-h"
           style={{ background: '#1a2535', paddingBottom: kbOffset > 0 ? `${kbOffset + 16}px` : undefined }}>
        <div className="flex items-center justify-between sticky -top-5 -mx-5 px-5 pt-1 pb-2" style={{ background: '#1a2535' }}>
          <h2 className="text-white font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
