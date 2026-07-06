import { useEffect, useRef, useState } from 'react'
import { motion, useMotionTemplate, useTransform } from 'framer-motion'
import { SCENES } from './scenes'

/**
 * JourneyTimeline — desktop (≥768px) left column: a vertical gradient spine
 * that fills as the shared section progress advances, with a sticky
 * year+label+dot marker per entry (translated from the 21st.dev Timeline
 * component: https://21st.dev/@aceternity/components/timeline), each paired
 * with its chapter's bespoke Scene component (see ./scenes). The chapter
 * label is grouped with the year in the sticky marker (static, like the
 * year — no scroll-scrub reveal) rather than living in the scene's own
 * QuoteBlock. The shared grammar — spine, sticky marker, quote/deck/
 * metadata/chips — stays constant across chapters; each scene varies its
 * featured visual and composition around that constant.
 *
 * Two motion sources, both supplied by MyJourney:
 *  - `progress` — the single scroll value shared with the avatar scrub.
 *    Drives the spine's fill height exactly like the reference's
 *    `heightTransform`. No per-entry/chapter coupling.
 *  - `sectionEnter` / `sectionExit` — drive the spine's relay handoff with
 *    ScrollProgressFrame's left rail (see ScrollProgressFrame.jsx and
 *    `--journey-gutter-x` in journey.css): the spine translates in from the
 *    viewport edge as the section arrives, and back out as it leaves, so the
 *    frame's rail and this spine read as one continuous line.
 */
export default function JourneyTimeline({ chapters, progress, sectionEnter, sectionExit, reduced }) {
  const bodyRef = useRef(null)
  const [lineHeight, setLineHeight] = useState(0)

  // ResizeObserver (not a one-shot measure) — entry text can reflow the
  // body's height on font load / viewport resize, and the spine must always
  // span exactly the entries it draws alongside.
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const measure = () => setLineHeight(el.getBoundingClientRect().height)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const fillHeight = useTransform(progress, [0, 1], [0, lineHeight])

  // relayFactor: 1 = spine sits at the viewport edge (handoff point with the
  // frame's rail), 0 = spine settled at its resting gutter position. Mirrors
  // ScrollProgressFrame's own [birthProgress]/[railProgress] branch pattern —
  // an array-input transform so both entry and exit sources stay subscribed.
  const relayFactor = useTransform(
    [sectionEnter, sectionExit],
    ([se, sx]) => (se < 1 ? 1 - se : sx),
  )
  const spineTransform = useMotionTemplate`translateX(calc(${relayFactor} * -1 * var(--journey-gutter-x)))`

  return (
    <div className="journey-timeline__body" ref={bodyRef}>
      {chapters.map((chapter) => {
        const Scene = SCENES[chapter.scene]
        return (
          <div key={chapter.id} className="journey-timeline__entry">
            <div className="journey-timeline__marker">
              <span className="journey-timeline__dot" aria-hidden="true" />
              <div className="journey-timeline__marker-text">
                <span className="journey-timeline__year">{chapter.year}</span>
                <span className="journey-timeline__marker-label kicker">{chapter.label}</span>
              </div>
            </div>
            <Scene chapter={chapter} reduced={reduced} />
          </div>
        )
      })}

      {reduced ? (
        <div className="journey-timeline__spine" style={{ height: lineHeight }} aria-hidden="true">
          <div className="journey-timeline__spine-track" />
          <div className="journey-timeline__spine-fill journey-timeline__spine-fill--static" />
        </div>
      ) : (
        <motion.div
          className="journey-timeline__spine"
          style={{ height: lineHeight, transform: spineTransform }}
          aria-hidden="true"
        >
          <div className="journey-timeline__spine-track" />
          <motion.div className="journey-timeline__spine-fill" style={{ height: fillHeight }} />
        </motion.div>
      )}
    </div>
  )
}
