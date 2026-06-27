import supabase from './supabase'

// Everyone who belongs to a farm — requires the "co-members can view each
// other's profile" + "members can view their farm's roster" RLS policies.
export async function getFarmMembers(farmId) {
  const { data, error } = await supabase
    .from('farm_members')
    .select('user_id, role, joined_at, profiles(username)')
    .eq('farm_id', farmId)
    .order('joined_at', { ascending: true })
  if (error) throw error
  return data.map(m => ({
    userId: m.user_id,
    role: m.role,
    joinedAt: m.joined_at,
    username: m.profiles?.username ?? 'Unknown',
  }))
}
