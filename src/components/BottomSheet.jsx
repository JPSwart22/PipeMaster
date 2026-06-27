export default function BottomSheet({ title, onClose, children }) {
  return (
    <div className="absolute inset-0 z-[2000] flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-t-2xl p-5 flex flex-col gap-4 overflow-y-auto bottom-sheet-h" style={{ background: '#1a2535' }}>
        <div className="flex items-center justify-between sticky -top-5 -mx-5 px-5 pt-1 pb-2" style={{ background: '#1a2535' }}>
          <h2 className="text-white font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
