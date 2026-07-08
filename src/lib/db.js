import Dexie from 'dexie'

const db = new Dexie('pipemaster')

db.version(1).stores({
  farms:     '++id, name, createdAt',
  fields:    '++id, farmId, name, crop, color, createdAt',
  wells:     '++id, farmId, name, type, gpm, hp, lat, lon, createdAt',
  runs:      '++id, fieldId, wellId, name, status, startTime, endTime, gpmReading, gallons',
  segments:  '++id, runId, distance, holeSize, color, sortOrder',
  notes:     '++id, fieldId, runId, text, photoUrl, lat, lon, createdAt',
  waterLogs: '++id, runId, wellId, gpm, startTime, endTime, gallons',
})

db.version(2).stores({
  farms:     '++id, name, createdAt',
  fields:    '++id, farmId, name, crop, color, createdAt',
  zones:     '++id, fieldId, name, crop, color, createdAt',
  wells:     '++id, farmId, name, type, gpm, hp, lat, lon, createdAt',
  runs:      '++id, fieldId, zoneId, wellId, name, status, startTime, endTime, gpmReading, gallons',
  segments:  '++id, runId, distance, holeSize, color, sortOrder',
  notes:     '++id, fieldId, zoneId, runId, text, photoUrl, lat, lon, createdAt',
  waterLogs: '++id, runId, wellId, gpm, startTime, endTime, gallons',
})

// v3 — risers, underground lines, updated segments schema
db.version(3).stores({
  farms:       '++id, name, createdAt',
  fields:      '++id, farmId, name, crop, color, createdAt',
  zones:       '++id, fieldId, name, crop, color, createdAt',
  wells:       '++id, farmId, name, type, gpm, hp, lat, lon, createdAt',
  risers:      '++id, wellId, farmId, name, lat, lon, createdAt',
  undergrounds:'++id, wellId, riserId, farmId, createdAt',
  runs:        '++id, fieldId, riserId, wellId, name, status, startLat, startLon, endLat, endLon, startTime, endTime, gpmReading, gallons',
  segments:    '++id, runId, startFt, endFt, holeSize, furrowCount, sortOrder',
  notes:       '++id, fieldId, runId, text, photoUrl, lat, lon, createdAt',
  waterLogs:   '++id, runId, wellId, gpm, startTime, endTime, gallons',
})

// v4 — wells/risers tied to fields; daisy-chain undergrounds (fromType + fromId)
db.version(4).stores({
  farms:       '++id, name, createdAt',
  fields:      '++id, farmId, name, crop, color, createdAt',
  zones:       '++id, fieldId, name, crop, color, createdAt',
  wells:       '++id, farmId, fieldId, name, type, gpm, hp, lat, lon, createdAt',
  risers:      '++id, wellId, farmId, fieldId, name, lat, lon, createdAt',
  undergrounds:'++id, fromType, fromId, riserId, farmId, fieldId, createdAt',
  runs:        '++id, fieldId, riserId, wellId, name, status, startLat, startLon, endLat, endLon, startTime, endTime, gpmReading, gallons',
  segments:    '++id, runId, startFt, endFt, holeSize, furrowCount, sortOrder',
  notes:       '++id, fieldId, runId, text, photoUrl, lat, lon, createdAt',
  waterLogs:   '++id, runId, wellId, gpm, startTime, endTime, gallons',
}).upgrade(tx =>
  tx.table('undergrounds').toCollection().modify(u => {
    if (u.fromType === undefined) {
      u.fromType = 'well'
      u.fromId   = u.wellId
    }
  })
)

// v5 — runs use path[] (non-indexed array) instead of startLat/startLon/endLat/endLon
db.version(5).stores({
  farms:       '++id, name, createdAt',
  fields:      '++id, farmId, name, crop, color, createdAt',
  zones:       '++id, fieldId, name, crop, color, createdAt',
  wells:       '++id, farmId, fieldId, name, type, gpm, hp, lat, lon, createdAt',
  risers:      '++id, wellId, farmId, fieldId, name, lat, lon, createdAt',
  undergrounds:'++id, fromType, fromId, riserId, farmId, fieldId, createdAt',
  runs:        '++id, fieldId, riserId, wellId, name, status, startTime, endTime, gpmReading, gallons',
  segments:    '++id, runId, startFt, endFt, holeSize, furrowCount, sortOrder',
  notes:       '++id, fieldId, runId, text, photoUrl, lat, lon, createdAt',
  waterLogs:   '++id, runId, wellId, gpm, startTime, endTime, gallons',
})

