import { useCallback, useRef } from 'react'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { HERO_PARENT, HERO_CHILD, HERO_CHILD_FADE } from '../animations/variants'
import Terminal from './Terminal'
import AIOrb from './AIOrb'
import HeroLetter from './HeroLetter'
import SplineScene from './SplineScene'

export default function Hero({ onOpenAI }) {
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' · ')

  const splineRef = useRef(null)

  /* Framer MotionValues for h1 spring parallax — element-relative coords */
  const mouseX   = useMotionValue(0.5)
  const mouseY   = useMotionValue(0.5)
  const hX = useSpring(useTransform(mouseX, [0, 1], [-10, 10]), { stiffness: 60, damping: 18 })
  const hY = useSpring(useTransform(mouseY, [0, 1], [ -4,  4]), { stiffness: 60, damping: 18 })

  const handlePointerMove = useCallback(
    (e) => {
      if (e.pointerType !== 'mouse') return
      const rect = e.currentTarget.getBoundingClientRect()
      mouseX.set((e.clientX - rect.left) / rect.width)
      mouseY.set((e.clientY - rect.top)  / rect.height)

      /* Forward to the Spline canvas when the real target is NOT already inside
         the canvas container (e.g. mouse is over the H1 letters). This lets the
         robot track the cursor everywhere in the hero without blocking whileHover
         on the letter spans. bubbles:false prevents a dispatch feedback loop. */
      if (splineRef.current && !splineRef.current.contains(e.target)) {
        const canvas = splineRef.current.querySelector('canvas')
        if (canvas) {
          const opts = {
            clientX: e.clientX, clientY: e.clientY,
            screenX: e.screenX, screenY: e.screenY,
            bubbles: false, cancelable: false,
          }
          canvas.dispatchEvent(new PointerEvent('pointermove', { ...opts, pointerType: 'mouse' }))
          canvas.dispatchEvent(new MouseEvent('mousemove', opts))
        }
      }
    },
    [mouseX, mouseY],
  )

  return (
    <motion.section
      className="hero shell"
      id="top"
      {...HERO_PARENT}
      onPointerMove={handlePointerMove}
      style={{ position: 'relative' }}
    >
      {/* Full-cover 3D layer — absolutely fills the hero, below text z-index */}
      <div className="hero-spline" ref={splineRef}>
        <SplineScene
          scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
          className="spline-canvas"
        />
      </div>

      <motion.div
        className="meta-row"
        style={{ position: 'relative', zIndex: 2, pointerEvents: 'none' }}
        {...HERO_CHILD_FADE}
      >
        <span>[ N — 40°44′34″N · 074°01′41″W / HOBOKEN, NJ ]</span>
        <span>SYS.LOG · {timestamp}</span>
        <span>v.2026.05 / build 0049</span>
      </motion.div>

      {/*
        Entrance wrapper (HERO_CHILD spring) → inner motion.h1 carries
        MotionValue x/y for parallax. Separated so springs don't conflict.
      */}
      <motion.div style={{ position: 'relative', zIndex: 2 }} {...HERO_CHILD}>
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

      <motion.div className="sub" style={{ position: 'relative', zIndex: 2 }} {...HERO_CHILD}>
        <Terminal />
      </motion.div>

      <AIOrb onClick={onOpenAI} />
    </motion.section>
  )
}
