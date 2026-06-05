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
  grid:      0.20,
  meta:      0.95,
  name:      1.00,
  manifesto: 2.20,
  metrics:   2.90,
  cta:       3.55,
  terminal:  4.50,
  footer:    5.30,
  robot:     5.60,
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
