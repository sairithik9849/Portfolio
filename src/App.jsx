import { useState, useCallback } from 'react'
import Nav          from './components/Nav'
import Hero         from './components/Hero'
import Metrics      from './components/Metrics'
import AgentSection from './components/AgentSection'
import Experience   from './components/Experience'
import Education    from './components/Education'
import Projects     from './components/Projects'
import Footer       from './components/Footer'
import AIDrawer     from './components/AIDrawer'
import { useHotkey } from './hooks/useHotkey'

export default function App() {
  const [aiOpen, setAiOpen] = useState(false)
  const toggleAI = useCallback(() => setAiOpen((o) => !o), [])
  const closeAI  = useCallback(() => setAiOpen(false), [])

  useHotkey('cmd+k', toggleAI)

  return (
    <>
      <div className="grid-bg" />
      <div className="noise" />

      <Nav />
      <Hero         onOpenAI={() => setAiOpen(true)} />
      <Metrics />
      <AgentSection onOpenAI={() => setAiOpen(true)} />
      <Experience />
      <Education />
      <Projects />
      <Footer       onOpenAI={() => setAiOpen(true)} />

      <AIDrawer open={aiOpen} onClose={closeAI} />
    </>
  )
}