// v6 — schematic image overlays per field (imageData + bounds stored as non-indexed fields)
db.version(6).stores({
  farms:       '++id, name, createdAt',
  fields:      '++id, farmId, name, crop, color, createdAt',
  zones:       '++id, fieldId, name, crop, color, createdAt',
  wells:       '++id, farmId, fieldId, name, type, gpm, hp, lat, lon, createdAt',
  risers:      '++id, wellId, farmId, fieldId, name, lat, lon, createdAt',
  undergrounds:'++id, fromType, fromId, riserId, farmId, fieldId, createdAt',
  runs:        '++id, fieldId, riserId, wellId, name, status, startTime, endTime, gpmReading, gallons',
  segments:    '++id, runId, startFt, endFt, holeSize, furrowCount, sortOrder',
  notes:       '++id, fieldId, runId, text, photoUrl, lat, lon, createdAt',
  waterLogs:   '++id, runId, wellId, gpm, startTime, endTime, gallons',
  schematics:  '++id, fieldId, name, createdAt',
})

// v7 — inline tee markers: persistent T-fitting points placed along a run's path,
// from which one or more new runs can branch (replaces the old one-shot tee-run flow)
db.version(7).stores({
  farms:       '++id, name, createdAt',
  fields:      '++id, farmId, name, crop, color, createdAt',
  zones:       '++id, fieldId, name, crop, color, createdAt',
  wells:       '++id, farmId, fieldId, name, type, gpm, hp, lat, lon, createdAt',
  risers:      '++id, wellId, farmId, fieldId, name, lat, lon, createdAt',
  undergrounds:'++id, fromType, fromId, riserId, farmId, fieldId, createdAt',
  runs:        '++id, fieldId, riserId, wellId, name, status, startTime, endTime, gpmReading, gallons',
  segments:    '++id, runId, startFt, endFt, holeSize, furrowCount, sortOrder',
  notes:       '++id, fieldId, runId, text, photoUrl, lat, lon, createdAt',
  waterLogs:   '++id, runId, wellId, gpm, startTime, endTime, gallons',
  schematics:  '++id, fieldId, name, createdAt',
  tees:        '++id, runId, fieldId, atFt, name, createdAt',
})

// v8 — run-level furrow pattern tag; schematic pattern index
db.version(8).stores({
  farms:       '++id, name, createdAt',
  fields:      '++id, farmId, name, crop, color, createdAt',
  zones:       '++id, fieldId, name, crop, color, createdAt',
  wells:       '++id, farmId, fieldId, name, type, gpm, hp, lat, lon, createdAt',
  risers:      '++id, wellId, farmId, fieldId, name, lat, lon, createdAt',
  undergrounds:'++id, fromType, fromId, riserId, farmId, fieldId, createdAt',
  runs:        '++id, fieldId, riserId, wellId, furrowPattern, name, status, startTime, endTime, gpmReading, gallons',
  segments:    '++id, runId, startFt, endFt, holeSize, furrowCount, sortOrder',
  notes:       '++id, fieldId, runId, text, photoUrl, lat, lon, createdAt',
  waterLogs:   '++id, runId, wellId, gpm, startTime, endTime, gallons',
  schematics:  '++id, fieldId, furrowPattern, name, createdAt',
  tees:        '++id, runId, fieldId, atFt, name, createdAt',
})

// v9 — drop schematics table (overlay approach scrapped; AI reads sheets into runs directly)
db.version(9).stores({
  schematics: null,
})

// v10 — add teeId index to runs so child runs (branching from a tee marker) can be queried
db.version(10).stores({
  runs: '++id, fieldId, riserId, wellId, teeId, furrowPattern, name, status, startTime, endTime, gpmReading, gallons',
})

// v11 — flags: GPS pins with title + description, droppable in field or dev mode
db.version(11).stores({
  flags: '++id, farmId, lat, lon, title, createdAt',
})

// v12 — linkedRunId: optional pairing so two runs (e.g. north + south) can be
// marked as watered simultaneously from the same riser opening
db.version(12).stores({
  runs: '++id, fieldId, riserId, wellId, teeId, linkedRunId, furrowPattern, name, status, startTime, endTime, gpmReading, gallons',
})

// Fires a window event on every successful write to any table, regardless of
// which component made it — lets the auto-sync engine debounce-push to the
// cloud without every db.X.add/update/delete call site needing to know about sync.
db.use({
  stack: 'dbcore',
  name: 'notify-local-writes',
  create(downlevelDatabase) {
    return {
      ...downlevelDatabase,
      table(tableName) {
        const downlevelTable = downlevelDatabase.table(tableName)
        return {
          ...downlevelTable,
          mutate: async (req) => {
            const res = await downlevelTable.mutate(req)
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('pipemaster:local-write'))
            }
            return res
          },
        }
      },
    }
  },
})

export default db
