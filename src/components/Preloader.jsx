// Preloader overlay + HUD. Two responsibilities:
//
//   1. Bar: a compositor-driven WAAPI animation on transform:scaleX that fills
//      0 → 1 over FILL_DURATION_MS with a near-linear ease. Runs off the main
//      thread, so HeroFluid/Spline eval can never stutter it. No hold, no second
//      segment — a single smooth sweep all the way to 100.
//
//   2. Curtain: when BOTH the fill has finished AND beginExit fires (assets ready
//      or safety ceiling), the overlay sweeps up via transform:translateY
//      (compositor) revealing the already-loaded hero behind it.
//      onRevealComplete fires once the sweep finishes — App uses this to start
//      the Hero entrance cascade, keeping the heavy Framer spike off the
//      preloader's visible frames entirely.
//
// The percent/status HUD is written via refs (no per-frame React re-renders).

import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import BoxLoader from './preloader/BoxLoader.jsx'
import { PRELOADER_NAME, getStatusLabel } from '../data/preloader.js'

// Single continuous fill: 0 → 1 over FILL_DURATION_MS.
// Near-linear ease-in-out-sine: starts moving immediately, never parks near 100.
const FILL_DURATION_MS      = 2600
const FILL_DURATION_REDUCED = 600
const FILL_EASE             = 'cubic-bezier(0.45, 0, 0.55, 1)'

// Curtain (overlay sweep-up) durations (s).
const EXIT_DURATION      = 0.88
const EXIT_DURATION_FAST = 0.3   // reduced-motion fade
const EXIT_EASE          = [0.22, 1, 0.36, 1]

export default function Preloader({ beginExit, onRevealComplete }) {
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

  // Gate: curtain lifts only when BOTH conditions are met.
  const fillDoneRef  = useRef(false)
  const beginExitRef = useRef(false)

  // Number mirror dedup refs.
  const lastPctRef   = useRef(-1)
  const lastLabelRef = useRef('')

  // Active WAAPI animation — read by the rAF mirror.
  const animRef = useRef(null)

  // Shared reveal check: called by both the fill-.finished path and the
  // beginExit effect; the dismissedRef guard ensures it fires exactly once.
  const checkReveal = useRef(() => {
    if (dismissedRef.current) return
    if (fillDoneRef.current && beginExitRef.current) {
      dismissedRef.current = true
      setDismissed(true)   // AnimatePresence plays the curtain sweep
    }
  })

  // ── Bar: single WAAPI 0→1 fill + ref-driven number mirror ────────────────
  useEffect(() => {
    const fillEl = fillRef.current
    if (!fillEl) return undefined

    const duration = reducedRef.current ? FILL_DURATION_REDUCED : FILL_DURATION_MS
    const anim = fillEl.animate(
      [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
      { duration, easing: FILL_EASE, fill: 'forwards' },
    )
    animRef.current = anim

    // Mark fill done and check if curtain can lift.
    let cancelled = false
    anim.finished
      .then(() => {
        if (cancelled) return
        fillDoneRef.current = true
        checkReveal.current()
      })
      .catch(() => {})

    // rAF mirror: tracks the animation's eased progress to drive the percent
    // readout and status label without touching React state.
    let rafId
    const mirror = () => {
      if (dismissedRef.current) return
      const progress = animRef.current?.effect?.getComputedTiming().progress ?? 1

      const pct = Math.round(progress * 100)
      if (pct !== lastPctRef.current) {
        lastPctRef.current = pct
        if (pctRef.current)
          pctRef.current.textContent = `${String(pct).padStart(2, '0')}%`
        if (barRef.current)
          barRef.current.setAttribute('aria-valuenow', String(pct))
        const label = getStatusLabel(progress)
        if (label !== lastLabelRef.current) {
          lastLabelRef.current = label
          if (statusRef.current) statusRef.current.textContent = label
        }
      }
      rafId = requestAnimationFrame(mirror)
    }
    rafId = requestAnimationFrame(mirror)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      anim.cancel()
    }
  }, [])

  // ── Readiness gate: assets ready (or ceiling fired) ───────────────────────
  useEffect(() => {
    if (!beginExit || dismissedRef.current) return
    beginExitRef.current = true
    checkReveal.current()
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
    <AnimatePresence onExitComplete={onRevealComplete}>
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
