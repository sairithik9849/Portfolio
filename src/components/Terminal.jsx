import { useState, useRef, useCallback, useMemo, Fragment } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { TERM_OUTPUT_PARENT, TERM_OUTPUT_LINE } from '../animations/variants'
import { PROMPT, WHOAMI, COMMANDS } from '../data/terminal'

// ─── Component-private animation constants ────────────────────────────────────
// Systems viz nodes and arrows use absolute delay offsets so they stagger
// within a single output block without needing a nested stagger parent.
// These are intentionally local — they are not shared across components.

const SYS_NODE_BASE_DELAY = 0.05
const SYS_NODE_STEP        = 0.09

const sysNodeTransition = (i, instant) => ({
  duration: instant ? 0 : 0.22,
  delay:    instant ? 0 : SYS_NODE_BASE_DELAY + i * SYS_NODE_STEP,
  ease:     'easeOut',
})

const sysArrowTransition = (i, instant) => ({
  duration: instant ? 0 : 0.15,
  delay:    instant ? 0 : SYS_NODE_BASE_DELAY + 0.04 + i * SYS_NODE_STEP,
  ease:     'easeOut',
})


// ─── Tone → class name ────────────────────────────────────────────────────────
const TONE_CLASS = {
  accent: 'tone-accent',
  gold:   'tone-gold',
  muted:  'tone-muted',
  strong: 'tone-strong',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SystemsViz({ nodes, instant }) {
  const nodeAnimate = { opacity: 1, x: 0 }
  const arrowAnimate = { opacity: 1 }

  return (
    <div className="sys-viz">
      {nodes.map((node, i) => (
        <Fragment key={node}>
          <motion.span
            className="sys-node"
            initial={instant ? false : { opacity: 0, x: -6 }}
            animate={nodeAnimate}
            transition={sysNodeTransition(i, instant)}
          >
            {node}
          </motion.span>
          {i < nodes.length - 1 && (
            <motion.span
              className="sys-arrow"
              aria-hidden="true"
              initial={instant ? false : { opacity: 0 }}
              animate={arrowAnimate}
              transition={sysArrowTransition(i, instant)}
            >
              →
            </motion.span>
          )}
        </Fragment>
      ))}
    </div>
  )
}

function WaveIcon() {
  return (
    <span className="wave" aria-hidden="true">
      <span /><span /><span />
    </span>
  )
}

// ─── Line renderer ─────────────────────────────────────────────────────────────
// Does NOT receive pronounce/isPlaying — the pron case is handled directly in
// JSX by the parent component so the linter can confirm ref access is event-only.

function renderLine(line, i, instant) {
  // Blank spacer
  if (line === '') {
    return <motion.div key={`blank-${i}`} className="term-blank" variants={TERM_OUTPUT_LINE} aria-hidden="true" />
  }

  // Plain string
  if (typeof line === 'string') {
    return (
      <motion.div key={i} className="term-line" variants={TERM_OUTPUT_LINE}>
        {line}
      </motion.div>
    )
  }

  // Single-toned line
  if (line.tone) {
    return (
      <motion.div key={i} className="term-line" variants={TERM_OUTPUT_LINE}>
        <span className={TONE_CLASS[line.tone]}>{line.text}</span>
      </motion.div>
    )
  }

  // Mixed-tone segments
  if (line.segments) {
    return (
      <motion.div key={i} className="term-line" variants={TERM_OUTPUT_LINE}>
        {line.segments.map((seg, j) => (
          <span key={j} className={TONE_CLASS[seg.tone] ?? ''}>{seg.text}</span>
        ))}
      </motion.div>
    )
  }

  // Architecture viz (systems command)
  if (line.type === 'systems') {
    return (
      <motion.div key="systems" className="term-line" variants={TERM_OUTPUT_LINE}>
        <SystemsViz nodes={line.nodes} instant={instant} />
      </motion.div>
    )
  }

  // Project + purpose sub-line
  if (line.type === 'project') {
    return (
      <motion.div key={line.name} className="term-line term-project" variants={TERM_OUTPUT_LINE}>
        <span className="project-name">{line.name}</span>
        <span className="project-sep tone-muted"> → </span>
        <span className="project-purpose tone-muted">{line.purpose}</span>
      </motion.div>
    )
  }

  // Contact links
  if (line.type === 'links') {
    return (
      <motion.div key="links" className="term-links" variants={TERM_OUTPUT_LINE}>
        {line.links.map(({ label, purpose, href }) => {
          const isEmail = href.startsWith('mailto:')
          return (
            <a
              key={label}
              href={href}
              className="term-link"
              target={isEmail ? undefined : '_blank'}
              rel={isEmail ? undefined : 'noreferrer'}
              data-cursor="hover"
            >
              <span className="term-link-label">{label}</span>
              <span className="term-link-sep tone-muted"> → </span>
              <span className="term-link-purpose tone-muted">{purpose}</span>
            </a>
          )
        })}
      </motion.div>
    )
  }

  return null
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Terminal() {
  const [active,    setActive]    = useState('whoami')
  const [isPlaying, setIsPlaying] = useState(false)

  const audioRef = useRef(null)
  const instant  = useReducedMotion()

  // Lazy audio init; tracks playback state for the waveform affordance.
  const pronounce = useCallback(() => {
    try {
      if (!audioRef.current) {
        const audio = new Audio('/pronounce.mp3')
        audio.addEventListener('ended', () => setIsPlaying(false))
        audioRef.current = audio
      }
      audioRef.current.currentTime = 0
      setIsPlaying(true)
      const p = audioRef.current.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => setIsPlaying(false))
      }
    } catch {
      setIsPlaying(false)
    }
  }, [])

  // Resolve the line array for the active command.
  const activeLines = useMemo(() => {
    if (active === 'whoami') return WHOAMI
    return COMMANDS.find((cmd) => cmd.id === active)?.lines ?? []
  }, [active])


  return (
    <div className="terminal">
      {/* Window chrome */}
      <div className="bar">
        <div className="lights">
          <span /><span /><span />
        </div>
        <span className="bar-title">
          {PROMPT} · <span className="bar-shell">zsh</span>
        </span>
      </div>

      <div className="body">
        {/* Active prompt */}
        <div className="term-prompt">
          <span className="term-prompt-root tone-muted">{PROMPT}</span>
          <span className="term-prompt-sep tone-muted"> $ </span>
          <span className="term-prompt-cmd tone-accent">{active}</span>
          <span className="cur" />
        </div>

        {/* Command output — swaps with a wait-mode exit/enter.
            The pron line is handled inline here so pronounce (which accesses
            audioRef) is bound as an onClick handler, not passed into a helper. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            className="term-output"
            variants={TERM_OUTPUT_PARENT}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            {activeLines.map((line, i) => {
              if (line?.type === 'pron') {
                return (
                  <motion.div key="pron" className="term-line" variants={TERM_OUTPUT_LINE}>
                    <span className="tone-muted">{line.label}</span>
                    {' = "'}
                    {line.value}
                    {'"'}
                    <button
                      type="button"
                      className={`play${isPlaying ? ' is-playing' : ''}`}
                      onClick={pronounce}
                      data-cursor="hover"
                      aria-label="Play name pronunciation"
                      title="Play pronunciation"
                    >
                      {isPlaying ? <WaveIcon /> : '▶'}
                    </button>
                  </motion.div>
                )
              }
              return renderLine(line, i, instant)
            })}
          </motion.div>
        </AnimatePresence>

        {/* Command pill row */}
        <div className="term-cmds" role="toolbar" aria-label="Console commands">
          {/* Home pill — returns to whoami */}
          <button
            type="button"
            className={`cmd-pill cmd-home${active === 'whoami' ? ' is-active' : ''}`}
            onClick={() => setActive('whoami')}
            data-cursor="hover"
          >
            whoami
          </button>

          {/* Command pills */}
          {COMMANDS.map((cmd) => (
            <button
              key={cmd.id}
              type="button"
              className={[
                'cmd-pill',
                active   === cmd.id ? 'is-active'   : '',
                cmd.featured         ? 'is-featured' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setActive(cmd.id)}
              data-cursor="hover"
            >
              {cmd.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
