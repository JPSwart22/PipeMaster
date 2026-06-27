import { Marker } from 'react-leaflet'
import L from 'leaflet'

const RISER_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:18px;height:18px;
    background:white;border:3px solid #64748b;
    transform:rotate(45deg);
    box-shadow:0 2px 6px rgba(0,0,0,0.5);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

export default function RiserMarker({ riser, onClick }) {
  return (
    <Marker
      position={[riser.lat, riser.lon]}
      icon={RISER_ICON}
      eventHandlers={{ click: () => onClick && onClick(riser) }}
    />
  )
}
