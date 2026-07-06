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

// ─── WhatIDo live-system viz shared variants ──────────────────────────────────

// Panel-level entrance — bezel fades in when section enters the viewport.
// Instant under reduced motion (callers pass duration:0 when reduced).
export const WID_PANEL_REVEAL = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, margin: '-60px 0px' },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
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

// ─── My Journey scene primitives ────────────────────────────────────────────

// Today scene's terminal-cursor idle loop — the one featured visual allowed
// to keep a whisper of life at rest (see docs/journey.md, "Motion"), signaling
// the journey is ongoing rather than closed: a steady blink, then occasionally
// stretching into a short horizontal line before snapping back to a cursor —
// one combined keyframe cycle so the blink and the stretch never fight each
// other for the same element. Transform/opacity only. Off under reduced motion.
export const TODAY_CURSOR = {
  opacity: [1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1],
  scaleX:  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 5, 1, 1],
  transition: {
    duration: 6.2,
    repeat: Infinity,
    ease: 'linear',
    times: [0, 0.08, 0.09, 0.17, 0.18, 0.26, 0.27, 0.35, 0.36, 0.6, 0.66, 0.72, 1],
  },
}
