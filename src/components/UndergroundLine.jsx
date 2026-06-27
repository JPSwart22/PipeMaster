import { Polyline } from 'react-leaflet'

export default function UndergroundLine({ from, to }) {
  if (!from || !to) return null
  return (
    <Polyline
      positions={[[from.lat, from.lon], [to.lat, to.lon]]}
      pathOptions={{
        color: '#64748b',
        weight: 3,
        dashArray: '8 6',
        opacity: 0.7,
      }}
    />
  )
}
