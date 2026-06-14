// Preloader overlay + HUD. Two responsibilities:
//
//   1. Bar: a compositor-driven WAAPI animation on transform:scaleX — it runs
//      off the main thread, so HeroFluid/Spline eval (which mounts under this
//      overlay) can never stutter it. It fills 0 → FILL_RAMP over MIN_DISPLAY_MS,
//      then races FILL_RAMP → 1 the instant beginExit arrives, so 100% and the
//      curtain coincide (no dead wait at the end).
//
//   2. Curtain: when beginExit fires (App: fluid AND robot ready, or safety cap),
//      the bar completes, then the overlay sweeps up via transform:translateY
//      (compositor) revealing the already-loaded hero behind it.
//
// The percent/status HUD is written via refs (no per-frame React re-renders).

import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import BoxLoader from './preloader/BoxLoader.jsx'
import { MIN_DISPLAY_MS } from '../utils/preloadAssets.js'
import { PRELOADER_NAME, getStatusLabel } from '../data/preloader.js'

// Bar fills to this fraction over the cinematic floor; the final stretch to 1
// is the reveal race, so the bar lands on 100 exactly as the curtain lifts.
const FILL_RAMP        = 0.92
const RACE_DURATION_MS = 320   // FILL_RAMP → 1 once readiness fires
const RACE_DURATION_REDUCED = 80
const RAMP_EASE        = 'cubic-bezier(0.22, 1, 0.36, 1)'

// Curtain (overlay sweep-up) durations (s).
const EXIT_DURATION      = 0.88
const EXIT_DURATION_FAST = 0.3   // reduced-motion fade
const EXIT_EASE          = [0.22, 1, 0.36, 1]

export default function Preloader({ beginExit }) {
  const reduced    = !!useReducedMotion()
  const reducedRef = useRef(reduced)

  useLayoutEffect(() => {
    reducedRef.current = reduced
  })

  const [dismissed, setDismissed] = useState(false)
  const dismissedRef = useRef(false)

  // DOM refs for the ref-driven HUD (no React state churn during the fill).
  const fillRef   = useRef(null)
  const pctRef    = useRef(null)
  const statusRef = useRef(null)
  const barRef    = useRef(null)

  // Active fill animation + its scaleX range, so the number mirror can map the
  // animation's eased progress back to a 0–100 readout for whichever phase runs.
  const animRef     = useRef(null)
  const rangeRef    = useRef({ from: 0, to: FILL_RAMP })
  const lastPctRef  = useRef(-1)
  const lastLabelRef = useRef('')

  // ── Bar: WAAPI ramp + ref-driven number mirror ────────────────────────────
  useEffect(() => {
    const fillEl = fillRef.current
    if (!fillEl) return undefined

    rangeRef.current = { from: 0, to: FILL_RAMP }
    animRef.current = fillEl.animate(
      [{ transform: 'scaleX(0)' }, { transform: `scaleX(${FILL_RAMP})` }],
      { duration: MIN_DISPLAY_MS, easing: RAMP_EASE, fill: 'forwards' },
    )

    let rafId
    const mirror = () => {
      if (dismissedRef.current) return
      const anim = animRef.current
      const { from, to } = rangeRef.current
      const progress = anim ? (anim.effect.getComputedTiming().progress ?? 1) : 1
      const scaleX = from + (to - from) * progress

      const pct = Math.round(scaleX * 100)
      if (pct !== lastPctRef.current) {
        lastPctRef.current = pct
        if (pctRef.current) pctRef.current.textContent = `${String(pct).padStart(2, '0')}%`
        if (barRef.current) barRef.current.setAttribute('aria-valuenow', String(pct))
        const label = getStatusLabel(scaleX)
        if (label !== lastLabelRef.current) {
          lastLabelRef.current = label
          if (statusRef.current) statusRef.current.textContent = label
        }
      }
      rafId = requestAnimationFrame(mirror)
    }
    rafId = requestAnimationFrame(mirror)

    return () => {
      cancelAnimationFrame(rafId)
      animRef.current?.cancel()
    }
  }, [])

  // ── Reveal: race the bar to 100, then sweep the curtain up ────────────────
  useEffect(() => {
    if (!beginExit || dismissedRef.current) return
    const fillEl = fillRef.current
    if (!fillEl) {
      dismissedRef.current = true
      setDismissed(true)
      return
    }

    // Current scaleX from the in-flight ramp, so the race starts seamlessly.
    const prev = animRef.current
    const { from, to } = rangeRef.current
    const current = from + (to - from) * (prev?.effect.getComputedTiming().progress ?? 1)
    prev?.cancel()

    rangeRef.current = { from: current, to: 1 }
    const duration = reducedRef.current ? RACE_DURATION_REDUCED : RACE_DURATION_MS
    const race = fillEl.animate(
      [{ transform: `scaleX(${current})` }, { transform: 'scaleX(1)' }],
      { duration, easing: 'ease-out', fill: 'forwards' },
    )
    animRef.current = race

    let cancelled = false
    race.finished
      .then(() => {
        if (cancelled || dismissedRef.current) return
        dismissedRef.current = true
        setDismissed(true)   // AnimatePresence plays the curtain sweep
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [beginExit])

  // ── Curtain motion — translateY sweep (compositor), fade under reduced motion ─
  const motionProps = reduced
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit:    { opacity: 0, transition: { duration: EXIT_DURATION_FAST } },
      }
    : {
        initial: { y: 0 },
        animate: { y: 0 },
        exit:    { y: '-100%', transition: { duration: EXIT_DURATION, ease: EXIT_EASE } },
      }

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          className="preloader"
          key="preloader"
          {...motionProps}
        >
          {/* Centered CSS 3D box loader */}
          <BoxLoader reduced={reduced} />

          {/* Corner meta — top-left: name in lime */}
          <span className="preloader-meta preloader-meta--tl" aria-hidden="true">
            {PRELOADER_NAME}
          </span>

          {/* Status + percent — bottom-left in gold */}
          <div className="preloader-hud">
            <p className="preloader-status">
              <span ref={statusRef}>INITIALIZING</span>
              <span className="preloader-cur" aria-hidden="true" />
            </p>
            <span className="preloader-pct" aria-hidden="true" ref={pctRef}>00%</span>
          </div>

          {/* Full-viewport-width progress line — bottom of screen */}
          <div
            className="preloader-line"
            ref={barRef}
            role="progressbar"
            aria-valuenow={0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Loading portfolio"
          >
            <div className="preloader-line-fill" ref={fillRef} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
