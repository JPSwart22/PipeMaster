import { CircleMarker, Tooltip } from 'react-leaflet'

export default function TeeMarker({ position, name, onClick }) {
  if (!position) return null
  const clickHandlers = onClick
    ? { click: (e) => { e.originalEvent.stopPropagation(); onClick() } }
    : undefined

  return (
    <>
      {/* Wide invisible hit-target for easy tapping, especially on mobile */}
      {onClick && (
        <CircleMarker center={position} radius={20}
                      pathOptions={{ opacity: 0, fillOpacity: 0 }}
                      eventHandlers={clickHandlers} />
      )}
      <CircleMarker
        center={position}
        radius={9}
        pathOptions={{ fillColor: '#22c55e', fillOpacity: 1, color: 'white', weight: 2 }}
        eventHandlers={clickHandlers}>
        {name && <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>{name}</Tooltip>}
      </CircleMarker>
    </>
  )
}
