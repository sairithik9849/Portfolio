import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SectionHead from './SectionHead'
import { CAPABILITIES } from '../data/capabilities'

const N = CAPABILITIES.length // 5

// ─────────────────────────────────────────────────────────────────────────────
// Desktop media query — pin/scrub/snap is created ONLY inside this condition.
// gsap.matchMedia handles teardown when the viewport exits this range.
// ─────────────────────────────────────────────────────────────────────────────
const DESKTOP_QUERY =
  '(min-width: 981px) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

export default function Capabilities() {
  const sectionRef  = useRef(null)
  const stageRef    = useRef(null)
  const leftRef     = useRef(null)     // .cap-left — word column
  const stackBaseRef = useRef(null)    // cream word stack
  const bandRef     = useRef(null)     // accent band (overflow:hidden clip)
  const stackKoRef  = useRef(null)     // dark knockout stack inside band
  const capRightRef = useRef(null)     // right-side blurb column
  const activeRef   = useRef(0)
  const [active, setActive] = useState(0)

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
        const firstWord = stackBase.querySelector('.cap-word')
        if (!firstWord) return

        const wordH  = firstWord.getBoundingClientRect().height
        const travel = wordH * (N - 1)

        // ── geometry: bleed band ───────────────────────────────────────────
        // The band is taller than a single word so the active word sits
        // vertically centered with slivers of the neighbors bleeding in
        // above and below (matching the reference). Both stacks are offset
        // down by `bleed` so word 0 rests centered in the band at progress=0.
        // At progress = i/(N-1): y = -i·wordH, word i's rendered top =
        // bleed + i·wordH + y = bleed → dead-centered in band at every snap.
        const bleed = Math.round(wordH * 0.16)
        const bandH = wordH + bleed * 2

        // .cap-left height = bandH; marginTop parks the word column ~1 word-row
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

        // Anchor the right-side blurb to the vertical center of the band.
        // CSS `top:50% + translateY(-50%)` was centered on the stage mid-point
        // (correct when align-items:center); now that the stage is flex-start
        // with a top-gap, we override `top` to place the blurb's center on
        // the band's center: topGap + bandH/2.
        const capRight = capRightRef.current
        if (capRight) capRight.style.top = `${wordH + bandH / 2}px`

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
          const capRight = capRightRef.current
          if (capRight) capRight.style.top = ''
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
  }, [])

  return (
    <section ref={sectionRef} id="capabilities" className="capabilities">
      <SectionHead idx="03" title="What I" em="Do." right="" />

      {/* ── stage: word column (left) + readout (right) ─────────────────── */}
      <div className="cap-stage" ref={stageRef}>

        {/* LEFT — word column; height set to 1 word by JS so flex centers it */}
        <div className="cap-left" ref={leftRef}>

          {/* Accent band — clips the knockout stack via overflow:hidden. */}
          {/* position/height set by JS to match measured word line-box.   */}
          <div className="cap-band" ref={bandRef}>
            {/*
              Knockout stack: identical words in --bg color.
              aria-hidden — purely decorative duplicate; the base stack
              below carries the real content for assistive tech.
            */}
            <div
              className="cap-stack cap-stack--ko"
              ref={stackKoRef}
              aria-hidden="true"
            >
              {CAPABILITIES.map((c) => (
                <div key={c.id} className="cap-word cap-word--ko">
                  {c.word}
                </div>
              ))}
            </div>
          </div>

          {/* Base stack — cream words, visible above and below the band */}
          <div className="cap-stack cap-stack--base" ref={stackBaseRef}>
            {CAPABILITIES.map((c) => (
              <div key={c.id} className="cap-word">
                {c.word}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — animated blurb readout (desktop: single crossfade) */}
        <div className="cap-right" ref={capRightRef}>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              className="cap-readout-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className="cap-readout-blurb">
                {CAPABILITIES[active].blurb}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile-only: all five blurbs listed inline below their words  */}
        {/* Hidden on desktop via CSS. The static word stack is rendered  */}
        {/* by .cap-stack--base in its non-absolute (static) mobile flow. */}
        <div className="cap-mobile-blurbs">
          {CAPABILITIES.map((c, i) => (
            <div key={c.id} className="cap-mobile-blurb-item">
              <div className="kicker cap-readout-idx">// 0{i + 1}</div>
              <p className="cap-readout-blurb">{c.blurb}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
