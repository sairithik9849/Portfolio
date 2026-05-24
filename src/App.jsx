import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react'
import Lenis        from 'lenis'
import Nav          from './components/Nav'
import Hero         from './components/Hero'
import AboutMe      from './components/AboutMe'
import About      from './components/About'
import Experience   from './components/Experience'
import Education    from './components/Education'
import Projects     from './components/Projects'
import Footer       from './components/Footer'
import AIDrawer     from './components/AIDrawer'
import AIOrb        from './components/AIOrb'
import Cursor       from './components/Cursor'
import { useHotkey } from './hooks/useHotkey'

// Three.js is ~600 KB — lazy-load so it doesn't block initial paint
const HeroFluid = lazy(() => import('./components/HeroFluid'))

export default function App() {
  const [aiOpen, setAiOpen] = useState(false)
  const [heroVisible, setHeroVisible] = useState(true)
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

    let rafId
    const tick = (time) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      delete window.__lenis
    }
  }, [])

  // Pause Lenis while the AI drawer is open so wheel events don't leak to the page.
  useEffect(() => {
    if (!window.__lenis) return
    if (aiOpen) window.__lenis.stop()
    else window.__lenis.start()
  }, [aiOpen])

  useEffect(() => {
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
  }, [])

  return (
    <>
      {/* Fixed background layers — painted in z-order: fluid (0) < noise (2) */}
      <Suspense fallback={null}>
        <HeroFluid mouseRef={globalMouseRef} />
      </Suspense>
      <div className="noise" />

      {/* Page content — onPointerMove feeds globalMouseRef for the shader attractor */}
      <div onPointerMove={handleGlobalPointerMove}>
        <Nav />
        <Hero         onOpenAI={() => setAiOpen(true)} />
        <AboutMe />
        <About />
        <Experience />
        <Education />
        <Projects />
        <Footer       onOpenAI={() => setAiOpen(true)} />
      </div>

      <AIOrb onClick={() => setAiOpen(true)} hidden={heroVisible} />
      <AIDrawer open={aiOpen} onClose={closeAI} />
      <Cursor />
    </>
  )
}
