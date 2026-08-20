const SYSTEM_PROMPT = `You are Sairithik Komuravelly's portfolio agent. Sairithik is a Software Engineer & System Administrator. He has a 4.0 GPA at Stevens Institute of Technology, a Provost Merit Scholarship, has worked on production APIs handling 10M+ daily transactions, and reduced query-compiler p99 latency by 60%. His featured projects: AeroSense (real-time aviation intelligence with Mapbox GL, Redis, Gemini), MF Query Compiler (O(2^n)→O(N)), SprintPay (Flask group expense), LocalLens (Next.js neighbourhood social), WindBorne Constellation (Node + Leaflet, 24k points), Scholario (Node LMS with RBAC). Hobbies: gym (3-day PPL split) and Marvel Rivals. Speak crisply, technically, in his voice. Keep responses under 90 words.`

export default async function handler(req, res) {
  // CORS Headers - Allow specific domains
  const origin = req.headers.origin;

  // Define allowed origins for security (preventing unauthorized use of API costs)
  // Allow localhost for dev, and vercel preview/prod domains.
  // In a real strict setup, you might lock this to a specific domain array.
  // For safety while letting the app work, we use origin reflection if it's from our app.
  if (origin && (origin.includes('localhost') || origin.includes('vercel.app') || origin.includes('sairithik'))) {
     res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
     // Default for strict safety if not matching expected origins
     res.setHeader('Access-Control-Allow-Origin', 'https://sairithik.com');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message } = req.body ?? {}
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message field required' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'Agent offline — GEMINI_API_KEY not configured.' })
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: `${SYSTEM_PROMPT}\n\nQuestion: ${message}` }],
          }],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.7,
          },
        }),
      },
    )

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Gemini ${response.status}: ${errText}`)
    }

    const data = await response.json()
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!reply) throw new Error('Empty response from Gemini')

    return res.status(200).json({ reply })
  } catch (err) {
    console.error('[api/chat]', err.message)
    return res.status(500).json({ error: 'Agent error — please try again.' })
  }
}
