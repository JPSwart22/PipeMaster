import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const ACTIVE_EVENTS   = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION']
const EXPIRED_EVENTS  = ['EXPIRATION', 'CANCELLATION']

Deno.serve(async (req) => {
  // Verify RevenueCat shared secret
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${Deno.env.get('REVENUECAT_WEBHOOK_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body      = await req.json()
  const event     = body.event
  const userId    = event?.app_user_id
  const eventType = event?.type

  if (!userId || !eventType) return new Response('OK', { status: 200 })

  // Find the farm this user owns
  const { data: member } = await supabase
    .from('farm_members')
    .select('farm_id')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .maybeSingle()

  if (!member?.farm_id) return new Response('OK', { status: 200 })

  if (ACTIVE_EVENTS.includes(eventType)) {
    const expiresAt = event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null
    await supabase.from('farms')
      .update({ sub_status: 'active', sub_expires_at: expiresAt })
      .eq('id', member.farm_id)

  } else if (EXPIRED_EVENTS.includes(eventType)) {
    await supabase.from('farms')
      .update({ sub_status: 'expired' })
      .eq('id', member.farm_id)
  }

  return new Response('OK', { status: 200 })
})
