import { Polygon } from 'react-leaflet'

export default function FieldPolygon({ field, isSelected, onClick }) {
  return (
    <Polygon
      positions={field.boundary}
      pathOptions={{
        color: field.color,
        fillColor: field.color,
        fillOpacity: isSelected ? 0.10 : 0.04,
        weight: isSelected ? 2.5 : 1.5,
        opacity: isSelected ? 0.9 : 0.5,
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
