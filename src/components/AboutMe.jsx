import { useRef, useMemo } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import SectionHead from './SectionHead'
import { ABOUT_ME_STATEMENT, ABOUT_ME_HIGHLIGHT, ABOUT_ME_EMPHASES } from '../data/aboutMe'

const buildHighlights = () => [
  { phrase: ABOUT_ME_HIGHLIGHT, kind: 'accent' },
  ...ABOUT_ME_EMPHASES.map((phrase) => ({ phrase, kind: 'accent' })),
]

const splitWords = (chunk, kind) =>
  chunk.split(/\s+/).filter(Boolean).map((word) => ({ word, highlight: kind }))

const tokenize = (text, highlights) => {
  const tokens = []
  let cursor = 0
  while (cursor < text.length) {
    let nextHit = null
    for (const h of highlights) {
      const at = text.indexOf(h.phrase, cursor)
      if (at < 0) continue
      if (!nextHit || at < nextHit.at) nextHit = { at, ...h }
    }
    if (!nextHit) {
      tokens.push(...splitWords(text.slice(cursor), null))
      break
    }
    if (nextHit.at > cursor) {
      tokens.push(...splitWords(text.slice(cursor, nextHit.at), null))
    }
    tokens.push(...splitWords(nextHit.phrase, nextHit.kind))
    cursor = nextHit.at + nextHit.phrase.length
  }
  return tokens
}

export default function AboutMe() {
  const sectionRef = useRef(null)
  const prefersReducedMotion = useReducedMotion()
  const tokens = useMemo(() => tokenize(ABOUT_ME_STATEMENT, buildHighlights()), [])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'center center'],
  })

  return (
    <section id="about" className="about-me" ref={sectionRef}>
      <SectionHead idx="02" title="About" em="Me." right="// orchestration model" />
      <div className="shell">
        <p className="about-me-statement">
          {tokens.map((t, i) => {
            const variant =
              t.highlight === 'accent' ? 'highlight'
              : t.highlight === 'em'   ? 'emphasis'
              :                          'plain'
            return (
              <Word
                key={`${i}-${t.word}`}
                word={t.word}
                index={i}
                total={tokens.length}
                progress={scrollYProgress}
                reduced={prefersReducedMotion}
                variant={variant}
              />
            )
          })}
        </p>
      </div>
    </section>
  )
}

function Word({ word, index, total, progress, reduced, variant }) {
  const start = index / total
  const end = (index + 1) / total
  const opacity = useTransform(progress, [start, end], [0, 1])

  const wrapperClass = [
    'about-me-word',
    variant === 'highlight' && 'about-me-word--hl',
    variant === 'emphasis'  && 'about-me-word--em',
  ].filter(Boolean).join(' ')

  const content = variant === 'emphasis' ? <em>{word}</em> : word

  if (reduced) {
    return <span className={wrapperClass}>{content}</span>
  }

  return (
    <span className={wrapperClass}>
      <span className="about-me-word__ghost" aria-hidden="true">{content}</span>
      <motion.span className="about-me-word__fg" style={{ opacity }}>{content}</motion.span>
    </span>
  )
}
