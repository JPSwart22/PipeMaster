import { useState } from 'react'
import { useMap, useMapEvents, Polyline, Polygon, Marker } from 'react-leaflet'
import L from 'leaflet'

export const FIELD_COLORS = [
  '#22c55e', '#f97316', '#3b82f6', '#a855f7',
  '#06b6d4', '#eab308', '#ec4899', '#ef4444',
]

export function nextColor(usedCount) {
  return FIELD_COLORS[usedCount % FIELD_COLORS.length]
}

function makeDotIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
      cursor:grab;touch-action:none;
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

function ptToSegDist(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y
  const apx = p.x - a.x, apy = p.y - a.y
  const lenSq = abx * abx + aby * aby
  if (lenSq === 0) return Math.hypot(apx, apy)
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / lenSq))
  return Math.hypot(apx - t * abx, apy - t * aby)
}

function CursorTracker({ onMove }) {
  useMapEvents({
    mousemove(e) { onMove([e.latlng.lat, e.latlng.lng]) },
    mouseout()   { onMove(null) },
  })
  return null
}

function DrawClickHandler({ points, forcePolyline, onMapClick, onInsertPoint }) {
  const map = useMap()

  useMapEvents({
    click(e) {
      if (points.length >= 2) {
        const clickPx = map.latLngToContainerPoint(e.latlng)
        const THRESHOLD = 20

        // Check each segment
        for (let i = 0; i < points.length - 1; i++) {
          const a = map.latLngToContainerPoint(L.latLng(points[i][0], points[i][1]))
          const b = map.latLngToContainerPoint(L.latLng(points[i + 1][0], points[i + 1][1]))
          if (ptToSegDist(clickPx, a, b) < THRESHOLD) {
            onInsertPoint(i, [e.latlng.lat, e.latlng.lng])
            return
          }
        }

        // Check closing segment for polygons
        if (!forcePolyline && points.length >= 3) {
          const a = map.latLngToContainerPoint(L.latLng(points[points.length - 1][0], points[points.length - 1][1]))
          const b = map.latLngToContainerPoint(L.latLng(points[0][0], points[0][1]))
          if (ptToSegDist(clickPx, a, b) < THRESHOLD) {
            onInsertPoint(points.length - 1, [e.latlng.lat, e.latlng.lng])
            return
          }
        }
      }

      onMapClick([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

export default function DrawMode({ points, onMapClick, onPointDrag, onInsertPoint, onCursorMove, color = '#22c55e', forcePolyline = false }) {
  const [cursorPos, setCursorPos] = useState(null)
  const icon = makeDotIcon(color)
  const hasPolygon = !forcePolyline && points.length >= 3

  function handleCursorMove(pos) {
    setCursorPos(pos)
    onCursorMove?.(pos)
  }

  return (
    <>
      <DrawClickHandler
        points={points}
        forcePolyline={forcePolyline}
        onMapClick={onMapClick}
        onInsertPoint={onInsertPoint ?? (() => {})}
      />

      {onCursorMove && <CursorTracker onMove={handleCursorMove} />}

      {hasPolygon && (
        <Polygon
          positions={points}
          pathOptions={{ color, fillColor: color, fillOpacity: 0.2, weight: 2, dashArray: '6 4' }}
        />
      )}
      {!hasPolygon && points.length >= 2 && (
        <Polyline
          positions={points}
          pathOptions={{ color, weight: 2, dashArray: '6 4' }}
        />
      )}

      {/* Ghost line from last point to cursor (mouse/pen only) */}
      {forcePolyline && points.length >= 1 && cursorPos && (
        <Polyline
          positions={[points[points.length - 1], cursorPos]}
          pathOptions={{ color, weight: 2, dashArray: '4 6', opacity: 0.45 }}
        />
      )}

      {points.map((pt, i) => (
        <Marker
          key={i}
          position={pt}
          icon={icon}
          draggable={true}
          eventHandlers={{
            dragend(e) {
              const { lat, lng } = e.target.getLatLng()
              onPointDrag(i, [lat, lng])
            },
          }}
        />
      ))}
    </>
  )
}
