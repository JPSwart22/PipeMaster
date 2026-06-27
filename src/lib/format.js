export function formatDuration(ms) {
  const hrs = ms / 3600000
  if (hrs < 1) return `${Math.max(1, Math.round(ms / 60000))} min`
  return `${hrs.toFixed(1)} hrs`
}

export function formatDateTime(ts) {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function timeAgo(date) {
  if (!date) return ''
  const sec = (Date.now() - new Date(date).getTime()) / 1000
  if (sec < 10) return 'just now'
  if (sec < 60) return `${Math.floor(sec)}s ago`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86400)}d ago`
}
