const API_KEY_STORAGE = 'pm_anthropic_key'

export function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) ?? ''
}

export function setApiKey(key) {
  localStorage.setItem(API_KEY_STORAGE, key.trim())
}

export async function extractSegmentsFromSchematic(imageBase64, mediaType) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('NO_KEY')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `This is a Delta Plastics Pipe Planner schematic for a polypipe irrigation run. Extract the pipe segment table.

Return ONLY a valid JSON array, no markdown, no explanation. Each object:
- "holeSize": exactly one of: "Supply", "1/4\\"", "5/16\\"", "3/8\\"", "7/16\\"", "1/2\\"", "9/16\\"", "5/8\\""
- "startFt": number
- "endFt": number
- "furrowCount": number or null (null for Supply rows)

Example: [{"holeSize":"Supply","startFt":0,"endFt":16,"furrowCount":null},{"holeSize":"7/16\\"","startFt":16,"endFt":207,"furrowCount":30}]`,
          },
        ],
      }],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${body}`)
  }

  const data = await res.json()
  const raw = data.content[0].text.trim()
  // Strip markdown code fences if model wraps in them
  const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(json)
}

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
