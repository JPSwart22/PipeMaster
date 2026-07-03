import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { purchaseSubscription, restoreSubscription } from '../lib/purchases'

function daysAgo(isoDate) {
  if (!isoDate) return null
  const diff = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function daysLeft(isoDate) {
  if (!isoDate) return null
  const diff = new Date(isoDate).getTime() - Date.now()
  if (diff <= 0) return null
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function SubWall({ farm, onUnlocked }) {
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode]   = useState('idle') // idle | subscribing | restoring

  const isOwner    = farm?.role === 'owner'
  const isNative   = Capacitor.isNativePlatform()
  const trialEnded = farm?.sub_status === 'trial' ? daysAgo(farm.trial_ends_at) : null
  const subEnded   = farm?.sub_status === 'expired' ? daysAgo(farm.sub_expires_at) : null
  const remaining  = daysLeft(farm?.trial_ends_at)

  async function handleSubscribe() {
    setBusy(true); setError(null); setMode('subscribing')
    try {
      const ok = await purchaseSubscription()
      if (ok) onUnlocked()
      else setError('Purchase completed but could not verify — tap Restore to retry.')
    } catch (e) {
      if (e.message?.includes('userCancelled') || e.code === 'USER_CANCELLED') {
        setError(null)
      } else {
        setError(e.message || 'Purchase failed. Try again.')
      }
    } finally {
      setBusy(false); setMode('idle')
    }
  }

  async function handleRestore() {
    setBusy(true); setError(null); setMode('restoring')
    try {
      const ok = await restoreSubscription()
      if (ok) onUnlocked()
      else setError('No active subscription found on this account.')
    } catch (e) {
      setError(e.message || 'Restore failed.')
    } finally {
      setBusy(false); setMode('idle')
    }
  }

  return (
    <div className="fixed inset-0 z-[4000] flex flex-col items-center justify-center px-6"
         style={{ background: 'rgba(6,12,20,0.98)', backdropFilter: 'blur(8px)' }}>

      {/* Lock icon */}
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
           style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.35)' }}>
        <span className="text-4xl">🔒</span>
      </div>

      {isOwner ? (
        /* ── Owner view ───────────────────────────────────────────────── */
        <div className="flex flex-col items-center gap-3 text-center" style={{ maxWidth: 320 }}>
          <h1 className="text-white font-bold text-2xl">
            {trialEnded ? 'Trial Ended' : 'Subscription Expired'}
          </h1>

          <p className="text-gray-400 text-sm leading-relaxed">
            {trialEnded
              ? `Your 7-day free trial ended ${trialEnded}. Subscribe to unlock Pipemaster for your entire farm team.`
              : `Your subscription expired ${subEnded ?? 'recently'}. Renew to restore access for your whole team.`}
          </p>

          <div className="w-full rounded-2xl p-4 mt-2"
               style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Pipemaster Pro</div>
            <div className="text-white font-bold text-3xl">$100</div>
            <div className="text-gray-500 text-sm">per year · entire farm team</div>
            <div className="flex flex-col gap-1 mt-3 text-left">
              {['Unlimited pipe runs & fields', 'Full team access included', 'GPS punching & schematic AI', 'Offline — works without signal'].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-green-400">✓</span>{f}
                </div>
              ))}
            </div>
          </div>

          {isNative ? (
            <div className="flex flex-col gap-2.5 w-full mt-1">
              <button onClick={handleSubscribe} disabled={busy}
                      className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-50 transition-all"
                      style={{ background: busy && mode === 'subscribing' ? '#15803d' : 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 4px 24px rgba(34,197,94,0.4)' }}>
                {busy && mode === 'subscribing' ? 'Opening billing…' : 'Subscribe — $100 / year'}
              </button>
              <button onClick={handleRestore} disabled={busy}
                      className="w-full py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-200 border border-white/10 hover:border-white/20 transition-all disabled:opacity-40">
                {busy && mode === 'restoring' ? 'Restoring…' : 'Restore purchase'}
              </button>
            </div>
          ) : (
            <div className="w-full py-4 rounded-2xl text-sm text-gray-400 text-center mt-1"
                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              Open Pipemaster on your Android device to subscribe
            </div>
          )}
        </div>
      ) : (
        /* ── Crew member view ─────────────────────────────────────────── */
        <div className="flex flex-col items-center gap-3 text-center" style={{ maxWidth: 300 }}>
          <h1 className="text-white font-bold text-2xl">Farm Locked</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            {trialEnded
              ? `This farm's free trial ended ${trialEnded}.`
              : `This farm's subscription has lapsed.`}
            {' '}The farm owner needs to subscribe to restore access.
          </p>
          <div className="w-full py-4 px-5 rounded-2xl mt-2"
               style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-gray-500 text-xs">Contact</div>
            <div className="text-white font-semibold text-sm mt-0.5">{farm?.name ?? 'your farm owner'}</div>
            <div className="text-gray-600 text-xs mt-1">Ask them to open Pipemaster and subscribe</div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 px-4 py-2.5 rounded-xl text-sm text-red-400"
             style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', maxWidth: 320, textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* Trial remaining notice — shown when sub_status=trial but close to expiry */}
      {remaining !== null && remaining > 0 && farm?.sub_status === 'trial' && (
        <div className="absolute bottom-8 text-xs text-yellow-500/70">
          {remaining} day{remaining !== 1 ? 's' : ''} left in your trial
        </div>
      )}
    </div>
  )
}
