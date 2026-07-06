import { useEffect, useState } from 'react'
import {
  motion,
  useMotionValue,
  useSpring,
  useAnimationFrame,
  useReducedMotion,
} from 'framer-motion'

// Mirrors var(--fg): #ededdf cream — kept as a JS constant because
// box-shadow strings are assembled imperatively per-star at mount time.
const STAR_COLOR = 'rgba(237, 237, 223, 0.75)'

const LAYER_HEIGHT    = 2000  // px — seamless-loop wrap distance
const STAR_SPREAD     = 2400  // px — horizontal spread (±1200 from center dot);
                               // covers full viewport + 240 px parallax buffer per side,
                               // eliminating ~52% of stars that were previously off-screen
const PARALLAX_FACTOR = 0.04

const SPRING_CONFIG = { stiffness: 50, damping: 20 }

// Three depth layers: small/sparse/fastest → large/prominent/slowest.
// Counts scaled ~40% from previous values to hold the same perceived on-screen
// density now that STAR_SPREAD is viewport-matched rather than 4000 px wide.
const LAYERS = [
  { count: 240, size: 1, speed: 0.30 },
  { count: 450, size: 2, speed: 0.15 },
  { count: 110, size: 3, speed: 0.08 },
]

// Returns a CSS box-shadow string placing `count` star points at random positions.
// x is spread horizontally around the center dot (±STAR_SPREAD/2).
// y is distributed across [0, LAYER_HEIGHT) so the two-copy seamless loop tiles cleanly.
function generateStars(count) {
  const shadows = []
  const halfSpread = STAR_SPREAD / 2
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * STAR_SPREAD) - halfSpread
    const y = Math.floor(Math.random() * LAYER_HEIGHT)
    shadows.push(`${x}px ${y}px ${STAR_COLOR}`)
  }
  return shadows.join(', ')
}

// Receives its offsetY motion value from the parent so a single rAF callback
// can advance all three layers — no per-layer useAnimationFrame overhead.
function StarLayer({ layer, offsetY }) {
  const [boxShadow] = useState(() => generateStars(layer.count))

  const dotStyle = {
    width:     `${layer.size}px`,
    height:    `${layer.size}px`,
    boxShadow,
  }

  return (
    <motion.div className="starfield__layer" style={{ y: offsetY }}>
      {/* Primary copy — covers y: 0 → LAYER_HEIGHT */}
      <div className="starfield__dot" style={dotStyle} />
      {/* Seamless clone — covers y: LAYER_HEIGHT → 2×LAYER_HEIGHT */}
      <div
        className="starfield__dot"
        style={{ ...dotStyle, top: `${LAYER_HEIGHT}px` }}
      />
    </motion.div>
  )
}

export default function StarField({ visible = true }) {
  const reduced = useReducedMotion()

  // One motion value per layer — declared individually (not in a loop) to
  // satisfy React's Rules of Hooks. Advanced by the single rAF below.
  const offset0 = useMotionValue(0)
  const offset1 = useMotionValue(0)
  const offset2 = useMotionValue(0)

  // Single rAF callback drives all three layers — replaces the three separate
  // useAnimationFrame calls that previously lived inside each StarLayer.
  // `visible` mirrors the App-level hero IntersectionObserver: once the hero
  // scrolls off-screen the layers stop translating (and therefore repainting)
  // instead of drifting forever behind content the user can no longer see.
  useAnimationFrame(() => {
    if (reduced || !visible) return
    const pairs = [[offset0, 0], [offset1, 1], [offset2, 2]]
    for (const [offset, i] of pairs) {
      const next = offset.get() - LAYERS[i].speed
      offset.set(next <= -LAYER_HEIGHT ? 0 : next)
    }
  })

  // Parallax spring: cursor offset → spring-smoothed layer group translation.
  const rawX    = useMotionValue(0)
  const rawY    = useMotionValue(0)
  const springX = useSpring(rawX, SPRING_CONFIG)
  const springY = useSpring(rawY, SPRING_CONFIG)

  useEffect(() => {
    if (reduced || !visible) return

    const onMove = (e) => {
      const centerX = window.innerWidth  / 2
      const centerY = window.innerHeight / 2
      rawX.set(-(e.clientX - centerX) * PARALLAX_FACTOR)
      rawY.set(-(e.clientY - centerY) * PARALLAX_FACTOR)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [rawX, rawY, reduced, visible])

  return (
    <div className="starfield" aria-hidden="true">
      {/* 1. Opaque deep-space base — gives the hero its own dark backdrop over
             the fixed page background layers within the hero viewport. */}
      <div className="starfield__vignette" />

      {/* 2. Star layers — parallax wrapper composes with per-layer drift. */}
      <motion.div
        className="starfield__layers"
        style={{ x: springX, y: springY }}
      >
        <StarLayer layer={LAYERS[0]} offsetY={offset0} />
        <StarLayer layer={LAYERS[1]} offsetY={offset1} />
        <StarLayer layer={LAYERS[2]} offsetY={offset2} />
      </motion.div>

      {/* 3. Legibility scrim — dims stars behind the text column. Sits above
             stars, below hero content (z-order controlled by the hero z-stack). */}
      <div className="starfield__scrim" />
    </div>
  )
}
