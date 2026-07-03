import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'

// Shared spring config — matches the 21st.dev reference component this was
// adapted from, and reads consistently with the rest of the site's
// scroll-linked motion.
const PROGRESS_SPRING = { stiffness: 250, damping: 40, bounce: 0 }

// Mirrors the exact desktop + motion-allowed gate that pins the Hero under
// AboutMe (see hero-about-stack.css). The frame is only meaningful while
// that pin exists — anywhere else (mobile, reduced-motion) it collapses to
// a plain top bar, so this query must stay identical to that file's.
const FRAME_MEDIA_QUERY = '(min-width: 981px) and (prefers-reduced-motion: no-preference)'

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

// Document scroll fraction (matching Framer's own scrollY / (scrollHeight -
// clientHeight) normalization) at which #about's top edge reaches the
// viewport top — i.e. the instant the Hero pin visually resolves and birth
// hands off to the rails. Derived from layout on mount/resize, never
// per-frame, so it never causes scroll-driven layout thrash.
function usePinScrollFraction(aboutRef) {
  const [sPin, setSPin] = useState(0)

  useEffect(() => {
    const measure = () => {
      const el = aboutRef.current
      if (!el) return
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      if (scrollable <= 0) return
      setSPin(el.offsetTop / scrollable)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [aboutRef])

  return sPin
}

// ScrollProgressFrame — a scroll-driven rounded-rectangle border that is
// born on the AboutMe card's top edge and grows into a full frame around
// the viewport as the page scrolls. See docs/architecture.md, "Scroll
// Progress Frame" for the full design.
//
// Desktop + motion-allowed: SVG frame, born on the card, closes at page end.
// Mobile / reduced-motion: plain top bar (the card never pins there).
export default function ScrollProgressFrame() {
  const prefersReducedMotion = useReducedMotion()
  const [frameMode, setFrameMode] = useState(false)
  const aboutRef = useRef(null)

  // Self-locates the AboutMe card — #about already exists in the committed
  // DOM by the time this sibling's own layout effect runs (ScrollProgressFrame
  // mounts after AboutMe in App.jsx). Declared before the useScroll calls
  // below so this assignment's layout effect fires first, guaranteeing
  // useScroll's internal target-measurement effect sees a populated ref.
  useLayoutEffect(() => {
    aboutRef.current = document.getElementById('about')
  }, [])

  useEffect(() => {
    const mql = window.matchMedia(FRAME_MEDIA_QUERY)
    const update = () => setFrameMode(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  const { width, height } = useViewportSize()
  const sPin = usePinScrollFraction(aboutRef)
  const { fTop, fBottomStart, leftHalf, rightHalf } = buildFrameGeometry(
    width || 1,
    height || 1,
  )

  // Birth: 0 when the card's top edge enters from the viewport bottom
  // ('start end'), 1 the instant it reaches the viewport top ('start start')
  // — the same target-scoped useScroll pattern AboutMe.jsx already uses for
  // its own per-word reveal.
  const { scrollYProgress: birthProgress } = useScroll({
    target: aboutRef,
    offset: ['start end', 'start start'],
  })
  // Whole-document progress drives the rails + bottom close once pinned.
  const { scrollYProgress: pageProgress } = useScroll()

  const birthDraw = useTransform(birthProgress, [0, 1], [0, fTop])
  const railDraw = useTransform(pageProgress, [sPin, 0.98, 1], [fTop, fBottomStart, 1])

  // Continuous handoff — while the card is still rising (birthProgress < 1)
  // draw from the card-scoped source; once pinned, switch to the page-scoped
  // source, which starts at the same fTop value birthDraw ends on, so there
  // is no snap in either direction (scroll up re-enters birth smoothly too).
  // Explicit array form (not the zero-arg auto-tracking form) so both
  // sources stay subscribed regardless of which branch is currently active.
  const drawn = useTransform(
    [birthProgress, birthDraw, railDraw],
    ([bp, bd, rd]) => (bp < 1 ? bd : rd),
  )
  const drawnSpring = useSpring(drawn, PROGRESS_SPRING)
  const dashOffset = useTransform(drawnSpring, (d) => 1 - d)

  // Rides the card's top border up to the viewport top as it rises, then
  // stays put — a transform, so this stays on the compositor.
  const birthOffsetVh = useTransform(birthProgress, [0, 1], [100, 0])
  const groupTransform = useMotionTemplate`translateY(${birthOffsetVh}vh)`

  // Fallback (mobile / reduced-motion) — plain left→right top bar. The Hero
  // never pins under 981px / reduced-motion, so there is no card edge for a
  // birth phase to ride.
  const barScale = useSpring(pageProgress, PROGRESS_SPRING)

  if (prefersReducedMotion || !frameMode) {
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
          className="scroll-progress-frame__path"
          d={leftHalf}
          pathLength={1}
          strokeDasharray="1 1"
          style={{ strokeDashoffset: dashOffset }}
        />
        <motion.path
          className="scroll-progress-frame__path"
          d={rightHalf}
          pathLength={1}
          strokeDasharray="1 1"
          style={{ strokeDashoffset: dashOffset }}
        />
      </motion.g>
    </svg>
  )
}
