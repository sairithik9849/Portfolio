// Preloader orchestrator: tracks assets, drives the HUD, and sequences the
// two-phase handoff to Hero:
//
//   done → mount-delay pulse (420ms)
//     → onMount():  App mounts content under the opaque overlay;
//                   HeroFluid WebGL can compile while the overlay is still up
//     → beginExit:  App sends true once HeroFluid fires its first frame
//                   (or READY_CAP_MS safety cap fires) → overlay wipe plays

import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import BoxLoader from './preloader/BoxLoader.jsx'
import { createPreloadTracker } from '../utils/preloadAssets.js'
import { PRELOADER_NAME, getStatusLabel } from '../data/preloader.js'

// Beat 1: brief hold after assets load — lets the counter show 100 before
// mounting Hero under the still-opaque overlay (ms).
const MOUNT_DELAY_MS      = 420
const MOUNT_DELAY_REDUCED = 60   // reduced-motion: skip the cinematic pause
// Beat 2 exit animation durations (s).
const EXIT_DURATION      = 0.88
const EXIT_DURATION_FAST = 0.3   // reduced-motion fade
const EXIT_EASE          = [0.22, 1, 0.36, 1]

export default function Preloader({ onMount, beginExit }) {
  const reduced    = !!useReducedMotion()
  const reducedRef = useRef(reduced)

  // Stable ref for the mount callback — avoids re-creating the tracker
  // if the parent re-renders with a new function identity.
  const onMountRef = useRef(onMount)

  // Sync mutable refs after every render (layout effect fires before paint).
  useLayoutEffect(() => {
    reducedRef.current = reduced
    onMountRef.current = onMount
  })

  const [displayedPercent, setDisplayedPercent] = useState(0)
  const [statusLabel,      setStatusLabel]      = useState('INITIALIZING')
  const [dismissed,        setDismissed]        = useState(false)

  const targetRef    = useRef(0)
  const displayedRef = useRef(0)   // lerp accumulator — updated each rAF tick
  // exitingRef: drives the lerp snap to 1 once assets finish loading.
  // Not React state — only the lerp loop reads it, no re-render needed.
  const exitingRef   = useRef(false)
  const dismissedRef = useRef(false)

  // ── Asset tracking ────────────────────────────────────────────────────
  useEffect(() => {
    const tracker = createPreloadTracker()

    const unsub = tracker.subscribe(({ target, done }) => {
      targetRef.current = target

      if (done && !exitingRef.current) {
        exitingRef.current = true

        // Brief hold: lets the HUD read 100/READY, then mounts Hero + HeroFluid
        // under the still-opaque overlay. No WebGL in the preloader overlay
        // anymore, so the GPU is already free for HeroFluid's shader compile.
        // The overlay wipe fires later via the beginExit prop (from App).
        const delay = reducedRef.current ? MOUNT_DELAY_REDUCED : MOUNT_DELAY_MS
        setTimeout(() => {
          onMountRef.current()   // App mounts Hero + HeroFluid under cover
        }, delay)
      }
    })

    return () => {
      unsub()
      tracker.dispose()
    }
  }, []) // intentionally empty — all deps accessed through refs

  // ── Trigger overlay exit when App signals readiness ───────────────────
  // App passes beginExit=true once HeroFluid's first frame fires (or the
  // READY_CAP_MS safety timeout fires). At that point the scene is live
  // behind the overlay and the clip-path wipe can reveal it cleanly.
  useEffect(() => {
    if (beginExit && !dismissedRef.current) {
      dismissedRef.current = true
      setDismissed(true)   // AnimatePresence plays the exit variant
    }
  }, [beginExit])

  // ── Smooth progress counter (rAF lerp, updates state on integer ticks) ─
  // When exitingRef is true the target snaps to 1 so the HUD reads 100/READY.
  useEffect(() => {
    let rafId

    const tick = () => {
      if (dismissedRef.current) return   // stop once dismissed

      // Snap target to 1 once the exit begins so the HUD reads 100 / READY.
      const target = exitingRef.current ? 1 : targetRef.current
      const curr   = displayedRef.current
      const next   = curr + (target - curr) * 0.07   // lerp toward target
      displayedRef.current = next

      // Only trigger a React render when the displayed integer changes.
      const prevInt = Math.floor(curr * 100)
      const nextInt = Math.floor(next * 100)
      if (nextInt !== prevInt) {
        setDisplayedPercent(nextInt)
        setStatusLabel(getStatusLabel(next))
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // ── Motion props — conditional on reduced-motion preference ───────────
  const motionProps = reduced
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit:    { opacity: 0, transition: { duration: EXIT_DURATION_FAST } },
      }
    : {
        initial: { clipPath: 'inset(0% 0 0% 0)' },
        animate: { clipPath: 'inset(0% 0 0% 0)' },
        exit:    {
          clipPath:   'inset(100% 0 0% 0)',
          transition: { duration: EXIT_DURATION, ease: EXIT_EASE },
        },
      }

  // Pad to two digits: "7%" → "07%"
  const pctLabel = `${String(displayedPercent).padStart(2, '0')}%`

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
              {statusLabel}
              <span className="preloader-cur" aria-hidden="true" />
            </p>
            <span className="preloader-pct" aria-hidden="true">{pctLabel}</span>
          </div>

          {/* Full-viewport-width progress line — bottom of screen */}
          <div
            className="preloader-line"
            role="progressbar"
            aria-valuenow={displayedPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Loading portfolio"
          >
            <div
              className="preloader-line-fill"
              style={{ width: `${displayedPercent}%` }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
