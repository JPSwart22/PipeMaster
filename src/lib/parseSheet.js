// Compress + normalize before sending — Android camera photos can be 8-12 MB which
// exceeds Vercel's 4.5 MB body limit. This scales to ≤1600px and re-encodes as JPEG.
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1600
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Canvas compression failed')),
        'image/jpeg',
        0.85
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image')) }
    img.src = url
  })
}

export async function parsePipeSheet(imageFile, geoContext = null) {
  // PDFs go straight through; images get compressed
  const isPdf = imageFile.type === 'application/pdf'
  let sendFile = imageFile
  let mediaType = 'image/jpeg'

  if (!isPdf) {
    const blob = await compressImage(imageFile)
    sendFile = new File([blob], imageFile.name, { type: 'image/jpeg' })
    mediaType = 'image/jpeg'
  } else {
    mediaType = 'application/pdf'
  }

  const reader = new FileReader()
  const imageBase64 = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(sendFile)
  })

  const res = await fetch('/api/parse-sheet', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ imageBase64, mediaType, geoContext }),
  })

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(json?.error ?? `Server error ${res.status}`)
  }
  if (json?.error) {
    // API returned 200 but with an error payload (e.g. AI returned non-JSON)
    throw new Error(json.raw ? `AI response: ${json.raw.slice(0, 200)}` : json.error)
  }

  return json
}
