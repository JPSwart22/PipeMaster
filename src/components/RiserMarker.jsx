import { useState } from 'react'
import { Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

function sizePx(zoom) {
  if (zoom >= 14) return 18
  if (zoom >= 12) return 12
  if (zoom >= 10) return 8
  if (zoom >= 8) return 5
  return 3
}

function makeRiserIcon(size) {
  const border = Math.max(2, Math.round(size * 0.17))
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:white;border:${border}px solid #64748b;transform:rotate(45deg);box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export default function RiserMarker({ riser, onClick }) {
  const map  = useMap()
  const [size, setSize] = useState(() => sizePx(map.getZoom()))
  useMapEvents({ zoomend() { setSize(sizePx(map.getZoom())) } })

  return (
    <Marker
      position={[riser.lat, riser.lon]}
      icon={makeRiserIcon(size)}
      eventHandlers={{ click: () => onClick && onClick(riser) }}
    />
  )
}
