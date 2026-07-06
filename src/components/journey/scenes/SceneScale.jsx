import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import QuoteBlock from '../QuoteBlock'
import MetaList from '../MetaList'
import SkillChips from '../SkillChips'
import { useSceneReveal, SCENE_REVEAL_OFFSET } from '../../../hooks/useSceneReveal'

// Fixed jitter offsets (not randomized) for the two "erratic" threads, so
// the zigzag reads the same on every load — same convention as the old
// THROUGHPUT_BARS heights this replaces.
const JITTER_A = [0, -3, 2.5, -2, 3, -1.5, 0]
const JITTER_B = [0, 2.5, -2, 3, -2.5, 1.5, 0]
const STEPS = [2, 17.7, 33.3, 49, 64.7, 80.3, 96]

function jitterPoints(baseY, jitter) {
  return STEPS.map((x, i) => `${x},${baseY + jitter[i]}`).join(' ')
}

/**
 * SceneScale — "the proof." Two raw, erratic request threads (top) resolve
 * into two calm, rhythmic ones (bottom) as you scroll — the −60% latency
 * story told visually rather than just stated. Built as a cross-fade +
 * converging translate between a fixed jagged polyline and a fixed smooth
 * line (transform/opacity only — no path-morphing), so it reads as "raw
 * traffic settling into an optimized rhythm" without any per-frame layout
 * cost. The "−60% latency" caption resolves once the threads have settled.
 */
export default function SceneScale({ chapter, reduced }) {
  const rootRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: rootRef, offset: SCENE_REVEAL_OFFSET })
  const bands = useSceneReveal(scrollYProgress)

  const erraticOpacity = useTransform(bands.visual.opacity, [0, 0.6], [1, 0])
  const erraticY = useTransform(bands.visual.opacity, [0, 0.6], [0, 6])
  const smoothOpacity = useTransform(bands.visual.opacity, [0.15, 0.75], [0.3, 1])
  const smoothY = useTransform(bands.visual.opacity, [0.15, 0.75], [4, 0])
  // Driven directly off the scene's own scrollYProgress rather than chained
  // off bands.visual.opacity's output — that value is already compressed
  // into a narrow sub-window for the thread cross-fade above, and remapping
  // only its last fraction squeezed the caption into ~5% of the scene's
  // scroll dwell (imperceptible at normal scroll speed). This wider window
  // starts once the threads have visually settled and spans enough scroll
  // distance for the roll to actually read as motion.
  const captionOpacity = useTransform(scrollYProgress, [0.55, 0.95], [0, 1])

  const { latency } = chapter.visual
  const latencyCount = useTransform(scrollYProgress, [0.55, 0.95], [0, latency.value])
  const latencyDisplay = useTransform(
    latencyCount,
    (count) => `${latency.prefix}${Math.round(count)}${latency.suffix}`,
  )

  const threadsBlock = (
    <div className="journey-threads">
      <svg className="journey-threads__field" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        {!reduced && (
          <motion.g style={{ opacity: erraticOpacity, y: erraticY }}>
            <polyline className="journey-threads__line journey-threads__line--erratic" points={jitterPoints(9, JITTER_A)} />
            <polyline className="journey-threads__line journey-threads__line--erratic" points={jitterPoints(17, JITTER_B)} />
          </motion.g>
        )}
        {reduced ? (
          <>
            <line className="journey-threads__line journey-threads__line--smooth" x1="2" y1="25" x2="98" y2="25" />
            <line className="journey-threads__line journey-threads__line--smooth" x1="2" y1="33" x2="98" y2="33" />
          </>
        ) : (
          <motion.g style={{ opacity: smoothOpacity, y: smoothY }}>
            <line className="journey-threads__line journey-threads__line--smooth" x1="2" y1="25" x2="98" y2="25" />
            <line className="journey-threads__line journey-threads__line--smooth" x1="2" y1="33" x2="98" y2="33" />
          </motion.g>
        )}
      </svg>
      <div className="journey-threads__caption">
        {reduced ? (
          <span className="journey-threads__value">{`${latency.prefix}${latency.value}${latency.suffix}`}</span>
        ) : (
          <motion.span className="journey-threads__value" style={{ opacity: captionOpacity }}>
            {latencyDisplay}
          </motion.span>
        )}
        <span className="journey-threads__unit">{latency.unit}</span>
      </div>
    </div>
  )

  return (
    <div className="journey-timeline__content journey-scene journey-scene--scale" ref={rootRef}>
      <QuoteBlock
        quote={chapter.quote}
        deck={chapter.deck}
        bands={bands}
        reduced={reduced}
      />

      <div className="journey-scene__visual journey-scene__visual--scale" aria-hidden="true">
        {threadsBlock}
      </div>

      <MetaList items={chapter.metadata} band={bands.metadata} reduced={reduced} />
      <SkillChips skills={chapter.skills} band={bands.chips} reduced={reduced} />
    </div>
  )
}
