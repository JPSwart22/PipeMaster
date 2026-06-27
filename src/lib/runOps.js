import db from './db'

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
}
