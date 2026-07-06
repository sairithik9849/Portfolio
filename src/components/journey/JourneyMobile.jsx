import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import MetaList from './MetaList'
import SkillChips from './SkillChips'
import { STAGGER_PARENT, STAGGER_CHILD } from '../../animations/variants'
import { parseDeckEmphasis } from '../../lib/journey/deckEmphasis'

/**
 * JourneyMobile — single-column timeline for narrow viewports (≤ 767px).
 *
 * A light typographic adaptation of the desktop scenes: chapter label, hero
 * quote, deck line, metadata, and skill chips — but no featured visuals
 * (the desktop scenes' bespoke SVG visuals are a desktop-only, avatar-
 * adjacent treatment; mobile has no avatar to play against, so the visuals
 * are dropped rather than degraded). Reveal is a lighter one-shot
 * `whileInView` stagger (reusing STAGGER_PARENT/STAGGER_CHILD) instead of
 * the desktop scroll-scrub, since a per-chapter scroll subscription isn't
 * worth it for a treatment this light.
 *
 * No sticky pinning, no avatar canvas — but the spine still draws with
 * scroll, same as the desktop JourneyTimeline (translated from the
 * 21st.dev Timeline component), just without the sticky-avatar relay.
 * Under reduced motion the spine renders fully-drawn and static.
 */
export default function JourneyMobile({ chapters }) {
  const trackRef = useRef(null)
  const prefersReducedMotion = useReducedMotion()
  const [lineHeight, setLineHeight] = useState(0)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => setLineHeight(el.getBoundingClientRect().height)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Page-scroll target scoped to the track itself — draws while the track
  // is roughly within the viewport, finishing as the last entry settles.
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset:  ['start 0.85', 'end 0.6'],
  })
  const fillHeight = useTransform(scrollYProgress, [0, 1], [0, lineHeight])

  return (
    <div className="journey-mobile" aria-label="Journey timeline">
      <header className="journey-header journey-mobile__header-row">
        <span className="journey-header__idx">04</span>
        <span className="journey-header__title">My <em>Evolution</em><span style={{ color: 'var(--muted)' }}>.</span></span>
      </header>

      <div className="journey-mobile__track" ref={trackRef}>
        {chapters.map((ch) => (
          <motion.article
            key={ch.id}
            className="journey-mobile__chapter"
            {...(prefersReducedMotion ? {} : STAGGER_PARENT)}
          >
            <span className="journey-mobile__dot" aria-hidden="true" />
            <motion.header
              className="journey-mobile__header"
              variants={prefersReducedMotion ? undefined : STAGGER_CHILD.variants}
            >
              <span className="journey-mobile__num kicker">{ch.year}</span>
              <span className="journey-mobile__nav-title kicker">{ch.label}</span>
            </motion.header>

            <motion.h2
              className="journey-mobile__quote"
              variants={prefersReducedMotion ? undefined : STAGGER_CHILD.variants}
            >
              {ch.quote.slice(0, -1).join(' ')}{' '}
              <span className="journey-quote-block__line--accent">
                {ch.quote[ch.quote.length - 1]}
              </span>
            </motion.h2>

            <motion.p
              className="journey-mobile__deck"
              variants={prefersReducedMotion ? undefined : STAGGER_CHILD.variants}
            >
              {parseDeckEmphasis(ch.deck).map((segment, i) => (
                segment.emphasis
                  ? <em key={i} className="journey-quote-block__deck-emphasis">{segment.text}</em>
                  : <span key={i}>{segment.text}</span>
              ))}
            </motion.p>

            <motion.div variants={prefersReducedMotion ? undefined : STAGGER_CHILD.variants}>
              <MetaList items={ch.metadata} reduced />
            </motion.div>

            <motion.div variants={prefersReducedMotion ? undefined : STAGGER_CHILD.variants}>
              <SkillChips skills={ch.skills} reduced={prefersReducedMotion} />
            </motion.div>
          </motion.article>
        ))}

        {prefersReducedMotion ? (
          <div className="journey-mobile__spine" style={{ height: lineHeight }} aria-hidden="true">
            <div className="journey-mobile__spine-track" />
            <div className="journey-mobile__spine-fill journey-mobile__spine-fill--static" />
          </div>
        ) : (
          <div className="journey-mobile__spine" style={{ height: lineHeight }} aria-hidden="true">
            <div className="journey-mobile__spine-track" />
            <motion.div className="journey-mobile__spine-fill" style={{ height: fillHeight }} />
          </div>
        )}
      </div>
    </div>
  )
}
