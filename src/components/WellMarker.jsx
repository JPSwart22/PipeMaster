import { Marker } from 'react-leaflet'
import L from 'leaflet'

function makeWellIcon(type) {
  const isElectric = type === 'electric'
  const bg    = isElectric ? '#3b82f6' : '#f97316'
  const symbol = isElectric ? '⚡' : '⛽'

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:32px;height:32px;border-radius:50%;
        background:${bg};border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.6);
        display:flex;align-items:center;justify-content:center;
        font-size:14px;line-height:1;
      ">${symbol}</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

export default function WellMarker({ well, onClick }) {
  return (
    <Marker
      position={[well.lat, well.lon]}
      icon={makeWellIcon(well.type)}
      eventHandlers={{ click: () => onClick && onClick(well) }}
    />
  )
}
