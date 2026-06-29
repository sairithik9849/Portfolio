export const REVEAL = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px 0px -80px 0px' },
  transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
}

export const STAGGER_PARENT = {
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, margin: '-80px 0px' },
  variants: {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  },
}

export const STAGGER_CHILD = {
  variants: {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
  },
}

// Phase timing table for the serialized hero reload sequence.
// Each key maps to the delay (in seconds) at which that phase starts.
export const HERO_SEQUENCE = {
  grid:      0.10,
  meta:      0.45,
  name:      0.50,
  headline:  0.85,  // professional identifier — fades up after name settles
  manifesto: 1.10,
  focus:     1.30,
  metrics:   1.50,
  cta:       1.80,
  terminal:  2.25,
  footer:    2.65,
  robot:     2.80,
}

export const HERO_SEQUENCE_INSTANT = Object.fromEntries(
  Object.keys(HERO_SEQUENCE).map((k) => [k, 0]),
)

// Returns a variant dict ({ hidden, show }) for a single-shot delayed fade-up.
export const fadeUp = (delay, duration = 0.9) => ({
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { delay, duration, ease: [0.22, 1, 0.36, 1] },
  },
})

export const HERO_PARENT = {
  initial: 'hidden',
  animate: 'show',
  variants: {
    hidden: {},
    show: {},
  },
}

// Real spring physics — stiffness 70, damping 18, mass 0.9 gives a soft overshoot
export const HERO_CHILD = {
  variants: {
    hidden: { opacity: 0, y: 60 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 70, damping: 18, mass: 0.9 },
    },
  },
}

export const HERO_CHILD_FADE = {
  variants: {
    hidden: { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 1.0, ease: [0.22, 1, 0.36, 1] },
    },
  },
}

export const HERO_LETTER = {
  variants: {
    hidden: { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 260, damping: 22, mass: 0.6 },
    },
  },
}

export const HERO_LINE_PARENT = {
  variants: {
    hidden: {},
    show: { transition: { staggerChildren: 0.025, delayChildren: 0.05 } },
  },
}

export const HERO_INNER_STAGGER = {
  variants: {
    hidden: {},
    show: { transition: { staggerChildren: 0.12 } },
  },
}

// ─── WhatIDo live-system viz shared variants ──────────────────────────────────

// Panel-level entrance — bezel fades in when section enters the viewport.
// Instant under reduced motion (callers pass duration:0 when reduced).
export const WID_PANEL_REVEAL = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, margin: '-60px 0px' },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
}

// Shared pathLength draw transition used by every viz's structural SVG edges.
export const WID_DRAW = {
  duration: 0.6,
  ease: [0.22, 1, 0.36, 1],
}

// The "at rest" animate target for all ambient elements.
// Each viz's ambient element transitions to this when isActive becomes false.
export const WID_AMBIENT_REST = { opacity: 0 }

// ─── My Journey section variants ─────────────────────────────────────────────

// Chapter body transition — one chapter exits before the next enters
// (AnimatePresence mode="wait"). Blur + translateY gives depth without flash.
export const JOURNEY_CHAPTER = {
  initial:  { opacity: 0, filter: 'blur(8px)', y: 40 },
  animate:  { opacity: 1, filter: 'blur(0px)', y: 0,  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit:     { opacity: 0, filter: 'blur(8px)', y: -40, transition: { duration: 0.30, ease: [0.22, 1, 0.36, 1] } },
}

// ─── Return-to-Hero floating marker ─────────────────────────────────────────
// Entrance: slides in from above (y: -12) with a soft scale + fade.
// Exit: collapses back up faster (0.28s) so it doesn't linger over content.
// Component toggles between 'show' and 'hidden' driven by the visibility prop.
export const RETURN_MARKER = {
  hidden: {
    opacity: 0,
    y: -12,
    scale: 0.92,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
}

// ─── Terminal output swap variants ──────────────────────────────────────────
// Used by Terminal.jsx for the per-command output enter/exit stagger.
// Exit: the whole output block fades out quickly (0.10s).
// Enter: the parent fades in and staggers child lines (0.06s gap, 0.22s per line).
export const TERM_OUTPUT_PARENT = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0 },
  },
  exit: { opacity: 0, transition: { duration: 0.10, ease: 'easeIn' } },
}

export const TERM_OUTPUT_LINE = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.22, ease: 'easeOut' } },
}

// Autocomplete suggestion dropdown — opacity + small upward nudge only.
// No height animation (respects the transform/opacity-only rule).
export const TERM_SUGGEST = {
  hidden: { opacity: 0, y: -4 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.14, ease: 'easeOut' } },
  exit:   { opacity: 0, y: -4, transition: { duration: 0.10, ease: 'easeIn' } },
}
