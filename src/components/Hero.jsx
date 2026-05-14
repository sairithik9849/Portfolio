import { useCallback, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { HERO_PARENT, HERO_CHILD, HERO_CHILD_FADE } from '../animations/variants'
import Terminal from './Terminal'
import AIOrb from './AIOrb'
import HeroLetter from './HeroLetter'
import SplineScene from './SplineScene'
import InfiniteGrid from './InfiniteGrid'
import MatrixText from './MatrixText'
import Typewriter from './Typewriter'

const ROLES = [
  '[ FULL-STACK DEVELOPER ]',
  '[ M.S. COMPUTER SCIENCE ]',
  '[ SYSTEMS ADMINISTRATOR ]',
  '[ DATABASE INTERNALS ]',
  '[ SOFTWARE ENGINEER ]',
  '[ HIGH-THROUGHPUT SYSTEMS ]',
]

const LAYOUT_TWEEN = { type: 'tween', duration: 0.35, ease: [0.22, 1, 0.36, 1] }

const EMAIL = 'sairithik8639@gmail.com'

export default function Hero({ onOpenAI }) {
  const splineRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef(null)

  const handleEmailClick = useCallback((e) => {
    e.preventDefault()
    navigator.clipboard.writeText(EMAIL).catch(() => {})
    setCopied(true)
    clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }, [])

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
      <InfiniteGrid />

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
        <motion.span layout transition={LAYOUT_TWEEN}>
          <MatrixText phrases={ROLES} scrambleDuration={1400} holdDuration={3000} delay={300} />
        </motion.span>
        <motion.span layout transition={LAYOUT_TWEEN} className="meta-syslog">
          <a
            href={`mailto:${EMAIL}`}
            className={`meta-email-link${copied ? ' meta-email-copied' : ''}`}
            data-cursor="hover"
            style={{ pointerEvents: 'auto' }}
            onClick={handleEmailClick}
            aria-label="Copy email address"
          >
            {copied
              ? <span className="meta-copied-label">COPIED ✓</span>
              : <Typewriter text={EMAIL} speed={35} delay={900} caret />}
          </a>
        </motion.span>
        <motion.span layout transition={LAYOUT_TWEEN}>
          <Typewriter text="v.2026.05 / build 0069" speed={28} delay={1500} />
        </motion.span>
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
          {'VELLY'.split('').map((c, i) => <HeroLetter key={`v${i}`} char={c} />)}
          <span className="hero-dot">.</span>
        </motion.h1>
      </motion.div>

      <motion.div className="sub" style={{ position: 'relative', zIndex: 2 }} {...HERO_CHILD}>
        <Terminal />
      </motion.div>

      <AIOrb onClick={onOpenAI} />
    </motion.section>
  )
}
