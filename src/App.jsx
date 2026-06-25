import { useState, useRef, useCallback, useEffect, useLayoutEffect, lazy, Suspense } from 'react'
import Lenis        from 'lenis'
import { gsap }    from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
// eslint-disable-next-line no-unused-vars
import Nav          from './components/Nav'
import Hero         from './components/Hero'
import AboutMe      from './components/AboutMe'
import WhatIDo from './components/WhatIDo'
import Experience   from './components/Experience'
import Education    from './components/Education'
import Projects     from './components/Projects'
import Footer       from './components/Footer'
import AIDrawer     from './components/AIDrawer'
import AIOrb        from './components/AIOrb'
import Cursor       from './components/Cursor'
import Preloader    from './components/Preloader'
import { createPreloadTracker } from './utils/preloadAssets'
import { useHotkey } from './hooks/useHotkey'
import { Analytics } from '@vercel/analytics/react'

// Register ScrollTrigger once at module level.
gsap.registerPlugin(ScrollTrigger)

// Three.js is ~600 KB — lazy-load so it doesn't block initial paint
const HeroFluid = lazy(() => import('./components/HeroFluid'))

export default function App() {
  // Two-phase preloader handoff:
  //
  //   mountContent: true  → content tree mounts behind the still-opaque overlay
  //                         one rAF after the overlay paints. Heavy work (HeroFluid
  //                         WebGL compile, Spline scene fetch+eval) runs here under
  //                         the opaque cover during the ~1.5s cinematic floor.
  //
  //   revealed: true      → overlay sweeps up (translateY curtain) AND HERO_SEQUENCE
  //                         cascade starts. Fires only once both HeroFluid AND the
  //                         Spline robot are ready (or the ~6.5s safety ceiling).
  //                         This ensures nothing heavy runs concurrently with the wipe.
  const [mountContent, setMountContent] = useState(false)
  const [revealed,     setRevealed]     = useState(false)
  // heroStarted gates the Hero entrance cascade — set only after the curtain
  // sweep finishes (Preloader's onRevealComplete) so the Framer spike that
  // schedules the full HERO_SEQUENCE never contends with the visible wipe.
  const [heroStarted,  setHeroStarted]  = useState(false)

  // Stable ref to the tracker so signal methods are reachable in stable callbacks.
  const trackerRef = useRef(null)

  // Create the readiness tracker synchronously before the first paint (layout
  // effect), so the cinematic floor timer starts as early as possible.
  // setRevealed from useState is stable across renders — safe to close over.
  // Cleanup disposes the tracker (clears its hard-ceiling timer) on unmount.
  useLayoutEffect(() => {
    if (trackerRef.current) return undefined
    trackerRef.current = createPreloadTracker({
      onReady: () => setRevealed(true),
    })
    return () => {
      trackerRef.current?.dispose()
      trackerRef.current = null
    }
  }, [])

  // Mount content one rAF after the overlay paints — starts HeroFluid + Spline
  // loading under the opaque cover as early as possible.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMountContent(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Forward readiness signals to the tracker.
  const handleFluidReady  = useCallback(() => trackerRef.current?.markFluidReady(),  [])
  const handleSplineReady = useCallback(() => trackerRef.current?.markSplineReady(), [])

  // Fires once the curtain sweep fully completes — starts the Hero cascade on
  // a clean main thread, after all preloader visuals are gone.
  const handleRevealComplete = useCallback(() => setHeroStarted(true), [])

  const [aiOpen, setAiOpen] = useState(false)
  const [heroVisible,  setHeroVisible]  = useState(true)
  const [footerVisible, setFooterVisible] = useState(false)
  const [whatIdoVisible, setWhatIdoVisible] = useState(false)
  const toggleAI = useCallback(() => setAiOpen((o) => !o), [])
  const closeAI  = useCallback(() => setAiOpen(false), [])

  /* Viewport-normalized mouse coords for the shader attractor.
     Plain ref — mutated in place so useFrame reads it at 60 fps with no re-renders. */
  const globalMouseRef = useRef({ x: 0.5, y: 0.5, lastMove: 0 })
  const handleGlobalPointerMove = useCallback((e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return
    // Confine WebGL fluid glow to Hero (#top) and Footer (#contact).
    // Idle decay (~1.75s) in HeroFluid.jsx fades it out when this stops firing.
    if (!e.target.closest('#top, #contact')) return
    globalMouseRef.current.x = e.clientX / window.innerWidth
    globalMouseRef.current.y = e.clientY / window.innerHeight
    globalMouseRef.current.lastMove = performance.now()
  }, [])

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
  // nodes (#top, #contact, #what-i-do) actually exist. Previously the empty dep
  // array caused them to run at App mount when those ids weren't in the tree yet,
  // silently no-op'ing — heroVisible would stay true forever, HeroFluid's
  // frameloop would never pause mid-page.
  useEffect(() => {
    if (!mountContent) return undefined
    const hero = document.getElementById('top')

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

  // Footer visibility gates the HeroFluid render loop (with heroVisible below):
  // the fluid's glow is confined to #top/#contact, so mid-page frames are
  // wasted GPU work — frameloop pauses when neither section is on screen.
  useEffect(() => {
    if (!mountContent) return undefined
    const footer = document.getElementById('contact')

    if (!footer || !('IntersectionObserver' in window)) {
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0 },
    )

    observer.observe(footer)
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

  return (
    <>
      {/* Preloader — mounts immediately, exits when the reveal fires.
          beginExit: App sends true once both HeroFluid + Spline robot are ready
            (or the ~6.5s safety ceiling) → overlay translateY curtain plays,
            HERO_SEQUENCE cascade starts. Content mounts one rAF after first paint.
          Cursor stays outside this gate so CURSOR_X/Y update during preload. */}
      <Preloader beginExit={revealed} onRevealComplete={handleRevealComplete} />

      {/* Content tree — mounts one rAF after the overlay paints so the WebGL
          compile + Spline scene init run during the ~1.5s cinematic floor.
          Hero holds all elements at opacity:0 until started=true. */}
      {mountContent && (
        <>
          {/* Fixed background layers — painted in z-order: fluid (0) < noise (2) */}
          <Suspense fallback={null}>
            <HeroFluid
              mouseRef={globalMouseRef}
              active={heroVisible || footerVisible}
              onReady={handleFluidReady}
            />
          </Suspense>
          <div className="noise" />

          {/* Page content — onPointerMove feeds globalMouseRef for the shader attractor */}
          <div onPointerMove={handleGlobalPointerMove}>
            {/* <Nav /> */}
            <Hero         onOpenAI={() => setAiOpen(true)} started={heroStarted} onSplineLoaded={handleSplineReady} />
            <AboutMe />
            <WhatIDo />
            <Experience />
            <Education />
            <Projects />
            <Footer       onOpenAI={() => setAiOpen(true)} />
          </div>

          <AIOrb onClick={() => setAiOpen(true)} hidden={heroVisible || whatIdoVisible} />
          <AIDrawer open={aiOpen} onClose={closeAI} />
        </>
      )}

      {/* Cursor always mounted — provides CURSOR_X/Y for the preloader monolith */}
      <Cursor />

      {/* Vercel Analytics — unconditional, renders nothing visible */}
      <Analytics />
    </>
  )
}
