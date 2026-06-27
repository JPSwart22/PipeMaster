import supabase from './supabase'
import { generateFarmCode, saveFarmCode, pullFromCloud } from './cloudSync'

// Returns the farm the current user belongs to, or null if they haven't joined/created one yet
export async function getMyFarm() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('farm_members')
    .select('role, farms(id, name, code, owner_id)')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw error
  if (!data?.farms) return null
  const farm = { ...data.farms, role: data.role }
  saveFarmCode(farm.code)
  return farm
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

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateFarmCode()
    const { data: farm, error } = await supabase
      .from('farms')
      .insert({ name: farmName, code, owner_id: user.id })
      .select()
      .single()
    if (!error) {
      const { error: memberError } = await supabase
        .from('farm_members')
        .insert({ farm_id: farm.id, user_id: user.id, role: 'owner' })
      if (memberError) throw memberError
      saveFarmCode(farm.code)
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
