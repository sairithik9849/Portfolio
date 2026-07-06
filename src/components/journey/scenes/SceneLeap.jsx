import { motion, useTransform, useScroll, useMotionTemplate } from 'framer-motion'
import { useRef } from 'react'
import QuoteBlock from '../QuoteBlock'
import MetaList from '../MetaList'
import SkillChips from '../SkillChips'
import { useSceneReveal, SCENE_REVEAL_OFFSET } from '../../../hooks/useSceneReveal'

// Same quadratic Bézier the arc itself is drawn with (`M4,20 Q50,-4 96,20`,
// in the route's own 0-100 x / 0-24 y viewBox space) — sampled at scroll
// progress `t` to place a small plane marker along the arc and orient it to
// the curve's tangent, so the flight visibly follows the line it's drawn on.
const P0 = { x: 4, y: 20 }
const P1 = { x: 50, y: -4 }
const P2 = { x: 96, y: 20 }

function bezierPoint(t) {
  const mt = 1 - t
  return {
    x: mt * mt * P0.x + 2 * mt * t * P1.x + t * t * P2.x,
    y: mt * mt * P0.y + 2 * mt * t * P1.y + t * t * P2.y,
  }
}

function bezierAngleDeg(t) {
  const dx = 2 * (1 - t) * (P1.x - P0.x) + 2 * t * (P2.x - P1.x)
  const dy = 2 * (1 - t) * (P1.y - P0.y) + 2 * t * (P2.y - P1.y)
  return Math.atan2(dy, dx) * (180 / Math.PI)
}

/**
 * SceneLeap — "distance." The airiest scene: vast whitespace either side of
 * a single thin arc that draws itself across the full field width as you
 * scroll, with a small plane traveling India→United States along it —
 * horizontal space itself is the metaphor for crossing an ocean.
 */
export default function SceneLeap({ chapter, reduced }) {
  const rootRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: rootRef, offset: SCENE_REVEAL_OFFSET })
  const bands = useSceneReveal(scrollYProgress)
  // Reuses the visual band's own opacity MotionValue as the draw source —
  // no second scroll subscription needed for the line's strokeDashoffset,
  // and doubles as the plane's 0→1 flight-progress value.
  const t = bands.visual.opacity
  const dashOffset = useTransform(t, [0, 1], [1, 0])

  const planeLeft = useTransform(t, (v) => `${bezierPoint(v).x}%`)
  const planeTop = useTransform(t, (v) => `${(bezierPoint(v).y / 24) * 100}%`)
  const planeAngle = useTransform(t, (v) => bezierAngleDeg(v))
  const planeRotate = useMotionTemplate`translate(-50%, -50%) rotate(${planeAngle}deg)`
  // Fades in just after takeoff, out just before landing, so it doesn't
  // pop in/out abruptly at the arc's own endpoints.
  const planeOpacity = useTransform(t, [0, 0.06, 0.94, 1], [0, 1, 1, 0])

  const { from, to } = chapter.visual.route
  const landedTop = `${(P2.y / 24) * 100}%`

  const route = (
    <svg className="journey-route" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
      <motion.path
        className="journey-route__arc"
        d="M4,20 Q50,-4 96,20"
        pathLength="1"
        style={reduced ? undefined : { strokeDashoffset: dashOffset }}
      />
      <circle cx="4" cy="20" r="1.4" className="journey-route__point" />
      <circle cx="96" cy="20" r="1.4" className="journey-route__point" />
    </svg>
  )

  return (
    <div className="journey-timeline__content journey-scene journey-scene--leap" ref={rootRef}>
      <QuoteBlock
        quote={chapter.quote}
        deck={chapter.deck}
        bands={bands}
        reduced={reduced}
      />

      <div className="journey-scene__visual journey-scene__visual--leap" aria-hidden="true">
        <div className="journey-route-wrap">
          {reduced ? route : (
            <motion.div style={{ opacity: bands.visual.opacity }}>
              {route}
            </motion.div>
          )}
          {reduced ? (
            <div className="journey-route__plane" style={{ left: `${P2.x}%`, top: landedTop, transform: 'translate(-50%, -50%)' }}>
              <PlaneIcon />
            </div>
          ) : (
            <motion.div
              className="journey-route__plane"
              style={{ left: planeLeft, top: planeTop, opacity: planeOpacity, transform: planeRotate }}
            >
              <PlaneIcon />
            </motion.div>
          )}
        </div>
        <div className="journey-route__labels">
          <span>{from}</span>
          <span>{to}</span>
        </div>
      </div>

      <MetaList items={chapter.metadata} band={bands.metadata} reduced={reduced} />
      <SkillChips skills={chapter.skills} band={bands.chips} reduced={reduced} />
    </div>
  )
}

// Minimal monoline paper-plane glyph — matches MetaIcon.jsx's convention
// (stroke:currentColor, no fill) rather than an emoji.
function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12 21 4 13 21 11 13 3 12Z" />
    </svg>
  )
}
