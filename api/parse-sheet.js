import Anthropic from '@anthropic-ai/sdk'

// The native app is served from https://localhost (Capacitor's local scheme, no server.url
// configured), a different origin than the Vercel deployment — so this cross-origin request
// needs explicit CORS headers, including handling the preflight OPTIONS request the browser/
// WebView sends first for a JSON POST. Allowlisted rather than '*' since each call costs real
// Anthropic API tokens.
const ALLOWED_ORIGINS = ['https://pipemaster.vercel.app', 'https://localhost', 'capacitor://localhost']

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageBase64, mediaType, geoContext } = req.body

  if (!imageBase64 || !mediaType) {
    return res.status(400).json({ error: 'Missing imageBase64 or mediaType' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })
  }

  let pathInstruction = ''
  if (geoContext?.fieldBoundary?.length && geoContext.riserLat != null) {
    const { fieldBoundary, riserLat, riserLon } = geoContext
    pathInstruction = `

The field shown in the satellite map image has already been GPS-mapped. Use these coordinates to georeference the pipe path:
- Riser (pipe start point): [${riserLat.toFixed(6)}, ${riserLon.toFixed(6)}]
- Field boundary polygon: ${JSON.stringify(fieldBoundary.map(p => [+p[0].toFixed(6), +p[1].toFixed(6)]))}

The field outline visible in the satellite image on this sheet IS this boundary polygon — use it as your reference frame even if the boundary is not perfectly drawn.

In the satellite map:
- The PIPE is drawn as a blue line — trace this for the path
- Yellow lines/shading show the furrows being watered (not the pipe)
- A yellow arrow shows the flow direction along the furrows (not the pipe route)

Trace the blue pipe line from the riser and return its path as GPS coordinates.

Include "pathWaypoints": [[lat, lon], ...] in your response — start with the riser coordinates, then 4–8 waypoints along the blue pipe route to its end. Only include major direction changes, not every small step.`
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        mediaType === 'application/pdf'
          ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageBase64 } }
          : { type: 'image',    source: { type: 'base64', media_type: mediaType,          data: imageBase64 } },
        {
          type: 'text',
          text: `This is a polypipe irrigation schematic — it may be a printed planning sheet, a handwritten field diagram, or a photo of either.

Extract every pipe run and all its segments. Return ONLY a raw JSON object — no markdown, no code fences, no explanation.

{
  "farm": "string or null",
  "field": "string or null",
  "flowRateGPM": number or null,
  "pipeLengthFt": number or null,
  "pathWaypoints": [[lat, lon], ...] or null,
  "runs": [
    {
      "name": "run name e.g. Inline Tee Left, Inline Tee Right, Main Run, North, South",
      "furrowPattern": "every" or "alternate" or null,
      "segments": [
        {
          "startFt": 0,
          "endFt": 216,
          "holeSize": "1/4\\"",
          "furrowCount": 34
        }
      ]
    }
  ]
}

Rules:
- Each segment is one row in the table (one hole size, one distance range)
- Omit any segment that is just supply pipe with no punched holes
- holeSize must match exactly what is printed — common sizes: "5/8\\"", "9/16\\"", "1/2\\"", "7/16\\"", "3/4\\""
- startFt and endFt are the cumulative distance range (feet from the riser/start)
- furrowCount: read from the sheet if present; set to null if not shown
- furrowPattern: "every" for "every furrow" / "all furrows"; "alternate" for "every other" / "alternating"; null if not stated
- flowRateGPM: total well or pump flow rate in GPM from the header or notes, not per-furrow
- If multiple runs are shown (e.g. with inline tees), return each as a separate entry in "runs"
- If you cannot read part of the schematic clearly, make your best attempt rather than refusing${pathInstruction}`,
        },
      ],
    }],
  })

  const raw     = response.content[0].text.trim()
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return res.json(JSON.parse(cleaned))
  } catch {
    return res.status(500).json({ error: 'AI returned invalid JSON', raw: cleaned })
  }
}
