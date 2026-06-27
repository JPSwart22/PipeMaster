import db from './db'

export const TABLES = ['farms', 'fields', 'zones', 'wells', 'risers', 'undergrounds', 'runs', 'segments', 'notes', 'waterLogs', 'schematics', 'tees']

export async function getAllTablesData() {
  const tables = {}
  for (const t of TABLES) {
    tables[t] = await db[t].toArray()
  }
  return tables
}

// Replaces all local data with the given table contents
export async function restoreAllTablesData(tables) {
  await db.transaction('rw', TABLES.map(t => db[t]), async () => {
    for (const t of TABLES) {
      if (!tables[t]) continue
      await db[t].clear()
      await db[t].bulkAdd(tables[t])
    }
  })
}

export async function downloadBackup() {
  const tables = await getAllTablesData()
  const blob = new Blob([JSON.stringify({ exportedAt: Date.now(), tables }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pipemaster-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function restoreBackup(file) {
  const payload = JSON.parse(await file.text())
  await restoreAllTablesData(payload.tables ?? payload)
}
