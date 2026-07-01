function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function parsePipeSheet(imageFile, geoContext = null) {
  const imageBase64 = await fileToBase64(imageFile)
  const mediaType   = imageFile.type || 'image/jpeg'

  const res = await fetch('/api/parse-sheet', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ imageBase64, mediaType, geoContext }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Schematic API error ${res.status}: ${text}`)
  }

  return res.json()
}
