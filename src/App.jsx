import { useState, useCallback, useEffect, useTransition, lazy, Suspense } from 'react'
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
import { useScrollSetup } from './hooks/useScrollSetup'
import { scheduleIdle } from './utils/scheduleIdle'

// Safari-only waits — ordered so the sections commit lands before the
// ScrollTrigger measurement pass, and both clear the hero cascade's opening
// beats (HERO_SEQUENCE grid 0.10s → metrics 1.50s).
// ponytail: hand-tuned floors, not measurements. If the real-device gate still
// shows a freeze, raise these and/or route Hero's mountSpline through
// scheduleIdle too (Spline's WebGL shader compile is the next-largest task).
const SECTIONS_MOUNT_FALLBACK_MS = 600

// AIDrawer carries its own chat UI + Framer transitions and is only ever
// needed once the user opens it (Cmd+K or the orb) — deferred out of the
// initial bundle instead of shipping unconditionally with the rest of the page.
const AIDrawer = lazy(() => import('./components/AIDrawer'))
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

export default function App() {
  // Two-phase preloader handoff:
  //
  //   mountContent: true  → content tree mounts behind the still-opaque overlay
  //                         one rAF after the overlay paints. This only warms
  //                         Spline's network fetch (see Hero's preloadSplineRuntime
  //                         call) under the opaque cover during the ~1.5s cinematic
  //                         floor — the WebGL context creation + shader compile
  //                         (the actual heavy main-thread cost) does NOT happen
  //                         here. That, plus StarField's box-shadow raster, are
  //                         staged across separate rAFs after heroStarted instead
  //                         (see Hero.jsx's mountStars/mountSpline), so neither
  //                         lands in the same commit as the curtain-lift.
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
  // sectionsMounted gates the below-fold tree (WhatIDo/MyJourney/Projects/
  // Footer/AIOrb/ReturnToTop/ScrollProgressFrame) — mounted one idle tick
  // after reveal instead of in the same synchronous commit as Hero/AboutMe.
  // They're invisible under the overlay and off-screen at reveal time, so
  // splitting them out shrinks the one giant commit mountContent used to
  // trigger, keeping that work from landing on the preloader's visible frames.
  const [sectionsMounted, setSectionsMounted] = useState(false)
  // Lets the sectionsMounted commit below be time-sliced by React instead of
  // blocking a frame outright — it's still the biggest single commit left
  // (WhatIDo/MyJourney/Projects/Footer), so marking it non-urgent keeps it
  // from producing its own long task even after being moved post-reveal.
  const [, startSectionsTransition] = useTransition()

  // Mount content one rAF after the overlay paints — starts Spline loading
  // under the opaque cover as early as possible.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMountContent(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Fires once the curtain sweep fully completes — starts the Hero cascade on
  // a clean main thread, after all preloader visuals are gone. Below-fold
  // sections are scheduled a beat later via requestIdleCallback (falling
  // back to setTimeout where unsupported, e.g. Safari) so their mount
  // doesn't compete with the Hero cascade Framer just kicked off; a 500ms
  // timeout ceiling keeps them from being starved indefinitely on a busy tab.
  const handleRevealComplete = useCallback(() => {
    setHeroStarted(true)
    scheduleIdle(
      () => startSectionsTransition(() => setSectionsMounted(true)),
      { timeout: 500, fallbackDelay: SECTIONS_MOUNT_FALLBACK_MS },
    )
  }, [startSectionsTransition])

  const [aiOpen, setAiOpen] = useState(false)
  // Sticky "ever opened" flag — once true, AIDrawer stays mounted so its chat
  // history (internal state) survives subsequent closes/reopens, matching
  // the pre-lazy behavior where it was always mounted.
  const [hasOpenedAI, setHasOpenedAI] = useState(false)
  const [heroVisible,    setHeroVisible]    = useState(true)
  const [whatIdoVisible, setWhatIdoVisible] = useState(false)
  const [journeyVisible, setJourneyVisible] = useState(false)
  // AIOrb is phone-only disabled — performance + visual real-estate call, an
  // explicit exception to docs/mobile.md's "no content dropped" rule (Hero
  // and Footer CTAs still open AI chat there). Phone tier is <768px, same
  // boundary as every other tier check in the codebase.
  const [isPhoneTier, setIsPhoneTier] = useState(false)
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

  useEffect(() => {
    const phoneQuery = window.matchMedia('(max-width: 767px)')
    const apply = () => setIsPhoneTier(phoneQuery.matches)
    apply()
    phoneQuery.addEventListener('change', apply)
    return () => phoneQuery.removeEventListener('change', apply)
  }, [])

  useScrollSetup({ heroStarted, revealed, aiOpen })

  // IntersectionObservers depend on the DOM nodes they watch actually
  // existing — running before that silently no-ops (e.g. heroVisible would
  // stay true forever and AIOrb would never surface over the hero). The
  // hero-sentinel observer depends on mountContent (Hero mounts immediately);
  // the below-fold observers (#what-i-do, #journey) depend on sectionsMounted
  // since those sections now mount a beat later (see handleRevealComplete).
  useEffect(() => {
    if (!mountContent || !('IntersectionObserver' in window)) return undefined
    // heroVisible drives the WebGL pause (StarField/Spline app.stop()) AND gates
    // the MatrixText scramble loop.
    //
    // The hero is covered exactly when the Hero/AboutMe boundary passes above the
    // viewport top — so this tests the sentinel's POSITION, not its intersection.
    // `isIntersecting` was wrong on phone: .hero there is deliberately taller than
    // the viewport (height:auto — hero/shell.css), so the sentinel STARTS below
    // the fold and reported the hero hidden at scroll 0, freezing StarField and
    // MatrixText from first paint. boundingClientRect.top distinguishes the two
    // ways a target can be non-intersecting (below the fold vs scrolled past),
    // which the old isIntersecting read could not — same idiom as the
    // returnVisible observer below.
    //
    // Position works at every tier and under both motion preferences, so the
    // previous #top-vs-sentinel switch on prefers-reduced-motion is gone: when
    // the hero is pinned the sentinel still scrolls normally past the viewport
    // top, and when it isn't pinned the same boundary means the same thing.
    const sentinel = document.getElementById('hero-sentinel')
    if (!sentinel) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.boundingClientRect.top > 0),
      { threshold: 0 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [mountContent])

  // Writes --hero-pin-top, the negative sticky offset hero-about-stack.css's
  // pin needs on phone. There .hero is deliberately taller than one viewport
  // (height:auto — hero/shell.css) so its content isn't compressed; a plain
  // `top:0` sticky would lock it at the first scroll pixel and make
  // everything below the fold unreachable. The offset is the hero's overflow
  // past one viewport (~0 on desktop/tablet, where .hero already fits), so
  // the hero scrolls normally through all its content and only locks once
  // its bottom (the CTA) reaches the viewport bottom. Same
  // ResizeObserver-on-layout-change pattern as ScrollProgressFrame.jsx's
  // useViewportSize — never per-frame, never a scroll listener.
  useEffect(() => {
    if (!mountContent || !('ResizeObserver' in window)) return undefined
    const hero = document.getElementById('top')
    const stack = document.getElementById('hero-about-stack')
    if (!hero || !stack) return undefined

    const measure = () => {
      const offset = Math.min(0, document.documentElement.clientHeight - hero.offsetHeight)
      stack.style.setProperty('--hero-pin-top', `${offset}px`)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(hero)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [mountContent])

  useEffect(() => {
    if (!sectionsMounted) return undefined
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
  }, [sectionsMounted])

  // Show the Return-to-Hero marker once #what-i-do is reached and keep it
  // visible for the remainder of the page (Journey / Projects / Footer).
  // `entry.isIntersecting` covers "currently in view"; the `top < 0` arm
  // covers "scrolled past it" — together they implement "sticky visible once seen".
  // rootMargin trims the bottom so the marker appears only once the section
  // is meaningfully engaged, not the instant its top edge crosses the fold.
  useEffect(() => {
    if (!sectionsMounted) return undefined
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
  }, [sectionsMounted])

  // Hide AIOrb while #journey is on screen, mirroring the WhatIDo IO pattern.
  useEffect(() => {
    if (!sectionsMounted) return undefined
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
  }, [sectionsMounted])

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
                hero-about-stack.css) — the Hero pins under AboutMe at every
                tier (motion-gated, not width-gated). id is read by the
                --hero-pin-top measurement effect above. #hero-sentinel sits
                at the Hero/AboutMe boundary in normal (non-sticky) flow —
                NOT before the Hero — so it scrolls out of the viewport at
                exactly the scroll position where AboutMe's sticky-relative
                card has fully covered the pinned hero, giving the visibility
                observer below the right moment to pause StarField/Spline
                instead of #top (which stays geometrically in the viewport
                for as long as the hero is pinned). */}
            <div className="hero-about-stack" id="hero-about-stack">
              <Hero onOpenAI={openAI} started={heroStarted} visible={heroVisible} />
              {/* 1px, not 0px — a zero-area target is unreliable across
                  IntersectionObserver implementations. */}
              <div id="hero-sentinel" aria-hidden="true" style={{ height: 1 }} />
              <AboutMe />
            </div>
            {/* Below-fold sections mount one idle tick after reveal
                (sectionsMounted, set from handleRevealComplete) instead of in
                the same synchronous commit as Hero/AboutMe — they're
                off-screen and invisible under the overlay at reveal time, so
                splitting them out of mountContent's single big commit keeps
                that work off the preloader's visible frames. */}
            {sectionsMounted && (
              <>
                <WhatIDo />
                <MyJourney />
                <Projects />
                <Footer onOpenAI={openAI} />
              </>
            )}
          </div>

          {sectionsMounted && (
            <>
              {!isPhoneTier && (
                <AIOrb onClick={openAI} hidden={heroVisible || whatIdoVisible || journeyVisible} />
              )}
              <ReturnToTop hidden={!returnVisible} />
              <ScrollProgressFrame />
            </>
          )}
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
