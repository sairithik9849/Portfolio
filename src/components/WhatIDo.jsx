import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useReducedMotion } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SectionHead from './SectionHead'
import WidVisual from './WidVisual'
import { WHAT_I_DO } from '../data/whatIDo'
const N = WHAT_I_DO.length // 5

// ── Scroll tuning constants ───────────────────────────────────────────────────
const SCROLL_PER_WORD        = 780   // px of scroll range budgeted per word
const SETTLE_MS              = 140   // ms of scroll inactivity before settle fires
const CLICK_SCROLL_DURATION  = 1.0   // Lenis duration (s) for click/keyboard nav
const SETTLE_SCROLL_DURATION = 0.5   // Lenis duration (s) for auto-settle snap
const SETTLE_VELOCITY_MAX    = 0.05  // Lenis velocity below this counts as "stopped"
const SNAP_EPSILON_PX        = 4     // skip snap when already within this many px of target

// Splits blurb text on numeric tokens (e.g. "50+", "10M", "60fps") and wraps
// them in gold so metrics stand out without hardcoding per-blurb markup.
const highlightNums = text =>
  text.split(/(\d[\w+]*)/).map((part, i) =>
    /^\d/.test(part)
      ? <span key={i} className="wid-caption-num">{part}</span>
      : part
  )

// ─────────────────────────────────────────────────────────────────────────────
// Desktop media query — pin/scrub/settle is created ONLY inside this condition.
// gsap.matchMedia handles teardown when the viewport exits this range.
// ─────────────────────────────────────────────────────────────────────────────
const DESKTOP_QUERY =
  '(min-width: 981px) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

