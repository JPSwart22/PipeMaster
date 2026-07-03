import supabase from './supabase'
import { generateFarmCode, saveFarmCode, pullFromCloud, pushToCloud } from './cloudSync'
import { clearAllTablesData } from './backup'

// Returns the farm the current user belongs to, or null if they haven't joined/created one yet
export async function getMyFarm() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('farm_members')
    .select('role, farms(id, name, code, owner_id, sub_status, trial_ends_at, sub_expires_at)')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw error
  if (!data?.farms) return null
  const farm = { ...data.farms, role: data.role }
  saveFarmCode(farm.code)
  // Cache subscription status locally for offline grace period
  localStorage.setItem('pipemaster-sub-cache', JSON.stringify({
    allowed: isSubActive(farm),
    role: farm.role,
    trialEndsAt: farm.trial_ends_at,
    checkedAt: Date.now(),
  }))
  return farm
}

export function isSubActive(farm) {
  if (!farm) return false
  if (farm.sub_status === 'active') return true
  if (farm.sub_status === 'trial' && farm.trial_ends_at) {
    return new Date(farm.trial_ends_at) > new Date()
  }
  return false
}

// Returns cached sub state if Supabase is unreachable and cache is < 48 hours old
export function getCachedSubAllowed() {
  try {
    const cached = JSON.parse(localStorage.getItem('pipemaster-sub-cache') || 'null')
    if (!cached) return null
    const GRACE_MS = 48 * 60 * 60 * 1000
    if (Date.now() - cached.checkedAt < GRACE_MS) return cached
  } catch { /* ignore */ }
  return null
}

export async function saveProfile(username) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, username }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function setupFarm(farmName) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  // Wipe any pre-existing local data so the new farm starts completely empty
  await clearAllTablesData()

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateFarmCode()
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: farm, error } = await supabase
      .from('farms')
      .insert({ name: farmName, code, owner_id: user.id, sub_status: 'trial', trial_ends_at: trialEndsAt })
      .select()
      .single()
    if (!error) {
      const { error: memberError } = await supabase
        .from('farm_members')
        .insert({ farm_id: farm.id, user_id: user.id, role: 'owner' })
      if (memberError) throw memberError
      saveFarmCode(farm.code)
      try { await pushToCloud(farm.code) } catch { /* non-fatal — syncs on next write */ }
      return farm
    }
    if (error.code !== '23505') throw error // not a unique-code collision — a real error
  }
  throw new Error('Could not generate a unique farm code — try again')
}

export async function joinFarmWithCode(code) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data: farm, error } = await supabase
    .from('farms')
    .select('id, name, code, owner_id')
    .eq('code', code.toUpperCase())
    .maybeSingle()
  if (error) throw error
  if (!farm) throw new Error('No farm found with that code')

  const { error: memberError } = await supabase
    .from('farm_members')
    .insert({ farm_id: farm.id, user_id: user.id, role: 'member' })
  if (memberError) throw memberError

  saveFarmCode(farm.code)
  try { await pullFromCloud(farm.code) } catch { /* nothing pushed yet — fine */ }
  return farm
}
