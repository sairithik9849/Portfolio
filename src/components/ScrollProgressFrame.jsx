import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'

// Shared spring config — matches the 21st.dev reference component this was
// adapted from, and reads consistently with the rest of the site's
// scroll-linked motion.
const PROGRESS_SPRING = { stiffness: 250, damping: 40, bounce: 0 }

// Matches `.about-me`'s own `border-top-left/right-radius` in
// hero-about-stack.css. Keeping this identical is what makes the birth
// phase's arc land flush on the card's real corner with no visible seam.
const CORNER_RADIUS = 32

// Stroke width and its half — path coordinates are inset by half the stroke
// so the line never gets clipped by the viewport edge.
const STROKE_WIDTH = 3.5
const INSET = STROKE_WIDTH / 2

// document.documentElement.clientWidth/Height — NOT window.innerWidth/innerHeight.
// innerWidth includes the native scrollbar's track; sizing the frame to it puts
// the right rail directly underneath the (opaque, ~15px) scrollbar, hiding it
// completely. clientWidth excludes the scrollbar, matching the actually visible
// content area.
function useViewportSize() {
  const [size, setSize] = useState(() => ({
    width: typeof document === 'undefined' ? 0 : document.documentElement.clientWidth,
    height: typeof document === 'undefined' ? 0 : document.documentElement.clientHeight,
  }))

  // ResizeObserver on <html>, not a `resize` listener. The lazy useState
  // initializer above runs during render, before React has committed
  // anything — at that point the page's real content (Footer, Projects,
  // etc.) doesn't exist yet, so the document isn't tall enough to need a
  // scrollbar and clientWidth reads as if there were none. ResizeObserver's
  // callback fires once right after it starts observing (by which point the
  // full tree is committed and the scrollbar, if any, is accounted for) and
  // again on every subsequent viewport/content change — covering both the
  // one-time correction and ongoing resizes with a single subscription.
  useEffect(() => {
    const target = document.documentElement
    const observer = new ResizeObserver(() => {
      setSize({ width: target.clientWidth, height: target.clientHeight })
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return size
}

// Builds the two mirrored half-frame path strings plus the scroll-fraction
// boundary (fTop) between the birth/top phase and the rails+bottom phase.
//
// Each half runs top-center → corner → rail → corner → bottom-center, so a
// single monotonic strokeDashoffset sweep (1 → 0) draws, in order: the top
// edge outward from center, the rail top-to-bottom, then the bottom edge
// inward to center — matching the birth / rails / close-the-loop spec with
// one continuous draw instead of a 3-phase state machine.
function buildFrameGeometry(width, height) {
  const r = Math.max(CORNER_RADIUS - INSET, 0)
  const top = INSET
  const bottom = height - INSET
  const left = INSET
  const right = width - INSET
  const midX = width / 2

  // Left half travels top-center → top-left corner → left rail down →
  // bottom-left corner → bottom-center. That traversal runs counter-
  // clockwise around the frame, so both corner arcs use sweep-flag 0.
  const leftHalf = [
    `M ${midX} ${top}`,
    `L ${left + r} ${top}`,
    `A ${r} ${r} 0 0 0 ${left} ${top + r}`,
    `L ${left} ${bottom - r}`,
    `A ${r} ${r} 0 0 0 ${left + r} ${bottom}`,
    `L ${midX} ${bottom}`,
  ].join(' ')

  // Right half is the mirror image — clockwise around the frame, so its
  // corner arcs use sweep-flag 1.
  const rightHalf = [
    `M ${midX} ${top}`,
    `L ${right - r} ${top}`,
    `A ${r} ${r} 0 0 1 ${right} ${top + r}`,
    `L ${right} ${bottom - r}`,
    `A ${r} ${r} 0 0 1 ${right - r} ${bottom}`,
    `L ${midX} ${bottom}`,
  ].join(' ')

  const cornerArc = (Math.PI / 2) * r
  const topHalfLen = midX - left - r
  const rail = bottom - top - 2 * r
  const bottomHalfLen = midX - left
  const total = topHalfLen + cornerArc + rail + bottomHalfLen || 1

  return {
    leftHalf,
    rightHalf,
    fTop: (topHalfLen + cornerArc) / total,
    fBottomStart: (topHalfLen + cornerArc + rail) / total,
  }
}

// Document scroll fractions (matching Framer's own scrollY / (scrollHeight -
// clientHeight) normalization) bounding the birth phase: sBirthStart is where
// #about's top edge enters at the viewport bottom, sPin is where it reaches
// the viewport top — the instant the Hero pin visually resolves and birth
// hands off to the rails. Both drive `pageProgress`-based transforms directly
// (see birthProgress/railDraw below) instead of a separate Framer
// target-tracked useScroll, so birth and rails share one measurement and can
// never disagree about where the handoff happens.
//
// Re-measured on mount, on window resize, AND on a ResizeObserver watching
// `document.body` — not resize alone. Async above-the-fold content (the Spline
// robot, StarField canvas) can finish loading and settle into its final size
// after this first measures, silently shifting #about's offsetTop without
// firing a `resize` event; on a slower machine that window is wide enough to
// be visible, and without this observer the fractions freeze on the stale
// pre-settle layout permanently — the birth fill stalls short of the card's
// corners and never recovers, since nothing ever re-measures again.
function usePinScrollFraction(aboutRef) {
  const [fractions, setFractions] = useState({ sBirthStart: 0, sPin: 0.0001 })

  useEffect(() => {
    const measure = () => {
      const el = aboutRef.current
      if (!el) return
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      if (scrollable <= 0) return
      const rawPin = el.offsetTop / scrollable
      const sBirthStart = Math.min(
        Math.max((el.offsetTop - window.innerHeight) / scrollable, 0),
        rawPin,
      )
      // Guaranteed distinct from sBirthStart so the [sBirthStart, sPin] input
      // range useTransform interpolates over below is never degenerate.
      const sPin = Math.max(rawPin, sBirthStart + 0.0001)
      setFractions({ sBirthStart, sPin })
    }
    measure()
    window.addEventListener('resize', measure)
    const bodyObserver = new ResizeObserver(measure)
    bodyObserver.observe(document.body)
    return () => {
      window.removeEventListener('resize', measure)
      bodyObserver.disconnect()
    }
  }, [aboutRef])

  return fractions
}

// ScrollProgressFrame — a scroll-driven rounded-rectangle border that is
// born on the AboutMe card's top edge and grows into a full frame around
// the viewport as the page scrolls. See docs/architecture.md, "Scroll
// Progress Frame" for the full design.
//
// SVG frame, born on the card, closes at page end — ships at every tier.
// Reduced-motion only: plain top bar (the card never pins there).
export default function ScrollProgressFrame() {
  const prefersReducedMotion = useReducedMotion()
  const aboutRef = useRef(null)
  const journeyRef = useRef(null)

  // Self-locates the AboutMe card and the My Evolution section — both
  // already exist in the committed DOM by the time this sibling's own
  // layout effect runs (ScrollProgressFrame mounts after both in App.jsx).
  // Declared before usePinScrollFraction and the journeyRef useScroll calls
  // below so this assignment's layout effect fires first, guaranteeing their
  // own effects see populated refs.
  useLayoutEffect(() => {
    aboutRef.current = document.getElementById('about')
    journeyRef.current = document.getElementById('journey')
  }, [])

  const { width, height } = useViewportSize()
  const { sBirthStart, sPin } = usePinScrollFraction(aboutRef)
  const { fTop, fBottomStart, leftHalf, rightHalf } = buildFrameGeometry(
    width || 1,
    height || 1,
  )

  // Dash units are the path's REAL length, measured from the DOM — not
  // `pathLength={1}` normalization. Chromium's internal length approximation
  // for pathLength-based dash scaling disagrees with getTotalLength() on paths
  // containing elliptical-arc (`A`) commands, which these have for the 32px
  // corners: verified 2026-08-12 in desktop Chromium against real screenshot
  // pixels — the stroke painted only ~half its expected span while both the JS
  // dash offset and getPointAtLength() agreed it reached both corners. Real
  // (un-normalized) dasharray/dashoffset are stroked against exactly the length
  // getTotalLength() reports, so they agree by construction. Do not "simplify"
  // this back to Framer's own `pathLength` style prop — motion-dom's
  // buildSVGPath implements it by setting pathLength=1, i.e. the broken case.
  //
  // Motion values, not useState: strokeDasharray and strokeDashoffset must
  // reach the DOM in the same Framer render pass. Framer serializes motion
  // values into SVG props once (useSVGProps memoizes on the constant
  // visualState) and pushes later changes imperatively on its own frame, so a
  // React-attribute dasharray would commit a frame ahead of its motion-value
  // offset — pairing a full-length dasharray with a stale offset for one frame.
  const leftPathRef = useRef(null)
  const rightPathRef = useRef(null)
  const leftLength = useMotionValue(1)
  const rightLength = useMotionValue(1)

  // Keyed on the two `d` strings (not just width/height) so a resize can never
  // leave the dash math on a stale length — same "don't trust a one-time
  // measurement" rule as useViewportSize / usePinScrollFraction above. Each
  // half is measured on its own: they're geometric mirrors, but nothing
  // guarantees Chromium flattens both arc sets to bit-identical lengths.
  // prefersReducedMotion is a dep because the paths unmount in that branch —
  // re-measure if it flips back. useLayoutEffect so this runs after React
  // commits the new `d` but before paint, never a visible stale-length frame.
  useLayoutEffect(() => {
    leftLength.set(leftPathRef.current?.getTotalLength() ?? 1)
    rightLength.set(rightPathRef.current?.getTotalLength() ?? 1)
  }, [leftHalf, rightHalf, prefersReducedMotion, leftLength, rightLength])

  // Whole-document progress drives birth, rails, and the bottom close.
  const { scrollYProgress: pageProgress } = useScroll()

  // Birth: 0 when the card's top edge enters from the viewport bottom
  // (sBirthStart), 1 the instant it reaches the viewport top (sPin) — a
  // transform of the same pageProgress source as railDraw below, bounded by
  // the self-measured fractions from usePinScrollFraction. See that hook's
  // comment for why this replaced a separate Framer target-tracked useScroll.
  const birthProgress = useTransform(pageProgress, [sBirthStart, sPin], [0, 1])

  // Relay handoff with My Evolution's timeline spine (see JourneyTimeline.jsx
  // and --journey-gutter-x in journey.css): as #journey arrives, both rails
  // fade out while the spine translates in from the left edge; as #journey
  // leaves, both rails fade back in while the spine retreats to the edge.
  // The right rail has no spine of its own to hand off to, but it fades in
  // lockstep with the left so the frame never sits half-open around the
  // sticky avatar. journeyEnter/journeyExit mirror MyJourney.jsx's
  // sectionEnter/sectionExit exactly (same target, same offsets) so the
  // relay and this fade move in lockstep.
  const { scrollYProgress: journeyEnter } = useScroll({
    target: journeyRef,
    offset: ['start end', 'start start'],
  })
  const { scrollYProgress: journeyExit } = useScroll({
    target: journeyRef,
    offset: ['end end', 'end start'],
  })
  const railOpacity = useTransform(
    [journeyEnter, journeyExit],
    ([je, jx]) => (je < 1 ? 1 - je : jx),
  )
  const railOpacitySpring = useSpring(railOpacity, PROGRESS_SPRING)

  const birthDraw = useTransform(birthProgress, [0, 1], [0, fTop])
  const railDraw = useTransform(pageProgress, [sPin, 0.98, 1], [fTop, fBottomStart, 1])
  // Spring only the rail phase — smoothing is what you want over a long,
  // whole-page scroll. Springing it during birth too (as a single spring over
  // the combined value, the previous approach) put the draw length a beat
  // behind a fast scroll while groupTransform's position (below, unsprung)
  // stayed exactly synced with the card — the two visibly decoupled, the line
  // looking "detached" on a fast fling even though it tracked correctly on a
  // slow scroll. `railDraw` clamps to `fTop` for the whole birth phase (its
  // input, pageProgress, hasn't reached sPin yet), so this spring has already
  // settled at fTop by the time birthProgress reaches 1 — no snap at handoff.
  const railDrawSpring = useSpring(railDraw, PROGRESS_SPRING)

  // Continuous handoff — while the card is still rising (birthProgress < 1)
  // draw from the raw, unsprung birth value (see above); once pinned, switch
  // to the page-scoped spring. Explicit array form (not the zero-arg
  // auto-tracking form) so both sources stay subscribed regardless of which
  // branch is currently active.
  const drawn = useTransform(
    [birthProgress, birthDraw, railDrawSpring],
    ([bp, bd, rds]) => (bp < 1 ? bd : rds),
  )
  const leftDashArray = useMotionTemplate`${leftLength} ${leftLength}`
  const rightDashArray = useMotionTemplate`${rightLength} ${rightLength}`
  const leftDashOffset = useTransform([drawn, leftLength], ([d, len]) => (1 - d) * len)
  const rightDashOffset = useTransform([drawn, rightLength], ([d, len]) => (1 - d) * len)

  // Rides the card's top border up to the viewport top as it rises, then
  // stays put — a transform, so this stays on the compositor.
  //
  // Pixels measured via useViewportSize (document.documentElement.clientHeight),
  // NOT a `vh` CSS unit. `vh` on mobile browsers is pinned to the "large"
  // viewport (address bar collapsed) regardless of whether the address bar is
  // actually showing right now, while every other measurement in this
  // component (buildFrameGeometry's INSET/corners, the SVG's own height) uses
  // the real current clientHeight. Using `vh` here made the birth line ride
  // faster or slower than the card's actual on-screen top edge whenever the
  // address bar was mid-collapse — invisible on desktop (no dynamic chrome)
  // but visibly detached from the card on a real phone.
  const birthOffsetPx = useTransform(birthProgress, [0, 1], [height || 1, 0])
  const groupTransform = useMotionTemplate`translateY(${birthOffsetPx}px)`

  // Fallback (reduced-motion) — plain left→right top bar. The Hero never
  // pins under reduced-motion, so there is no card edge for a birth phase
  // to ride.
  const barScale = useSpring(pageProgress, PROGRESS_SPRING)

  if (prefersReducedMotion) {
    return (
      <motion.div
        className="scroll-progress-bar"
        style={{ scaleX: barScale }}
        aria-hidden="true"
      />
    )
  }

  return (
    <svg
      className="scroll-progress-frame"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="scroll-progress-frame-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <motion.g style={{ transform: groupTransform }}>
        <motion.path
          ref={leftPathRef}
          className="scroll-progress-frame__path"
          d={leftHalf}
          style={{
            strokeDasharray: leftDashArray,
            strokeDashoffset: leftDashOffset,
            opacity: railOpacitySpring,
          }}
        />
        <motion.path
          ref={rightPathRef}
          className="scroll-progress-frame__path"
          d={rightHalf}
          style={{
            strokeDasharray: rightDashArray,
            strokeDashoffset: rightDashOffset,
            opacity: railOpacitySpring,
          }}
        />
      </motion.g>
    </svg>
  )
}
