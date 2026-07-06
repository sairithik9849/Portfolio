import { useRef } from 'react'
import { useScroll, useReducedMotion } from 'framer-motion'
import { JOURNEY } from '../../data/journey'
import { useJourneyEngine } from '../../hooks/useJourneyEngine'
import JourneyStage from './JourneyStage'
import JourneyTimeline from './JourneyTimeline'
import JourneyMobile from './JourneyMobile'

// Static representative progress for reduced-motion mode (midpoint of the sequence).
const STATIC_PROGRESS = 0.5

export default function MyJourney() {
  // sectionRef is observed by the AIOrb IntersectionObserver in App.jsx and
  // is the shared target for all three scroll subscriptions below.
  const sectionRef = useRef(null)
  const prefersReducedMotion = useReducedMotion()

  // The single progress source shared by the avatar scrub and the timeline
  // spine's fill height. offset spans exactly the sticky-avatar's pin
  // duration (top hits viewport top → bottom hits viewport bottom), so both
  // the avatar's last frame and the spine's full draw land together at the
  // same scroll position — a clean, synchronized finish.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset:  ['start start', 'end end'],
  })

  // Entry/exit progress for the relay handoff with ScrollProgressFrame's
  // left rail (see JourneyTimeline + ScrollProgressFrame). `sectionEnter`
  // spans the section's arrival (top: viewport bottom → viewport top);
  // `sectionExit` spans its departure (bottom: viewport bottom → viewport
  // top). ScrollProgressFrame computes the identical pair against the same
  // #journey target so the rail and the spine move in lockstep.
  const { scrollYProgress: sectionEnter } = useScroll({
    target: sectionRef,
    offset:  ['start end', 'start start'],
  })
  const { scrollYProgress: sectionExit } = useScroll({
    target: sectionRef,
    offset:  ['end end', 'end start'],
  })

  const { canvasRef } = useJourneyEngine(scrollYProgress, {
    reduced:        prefersReducedMotion,
    staticProgress: STATIC_PROGRESS,
    sectionRef,
  })

  return (
    <section id="journey" className="journey" ref={sectionRef}>
      {/* ── Mobile layout (≤ 767px): single-column timeline, no pin ─────── */}
      <JourneyMobile chapters={JOURNEY} />

      {/* ── Tablet + desktop (≥ 768px): sticky avatar + scrolling timeline ─ */}
      <div className="journey-desktop">
        <div className="journey-timeline">
          <div className="journey-timeline__row">

            {/* Left: shell-aligned scrolling column — header + timeline */}
            <div className="journey-timeline__track">
              <header className="journey-header">
                <span className="journey-header__idx">04</span>
                <span className="journey-header__title">My <em>Evolution</em><span style={{ color: 'var(--muted)' }}>.</span></span>
              </header>

              <JourneyTimeline
                chapters={JOURNEY}
                progress={scrollYProgress}
                sectionEnter={sectionEnter}
                sectionExit={sectionExit}
                reduced={prefersReducedMotion}
              />
            </div>

            {/* Right: full-bleed sticky avatar canvas */}
            <div className="journey-timeline__avatar">
              <JourneyStage canvasRef={canvasRef} />
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
