import { Fragment } from 'react'
import { Polyline, CircleMarker } from 'react-leaflet'
import { slicePath, getPointAtFt, offsetPath, HOLE_COLOR } from '../lib/pipeUtils'

const LINE_SPACING_M = 2.2 // ~ a 15ft pad, just enough to render side by side
const STATUS_COLOR = { running: '#22c55e', idle: '#6b7280' }

export default function PipeRunLine({ run, segments, onSelect, selectable = true, statusColor = false, showColors = true }) {
  if (!run?.path?.length || !segments?.length) return null

  const lineNames = [...new Set(segments.map(s => s.line || 'Line 1'))]
  const selectHandlers = selectable && onSelect
    ? { click: (e) => { e.originalEvent.stopPropagation(); onSelect(run) } }
    : undefined
  const runColor = run.status === 'running' ? STATUS_COLOR.running : STATUS_COLOR.idle

  return (
    <>
      {lineNames.map((lineName, li) => {
        const lineSegs = segments.filter(s => (s.line || 'Line 1') === lineName)
        const sorted = [...lineSegs].sort((a, b) => a.sortOrder - b.sortOrder)
        const offsetM = lineNames.length > 1 ? (li - (lineNames.length - 1) / 2) * LINE_SPACING_M : 0
        const linePath = offsetM ? offsetPath(run.path, offsetM) : run.path

        return (
          <Fragment key={lineName}>
            {/* Wide invisible hit-target for easy tapping, especially on mobile */}
            {selectHandlers && (
              <Polyline
                positions={linePath}
                pathOptions={{ opacity: 0, weight: 22 }}
                eventHandlers={selectHandlers}
              />
            )}

            {statusColor ? (
              // Field Mode: solid green + glow when running, dim grey when idle
              <>
                {run.status === 'running' && (
                  <Polyline positions={linePath}
                    pathOptions={{ color: '#22c55e', weight: 20, opacity: 0.08 }} />
                )}
                {run.status === 'running' && (
                  <Polyline positions={linePath}
                    pathOptions={{ color: '#22c55e', weight: 11, opacity: 0.2 }} />
                )}
                <Polyline positions={linePath}
                  pathOptions={{ color: runColor, weight: run.status === 'running' ? 5 : 3, opacity: run.status === 'running' ? 0.95 : 0.55 }} />
              </>
            ) : !showColors ? (
              // Edit Mode zoomed-out: simple neutral line, no segment colors
              <Polyline positions={linePath}
                pathOptions={{ color: '#94a3b8', weight: 2, opacity: 0.55 }} />
            ) : (
              <>
                {sorted.map((seg, i) => {
                  const pts = slicePath(linePath, seg.startFt, seg.endFt)
                  if (pts.length < 2) return null
                  const color = HOLE_COLOR[seg.holeSize] ?? '#64748b'
                  const isSupply = seg.holeSize === 'Supply'
                  return (
                    <Polyline
                      key={seg.id ?? `${lineName}-${i}`}
                      positions={pts}
                      pathOptions={{
                        color,
                        weight: isSupply ? 3 : 4,
                        dashArray: isSupply ? '6 5' : null,
                        opacity: 0.9,
                      }}
                    />
                  )
                })}

                {/* Swap point markers — dot at each hole-size change */}
                {sorted.slice(0, -1).map((seg, i) => {
                  const pt = getPointAtFt(linePath, seg.endFt)
                  if (!pt) return null
                  const nextColor = HOLE_COLOR[sorted[i + 1]?.holeSize] ?? '#64748b'
                  return (
                    <CircleMarker
                      key={`swap-${seg.id ?? `${lineName}-${i}`}`}
                      center={pt}
                      radius={5}
                      pathOptions={{ fillColor: nextColor, fillOpacity: 1, color: 'white', weight: 1.5 }}
                    />
                  )
                })}
              </>
            )}
          </Fragment>
        )
      })}
    </>
  )
}
