import { useRef } from 'react'
import { useScroll, useReducedMotion } from 'framer-motion'
import { JOURNEY } from '../../data/journey'
import { useJourneyEngine } from '../../hooks/useJourneyEngine'
import JourneyStage from './JourneyStage'
import JourneyChapter from './JourneyChapter'
import JourneyMobile from './JourneyMobile'

// Static representative progress for reduced-motion mode (midpoint of the sequence).
const STATIC_PROGRESS = 0.5

export default function MyJourney() {
  // sectionRef is observed by the AIOrb IntersectionObserver in App.jsx.
  // scrollContainerRef is the useScroll target — progress [0,1] maps exactly
  // to the sticky container height (not the whole section).
  const sectionRef         = useRef(null)
  const scrollContainerRef = useRef(null)
  const prefersReducedMotion = useReducedMotion()

  // offset 'start 50%' begins progress when the section's top reaches the
  // viewport midpoint — frames start once the section is halfway into view,
  // not the instant it peeks in from the bottom.
  const { scrollYProgress } = useScroll({
    target:  scrollContainerRef,
    offset:  ['start 50%', 'end end'],
  })

  const { canvasRef, activeIndex } = useJourneyEngine(scrollYProgress, {
    reduced:        prefersReducedMotion,
    staticProgress: STATIC_PROGRESS,
    sectionRef,
  })

  const resolvedIndex = prefersReducedMotion ? 0 : activeIndex

  return (
    <section id="journey" className="journey" ref={sectionRef}>
      {/* ── Mobile layout (≤ 767px): flat chapter list, no pin ──────────── */}
      <JourneyMobile chapters={JOURNEY} />

      {/* ── Desktop + tablet (≥ 768px): full sticky pinned experience ───── */}
      <div
        ref={scrollContainerRef}
        className="journey-scroll-container"
        aria-label="Journey timeline — scroll to progress through chapters"
      >
        <div className="journey-sticky">
          {/* Layer 0: canvas + scrim */}
          <JourneyStage canvasRef={canvasRef} />

          {/* Layer 1: foreground — section header + chapter content */}
          <div className="journey-content">
            <div className="shell journey-shell">

              {/* Section identity strip — top of the viewport */}
              <header className="journey-header">
                <span className="journey-header__idx">04</span>
                <span className="journey-header__title">My <em>Evolution</em><span style={{ color: 'var(--muted)' }}>.</span></span>
              </header>

              {/* Chapter area — vertically centered in the remaining space */}
              <div className="journey-left">
                <JourneyChapter
                  chapters={JOURNEY}
                  activeIndex={resolvedIndex}
                  reduced={prefersReducedMotion}
                />
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
