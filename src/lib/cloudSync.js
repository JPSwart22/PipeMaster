import supabase from './supabase'
import { getAllTablesData, restoreAllTablesData } from './backup'

const CODE_KEY       = 'pipemaster-farm-code'
const LAST_WRITE_KEY = 'pipemaster-last-write-at'
const CODE_CHARS     = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid confusion read aloud
const PUSH_DEBOUNCE_MS = 2000  // raised from 300ms — gives writes time to settle before push
const ECHO_GUARD_MS    = 3000  // raised — give the push → realtime echo time to arrive and be ignored

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

// Called whenever any local DB write happens — stamps the time so startup
// sync can decide whether to push (local newer) or pull (cloud newer).
function stampLocalWrite() {
  localStorage.setItem(LAST_WRITE_KEY, Date.now().toString())
}

function getLastLocalWriteAt() {
  return parseInt(localStorage.getItem(LAST_WRITE_KEY) || '0')
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
  // Safety guard: never overwrite cloud with an empty local state.
  // This prevents a wipe cascade if local data is cleared before startup sync runs.
  const totalItems = Object.values(tables).reduce((sum, arr) => sum + (arr?.length ?? 0), 0)
  if (totalItems === 0) return
  const { error } = await supabase
    .from('farm_sync')
    .upsert({ code: code.toUpperCase(), data: tables, updated_at: new Date().toISOString() }, { onConflict: 'code' })
  if (error) throw error
  lastPushAt = Date.now() // track here so any push path sets the echo guard
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

// Returns last 5 auto-saved versions (saved by DB trigger before each push overwrites)
export async function listSnapshots(code) {
  const { data, error } = await supabase
    .from('farm_sync_history')
    .select('id, saved_at')
    .eq('farm_code', code.toUpperCase())
    .order('saved_at', { ascending: false })
    .limit(5)
  if (error) throw error
  return data ?? []
}

// Restores a snapshot locally and pushes it to cloud so all devices sync
export async function restoreSnapshot(code, snapshotId) {
  const { data: row, error } = await supabase
    .from('farm_sync_history')
    .select('data')
    .eq('id', snapshotId)
    .eq('farm_code', code.toUpperCase())
    .single()
  if (error) throw error
  await restoreAllTablesData(row.data)
  localStorage.setItem(LAST_WRITE_KEY, Date.now().toString())
  await forceSync(code)
}

let lastPushAt = 0

export async function forceSync(code) {
  setSyncStatus({ state: 'syncing' })
  try {
    await pushToCloud(code)
    setSyncStatus({ state: 'synced', lastSyncedAt: new Date(), error: null })
  } catch (err) {
    setSyncStatus({ state: 'error', error: err.message })
    throw err
  }
}

// ── Startup sync — decides push vs pull based on timestamps to avoid
// overwriting local data that hasn't been pushed yet. ─────────────────────
async function startupSync(code) {
  // Fetch only the metadata first (cheap) to compare timestamps
  const { data: meta } = await supabase
    .from('farm_sync')
    .select('updated_at')
    .eq('code', code.toUpperCase())
    .maybeSingle()

  if (!meta) {
    // Nothing in cloud yet — push local data up
    await pushToCloud(code)
    return
  }

  const lastLocalWrite = getLastLocalWriteAt()
  const cloudTs = new Date(meta.updated_at).getTime()

  if (lastLocalWrite > cloudTs) {
    // Local has newer changes that haven't reached the cloud — push
    await pushToCloud(code)
  } else {
    // Cloud is newer (or equal) — safe to pull
    await pullFromCloud(code)
  }
}

// ── Auto-sync — push shortly after any local change, pull the instant another
// device pushes. Call once per session after the user has a farm. ─────────
let autoSyncCleanup = null

export function startAutoSync(code) {
  if (autoSyncCleanup) return autoSyncCleanup
  let pushTimer = null

  // Startup: push if local is newer, pull if cloud is newer
  startupSync(code).then(() => {
    setSyncStatus({ state: 'synced', lastSyncedAt: new Date(), error: null })
  }).catch(() => { /* offline or no snapshot yet — fine */ })

  function scheduleDebouncedPush() {
    stampLocalWrite()  // track that local data changed
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
