import { useCallback, useEffect, useRef, useState } from 'react'
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
import {
  HERO_HEADLINE_ROLE,
  HERO_HEADLINE_SPEC,
  HERO_MANIFESTO,
  HERO_FOCUS,
  HERO_CTA_TAGLINE,
  HERO_ROBOT_CTA,
  HERO_SOCIALS,
} from '../data/hero'

const ROLES = [
  'AUTOMATION WITH PURPOSE',
  'SHIPPING PRODUCTION SYSTEMS',
  'OPTIMIZING OPERATIONS',
  'HUMAN × AI WORKFLOWS',
  'ENGINEERING LEVERAGE',
]

const LAYOUT_TWEEN = { type: 'tween', duration: 0.35, ease: [0.22, 1, 0.36, 1] }

const EMAIL = 'sairithik8639@gmail.com'

const PASSTHROUGH = { hidden: {}, show: {} }

// Inline SVGs for meta-row social pills — all use currentColor so hover
// transitions (color: var(--accent)) propagate through fill/stroke automatically.
const SOCIAL_ICONS = {
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  resume: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="8"  y1="9"  x2="14" y2="9" />
    </svg>
  ),
}

function SocialIcon({ name }) {
  return SOCIAL_ICONS[name] ?? null
}

export default function Hero({ onOpenAI, started = false, onSplineLoaded }) {
  const splineRef = useRef(null)
  const robotHotspotRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [robotInView, setRobotInView] = useState(true)
  const copyTimerRef = useRef(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const el = robotHotspotRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setRobotInView(entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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
            style={{ pointerEvents: 'auto' }}
            onClick={handleEmailClick}
            aria-label="Copy email address"
          >
            {copied
              ? <span className="meta-copied-label">COPIED ✓</span>
              : <Typewriter text={EMAIL} speed={35} delay={0} caret />}
          </a>
        </motion.span>
        <div className="meta-social">
          {HERO_SOCIALS.map((s) => (
            <a
              key={s.label}
              className="meta-social-btn"
              href={s.href}
              target="_blank"
              rel="noreferrer"
                style={{ pointerEvents: 'auto' }}
              aria-label={s.label}
            >
              <SocialIcon name={s.icon} />
              <span className="meta-social-label">{s.label}</span>
            </a>
          ))}
        </div>
      </motion.div>

      {/*
        Phase 2b — name slide+fade, bonded with the new professional headline.
        The .hero-identity wrapper keeps the headline visually glued to the name
        (tight internal gap) so it reads as a title/subtitle, not a floating row.
        Each name word uses fadeUp independently; the headline is a single fadeUp unit.
      */}
      <motion.div
        className="hero-identity"
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

        {/* Phase 2c — professional identifier. Single fadeUp unit, no per-letter animation.
            Two-tone: lime "Full-Stack Engineer" dominant; muted gray for the rest. */}
        <motion.p className="hero-headline" variants={fade('headline')}>
          <span className="hero-headline-role">{HERO_HEADLINE_ROLE}</span>
          <span className="hero-headline-sep"> specializing in </span>
          <span className="hero-headline-ai">{HERO_HEADLINE_SPEC}</span>
        </motion.p>
      </motion.div>

      {/* Phase 3 — manifesto block; single .hero child wrapping body + focus line */}
      <motion.div className="manifesto-block" variants={PASSTHROUGH}>
        <motion.p className="manifesto-quote" variants={fade('manifesto')}>
          {HERO_MANIFESTO}
        </motion.p>
        <motion.p className="manifesto-focus" variants={fade('focus')}>
          {HERO_FOCUS.lead} <span className="serif">{HERO_FOCUS.emphasis}</span>.
        </motion.p>
      </motion.div>

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
              <span className="mf-label">Requests/Day Served</span>
            </li>
            <li className="mf-metric">
              <span className="mf-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <circle cx="9" cy="7" r="3" />
                  <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  <path d="M21 20c0-3.3-2.7-6-6-6" />
                </svg>
              </span>
              <span className="mf-num">25+</span>
              <span className="mf-label">Internal Users Supported</span>
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
            <li className="mf-metric">
              <span className="mf-icon">
                {/* Gemini mark — filled 4-pointed star, currentColor so it follows gold→lime hover */}
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none" aria-hidden="true">
                  <path d="M12 1.5Q15.5 9 22.5 12Q15.5 15 12 22.5Q8.5 15 1.5 12Q8.5 9 12 1.5Z" />
                </svg>
              </span>
              <span className="mf-num">10+</span>
              <span className="mf-label">Multi-Agent Workflows</span>
            </li>
          </motion.ul>

          {/* Phase 5 — CTA block */}
          <motion.div className="manifesto-cta" variants={fade('cta')}>
            <p className="manifesto-quote-sm">
              {HERO_CTA_TAGLINE.promptingLead} <span className="serif">{HERO_CTA_TAGLINE.syntax}</span>. {HERO_CTA_TAGLINE.architectingLead} <span className="serif">{HERO_CTA_TAGLINE.execution}</span>.
            </p>
            <button
              type="button"
              className="manifesto-cta-btn"
              onClick={handleDiscoverClick}
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
        ref={robotHotspotRef}
        type="button"
        className={`robot-agent-hotspot${robotInView ? '' : ' robot-agent-hotspot--hidden'}`}
        onClick={onOpenAI}
        onPointerMove={handleRobotPointerMove}
        aria-label="Open AI agent"
        variants={fade('robot')}
      >
        <span className="robot-agent-cta">{HERO_ROBOT_CTA}</span>
      </motion.button>
    </motion.section>
  )
}
