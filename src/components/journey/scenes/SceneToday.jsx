import { motion, useScroll } from 'framer-motion'
import { useRef } from 'react'
import QuoteBlock from '../QuoteBlock'
import MetaList from '../MetaList'
import SkillChips from '../SkillChips'
import { useSceneReveal, SCENE_REVEAL_OFFSET } from '../../../hooks/useSceneReveal'
import { TODAY_CURSOR } from '../../../animations/variants'

/**
 * SceneToday — "open / forward." The one scene allowed to stay alive at
 * rest: a glowing terminal cursor (`>_`) that blinks steadily and
 * occasionally stretches into a short horizontal line before snapping back
 * — a nod to the command-line, agentic-harness work this chapter is about.
 * Idle loop is off entirely under reduced motion (renders a plain, steady
 * cursor instead).
 */
export default function SceneToday({ chapter, reduced }) {
  const rootRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: rootRef, offset: SCENE_REVEAL_OFFSET })
  const bands = useSceneReveal(scrollYProgress)

  const terminal = (
    <div className="journey-terminal">
      <PromptChevron />
      <motion.span
        className="journey-terminal__cursor"
        animate={reduced ? undefined : TODAY_CURSOR}
      />
    </div>
  )

  return (
    <div className="journey-timeline__content journey-scene journey-scene--today" ref={rootRef}>
      <QuoteBlock
        quote={chapter.quote}
        deck={chapter.deck}
        bands={bands}
        reduced={reduced}
      />

      <div className="journey-scene__visual journey-scene__visual--today" aria-hidden="true">
        {reduced ? terminal : (
          <motion.div style={{ opacity: bands.visual.opacity }}>
            {terminal}
          </motion.div>
        )}
      </div>

      <MetaList items={chapter.metadata} band={bands.metadata} reduced={reduced} />
      <SkillChips skills={chapter.skills} band={bands.chips} reduced={reduced} />
    </div>
  )
}

// A drawn chevron instead of a literal ">" character — text glyphs for
// symbols like ">" carry built-in left-side bearing (whitespace before the
// visible ink), which reads as misaligned against the quote/deck text's
// flush left edge above it. An SVG lets the stroke itself start at the
// viewBox's left edge, matching PlaneIcon's approach in SceneLeap.jsx.
function PromptChevron() {
  return (
    <svg
      className="journey-terminal__prompt"
      viewBox="0 0 20 28"
      width="20"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 8 12 14 2 20" />
    </svg>
  )
}
