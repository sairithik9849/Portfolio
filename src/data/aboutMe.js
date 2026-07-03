export const ABOUT_ME_STATEMENT =
  "I build software by treating AI as a high-precision instrument, not a crutch. From robust infrastructure to fluid interfaces, I orchestrate advanced agents to build production-grade systems that actually perform, leaving the generated slop behind."

export const ABOUT_ME_HIGHLIGHT = 'high-precision instrument'

export const ABOUT_ME_EMPHASES = ['advanced agents']

// Small HUD kicker rendered above the technology icon row.
export const ABOUT_ME_TECH_KICKER = 'What I build with'

// The technology icon row. `id` maps to the inline SVG glyph in the
// TECH_ICONS map inside AboutMe.jsx; `label` is the display copy. Order is
// meaningful — icons reveal left-to-right on scroll.
export const ABOUT_ME_TECH = [
  { id: 'claude', label: 'Claude' },
  { id: 'react', label: 'React' },
  { id: 'nodejs', label: 'Node.js' },
  { id: 'python', label: 'Python' },
  { id: 'postgresql', label: 'PostgreSQL' },
]
