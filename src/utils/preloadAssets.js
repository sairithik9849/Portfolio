// Readiness tracker for the preloader → hero reveal handoff.
//
// This no longer fakes a progress ramp. The visible bar is now a compositor-
// driven WAAPI animation in Preloader.jsx (immune to main-thread jank), so the
// tracker's only job is to decide *when the curtain may lift*:
//
//   reveal when  (min-display floor elapsed)  AND  fluidReady  AND  splineReady
//                — or the hard ceiling fires, so a blocked Spline domain or a
//                  WebGL fallback never traps the user behind the overlay.
//
// Loading the heavy chunks (HeroFluid WebGL, Spline scene) happens under the
// opaque overlay during the floor window — see App.jsx (content mounts one frame
// after the overlay paints). Because the bar is compositor-driven, the old
// ~92% main-thread eval freeze can no longer stall it.

// Cinematic floor — the bar always takes at least this long to fill, even if
// assets resolve instantly. Shared with Preloader's WAAPI ramp duration.
export const MIN_DISPLAY_MS = 1500

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
  const startMs   = performance.now()

  const finish = () => {
    if (finished || disposed) return
    finished = true
    onReady?.()
  }

  // Reveal only once both heavy subsystems are live AND the floor has elapsed.
  const tryFinish = () => {
    if (finished || disposed) return
    if (fluidReady && splineReady && performance.now() - startMs >= MIN_DISPLAY_MS) {
      finish()
    }
  }

  // Covers the assets-ready-before-floor case: re-check when the floor passes.
  const minTimer     = setTimeout(tryFinish, MIN_DISPLAY_MS)
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
      clearTimeout(minTimer)
      clearTimeout(ceilingTimer)
    },
  }
}
