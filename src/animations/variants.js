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

export const HERO_PARENT = {
  initial: 'hidden',
  animate: 'show',
  variants: {
    hidden: {},
    show: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
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
