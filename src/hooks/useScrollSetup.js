import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { scheduleIdle, cancelScheduledIdle } from '../utils/scheduleIdle'

const LENIS_INIT_FALLBACK_MS = 1000

// Register ScrollTrigger once at module level.
gsap.registerPlugin(ScrollTrigger)

export function useScrollSetup({ heroStarted, revealed, aiOpen }) {
  // ---- Site-wide momentum scroll (minhpham.design-style feel) ----
  // Lenis lerps window.scrollTop toward wheel target; Framer Motion's useScroll
  // reads native scrollTop transparently, so AboutMe's word reveal benefits.
  //
  // Lenis and GSAP ScrollTrigger share ONE clock: gsap.ticker drives lenis.raf,
  // and Lenis fires lenis.on('scroll', ScrollTrigger.update) so ScrollTrigger
  // always reads a Lenis-smoothed scroll position. This prevents the double-rAF
  // jitter that would occur if both ran their own requestAnimationFrame loops.
  //
  // Gated on heroStarted (post-reveal) rather than mount: native scroll is
  // locked until reveal anyway (see the overflow effect below), so there's
  // nothing for Lenis to smooth yet, and ScrollTrigger's initial measurement
  // pass is a forced-layout cost that has no reason to compete with the
  // preloader's still-visible cube animation for the main thread.
  //
  // The actual instantiation is idle-deferred rather than synchronous on
  // heroStarted: that flag flips in the SAME commit as the curtain-lift and
  // the Hero cascade kicking off, and ScrollTrigger's initial measurement is
  // a forced-layout pass — running it there piles onto the first-load reveal
  // freeze. Native scroll is locked until reveal and the cascade runs for
  // ~2.8s, so smooth-scroll going live a beat later (idle tick, 500ms
  // ceiling) has no perceptible UX cost. Mirrors the same schedule pattern
  // used for sectionsMounted below.
  useEffect(() => {
    if (!heroStarted) return undefined
    if (typeof window === 'undefined') return undefined

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return undefined

    let lenis = null
    let tickerFn = null

    const setUpLenis = () => {
      lenis = new Lenis({
        duration: 1.6,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      })
      window.__lenis = lenis

      // Wire Lenis → ScrollTrigger: every Lenis scroll event updates ST's
      // internal scroll position (keeps pin math and scrub in sync).
      lenis.on('scroll', ScrollTrigger.update)

      // gsap.ticker is now the sole rAF driver for Lenis.
      // gsap.ticker time is in seconds; lenis.raf expects milliseconds.
      // lagSmoothing(0) prevents GSAP from skipping frames after a tab blur.
      tickerFn = (time) => lenis.raf(time * 1000)
      gsap.ticker.add(tickerFn)
      gsap.ticker.lagSmoothing(0)
    }

    const idleId = scheduleIdle(setUpLenis, { timeout: 500, fallbackDelay: LENIS_INIT_FALLBACK_MS })

    // ── cleanup is ADDITIVE — ticker/off lines join the existing teardown ──
    // lenis.destroy() and delete window.__lenis MUST stay to prevent
    // leaking the Lenis instance and leaving a dangling global. Also cancels
    // the idle schedule itself, in case the component unmounts before it fires.
    return () => {
      cancelScheduledIdle(idleId)
      if (!lenis) return
      gsap.ticker.remove(tickerFn)
      lenis.off('scroll', ScrollTrigger.update)
      lenis.destroy()
      delete window.__lenis
    }
  }, [heroStarted])

  // Lock native scroll until the reveal fires so no wheel input leaks to the
  // page during warm-up (content is mounted but hidden under the overlay).
  useEffect(() => {
    document.body.style.overflow = revealed ? '' : 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [revealed])

  // Pause Lenis while the AI drawer is open so wheel events don't leak to the page.
  useEffect(() => {
    if (!window.__lenis) return
    if (aiOpen) window.__lenis.stop()
    else window.__lenis.start()
  }, [aiOpen])
}
