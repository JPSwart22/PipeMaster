import { useState } from 'react'
import { CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet'

function radiusPx(zoom) {
  if (zoom >= 14) return 9
  if (zoom >= 12) return 6
  if (zoom >= 10) return 4
  if (zoom >= 8) return 2.5
  return 1.5
}

export default function TeeMarker({ position, name, onClick }) {
  const map = useMap()
  const [radius, setRadius] = useState(() => radiusPx(map.getZoom()))
  useMapEvents({ zoomend() { setRadius(radiusPx(map.getZoom())) } })

  if (!position) return null
  const clickHandlers = onClick
    ? { click: (e) => { e.originalEvent.stopPropagation(); onClick() } }
    : undefined

  return (
    <>
      {/* Wide invisible hit-target for easy tapping, especially on mobile — stays constant
          regardless of the visible dot's size so it's never harder to tap when zoomed out */}
      {onClick && (
        <CircleMarker center={position} radius={20}
                      pathOptions={{ opacity: 0, fillOpacity: 0 }}
                      eventHandlers={clickHandlers} />
      )}
      <CircleMarker
        center={position}
        radius={radius}
        pathOptions={{ fillColor: '#22c55e', fillOpacity: 1, color: 'white', weight: Math.max(1, Math.round(radius * 0.22)) }}
        eventHandlers={clickHandlers}>
        {name && <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>{name}</Tooltip>}
      </CircleMarker>
    </>
  )
}
