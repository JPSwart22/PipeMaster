export const HOLE_SIZES = [
  'Supply',
  '1/4"', '5/16"', '3/8"', '7/16"', '1/2"',
  '9/16"', '5/8"', '11/16"', '3/4"',
  '13/16"', '7/8"', '15/16"', '1"',
]

export const HOLE_COLOR = {
  'Supply':  '#64748b',
  '1/4"':    '#f59e0b',
  '5/16"':   '#3b82f6',
  '3/8"':    '#7c3aed',
  '7/16"':   '#10b981',
  '1/2"':    '#ef4444',
  '9/16"':   '#eab308',
  '5/8"':    '#22c55e',
  '11/16"':  '#f97316',
  '3/4"':    '#06b6d4',
  '13/16"':  '#ec4899',
  '7/8"':    '#84cc16',
  '15/16"':  '#a855f7',
  '1"':      '#e2e8f0',
}

export function haversineMeters(a, b) {
  const R = 6371000
  const φ1 = a[0] * Math.PI / 180
  const φ2 = b[0] * Math.PI / 180
  const Δφ = (b[0] - a[0]) * Math.PI / 180
  const Δλ = (b[1] - a[1]) * Math.PI / 180
  const s = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

export function pathTotalFt(path) {
  if (!path?.length) return 0
  let m = 0
  for (let i = 0; i < path.length - 1; i++) m += haversineMeters(path[i], path[i + 1])
  return m / 0.3048
}

export function getPointAtFt(path, targetFt) {
  if (!path?.length) return null
  const targetM = targetFt * 0.3048
  let walked = 0
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1]
    const segM = haversineMeters(a, b)
    if (walked + segM >= targetM) {
      const t = segM > 0 ? (targetM - walked) / segM : 0
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    }
    walked += segM
  }
  return path[path.length - 1]
}

// Shifts every point in path sideways by offsetMeters (perpendicular to local direction)
// Used to render multiple physical lines that share one drawn corridor without fully overlapping
export function offsetPath(path, offsetMeters) {
  if (!path?.length || !offsetMeters) return path
  const mPerDegLat = 111320
  return path.map((pt, i) => {
    const prev = path[Math.max(0, i - 1)]
    const next = path[Math.min(path.length - 1, i + 1)]
    const latRad = pt[0] * Math.PI / 180
    const mPerDegLon = 111320 * Math.cos(latRad)
    const dxM = (next[1] - prev[1]) * mPerDegLon
    const dyM = (next[0] - prev[0]) * mPerDegLat
    const len = Math.hypot(dxM, dyM) || 1
    const perpXm = -dyM / len
    const perpYm =  dxM / len
    return [
      pt[0] + (perpYm * offsetMeters) / mPerDegLat,
      pt[1] + (perpXm * offsetMeters) / mPerDegLon,
    ]
  })
}

// Given a tapped lat/lon, returns the distance in ft along the path closest to that point.
// Used to place a tee marker at the spot the user taps near an existing run's line.
export function nearestFtOnPath(path, latlng) {
  if (!path?.length) return 0
  let walked = 0
  let bestFt = 0
  let bestDist = Infinity

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1]
    const segM = haversineMeters(a, b)

    const latRad = a[0] * Math.PI / 180
    const mPerDegLat = 111320
    const mPerDegLon = 111320 * Math.cos(latRad)
    const bx = (b[1] - a[1]) * mPerDegLon, by = (b[0] - a[0]) * mPerDegLat
    const px = (latlng[1] - a[1]) * mPerDegLon, py = (latlng[0] - a[0]) * mPerDegLat
    const lenSq = bx * bx + by * by
    const t = lenSq > 0 ? Math.max(0, Math.min(1, (px * bx + py * by) / lenSq)) : 0
    const distM = Math.hypot(px - bx * t, py - by * t)

    if (distM < bestDist) {
      bestDist = distM
      bestFt = (walked + segM * t) / 0.3048
    }
    walked += segM
  }
  return Math.round(bestFt)
}

// Returns the segment whose [startFt, endFt) range contains ft, or the last segment if past the end
export function segmentAtFt(segments, ft) {
  if (!segments?.length) return null
  const sorted = [...segments].sort((a, b) => a.sortOrder - b.sortOrder)
  for (const seg of sorted) {
    if (ft >= seg.startFt && ft < seg.endFt) return seg
  }
  return ft < sorted[0].startFt ? sorted[0] : sorted[sorted.length - 1]
}

// Rewrites a segment list so that [startFt, endFt] uses newHoleSize/newFurrowPattern.
// Segments outside the range are kept intact; segments that overlap the range are split.
export function applyRangeEdit(segs, startFt, endFt, newHoleSize, newFurrowPattern) {
  if (!segs?.length || startFt >= endFt) return segs
  // Expand implicit startFt
  const full = segs.map((s, i) => ({
    startFt:      i === 0 ? 0 : segs[i - 1].endFt,
    endFt:        s.endFt,
    holeSize:     s.holeSize,
    furrowCount:  s.furrowCount ?? null,
    furrowPattern: s.furrowPattern ?? null,
  }))
  const result = []
  for (const seg of full) {
    if (seg.endFt <= startFt || seg.startFt >= endFt) {
      result.push(seg)
    } else {
      if (seg.startFt < startFt) result.push({ ...seg, endFt: startFt })
      if (seg.endFt   > endFt)   result.push({ ...seg, startFt: endFt })
    }
  }
  result.push({ startFt, endFt, holeSize: newHoleSize, furrowCount: null, furrowPattern: newFurrowPattern ?? null })
  result.sort((a, b) => a.startFt - b.startFt)
  return result.map(s => ({ holeSize: s.holeSize, endFt: s.endFt, furrowCount: s.furrowCount, furrowPattern: s.furrowPattern }))
}

// Returns the sub-polyline of path between startFt and endFt
export function slicePath(path, startFt, endFt) {
  if (!path?.length || endFt <= startFt) return []
  const startM = startFt * 0.3048
  const endM   = endFt   * 0.3048
  const out    = []
  let walked   = 0

  function lerp(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  }

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1]
    const segM     = haversineMeters(a, b)
    const segStart = walked
    const segEnd   = walked + segM

    if (segEnd <= startM) { walked = segEnd; continue }
    if (segStart >= endM) break

    const clipStart = Math.max(segStart, startM)
    const clipEnd   = Math.min(segEnd,   endM)
    const tStart = segM > 0 ? (clipStart - segStart) / segM : 0
    const tEnd   = segM > 0 ? (clipEnd   - segStart) / segM : 1

    if (out.length === 0) out.push(lerp(a, b, tStart))
    out.push(lerp(a, b, tEnd))

    walked = segEnd
  }

  return out
}
