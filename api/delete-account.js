import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, farmCode } = req.body ?? {}
  if (!email || !farmCode) {
    return res.status(400).json({ error: 'Email and farm code are required.' })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return res.status(500).json({ error: 'Server not configured — contact 2205jpswart@gmail.com' })
  }

  const admin = createClient(
    process.env.VITE_SUPABASE_URL,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const code = farmCode.toUpperCase().trim()
  const cleanEmail = email.toLowerCase().trim()

  // 1. Delete farm sync data for this farm code
  const { error: syncErr } = await admin.from('farm_sync').delete().eq('code', code)
  if (syncErr) {
    return res.status(500).json({ error: 'Could not delete farm data. Check that your farm code is correct.' })
  }

  // 2. Delete all snapshots for this farm code
  await admin.from('farm_sync_history').delete().eq('farm_code', code)

  // 3. Find and delete the auth user by email
  // Supabase admin has no getUserByEmail — list and filter (small user base)
  const { data: page } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const user = page?.users?.find(u => u.email?.toLowerCase() === cleanEmail)
  if (user) {
    await admin.auth.admin.deleteUser(user.id)
  }

  return res.status(200).json({ success: true })
}
