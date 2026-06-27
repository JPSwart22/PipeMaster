import supabase from './supabase'
import { getAllTablesData, restoreAllTablesData } from './backup'

const CODE_KEY = 'pipemaster-farm-code'
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid confusion read aloud
const PUSH_DEBOUNCE_MS = 1500
const ECHO_GUARD_MS = 4000 // skip realtime pulls that are just our own push reflecting back

export function getSavedFarmCode() {
  return localStorage.getItem(CODE_KEY)
}

export function saveFarmCode(code) {
  localStorage.setItem(CODE_KEY, code.toUpperCase())
}

export function generateFarmCode() {
  let code = ''
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return code
}

// ── Sync status — a tiny pub-sub so the UI (settings sheet, status dot) can
// reactively show what's happening without polling ─────────────────────────
let syncStatus = { state: 'idle', lastSyncedAt: null, error: null } // state: idle | syncing | synced | error
const statusListeners = new Set()

function setSyncStatus(patch) {
  syncStatus = { ...syncStatus, ...patch }
  statusListeners.forEach(fn => fn(syncStatus))
}

export function getSyncStatus() {
  return syncStatus
}

export function onSyncStatusChange(fn) {
  statusListeners.add(fn)
  return () => statusListeners.delete(fn)
}

// ── Manual push/pull — still exposed for an explicit "force sync" action ───
export async function pushToCloud(code) {
  const tables = await getAllTablesData()
  const { error } = await supabase
    .from('farm_sync')
    .upsert({ code: code.toUpperCase(), data: tables, updated_at: new Date().toISOString() }, { onConflict: 'code' })
  if (error) throw error
}

export async function pullFromCloud(code) {
  const { data, error } = await supabase
    .from('farm_sync')
    .select('data, updated_at')
    .eq('code', code.toUpperCase())
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('No farm found with that code')
  await restoreAllTablesData(data.data)
  return data.updated_at
}

let lastPushAt = 0

export async function forceSync(code) {
  setSyncStatus({ state: 'syncing' })
  try {
    await pushToCloud(code)
    lastPushAt = Date.now()
    setSyncStatus({ state: 'synced', lastSyncedAt: new Date(), error: null })
  } catch (err) {
    setSyncStatus({ state: 'error', error: err.message })
    throw err
  }
}

// ── Auto-sync — push shortly after any local change, pull the instant another
// device pushes. Call once per session after the user has a farm. ─────────
let autoSyncCleanup = null

export function startAutoSync(code) {
  if (autoSyncCleanup) return autoSyncCleanup
  let pushTimer = null

  function scheduleDebouncedPush() {
    clearTimeout(pushTimer)
    pushTimer = setTimeout(() => { forceSync(code).catch(() => {}) }, PUSH_DEBOUNCE_MS)
  }
  window.addEventListener('pipemaster:local-write', scheduleDebouncedPush)

  const channel = supabase
    .channel(`farm_sync_${code.toUpperCase()}`)
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'farm_sync', filter: `code=eq.${code.toUpperCase()}` },
      async (payload) => {
        if (Date.now() - lastPushAt < ECHO_GUARD_MS) return // that's just our own push echoing back
        setSyncStatus({ state: 'syncing' })
        try {
          await restoreAllTablesData(payload.new.data)
          setSyncStatus({ state: 'synced', lastSyncedAt: new Date(), error: null })
        } catch (err) {
          setSyncStatus({ state: 'error', error: err.message })
        }
      })
    .subscribe()

  autoSyncCleanup = () => {
    clearTimeout(pushTimer)
    window.removeEventListener('pipemaster:local-write', scheduleDebouncedPush)
    supabase.removeChannel(channel)
    autoSyncCleanup = null
  }
  return autoSyncCleanup
}

export function stopAutoSync() {
  autoSyncCleanup?.()
}
