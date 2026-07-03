import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import { getMyFarm } from '../lib/farms'
import { getFarmMembers } from '../lib/members'
import { getSyncStatus, onSyncStatusChange, forceSync, getSavedFarmCode } from '../lib/cloudSync'
import { downloadBackup, restoreBackup } from '../lib/backup'
import { signOut } from '../lib/auth'
import { timeAgo } from '../lib/format'

const STATUS_COLOR = { idle: '#6b7280', syncing: '#eab308', synced: '#22c55e', error: '#ef4444' }
const STATUS_LABEL = { idle: 'Not synced yet', syncing: 'Syncing…', synced: 'Synced', error: 'Sync error' }

export function SyncStatusDot() {
  const [status, setStatus] = useState(getSyncStatus())
  useEffect(() => onSyncStatusChange(setStatus), [])
  return (
    <span className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: STATUS_COLOR[status.state], boxShadow: status.state === 'syncing' ? '0 0 6px currentColor' : 'none' }} />
  )
}

function RoleBadge({ role }) {
  const isOwner = role === 'owner'
  return (
    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{
            color: isOwner ? '#4ade80' : '#93c5fd',
            background: isOwner ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
            border: `1px solid ${isOwner ? 'rgba(34,197,94,0.35)' : 'rgba(59,130,246,0.35)'}`,
          }}>
      {role}
    </span>
  )
}

export default function SettingsSheet({ onClose }) {
  const [farm, setFarm] = useState(undefined)
  const [members, setMembers] = useState(undefined)
  const [status, setStatus] = useState(getSyncStatus())
  const [copied, setCopied] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => onSyncStatusChange(setStatus), [])

  useEffect(() => {
    getMyFarm().then(setFarm).catch(() => setFarm(null))
  }, [])

  useEffect(() => {
    if (!farm) return
    getFarmMembers(farm.id).then(setMembers).catch(() => setMembers([]))
  }, [farm])

  function handleCopyCode() {
    const code = farm?.code ?? getSavedFarmCode()
    if (!code) return
    navigator.clipboard?.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleSyncNow() {
    const code = farm?.code ?? getSavedFarmCode()
    if (!code) return
    setBusy(true); setError(null)
    try {
      await forceSync(code)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (!confirm('This replaces ALL data on this device with the backup file. Continue?')) return
    await restoreBackup(file)
  }

  return (
    <BottomSheet title="Settings" onClose={onClose}>
      <div className="flex flex-col gap-4">

        {/* Farm code */}
        <div className="rounded-xl p-4 flex flex-col gap-3"
             style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(59,130,246,0.08))', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">{farm?.name ?? 'Your Farm'}</div>
              <div className="text-white font-mono text-2xl tracking-widest mt-1">{farm?.code ?? getSavedFarmCode() ?? '——————'}</div>
            </div>
            <button onClick={handleCopyCode}
                    className="px-3 py-2 rounded-lg text-xs font-medium border border-white/15 text-gray-300 hover:text-white hover:border-white/30 transition-all flex-shrink-0">
              {copied ? '✓ Copied' : '⧉ Copy'}
            </button>
          </div>
          <div className="text-xs text-gray-500">Share this code so a worker's phone can join your farm instantly.</div>
        </div>

        {/* Sync status */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <SyncStatusDot />
            <span className="text-sm text-gray-300">
              {STATUS_LABEL[status.state]}
              {status.state === 'synced' && status.lastSyncedAt && (
                <span className="text-gray-500"> · {timeAgo(status.lastSyncedAt)}</span>
              )}
            </span>
          </div>
          <button onClick={handleSyncNow} disabled={busy}
                  className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors">
            {busy ? 'Syncing…' : '↻ Sync now'}
          </button>
        </div>
        {status.state === 'error' && status.error && (
          <div className="text-xs text-red-400 -mt-2">{status.error}</div>
        )}

        {/* Members */}
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Team</div>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {members === undefined && (
              <div className="px-4 py-3 text-sm text-gray-600">Loading…</div>
            )}
            {members?.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-600 italic">No members found</div>
            )}
            {members?.map(m => (
              <div key={m.userId} className="flex items-center gap-3 px-4 py-3"
                   style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #22c55e, #3b82f6)' }}>
                  {m.username?.[0]?.toUpperCase() ?? '?'}
                </span>
                <span className="text-sm text-gray-200 flex-1 truncate">{m.username}</span>
                <RoleBadge role={m.role} />
              </div>
            ))}
          </div>
        </div>

        {/* Advanced */}
        <div>
          <button onClick={() => setAdvancedOpen(o => !o)}
                  className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 py-1 transition-colors">
            <span>Advanced</span>
            <span>{advancedOpen ? '▲' : '▼'}</span>
          </button>
          {advancedOpen && (
            <div className="flex gap-2 mt-2">
              <button onClick={downloadBackup}
                      className="flex-1 py-2 rounded-lg text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/25 transition-all">
                ⬇ Export backup
              </button>
              <label className="flex-1 py-2 rounded-lg text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/25 transition-all text-center cursor-pointer">
                ⬆ Import backup
                <input type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
              </label>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('pipemaster:show-help'))
            onClose()
          }}
          className="w-full py-2.5 rounded-xl text-sm text-blue-400 hover:text-blue-300 border border-blue-900/40 hover:border-blue-700/40 transition-all">
          Help &amp; Guide
        </button>

        {/* Support */}
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Support</div>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <a href="mailto:jppipemaster@gmail.com?subject=Pipemaster%20Support%20Request"
               className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all"
               style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-base">✉️</span>
              <div className="flex flex-col">
                <span className="font-medium">Email Support</span>
                <span className="text-xs text-gray-500">jppipemaster@gmail.com</span>
              </div>
              <span className="ml-auto text-gray-600">›</span>
            </a>
            <a href="mailto:jppipemaster@gmail.com?subject=Pipemaster%20Bug%20Report&body=Describe%20what%20happened%3A%0A%0ASteps%20to%20reproduce%3A%0A%0ADevice%2FOS%3A"
               className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">
              <span className="text-base">🐛</span>
              <div className="flex flex-col">
                <span className="font-medium">Report a Bug</span>
                <span className="text-xs text-gray-500">Pre-filled email with details</span>
              </div>
              <span className="ml-auto text-gray-600">›</span>
            </a>
          </div>
        </div>

        {/* Legal */}
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Legal</div>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => window.open('/terms', '_blank')}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-base">📋</span>
              <span className="font-medium flex-1">Terms of Use</span>
              <span className="text-gray-600">›</span>
            </button>
            <button
              onClick={() => window.open('/privacy', '_blank')}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left">
              <span className="text-base">🔒</span>
              <span className="font-medium flex-1">Privacy Policy</span>
              <span className="text-gray-600">›</span>
            </button>
          </div>
        </div>

        <button onClick={signOut}
                className="w-full py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 border border-red-900/40 hover:border-red-700/40 transition-all">
          Sign out
        </button>
      </div>
    </BottomSheet>
  )
}