export default function WhatIDo() {
  const sectionRef       = useRef(null)
  const stageRef         = useRef(null)
  const leftRef          = useRef(null)      // .wid-left — word column
  const stackBaseRef     = useRef(null)      // cream word stack
  const bandRef          = useRef(null)      // accent band (overflow:hidden clip)
  const stackKoRef       = useRef(null)      // dark knockout stack inside band
  const activeRef        = useRef(0)
  // Exposed to JSX click handlers; populated inside setup(), cleared on teardown.
  const scrollToIndexRef = useRef(null)
  const [active, setActive] = useState(0)

  // Scroll-progress MotionValue — set in the onUpdate callback below.
  // useMotionValue gives automatic subscriber cleanup on unmount (vs module-level
  // motionValue() which needs manual teardown). .set() never triggers re-renders.
  const progress = useMotionValue(0)
  const reduced  = useReducedMotion()

  useEffect(() => {
    const section   = sectionRef.current
    const left      = leftRef.current
    const stackBase = stackBaseRef.current
    const band      = bandRef.current
    const stackKo   = stackKoRef.current
    if (!section || !left || !stackBase || !band || !stackKo) return

    // Hold a reference to the matchMedia instance so mm.revert() in the
    // cleanup disposes every ScrollTrigger/tween created across ALL breakpoint
    // transitions — including ones created after a resize (which gsap.context
    // cannot reliably capture). This is the correct StrictMode + resize pattern.
    const mm = gsap.matchMedia(section)

    mm.add(DESKTOP_QUERY, () => {
      let stKiller = null // () => st.kill()
      let alive    = true

      // ─── measure and wire up after fonts have loaded ───────────────────────
      // Fonts affect the measured line-box height. If we measure before the
      // web font swaps in, the pin end and travel distance will be wrong.
      const setup = () => {
        const firstWord = stackBase.querySelector('.wid-word')
        if (!firstWord) return

        const wordH  = firstWord.getBoundingClientRect().height
        const travel = wordH * (N - 1)

        // ── geometry: bleed band ───────────────────────────────────────────
        // The band is slightly taller than a single word so the active word
        // sits centered with a slim even margin of lime above and below —
        // stopping short of the neighbor letters. Both stacks are offset down
        // by `bleed` so word 0 rests centered in the band at progress=0.
        // At progress = i/(N-1): y = -i·wordH, word i's rendered top =
        // bleed + i·wordH + y = bleed → dead-centered in band at every snap.
        const bleed = Math.round(wordH * 0.05)
        const bandH = wordH + bleed * 2

        // .wid-left height = bandH; marginTop parks the word column ~1 word-row
        // below the top of the flex stage so there is one empty row of space
        // above the green band before the runway below.
        left.style.height    = `${bandH}px`
        left.style.marginTop = `${wordH}px`

        stackBase.style.top = `${bleed}px`  // word 0 centered in band

        band.style.height = `${bandH}px`
        band.style.top    = '0px'

        // knockout stack offsets match the base stack exactly so glyphs
        // land pixel-perfectly on the cream words.
        stackKo.style.top  = `${bleed}px`
        stackKo.style.left = '0px'

        // ── Settle-snap state ──────────────────────────────────────────────
        // All local to setup() — never cross React's render boundary.
        // Guards against oscillation when a programmatic scroll is in flight.
        let settleTimer     = null
        let isSnapping      = false
        let isSnappingTimer = null

        const clearSnapState = () => {
          clearTimeout(settleTimer)
          clearTimeout(isSnappingTimer)
          isSnapping = false
        }

        // ── ScrollTrigger ──────────────────────────────────────────────────
        const st = ScrollTrigger.create({
          trigger: section,
          start:   'top top',
          // Per-word scroll budget, longer than before so each word has room
          // to breathe. widDwell flattens DWELL_HOLD of each segment, so
          // each word's effective dwell ≈ SCROLL_PER_WORD × DWELL_HOLD px.
          end: `+=${Math.max(SCROLL_PER_WORD * (N - 1), travel + 800)}`,
          pin:   true,
          // scrub:true = immediate 1:1 mapping. Lenis provides the smoothing
          // layer — no second GSAP lerp needed, and the Lenis settle snap
          // won't fight a competing interpolation track.
          scrub: true,
          // GSAP snap removed: it conflicts with Lenis smooth-scroll
          // ("rubbery" — the two interpolation loops fight each other).
          // Settle snap is now handled by Lenis below.
          onUpdate: (self) => {
            gsap.set([stackBase, stackKo], { y: -self.progress * travel })

            // Feed the right-side viz without triggering a React re-render.
            progress.set(self.progress)

            // Guard against redundant state sets (React bailout only fires
            // after reconciliation; this skips scheduling it entirely).
            const i = Math.round(self.progress * (N - 1))
            if (i !== activeRef.current) {
              activeRef.current = i
              setActive(i)
            }

            // Lenis-driven settle snap — fires only once scroll has genuinely stopped.
            // Snapping mid-momentum would reverse the in-flight scroll and produce the
            // edge wiggle, so we re-check Lenis velocity and reschedule until momentum
            // has decayed to near-zero.
            // Skipped while a programmatic scroll (click or prior settle) is
            // in flight to prevent oscillation.
            if (!isSnapping) {
              clearTimeout(settleTimer)
              const attemptSettle = () => {
                if (isSnapping) return  // another snap already in flight

                const lenis = window.__lenis
                // Still moving? Defer until Lenis momentum decays.
                if (lenis && Math.abs(lenis.velocity) > SETTLE_VELOCITY_MAX) {
                  settleTimer = setTimeout(attemptSettle, SETTLE_MS)
                  return
                }

                const nearest  = Math.round(st.progress * (N - 1))
                const targetY  = st.start + (nearest / (N - 1)) * (st.end - st.start)
                const currentY = window.scrollY ?? window.pageYOffset
                if (Math.abs(currentY - targetY) > SNAP_EPSILON_PX) {
                  isSnapping = true
                  isSnappingTimer = setTimeout(
                    () => { isSnapping = false },
                    SETTLE_SCROLL_DURATION * 1000 + 100,
                  )
                  if (lenis) {
                    lenis.scrollTo(targetY, { duration: SETTLE_SCROLL_DURATION })
                  } else {
                    window.scrollTo({ top: targetY, behavior: 'smooth' })
                  }
                }
              }
              settleTimer = setTimeout(attemptSettle, SETTLE_MS)
            }
          },
        })

        // ── Click / keyboard navigation ────────────────────────────────────
        // Smooth-scrolls to the scroll position that centers word `targetIdx`
        // in the lime band. Cancels any in-flight settle to prevent fighting.
        // Snap points are fixed points of widDwell so targetIdx/(N-1) is the
        // correct raw progress target without any inverse transform needed.
        const scrollToIndex = (targetIdx) => {
          clearSnapState()
          const targetY = st.start + (targetIdx / (N - 1)) * (st.end - st.start)
          isSnapping = true
          isSnappingTimer = setTimeout(
            () => { isSnapping = false },
            CLICK_SCROLL_DURATION * 1000 + 100
          )
          if (window.__lenis) {
            window.__lenis.scrollTo(targetY, { duration: CLICK_SCROLL_DURATION })
          } else {
            window.scrollTo({ top: targetY, behavior: 'smooth' })
          }
        }
        scrollToIndexRef.current = scrollToIndex

        stKiller = () => {
          clearSnapState()
          scrollToIndexRef.current = null
          st.kill()
          // Clear transforms and JS-set geometry so the mobile static layout
          // takes over cleanly if the viewport shrinks below 981 px.
          gsap.set([stackBase, stackKo], { clearProps: 'transform' })
          left.style.height    = ''
          left.style.marginTop = ''
          stackBase.style.top  = ''
          band.style.height    = ''
          band.style.top       = ''
          stackKo.style.top    = ''
          stackKo.style.left   = ''
        }
      }

      // document.fonts.ready resolves immediately if fonts are already loaded,
      // or waits for the first web-font swap. The `alive` flag prevents a
      // stale setup call if the component unmounts first.
      document.fonts.ready.then(() => {
        if (!alive) return
        setup()
        ScrollTrigger.refresh()
      })

      // Re-sync pin math after any layout-shifting resize.
      const onResize = () => ScrollTrigger.refresh()
      window.addEventListener('resize', onResize, { passive: true })

      // ── matchMedia cleanup ─────────────────────────────────────────────
      // Called by mm.revert() on unmount OR when the viewport exits the
      // DESKTOP_QUERY range (e.g. resize to mobile). Both cases need a full
      // teardown — ScrollTrigger, transforms, and the resize listener.
      return () => {
        alive = false
        window.removeEventListener('resize', onResize)
        stKiller?.()
        scrollToIndexRef.current = null
        // Reset active to word 0 so the mobile fallback starts clean.
        activeRef.current = 0
        setActive(0)
      }
    })

    // mm.revert() disposes every trigger/tween the matchMedia ever created,
    // including triggers created after a later resize into the desktop range.
    return () => mm.revert()
    // progress is a stable MotionValue ref (useMotionValue) — it won't change
    // between renders and doesn't need to trigger re-setup of the GSAP/Lenis
    // ScrollTrigger. Omitting it from deps is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Smooth-scroll to word `i`. On desktop, uses the ScrollTrigger-aware Lenis
  // target so the pinned progress lands exactly on that word's snap point.
  // Mobile / reduced-motion fallback: scrolls the matching blurb into view.
  const handleWordClick = (i) => {
    if (scrollToIndexRef.current) {
      scrollToIndexRef.current(i)
    } else {
      document.querySelectorAll('.wid-mobile-blurb-item')[i]
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleWordKeyDown = (e, i) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleWordClick(i)
    }
  }

  return (
    <section ref={sectionRef} id="what-i-do" className="what-i-do">
      <SectionHead idx="03" title="What I" em="Do." right="" />

      {/* ── stage: word column (left) + readout (right) ─────────────────── */}
      <div className="wid-stage" ref={stageRef}>

        {/* LEFT — word column; height set to 1 word by JS so flex centers it */}
        <div className="wid-left" ref={leftRef}>

          {/* Accent band — clips the knockout stack via overflow:hidden.    */}
          {/* position/height set by JS to match measured word line-box.     */}
          {/* pointer-events:none (CSS) so clicks fall through to base words */}
          <div className="wid-band" ref={bandRef}>
            {/*
              Knockout stack: identical words in --bg color.
              aria-hidden — purely decorative duplicate; the base stack
              below carries the real content for assistive tech.
            */}
            <div
              className="wid-stack wid-stack--ko"
              ref={stackKoRef}
              aria-hidden="true"
            >
              {WHAT_I_DO.map((c) => (
                <div key={c.id} className="wid-word wid-word--ko">
                  {c.word}
                </div>
              ))}
            </div>
          </div>

          {/* Base stack — cream words, visible above and below the band.
              Each word is role=button: clicking smooth-scrolls to that word's
              position in the pinned section (or its mobile blurb).
              Geometry (position/size) must stay identical to the ko stack
              above so glyphs register pixel-perfectly — never add padding,
              margin, or font overrides here. */}
          <div className="wid-stack wid-stack--base" ref={stackBaseRef}>
            {WHAT_I_DO.map((c, i) => (
              <div
                key={c.id}
                className="wid-word"
                role="button"
                tabIndex={0}
                data-cursor="hover"
                aria-label={`Go to ${c.word}`}
                onClick={() => handleWordClick(i)}
                onKeyDown={(e) => handleWordKeyDown(e, i)}
              >
                {c.word}
              </div>
            ))}
          </div>

        </div>

        {/* Mobile-only (and reduced-motion): all five blurbs listed inline.
            Each item gets a frozen single-viz final frame above the blurb. */}
        <div className="wid-mobile-blurbs">
          {WHAT_I_DO.map((c, i) => (
            <div key={c.id} className="wid-mobile-blurb-item">
              <div className="kicker wid-readout-idx">// 0{i + 1}</div>
              <div className="wid-mobile-viz">
                <WidVisual frozen index={i} />
              </div>
              <p className="wid-readout-blurb">{c.blurb}</p>
            </div>
          ))}
        </div>

      </div>

      {/* Desktop viz field + caption — direct children of the section (not the
          stage) so they are NOT clipped by the stage's clip-path:inset and can
          span the full 100vh. The section is position:relative and the
          containing block for these absolute elements. */}
      <WidVisual progress={progress} active={active} reduced={reduced} />

      {/* Caption — real DOM text (active blurb) for screen readers.
          Mirrors the field's geometry (same left/right/height). z:5 paints it
          above the word stacks. The viz region is aria-hidden. */}
      <div className="wid-caption" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.p
            key={active}
            className="wid-caption-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {highlightNums(WHAT_I_DO[active]?.blurb ?? '')}
          </motion.p>
        </AnimatePresence>
      </div>

    </section>
  )
}
