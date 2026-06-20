// Readiness tracker for the preloader → hero reveal handoff.
//
// Decides *when the curtain may lift*: once fluidReady AND splineReady are both
// true — or the hard ceiling fires so a blocked Spline host never traps the user.
//
// The visible fill bar is a compositor-driven WAAPI animation in Preloader.jsx
// (FILL_DURATION_MS), entirely independent of this tracker. The bar's duration
// is now the effective minimum-display floor, so the tracker no longer imposes
// a separate MIN_DISPLAY_MS timing check — it fires the moment both subsystems
// are ready.

// Safety ceiling — reveal regardless of readiness so the site is never
// permanently hidden (slow network, blocked Spline host, WebGL unavailable).
const HARD_CEILING_MS = 6500

// Creates a tracker. `onReady` fires exactly once when the reveal should begin.
//   markFluidReady() — HeroFluid rendered its first WebGL frame.
//   markSplineReady() — the Spline robot finished loading (or its own fallback).
//   dispose()        — clears timers (call on unmount).
export function createPreloadTracker({ onReady } = {}) {
  let fluidReady  = false
  let splineReady = false
  let finished    = false
  let disposed    = false

  const finish = () => {
    if (finished || disposed) return
    finished = true
    onReady?.()
  }

  // Reveal as soon as both heavy subsystems are live.
  const tryFinish = () => {
    if (finished || disposed) return
    if (fluidReady && splineReady) {
      finish()
    }
  }

  const ceilingTimer = setTimeout(finish, HARD_CEILING_MS)

  return {
    markFluidReady() {
      fluidReady = true
      tryFinish()
    },
    markSplineReady() {
      splineReady = true
      tryFinish()
    },
    dispose() {
      disposed = true
      clearTimeout(ceilingTimer)
    },
  }
}
