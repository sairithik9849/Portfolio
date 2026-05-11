import { useState, useRef, useCallback, lazy, Suspense } from 'react'
import Nav          from './components/Nav'
import Hero         from './components/Hero'
import Metrics      from './components/Metrics'
import AgentSection from './components/AgentSection'
import Experience   from './components/Experience'
import Education    from './components/Education'
import Projects     from './components/Projects'
import Footer       from './components/Footer'
import AIDrawer     from './components/AIDrawer'
import Cursor       from './components/Cursor'
import { useHotkey } from './hooks/useHotkey'

// Three.js is ~600 KB — lazy-load so it doesn't block initial paint
const HeroFluid = lazy(() => import('./components/HeroFluid'))

export default function App() {
  const [aiOpen, setAiOpen] = useState(false)
  const toggleAI = useCallback(() => setAiOpen((o) => !o), [])
  const closeAI  = useCallback(() => setAiOpen(false), [])

  /* Viewport-normalized mouse coords for the shader attractor.
     Plain ref — mutated in place so useFrame reads it at 60 fps with no re-renders. */
  const globalMouseRef = useRef({ x: 0.5, y: 0.5 })
  const handleGlobalPointerMove = useCallback((e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return
    globalMouseRef.current.x = e.clientX / window.innerWidth
    globalMouseRef.current.y = e.clientY / window.innerHeight
  }, [])

  useHotkey('cmd+k', toggleAI)

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
        <Metrics />
        <AgentSection onOpenAI={() => setAiOpen(true)} />
        <Experience />
        <Education />
        <Projects />
        <Footer       onOpenAI={() => setAiOpen(true)} />
      </div>

      <AIDrawer open={aiOpen} onClose={closeAI} />
      <Cursor />
    </>
  )
}
