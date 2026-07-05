import { useState } from 'react'
import BottomSheet from './BottomSheet'
import supabase from '../lib/supabase'
import { getSavedFarmCode } from '../lib/cloudSync'

const FUNCTION_URL = 'https://iiaijapxmowkzwxofhjk.supabase.co/functions/v1/submit-feedback'

export default function FeedbackSheet({ onClose }) {
  const [message, setMessage] = useState('')
  const [state, setState] = useState('idle') // idle | sending | done | error

  async function handleSubmit() {
    if (!message.trim() || state === 'sending') return
    setState('sending')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          farmCode: getSavedFarmCode() ?? null,
          userId: session?.user?.id ?? null,
        }),
      })
      if (!res.ok) throw new Error('Server error')
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <BottomSheet title="Feedback" onClose={onClose}>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="text-4xl">✅</div>
          <p className="text-gray-300 text-base">Thanks — feedback received.</p>
          <p className="text-gray-500 text-sm">We read every submission and use it to improve the app.</p>
          <button onClick={onClose}
                  className="mt-2 w-full py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-400 transition-all">
            Close
          </button>
        </div>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet title="Send Feedback" onClose={onClose}>
      <div className="flex flex-col gap-4">

        <p className="text-sm text-gray-400 leading-relaxed">
          Tell us what's working, what's broken, or what you'd like to see. Every message goes straight to the developer.
        </p>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="What's on your mind?"
          rows={6}
          className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none border border-white/10 focus:border-green-500 resize-none leading-relaxed"
          style={{ background: '#0f1923' }}
          autoFocus
        />

        {state === 'error' && (
          <p className="text-xs text-red-400 -mt-2">Something went wrong — check your connection and try again.</p>
        )}

        <button
          disabled={!message.trim() || state === 'sending'}
          onClick={handleSubmit}
          className="w-full py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-400 disabled:opacity-40 transition-all">
          {state === 'sending' ? 'Sending…' : 'Send Feedback'}
        </button>

      </div>
    </BottomSheet>
  )
}
