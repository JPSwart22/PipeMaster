import { useState } from 'react'
import { Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

function sizePx(zoom) {
  if (zoom >= 14) return 32
  if (zoom >= 12) return 22
  if (zoom >= 10) return 16
  if (zoom >= 8) return 10
  return 6
}

function makeWellIcon(type, size) {
  const isElectric = type === 'electric'
  const bg      = isElectric ? '#3b82f6' : '#f97316'
  const symbol  = isElectric ? '⚡' : '⛽'
  const border  = Math.max(2, Math.round(size * 0.09))
  const fsz     = Math.round(size * 0.44)

  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:${border}px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;font-size:${fsz}px;line-height:1;">${symbol}</div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export default function WellMarker({ well, onClick }) {
  const map  = useMap()
  const [size, setSize] = useState(() => sizePx(map.getZoom()))
  useMapEvents({ zoomend() { setSize(sizePx(map.getZoom())) } })

  return (
    <Marker
      position={[well.lat, well.lon]}
      icon={makeWellIcon(well.type, size)}
      eventHandlers={{ click: () => onClick && onClick(well) }}
    />
  )
}
