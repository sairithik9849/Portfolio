import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import QuoteBlock from '../QuoteBlock'
import MetaList from '../MetaList'
import SkillChips from '../SkillChips'
import { useSceneReveal, SCENE_REVEAL_OFFSET } from '../../../hooks/useSceneReveal'

// Four log rows, each fading/sliding in a beat after the one above it —
// "the ground others build on" reads as an automated script executing,
// lines generating top to bottom, one after another.
const LINES = [0, 1, 2, 3]

/**
 * SceneBuild — "the structure." Engineered and modular: a small cascade of
 * log-style rows fades in top to bottom beneath the quote as you scroll,
 * each settling a beat after the one above it — reading as a script or
 * automation job executing, line by line.
 */
export default function SceneBuild({ chapter, reduced }) {
  const rootRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: rootRef, offset: SCENE_REVEAL_OFFSET })
  const bands = useSceneReveal(scrollYProgress)

  return (
    <div className="journey-timeline__content journey-scene journey-scene--build" ref={rootRef}>
      <QuoteBlock
        quote={chapter.quote}
        deck={chapter.deck}
        bands={bands}
        reduced={reduced}
      />

      <div className="journey-scene__visual journey-scene__visual--build" aria-hidden="true">
        {LINES.map((i) => (
          <LogLine key={i} index={i} visualOpacity={bands.visual.opacity} reduced={reduced} />
        ))}
      </div>

      <MetaList items={chapter.metadata} band={bands.metadata} reduced={reduced} />
      <SkillChips skills={chapter.skills} band={bands.chips} reduced={reduced} />
    </div>
  )
}

function LogLine({ index, visualOpacity, reduced }) {
  // Each row reads its own sub-window of the shared visual band's opacity,
  // so rows cascade in one after another rather than all at once — composed
  // from the single visual-band MotionValue, no extra scroll subscription.
  const start = index * 0.18
  const end = Math.min(1, start + 0.34)
  const opacity = useTransform(visualOpacity, [start, end], [0, 1])
  const x = useTransform(visualOpacity, [start, end], [-8, 0])

  const inner = (
    <>
      <span className="journey-log-line__tick" aria-hidden="true" />
      <span className="journey-log-line__bar" />
    </>
  )

  if (reduced) {
    return <div className={`journey-log-line journey-log-line--${index}`}>{inner}</div>
  }

  return (
    <motion.div
      className={`journey-log-line journey-log-line--${index}`}
      style={{ opacity, x }}
    >
      {inner}
    </motion.div>
  )
}
