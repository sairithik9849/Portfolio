import { useRef, useMemo } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import SectionHead from './SectionHead'
import { ABOUT_ME_STATEMENT, ABOUT_ME_HIGHLIGHT, ABOUT_ME_EMPHASES } from '../data/aboutMe'

const REVEAL_START = 0.10
const REVEAL_SPAN  = 0.28
const PER_WORD_DUR = 0.08
const DIM_OPACITY  = 0.18

// Raw hex required: useTransform cannot interpolate var() strings.
// Keep in sync with --muted and --accent in global.css.
const EM_COLOR_DIM = '#6e6e66'
const EM_COLOR_ON  = '#e8c47a'  // --accent-2

const buildHighlights = () => [
  { phrase: ABOUT_ME_HIGHLIGHT, kind: 'accent' },
  ...ABOUT_ME_EMPHASES.map((phrase) => ({ phrase, kind: 'em' })),
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
    offset: ['start end', 'end start'],
  })

  return (
    <section id="about" className="about-me" ref={sectionRef}>
      <SectionHead idx="02" title="About" em="Me." right="// orchestration model" />
      <div className="shell">
        <p className="about-me-statement">
          {tokens.map((t, i) => {
            if (t.highlight === 'accent') {
              return <AccentWord key={`${i}-${t.word}`} word={t.word} />
            }
            if (t.highlight === 'em') {
              return (
                <EmphasisWord
                  key={`${i}-${t.word}`}
                  word={t.word}
                  index={i}
                  total={tokens.length}
                  progress={scrollYProgress}
                  reduced={prefersReducedMotion}
                />
              )
            }
            return (
              <Word
                key={`${i}-${t.word}`}
                word={t.word}
                index={i}
                total={tokens.length}
                progress={scrollYProgress}
                reduced={prefersReducedMotion}
              />
            )
          })}
        </p>
      </div>
    </section>
  )
}

function Word({ word, index, total, progress, reduced }) {
  const start = REVEAL_START + (index / Math.max(total - 1, 1)) * REVEAL_SPAN
  const end   = Math.min(start + PER_WORD_DUR, 0.95)
  const opacity = useTransform(progress, [start, end], [DIM_OPACITY, 1])

  if (reduced) {
    return <span className="about-me-word">{word}</span>
  }

  return (
    <motion.span className="about-me-word" style={{ opacity }}>
      {word}
    </motion.span>
  )
}

function AccentWord({ word }) {
  return <span className="about-me-word about-me-word--hl">{word}</span>
}

function EmphasisWord({ word, index, total, progress, reduced }) {
  const start = REVEAL_START + (index / Math.max(total - 1, 1)) * REVEAL_SPAN
  const end   = Math.min(start + PER_WORD_DUR, 0.95)
  const opacity = useTransform(progress, [start, end], [DIM_OPACITY, 1])
  const color   = useTransform(progress, [start, end], [EM_COLOR_DIM, EM_COLOR_ON])

  if (reduced) {
    return (
      <span className="about-me-word about-me-word--em" style={{ color: EM_COLOR_ON }}>
        <em>{word}</em>
      </span>
    )
  }

  return (
    <motion.span className="about-me-word about-me-word--em" style={{ opacity, color }}>
      <em>{word}</em>
    </motion.span>
  )
}
