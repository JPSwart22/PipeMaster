import { Polygon } from 'react-leaflet'

export default function ZonePolygon({ zone, isFieldSelected, onClick }) {
  return (
    <Polygon
      positions={zone.boundary}
      pathOptions={{
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: isFieldSelected ? 0.6 : 0.3,
        weight: isFieldSelected ? 3 : 2,
        opacity: isFieldSelected ? 1 : 0.8,
      }}
      eventHandlers={{
        click(e) {
          e.originalEvent.stopPropagation()
          onClick && onClick(zone)
        }
      }}
    />
  )
}
