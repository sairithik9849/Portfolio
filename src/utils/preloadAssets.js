// Asset tracking helper for the preloader.
// Drives a smooth time-based progress ramp over MIN_DISPLAY_MS so the counter
// never freezes mid-preload.
//
// The previous eager import() warm-signals for HeroFluid / Spline were the root
// cause of the ~92% main-thread eval stall: the 600 KB Three.js bundle eval
// blocked the JS thread at the exact moment the counter plateaued at 0.85.
// Those imports are removed. Heavy chunks now load under the frozen preloader
// overlay (GPU free) and the reveal fires only once HeroFluid's first frame
// is up — see App.jsx for the two-phase mount-under-cover → reveal handoff.

const MIN_DISPLAY_MS  = 2200   // cinematic always plays fully
const HARD_CEILING_MS = 7000   // never trap the user

// Progress ceiling for the ramp — the Preloader lerp will show ~88% right
// before done fires, then race to 100 when exiting snaps the lerp target to 1.
const RAMP_CEILING = 0.88

// Instant head-start when web fonts are ready so the counter isn't stuck at
// 0% if fonts resolve before the first interval tick.
const FONTS_BOOST = 0.08

// Interval between ramp ticks — 50ms is smooth enough for the 0.07 lerp.
const RAMP_TICK_MS = 50

// Returns an object with:
//   subscribe(fn) — calls fn({ target: 0–1, done: bool }) as the ramp advances;
//                   returns an unsubscribe function.
//   dispose()     — cancels timers (call on unmount).
export function createPreloadTracker() {
  let target   = 0
  let done     = false
  let disposed = false
  const listeners = new Set()
  const startMs   = performance.now()

  const emit = () => {
    if (disposed) return
    const snap = { target, done }
    for (const fn of listeners) fn(snap)
  }

  const finish = () => {
    if (done || disposed) return
    target = 1
    done   = true
    emit()
  }

  // Continuous ramp: advances target proportionally with elapsed time so the
  // displayed counter climbs smoothly instead of jumping in discrete signals.
  const tick = () => {
    if (done || disposed) return
    const elapsed    = performance.now() - startMs
    const rampTarget = Math.min(RAMP_CEILING, (elapsed / MIN_DISPLAY_MS) * RAMP_CEILING)
    if (rampTarget > target) {
      target = rampTarget
      emit()
    }
  }
  const intervalId = setInterval(tick, RAMP_TICK_MS)

  // ── signal 1: web fonts — instant head-start ───────────────────────────
  document.fonts.ready
    .then(() => {
      if (done || disposed) return
      if (FONTS_BOOST > target) {
        target = FONTS_BOOST
        emit()
      }
    })
    .catch(() => {})

  // ── signal 2: minimum display floor — declares done ────────────────────
  const minTimer = setTimeout(() => {
    clearInterval(intervalId)
    finish()
  }, MIN_DISPLAY_MS)

  // ── signal 3: hard ceiling — always finishes regardless ────────────────
  const ceilingTimer = setTimeout(() => {
    clearInterval(intervalId)
    finish()
  }, HARD_CEILING_MS)

  return {
    subscribe(fn) {
      listeners.add(fn)
      // Emit current state immediately so late subscribers sync up.
      fn({ target, done })
      return () => listeners.delete(fn)
    },
    dispose() {
      disposed = true
      clearTimeout(minTimer)
      clearTimeout(ceilingTimer)
      clearInterval(intervalId)
      listeners.clear()
    },
    get target() { return target },
    get done()   { return done   },
  }
}
