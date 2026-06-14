import { useCallback, useRef, useState } from 'react'
import { motion, useMotionValue, useReducedMotion } from 'framer-motion'
import {
  HERO_PARENT,
  HERO_SEQUENCE,
  HERO_SEQUENCE_INSTANT,
  fadeUp,
} from '../animations/variants'
import Terminal from './Terminal'
import HeroLetter from './HeroLetter'
import SplineScene from './SplineScene'
import InfiniteGrid from './InfiniteGrid'
import MatrixText from './MatrixText'
import TextScramble from './TextScramble'
import Typewriter from './Typewriter'
import { scrollToId } from '../utils/scrollTo'

const ROLES = [
  'FULL-STACK DEVELOPER',
  'M.S. COMPUTER SCIENCE',
  'SYSTEMS ADMINISTRATOR',
  'DATABASE INTERNALS',
  'SOFTWARE ENGINEER',
  'HIGH-THROUGHPUT SYSTEMS',
]

const LAYOUT_TWEEN = { type: 'tween', duration: 0.35, ease: [0.22, 1, 0.36, 1] }

const EMAIL = 'sairithik8639@gmail.com'

const PASSTHROUGH = { hidden: {}, show: {} }

export default function Hero({ onOpenAI, started = false, onSplineLoaded }) {
  const splineRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef(null)
  const prefersReducedMotion = useReducedMotion()

  const handleEmailClick = useCallback((e) => {
    e.preventDefault()
    navigator.clipboard.writeText(EMAIL).catch(() => {})
    setCopied(true)
    clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }, [])

  const mouseX   = useMotionValue(0.5)
  const mouseY   = useMotionValue(0.5)

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

  const handleDiscoverClick = useCallback(() => {
    scrollToId('about')
  }, [])

  const handleRobotPointerMove = useCallback((e) => {
    if (e.pointerType !== 'mouse') return

    const x = Math.min(e.clientX + 18, window.innerWidth - 230)
    const y = Math.min(Math.max(e.clientY - 14, 18), window.innerHeight - 48)

    e.currentTarget.style.setProperty('--agent-cta-x', `${Math.max(18, x)}px`)
    e.currentTarget.style.setProperty('--agent-cta-y', `${y}px`)
  }, [])

  // Active timing table — all zeros when user prefers reduced motion.
  const T = prefersReducedMotion ? HERO_SEQUENCE_INSTANT : HERO_SEQUENCE
  const dur = prefersReducedMotion ? 0 : undefined

  // Builds a fadeUp variant with the correct delay and optional duration override.
  const fade = (key, duration) => fadeUp(T[key], dur ?? duration ?? 0.9)

  // Per-word slide delays — first name at T.name, last name 120 ms after.
  const firstNameDelay = T.name
  const lastNameDelay  = T.name + (prefersReducedMotion ? 0 : 0.12)

  return (
    <motion.section
      className="hero shell"
      id="top"
      {...HERO_PARENT}
      animate={started ? 'show' : 'hidden'}
      onPointerMove={handlePointerMove}
      style={{ position: 'relative' }}
    >
      {/* Phase 1 — InfiniteGrid fades in; wrapper uses variants so it holds
           hidden until the parent `started` gate opens (same as all other phases).
           direct initial/animate was bypassing the parent animate state. */}
      <motion.div
        variants={{
          hidden: { opacity: 0 },
          show:   { opacity: 1, transition: { delay: T.grid, duration: dur ?? 0.7, ease: 'easeOut' } },
        }}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      >
        <InfiniteGrid />
      </motion.div>

      {/* Full-cover 3D layer — absolutely fills the hero, below text z-index */}
      <div className="hero-spline" ref={splineRef}>
        <SplineScene
          scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
          className="spline-canvas"
          onLoaded={onSplineLoaded}
        />
      </div>

      {/* Phase 2a — meta-row fades alongside the name cascade */}
      <motion.div
        className="meta-row"
        style={{ position: 'relative', zIndex: 2, pointerEvents: 'none' }}
        variants={fade('meta')}
      >
        <motion.span layout transition={LAYOUT_TWEEN}>
          <span className="role-bracket role-bracket--left" aria-hidden="true">[</span>
          <MatrixText phrases={ROLES} scrambleDuration={1400} holdDuration={3000} delay={0} />
          <span className="role-bracket role-bracket--right" aria-hidden="true">]</span>
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
              : <Typewriter text={EMAIL} speed={35} delay={0} caret />}
          </a>
        </motion.span>
      </motion.div>

      {/*
        Phase 2b — name slide+fade.
        Each word is a single motion.span using fadeUp — SAIRITHIK at T.name,
        KOMURAVELLY at T.name+0.12s. Individual HeroLetter spans carry only
        whileHover (no entrance variant); the wrapper owns the entrance.
      */}
      <motion.div
        style={{ position: 'relative', zIndex: 2 }}
        variants={PASSTHROUGH}
      >
        <motion.h1 variants={PASSTHROUGH}>
          <motion.span className="hero-name-line" variants={fadeUp(firstNameDelay, dur ?? 0.7)}>
            {'SAIRITHIK'.split('').map((c, i) => <HeroLetter key={`s${i}`} char={c} />)}
          </motion.span>
          <br />
          <motion.span className="hero-name-line" variants={fadeUp(lastNameDelay, dur ?? 0.7)}>
            {'KOMURA'.split('').map((c, i) => <HeroLetter key={`k${i}`} char={c} className="char--last" />)}
            {'VELLY'.split('').map((c, i) => <HeroLetter key={`v${i}`} char={c} className="char--last" />)}
            <span className="hero-dot">.</span>
          </motion.span>
        </motion.h1>
      </motion.div>

      {/* Phase 3 — manifesto quote; direct .hero child so space-between centers it between H1 and the metrics row */}
      <motion.p className="manifesto-quote" variants={fade('manifesto')}>
        I'll skip the standard pitch about having the best 'if statements' in the business, no one hangs code on a fridge. Instead, I focus on what <span className="serif" style={{ color: 'var(--accent-2)', fontStyle: 'italic' }}>actually matters</span>: turning complex infrastructure bottlenecks into elegant, high-throughput solutions. From bare-metal system administration to silky-smooth React frontends, I build software that <span className="serif" style={{ color: 'var(--accent-2)', fontStyle: 'italic' }}>performs</span>. Let's build something awesome.
      </motion.p>

      <motion.div className="hero-bottom-row" variants={PASSTHROUGH}>
        <motion.div className="hero-manifesto" variants={PASSTHROUGH}>
          {/* Phase 4 — three metric cards together (no per-li stagger) */}
          <motion.ul className="manifesto-metrics" variants={fade('metrics')}>
            <li className="mf-metric">
              <span className="mf-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="2" y="3" width="20" height="5" rx="1" />
                  <rect x="2" y="10" width="20" height="5" rx="1" />
                  <circle cx="18" cy="5.5" r="1" fill="currentColor" stroke="none" />
                  <circle cx="18" cy="12.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span className="mf-num">10M+</span>
              <span className="mf-label">Daily API Requests Scaled</span>
            </li>
            <li className="mf-metric">
              <span className="mf-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <polyline points="4 9 9 12 4 15" />
                  <line x1="12" y1="15" x2="20" y2="15" />
                </svg>
              </span>
              <span className="mf-num">50+</span>
              <span className="mf-label">Physical Systems Automated</span>
            </li>
            <li className="mf-metric">
              <span className="mf-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <polygon points="12 3 22 9 12 15 2 9" />
                  <path d="M6 11v5c0 2 3 3 6 3s6-1 6-3v-5" />
                </svg>
              </span>
              <span className="mf-num">4.0<span className="mf-num-unit">GPA</span></span>
              <span className="mf-label">MS in Computer Science</span>
            </li>
          </motion.ul>

          {/* Phase 5 — CTA block */}
          <motion.div className="manifesto-cta" variants={fade('cta')}>
            <p className="manifesto-quote-sm">
              Prompting is <span className="serif">syntax</span>. Architecting is <span className="serif">execution</span>.
            </p>
            <button
              type="button"
              className="manifesto-cta-btn"
              onClick={handleDiscoverClick}
              data-cursor="hover"
            >
              <TextScramble text="Discover Me" />
            </button>
          </motion.div>
        </motion.div>

        {/* Phase 6 — terminal frame fades in; content types inside */}
        <motion.div className="sub" variants={fade('terminal', 0.45)}>
          <Terminal />
        </motion.div>
      </motion.div>

      {/* Phase 8 — robot hotspot (last) */}
      <motion.button
        type="button"
        className="robot-agent-hotspot"
        onClick={onOpenAI}
        onPointerMove={handleRobotPointerMove}
        aria-label="Open AI agent"
        data-cursor="hover"
        variants={fade('robot')}
      >
        <span className="robot-agent-cta">Click Mouse 1 to Chat</span>
      </motion.button>
    </motion.section>
  )
}
