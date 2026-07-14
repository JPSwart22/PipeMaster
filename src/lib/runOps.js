import { LocalNotifications } from '@capacitor/local-notifications'
import db from './db'

// Local notification only — fires on the same device/person who started the run, not
// broadcast to other team members' phones (that would need a push-notification backend).
// The run's own numeric id doubles as the notification id, so it can be reliably cancelled.
async function scheduleWateringReminder(run) {
  try {
    const segs = await db.segments.where('runId').equals(run.id).toArray()
    const hours = segs.find(s => s.wateringHours)?.wateringHours
    if (!hours) return
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions()
      if (req.display !== 'granted') return
    }
    await LocalNotifications.schedule({
      notifications: [{
        id: run.id,
        title: 'Check on watering',
        body: `${run.name} should be watered out by now`,
        schedule: { at: new Date(Date.now() + hours * 3600000) },
      }],
    })
  } catch { /* not Android/iOS, or permission denied — degrade silently */ }
}

async function cancelWateringReminder(run) {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: run.id }] })
  } catch { /* not Android/iOS */ }
}

// Stops a run, writing one waterLogs entry for the session that just ended.
// gpm is optional — when omitted (e.g. an auto-stop triggered by swapping lines),
// the entry is logged with duration only, editable later from the run's history.
export async function stopRun(run, gpm = null) {
  const endTime = Date.now()
  const startTime = run.startTime ?? endTime
  const durationMin = (endTime - startTime) / 60000
  const gallons = gpm ? Math.round(gpm * durationMin) : null
  await db.waterLogs.add({ runId: run.id, wellId: run.wellId ?? null, gpm, startTime, endTime, gallons })
  await db.runs.update(run.id, { status: 'idle', startTime: null, endTime: null })
  await cancelWateringReminder(run)
}

// Starts a run. If another run on the SAME riser is currently running, it's
// auto-stopped and logged first — swapping which line a riser feeds is one tap,
// not a manual stop-then-start.
export async function startRun(run) {
  if (run.riserId) {
    const siblings = await db.runs
      .where('riserId').equals(run.riserId)
      .and(r => r.id !== run.id && r.status === 'running')
      .toArray()
    for (const sibling of siblings) {
      await stopRun(sibling)
    }
  }
  await db.runs.update(run.id, { status: 'running', startTime: Date.now(), endTime: null })
  await scheduleWateringReminder(run)
}
