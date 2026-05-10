import { useRef, useCallback, lazy, Suspense } from 'react'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { HERO_PARENT, HERO_CHILD, HERO_CHILD_FADE } from '../animations/variants'
import Terminal from './Terminal'
import AIOrb from './AIOrb'
import HeroLetter from './HeroLetter'

// Three.js is ~600 KB — lazy-load it so it doesn't block the initial paint
const HeroFluid = lazy(() => import('./HeroFluid'))

export default function Hero({ onOpenAI }) {
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' · ')

  /*
    Two separate mouse consumers, one ref each:
    - mouseRef   → plain object, mutated in place, read by Three.js useFrame
                   (no React re-renders — stays at 60 fps)
    - mouseX/Y   → Framer MotionValues for h1 spring parallax
  */
  const mouseRef = useRef({ x: 0.5, y: 0.5 })
  const mouseX   = useMotionValue(0.5)
  const mouseY   = useMotionValue(0.5)
  const hX = useSpring(useTransform(mouseX, [0, 1], [-10, 10]), { stiffness: 60, damping: 18 })
  const hY = useSpring(useTransform(mouseY, [0, 1], [ -4,  4]), { stiffness: 60, damping: 18 })

  const handleMouseMove = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top)  / rect.height
      mouseRef.current = { x, y }   // Three.js reads this — zero allocations
      mouseX.set(x)                  // Framer Motion reads this
      mouseY.set(y)
    },
    [mouseX, mouseY],
  )

  return (
    <motion.section
      className="hero shell"
      id="top"
      {...HERO_PARENT}
      onMouseMove={handleMouseMove}
      style={{ position: 'relative' }}
    >
      {/*
        HeroFluid is first in the DOM → painted beneath every sibling.
        position:absolute + inset:0 + zIndex:0 keep it in the background.
        pointer-events:none (set inside HeroFluid) means text/orb stay interactive.
      */}
      <Suspense fallback={null}>
        <HeroFluid mouseRef={mouseRef} />
      </Suspense>

      <motion.div className="meta-row" style={{ position: 'relative', zIndex: 1 }} {...HERO_CHILD_FADE}>
        <span>[ N — 40°44′34″N · 074°01′41″W / HOBOKEN, NJ ]</span>
        <span>SYS.LOG · {timestamp}</span>
        <span>v.2026.05 / build 0049</span>
      </motion.div>

      {/*
        Entrance wrapper (HERO_CHILD spring) → inner motion.h1 carries
        MotionValue x/y for parallax. Separated so springs don't conflict.
      */}
      <motion.div style={{ position: 'relative', zIndex: 1 }} {...HERO_CHILD}>
        <motion.h1 style={{ x: hX, y: hY }}>
          {'SAIRITHIK'.split('').map((c, i) => <HeroLetter key={`s${i}`} char={c} />)}
          <br />
          {'KOMURA'.split('').map((c, i) => <HeroLetter key={`k${i}`} char={c} />)}
          <span className="u">
            {'VELLY'.split('').map((c, i) => <HeroLetter key={`v${i}`} char={c} />)}
          </span>
          <span className="it">.</span>
        </motion.h1>
      </motion.div>

      <motion.div className="sub" style={{ position: 'relative', zIndex: 1 }} {...HERO_CHILD}>
        <p>
          <span className="tag">{'{ Software Engineer & System Administrator }'}</span>
          <br /><br />
          I build at the seam between low-level systems and modern interface — query
          compilers, real-time data planes, full-stack platforms with the AI
          surface to make them legible. Currently engineering scaled API
          infrastructure handling 10M+ daily transactions.
        </p>
        <Terminal />
      </motion.div>

      <AIOrb onClick={onOpenAI} />
    </motion.section>
  )
}
