import { AnimatePresence, motion } from 'framer-motion'
import { JOURNEY_CHAPTER } from '../../animations/variants'

/**
 * JourneyChapter — renders one chapter's name, heading, and body.
 *
 * AnimatePresence mode="wait" ensures the outgoing chapter fully exits before
 * the incoming one enters — exactly one chapter is mounted at any time.
 * Under reduced motion, transitions are bypassed and all content renders
 * without animation (still only one chapter visible via conditional render).
 */
export default function JourneyChapter({ chapters, activeIndex, reduced }) {
  const chapter = chapters[activeIndex]

  if (reduced) {
    return (
      <div className="journey-chapter">
        <span className="journey-chapter__name">
          {chapter.navigationTitle}
        </span>
        <h2 className="journey-chapter__title">{chapter.title}</h2>
        <p className="journey-chapter__body">{chapter.body}</p>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={chapter.id}
        className="journey-chapter"
        {...JOURNEY_CHAPTER}
      >
        <span className="journey-chapter__name">
          {chapter.navigationTitle}
        </span>
        <h2 className="journey-chapter__title">{chapter.title}</h2>
        <p className="journey-chapter__body">{chapter.body}</p>
      </motion.div>
    </AnimatePresence>
  )
}
