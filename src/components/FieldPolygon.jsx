import { Polygon } from 'react-leaflet'

export default function FieldPolygon({ field, isSelected, onClick }) {
  return (
    <Polygon
      positions={field.boundary}
      pathOptions={{
        color: field.color,
        fillColor: field.color,
        fillOpacity: isSelected ? 0.15 : 0.2,
        weight: isSelected ? 3 : 2,
        opacity: isSelected ? 1 : 0.8,
        dashArray: isSelected ? null : null,
      }}
      eventHandlers={{
        click(e) {
          if (!onClick) return
          e.originalEvent.stopPropagation()
          onClick(field)
        }
      }}
    />
  )
}
