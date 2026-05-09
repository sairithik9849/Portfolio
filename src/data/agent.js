export const SUGGESTIONS = [
  "What's your strongest stack?",
  'Tell me about MF Compiler',
  'Are you available for full-time?',
  'Show me the AeroSense architecture',
]

export const SEED_MESSAGES = [
  {
    role: 'ai',
    text: "I'm Sairithik's agent — a small RAG layer over his CV, writing, and project READMEs. Ask me anything about his work.",
  },
]

export function pickCanned(q) {
  const s = q.toLowerCase()

  if (s.includes('aero') || s.includes('aviation')) {
    return {
      role: 'ai',
      text: 'AeroSense is a 4D aviation intelligence platform. Live ADS-B over WebSockets → Redis ring buffer → Mapbox GL volumetric layer. Gemini synthesises events into briefings. Built for low-latency situational awareness.',
      json: `{
  "feed": "ADS-B · 1.2k msg/s",
  "buffer": "redis-stream · 30s window",
  "render": "mapbox-gl @ 60fps",
  "ai":     "gemini-1.5 · brief.md"
}`,
    }
  }

  if (s.includes('mf') || s.includes('compiler') || s.includes('query')) {
    return {
      role: 'ai',
      text: 'MF Query Compiler. The legacy planner enumerated all partition states — O(2ⁿ). Rewrote it as a single hash-group pass: O(n). p99 dropped 60%. Operator tree stays small; emit is one walk.',
      card: [
        ['Before', 'O(2ⁿ)'],
        ['After', 'O(N)'],
        ['p99 latency', '−60%'],
        ['Throughput', '+3.4×'],
      ],
    }
  }

  if (s.includes('stack') || s.includes('strongest')) {
    return {
      role: 'ai',
      text: 'Backend systems is the spine — Node, Python, C++ for the hot paths, Postgres + Redis. On the front, Next.js / React, Mapbox / Leaflet for spatial. AI stitches them together (Gemini, Claude). Comfortable at every layer; sharpest at the seam.',
    }
  }

  if (s.includes('available') || s.includes('hire') || s.includes('full-time') || s.includes('fulltime')) {
    return {
      role: 'ai',
      text: 'Yes — open to 2026 full-time roles in systems, infrastructure, or full-stack with an AI surface. Based in NJ / NYC; flexible on location.',
      json: `{
  "status": "available",
  "window": "2026 · summer →",
  "location": "NJ / NYC · open",
  "contact": "skomurav@stevens.edu"
}`,
    }
  }

  return null
}
