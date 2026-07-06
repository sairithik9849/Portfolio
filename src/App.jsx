import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import Lenis        from 'lenis'
import { gsap }    from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Hero         from './components/Hero'
import AboutMe      from './components/AboutMe'
import WhatIDo from './components/WhatIDo'
import MyJourney from './components/journey/MyJourney'
import Projects     from './components/Projects'
import Footer       from './components/Footer'
import AIOrb        from './components/AIOrb'
import ReturnToTop  from './components/ReturnToTop'
import ScrollProgressFrame from './components/ScrollProgressFrame'
import Preloader    from './components/Preloader'
import { useHotkey } from './hooks/useHotkey'

// AIDrawer carries its own chat UI + Framer transitions and is only ever
// needed once the user opens it (Cmd+K or the orb) — deferred out of the
// initial bundle instead of shipping unconditionally with the rest of the page.
const AIDrawer = lazy(() => import('./components/AIDrawer'))
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

// Register ScrollTrigger once at module level.
gsap.registerPlugin(ScrollTrigger)

export default function App() {
  // Two-phase preloader handoff:
  //
  //   mountContent: true  → content tree mounts behind the still-opaque overlay
  //                         one rAF after the overlay paints. Heavy work (Spline
  //                         scene fetch+eval) runs here under the opaque cover
  //                         during the ~1.5s cinematic floor.
  //
  //   revealed: true      → overlay sweeps up (translateY curtain) AND HERO_SEQUENCE
  //                         cascade starts. Granted immediately (before first
  //                         paint) — Preloader's own bar-fill animation
  //                         (FILL_DURATION_MS) is the real minimum-display
  //                         floor, so the curtain no longer waits on the Spline
  //                         robot too. The robot fades in on its own once
  //                         loaded (SplineScene's independent opacity
  //                         transition), even if that lands after reveal.
  const [mountContent, setMountContent] = useState(false)
  // Reveal permission is granted from the first render — Preloader's own
  // bar-fill animation (FILL_DURATION_MS) is the real minimum-display floor,
  // so there's nothing async left to gate this on.
  const [revealed] = useState(true)
  // heroStarted gates the Hero entrance cascade — set only after the curtain
  // sweep finishes (Preloader's onRevealComplete) so the Framer spike that
  // schedules the full HERO_SEQUENCE never contends with the visible wipe.
  const [heroStarted,  setHeroStarted]  = useState(false)

  // Mount content one rAF after the overlay paints — starts Spline loading
  // under the opaque cover as early as possible.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMountContent(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Fires once the curtain sweep fully completes — starts the Hero cascade on
  // a clean main thread, after all preloader visuals are gone.
  const handleRevealComplete = useCallback(() => setHeroStarted(true), [])

  const [aiOpen, setAiOpen] = useState(false)
  // Sticky "ever opened" flag — once true, AIDrawer stays mounted so its chat
  // history (internal state) survives subsequent closes/reopens, matching
  // the pre-lazy behavior where it was always mounted.
  const [hasOpenedAI, setHasOpenedAI] = useState(false)
  const [heroVisible,    setHeroVisible]    = useState(true)
  const [whatIdoVisible, setWhatIdoVisible] = useState(false)
  const [journeyVisible, setJourneyVisible] = useState(false)
  // True once the What I Do section has been reached and for the remainder of
  // the page — drives the Return-to-Hero floating marker visibility.
  const [returnVisible,  setReturnVisible]  = useState(false)
  const openAI = useCallback(() => {
    setAiOpen(true)
    setHasOpenedAI(true)
  }, [])
  const toggleAI = useCallback(() => {
    setAiOpen((o) => !o)
    setHasOpenedAI(true)
  }, [])
  const closeAI  = useCallback(() => setAiOpen(false), [])

  useHotkey('cmd+k', toggleAI)

  // ---- Site-wide momentum scroll (minhpham.design-style feel) ----
  // Lenis lerps window.scrollTop toward wheel target; Framer Motion's useScroll
  // reads native scrollTop transparently, so AboutMe's word reveal benefits.
  //
  // Lenis and GSAP ScrollTrigger share ONE clock: gsap.ticker drives lenis.raf,
  // and Lenis fires lenis.on('scroll', ScrollTrigger.update) so ScrollTrigger
  // always reads a Lenis-smoothed scroll position. This prevents the double-rAF
  // jitter that would occur if both ran their own requestAnimationFrame loops.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return undefined

    const lenis = new Lenis({
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
    const tickerFn = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(tickerFn)
    gsap.ticker.lagSmoothing(0)

    // ── cleanup is ADDITIVE — ticker/off lines join the existing teardown ──
    // lenis.destroy() and delete window.__lenis MUST stay to prevent
    // leaking the Lenis instance and leaving a dangling global.
    return () => {
      gsap.ticker.remove(tickerFn)
      lenis.off('scroll', ScrollTrigger.update)
      lenis.destroy()
      delete window.__lenis
    }
  }, [])

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

  // IntersectionObservers depend on mountContent so they re-run once the DOM
  // nodes (#top, #what-i-do, #journey) actually exist. Previously the empty dep
  // array caused them to run at App mount when those ids weren't in the tree yet,
  // silently no-op'ing — heroVisible would stay true forever and AIOrb would
  // never surface over the hero.
  useEffect(() => {
    if (!mountContent) return undefined
    // Watches #hero-sentinel (top of .hero-about-stack), not #top (the Hero
    // itself) — while the hero is sticky-pinned under AboutMe it stays
    // geometrically in the viewport, so an observer on #top would never
    // report false and the WebGL-pause optimization (StarField/Spline
    // app.stop()) would never fire. The sentinel leaves the viewport at the
    // same scroll position the pin visually resolves (AboutMe fully covers
    // the hero), so timing is unchanged from the pre-stack behavior.
    const hero = document.getElementById('hero-sentinel')

    if (!hero || !('IntersectionObserver' in window)) {
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0 },
    )

    observer.observe(hero)
    return () => observer.disconnect()
  }, [mountContent])

  useEffect(() => {
    if (!mountContent) return undefined
    const section = document.getElementById('what-i-do')

    if (!section || !('IntersectionObserver' in window)) {
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => setWhatIdoVisible(entry.isIntersecting),
      { threshold: 0 },
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [mountContent])

  // Show the Return-to-Hero marker once #what-i-do is reached and keep it
  // visible for the remainder of the page (Journey / Projects / Footer).
  // `entry.isIntersecting` covers "currently in view"; the `top < 0` arm
  // covers "scrolled past it" — together they implement "sticky visible once seen".
  // rootMargin trims the bottom so the marker appears only once the section
  // is meaningfully engaged, not the instant its top edge crosses the fold.
  useEffect(() => {
    if (!mountContent) return undefined
    const section = document.getElementById('what-i-do')

    if (!section || !('IntersectionObserver' in window)) {
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => setReturnVisible(
        entry.isIntersecting || entry.boundingClientRect.top < 0,
      ),
      { threshold: 0, rootMargin: '0px 0px -20% 0px' },
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [mountContent])

  // Hide AIOrb while #journey is on screen, mirroring the WhatIDo IO pattern.
  useEffect(() => {
    if (!mountContent) return undefined
    const section = document.getElementById('journey')

    if (!section || !('IntersectionObserver' in window)) {
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => setJourneyVisible(entry.isIntersecting),
      { threshold: 0 },
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [mountContent])

  return (
    <>
      {/* Preloader — mounts immediately, exits when the reveal fires.
          beginExit: granted from first render — Preloader's own bar-fill
            animation is the minimum-display floor, so the curtain lifts as
            soon as that finishes. Content mounts one rAF after first paint. */}
      <Preloader beginExit={revealed} onRevealComplete={handleRevealComplete} />

      {/* Content tree — mounts one rAF after the overlay paints so the
          Spline scene init runs during the ~1.5s cinematic floor.
          Hero holds all elements at opacity:0 until started=true. */}
      {mountContent && (
        <>
          {/* Fixed background layers — composited (position:fixed), not
              repainted (background-attachment:fixed) — see layout.css. */}
          <div className="bg-gradient" />
          <div className="noise" />

          <div>
            {/* hero-about-stack: CSS-only sticky-pin transition (see
                hero-about-stack.css) — the Hero pins under AboutMe on desktop.
                #hero-sentinel sits at the Hero/AboutMe boundary in normal
                (non-sticky) flow — NOT before the Hero — so it scrolls out of
                the viewport at exactly the scroll position where AboutMe's
                sticky-relative card has fully covered the pinned hero, giving
                the visibility observer below the right moment to pause
                StarField/Spline instead of #top (which stays geometrically
                in the viewport for as long as the hero is pinned). */}
            <div className="hero-about-stack">
              <Hero onOpenAI={openAI} started={heroStarted} visible={heroVisible} />
              {/* 1px, not 0px — a zero-area target is unreliable across
                  IntersectionObserver implementations. */}
              <div id="hero-sentinel" aria-hidden="true" style={{ height: 1 }} />
              <AboutMe />
            </div>
            <WhatIDo />
            <MyJourney />
            <Projects />
            <Footer       onOpenAI={openAI} />
          </div>

          <AIOrb onClick={openAI} hidden={heroVisible || whatIdoVisible || journeyVisible} />
          <ReturnToTop hidden={!returnVisible} />
          <ScrollProgressFrame />
          {/* Mounted only after the first open — its chat-history state then
              persists across subsequent closes/reopens like before lazy-loading. */}
          {hasOpenedAI && (
            <Suspense fallback={null}>
              <AIDrawer open={aiOpen} onClose={closeAI} />
            </Suspense>
          )}
        </>
      )}

      {/* Vercel Analytics + Speed Insights — unconditional, render nothing visible */}
      <Analytics />
      <SpeedInsights />
    </>
  )
}
