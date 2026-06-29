import { motion, useReducedMotion } from 'framer-motion'
import { RETURN_MARKER } from '../animations/variants'
import { scrollToId } from '../utils/scrollTo'

// Upward chevron SVG — stroke-based so it scales cleanly and inherits
// currentColor from the parent button. Sized to sit inside the glass monolith.
function ChevronUp() {
  return (
    <svg
      className="return-top-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <polyline
        points="3,11 8,5 13,11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ReturnToTop — floating glass monolith, top-right corner.
//
// Visibility is controlled by the `hidden` prop (same contract as AIOrb):
//   hidden=true  → opacity 0, pointer-events none, aria-hidden, tabIndex -1
//   hidden=false → visible, interactive, tab-accessible
//
// On click: smooth-scrolls to #top via Lenis (scrollToId routes through
// window.__lenis.scrollTo when available, native scrollIntoView otherwise).
export default function ReturnToTop({ hidden = false }) {
  const reduced = useReducedMotion()

  // Under prefers-reduced-motion collapse the entrance to opacity-only
  // (no y/scale movement) and skip the variant entirely on exit.
  const hiddenVariant = reduced
    ? { opacity: 0, y: 0, scale: 1, transition: { duration: 0.2 } }
    : RETURN_MARKER.hidden

  const showVariant = reduced
    ? { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2 } }
    : RETURN_MARKER.show

  return (
    <motion.button
      className="return-top"
      onClick={() => scrollToId('top')}
      aria-label="Return to top"
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : 0}
      style={{ pointerEvents: hidden ? 'none' : 'auto' }}
      animate={hidden ? hiddenVariant : showVariant}
      // Hover/tap are defined inline (same convention as AIOrb)
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Lime ascent streak — rises through the module on hover, clipped by
          overflow:hidden on the parent. CSS drives this via the hover state;
          it is a purely decorative affordance, hence aria-hidden. */}
      <span className="return-top-ascent" aria-hidden="true" />

      {/* The chevron sits above the ascent streak in stacking order */}
      <span className="return-top-chevron">
        <ChevronUp />
      </span>
    </motion.button>
  )
}
