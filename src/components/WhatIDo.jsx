import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useReducedMotion } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SectionHead from './SectionHead'
import WidVisual from './WidVisual'
import { WHAT_I_DO } from '../data/whatIDo'

const N = WHAT_I_DO.length // 5

// Splits blurb text on numeric tokens (e.g. "50+", "10M", "60fps") and wraps
// them in gold so metrics stand out without hardcoding per-blurb markup.
const highlightNums = text =>
  text.split(/(\d[\w+]*)/).map((part, i) =>
    /^\d/.test(part)
      ? <span key={i} className="wid-caption-num">{part}</span>
      : part
  )

// ─────────────────────────────────────────────────────────────────────────────
// Desktop media query — pin/scrub/snap is created ONLY inside this condition.
// gsap.matchMedia handles teardown when the viewport exits this range.
// ─────────────────────────────────────────────────────────────────────────────
const DESKTOP_QUERY =
  '(min-width: 981px) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

export default function WhatIDo() {
  const sectionRef  = useRef(null)
  const stageRef    = useRef(null)
  const leftRef     = useRef(null)     // .wid-left — word column
  const stackBaseRef = useRef(null)    // cream word stack
  const bandRef     = useRef(null)     // accent band (overflow:hidden clip)
  const stackKoRef  = useRef(null)     // dark knockout stack inside band
  const activeRef   = useRef(0)
  const [active, setActive] = useState(0)

  // Scroll-progress MotionValue — set in the existing onUpdate callback below.
  // useMotionValue gives automatic subscriber cleanup on unmount (vs module-level
  // motionValue() which needs manual teardown). .set() never triggers re-renders.
  const progress = useMotionValue(0)
  const reduced  = useReducedMotion()

  useEffect(() => {
    const section  = sectionRef.current
    const left     = leftRef.current
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

        // ── ScrollTrigger ──────────────────────────────────────────────────
        const st = ScrollTrigger.create({
          trigger: section,
          start:   'top top',
          // Give each word ~1.6× its height of scroll range → comfortable to
          // scrub through. Minimum 1 600 px so tiny words aren't too brief.
          end: `+=${Math.max(travel * 1.6, 1600)}`,
          pin:   true,
          scrub: true,  // immediate 1:1 — required for snap to work cleanly
          snap: {
            snapTo:   1 / (N - 1),
            duration: { min: 0.15, max: 0.4 },
            ease:     'power2.inOut',
            // NOTE: if snap feels rubbery (scroll + Lenis fighting), the fix
            // is to remove this snap block and instead call
            //   window.__lenis?.scrollTo(target)
            // from a debounced onUpdate or an onScrubComplete callback.
          },
          onUpdate: (self) => {
            // Both stacks share the same y — glyphs register pixel-perfectly.
            const y = -self.progress * travel
            gsap.set([stackBase, stackKo], { y })

            // Feed the right-side viz without triggering a React re-render.
            progress.set(self.progress)

            // Guard against redundant state sets (React bailout only fires
            // after reconciliation; this avoids even scheduling it).
            const i = Math.round(self.progress * (N - 1))
            if (i !== activeRef.current) {
              activeRef.current = i
              setActive(i)
            }
          },
        })

        stKiller = () => {
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

  return (
    <section ref={sectionRef} id="what-i-do" className="what-i-do">
      <SectionHead idx="03" title="What I" em="Do." right="" />

      {/* ── stage: word column (left) + readout (right) ─────────────────── */}
      <div className="wid-stage" ref={stageRef}>

        {/* LEFT — word column; height set to 1 word by JS so flex centers it */}
        <div className="wid-left" ref={leftRef}>

          {/* Accent band — clips the knockout stack via overflow:hidden. */}
          {/* position/height set by JS to match measured word line-box.   */}
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

          {/* Base stack — cream words, visible above and below the band */}
          <div className="wid-stack wid-stack--base" ref={stackBaseRef}>
            {WHAT_I_DO.map((c) => (
              <div key={c.id} className="wid-word">
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
