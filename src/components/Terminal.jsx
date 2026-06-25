import { useState, useRef, useCallback, useMemo, useEffect, Fragment } from 'react'
import { motion, AnimatePresence, useReducedMotion, animate } from 'framer-motion'
import { TERM_OUTPUT_PARENT, TERM_OUTPUT_LINE, TERM_SUGGEST } from '../animations/variants'
import { PROMPT, WHOAMI, COMMANDS, COMMAND_IDS } from '../data/terminal'

// ─── Component-private animation constants ────────────────────────────────────
// Systems viz nodes and arrows use absolute delay offsets so they stagger
// within a single output block without needing a nested stagger parent.
// These are intentionally local — they are not shared across components.

const SYS_NODE_BASE_DELAY = 0.05
const SYS_NODE_STEP       = 0.09

// How long the "executing" interstitial shows before output is revealed.
// Kept short — this is perceived responsiveness, not actual loading.
const EXEC_DELAY = 250

const normalizeCommandInput = (value) => value.trim().toLowerCase()

const sysNodeTransition = (i, instant) => ({
  duration: instant ? 0 : 0.22,
  delay:    instant ? 0 : SYS_NODE_BASE_DELAY + i * SYS_NODE_STEP,
  ease:     'easeOut',
})


// ─── Tone → class name ────────────────────────────────────────────────────────
const TONE_CLASS = {
  accent: 'tone-accent',
  gold:   'tone-gold',
  muted:  'tone-muted',
  strong: 'tone-strong',
}

// ─── Contact link stagger variants ────────────────────────────────────────────
// Module-level to avoid recreation on every render.
// The parent orchestrates stagger; each link slides in individually.
const LINK_PARENT = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}
const LINK_ITEM = {
  hidden: { opacity: 0, x: -8 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.22, ease: 'easeOut' } },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SystemsViz({ nodes, instant }) {
  const nodeAnimate = { opacity: 1, x: 0 }

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
              // Pulse: fade in to dim → spike bright → settle dim (travelling wave effect).
              // instant skips the pulse and lands at the resting opacity.
              animate={{ opacity: instant ? 0.55 : [0, 0.55, 1, 0.55] }}
              transition={instant ? { duration: 0 } : {
                duration: 0.8,
                delay: SYS_NODE_BASE_DELAY + 0.04 + i * SYS_NODE_STEP,
                times: [0, 0.25, 0.6, 1],
                ease: 'easeOut',
              }}
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

// CSS-driven dots; the parent class drives the animation via term-dot keyframes.
function Dots() {
  return (
    <span className="term-dots" aria-hidden="true">
      <span /><span /><span />
    </span>
  )
}

// Counts up from 0 to `value` over ~0.9s on mount.
// `instant` shows the final value immediately — the lazy initializer sets it
// at mount time so we never call setState synchronously inside the effect.
function CountUp({ value, suffix, instant }) {
  const [display, setDisplay] = useState(() => (instant ? value : 0))

  useEffect(() => {
    // instant path: initial state already set correctly via lazy initializer.
    if (instant) return
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [value, instant])

  return (
    <span className="term-metric">
      <span className="metric-value">{display}{suffix}</span>
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

  // Metric count-up (impact command)
  if (line.type === 'metric') {
    return (
      <motion.div key="metric" className="term-line" variants={TERM_OUTPUT_LINE}>
        <CountUp value={line.value} suffix={line.suffix} instant={instant} />
        {' '}
        <span className="tone-muted">{line.label}</span>
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

  // Contact links — each link reveals progressively via an internal stagger.
  // LINK_PARENT orchestrates the stagger; each motion.a uses LINK_ITEM variants.
  if (line.type === 'links') {
    return (
      <motion.div key="links" className="term-links" variants={LINK_PARENT}>
        {line.links.map(({ label, display, purpose, href }) => {
          const isEmail = href.startsWith('mailto:')
          const displayText = display ?? purpose ?? href.replace(/^mailto:/, '')
          return (
            <motion.a
              key={label}
              href={href}
              className="term-link"
              target={isEmail ? undefined : '_blank'}
              rel={isEmail ? undefined : 'noreferrer'}
              data-cursor="hover"
              variants={LINK_ITEM}
            >
              <span className="term-link-label">{label}</span>
              <span className="term-link-sep tone-muted"> → </span>
              <span className="term-link-display tone-muted">{displayText}</span>
            </motion.a>
          )
        })}
      </motion.div>
    )
  }

  return null
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Terminal() {
  const [active,         setActive]         = useState('whoami')
  const [query,          setQuery]          = useState('whoami')
  const [phase,          setPhase]          = useState('output')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [inputFocused,   setInputFocused]   = useState(false)
  const [suggestOpen,    setSuggestOpen]    = useState(false)
  const [isPlaying,      setIsPlaying]      = useState(false)

  const audioRef     = useRef(null)
  const inputRef     = useRef(null)
  const execTimerRef = useRef(null)
  const suggestRef   = useRef(null)
  const instant      = useReducedMotion()

  // Ensure exec timer is always cleared on unmount to prevent stale state updates.
  useEffect(() => () => clearTimeout(execTimerRef.current), [])

  // Non-passive wheel handler so the dropdown scrolls without triggering page scroll.
  // CSS overscroll-behavior:contain is unreliable for absolutely-positioned overlays;
  // a { passive: false } native listener with manual scrollTop is the cross-browser fix.
  useEffect(() => {
    const el = suggestRef.current
    if (!el) return
    const onWheel = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const canScrollDown = e.deltaY > 0 && scrollTop + clientHeight < scrollHeight - 1
      const canScrollUp   = e.deltaY < 0 && scrollTop > 0
      e.stopPropagation()
      if (canScrollDown || canScrollUp) {
        e.preventDefault()
        // One item per tick (~22px), smoothly animated — avoids the raw deltaY
        // which can be 100+ px per event depending on the device.
        el.scrollBy({ top: Math.sign(e.deltaY) * 22, behavior: 'smooth' })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [suggestOpen])

  // ─── Derived ─────────────────────────────────────────────────────────────

  const normalizedQuery = normalizeCommandInput(query)

  // Empty input and exact commands intentionally show the full list. Partial
  // input narrows the list so autocomplete tracks what the user is typing.
  const suggestions = useMemo(() => {
    if (!normalizedQuery || COMMAND_IDS.includes(normalizedQuery)) {
      return [...COMMAND_IDS]
    }
    return COMMAND_IDS.filter((id) => id.startsWith(normalizedQuery))
  }, [normalizedQuery])

  const activeLines = useMemo(() => {
    if (active === 'whoami') return WHOAMI
    return COMMANDS.find((cmd) => cmd.id === active)?.lines ?? []
  }, [active])

  // Dynamic title bar: shows execution status, idle readiness, or active command.
  const barTitle = useMemo(() => {
    if (phase === 'executing') return 'EXECUTING'
    if (inputFocused && !query.trim()) return 'READY'
    return active.toUpperCase()
  }, [phase, inputFocused, query, active])

  // ─── Pronunciation playback ───────────────────────────────────────────────
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

  // ─── Command execution ────────────────────────────────────────────────────
  // All interaction paths (typing, pill clicks, suggestion clicks) funnel here.
  // Invalid commands are silently ignored — no error line emitted.
  const runCommand = useCallback((id) => {
    if (!COMMAND_IDS.includes(id)) return
    clearTimeout(execTimerRef.current)
    setQuery(id)
    setSuggestOpen(false)
    setHighlightIndex(0)
    setActive(id)
    if (instant) {
      // Skip the interstitial under reduced motion.
      setPhase('output')
    } else {
      setPhase('executing')
      execTimerRef.current = setTimeout(() => setPhase('output'), EXEC_DELAY)
    }
  }, [instant])

  // ─── Input handlers ───────────────────────────────────────────────────────

  const handleChange = useCallback((e) => {
    const val = e.target.value
    setQuery(val)
    setHighlightIndex(0)
    setSuggestOpen(true)
  }, [])

  const handleKeyDown = useCallback((e) => {
    // For every key we handle, stop native propagation so the global window
    // listener (useHotkey in App.jsx / AIDrawer.jsx) never sees the event.
    if (suggestOpen && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.nativeEvent.stopPropagation()
        setHighlightIndex((idx) => (idx + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.nativeEvent.stopPropagation()
        setHighlightIndex((idx) => (idx - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        e.nativeEvent.stopPropagation()
        setQuery(suggestions[highlightIndex])
        setSuggestOpen(true)
        setHighlightIndex(0)
        return
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      e.nativeEvent.stopPropagation()
      const normalizedTarget = normalizeCommandInput(query)
      let target = normalizedTarget
      if (!COMMAND_IDS.includes(normalizedTarget) && suggestOpen && suggestions.length > 0) {
        target = suggestions[highlightIndex]
      }
      runCommand(target)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.nativeEvent.stopPropagation()
      if (suggestOpen) {
        setSuggestOpen(false)
      } else {
        setQuery('')
      }
    }
  }, [suggestOpen, suggestions, highlightIndex, query, runCommand])

  const handleFocus = useCallback(() => {
    setInputFocused(true)
    setSuggestOpen(true)
  }, [])

  const handleBlur = useCallback(() => {
    setInputFocused(false)
    setSuggestOpen(false)
    // Restore the active command name so the field is never left blank.
    setQuery(active)
  }, [active])

  // Clicking anywhere on the prompt row focuses the input — like a real terminal.
  const handlePromptClick = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  // ─── Render ───────────────────────────────────────────────────────────────

  const isIdle = !inputFocused

  return (
    <div className="terminal">
      {/* Window chrome */}
      <div className="bar">
        <div className="lights">
          <span /><span /><span />
        </div>
        <span className="bar-title">
          {PROMPT} · <span className={`bar-shell${phase === 'executing' ? ' is-exec' : ''}`}>{barTitle}</span>
        </span>
      </div>

      <div className="body">
        {/* Group wraps prompt + dropdown so the dropdown can overlay absolutely */}
        <div className="term-prompt-group">
          {/* Prompt row — clicking the row focuses the input */}
          <div className={`term-prompt${isIdle ? ' is-idle' : ''}`} onClick={handlePromptClick}>
            <span className="term-prompt-root tone-muted">{PROMPT}</span>
            <span className="term-prompt-sep tone-muted"> $ </span>
            {/* .term-input-sizer mirrors the query text via ::after so the wrapper
                is exactly as wide as the typed characters, placing .cur right after. */}
            <div className="term-input-sizer" data-text={query}>
              <input
                ref={inputRef}
                type="text"
                className="term-input"
                value={query}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                size={1}
                role="combobox"
                aria-expanded={suggestOpen}
                aria-autocomplete="list"
                aria-controls="term-suggest-list"
                aria-label="Terminal command input"
                aria-activedescendant={
                  suggestOpen && suggestions.length > 0
                    ? `suggest-${suggestions[highlightIndex]}`
                    : undefined
                }
              />
            </div>
            {/* Cursor lives outside the sizer so it appears directly after the text.
                Hidden when focused — the native caret inside the input takes over. */}
            {isIdle && <span className="cur" aria-hidden="true" />}
            {/* First-visit affordance: fades in after output settles, vanishes on any interaction. */}
            <AnimatePresence>
              {isIdle && active === 'whoami' && (
                <motion.span
                  className="term-hint"
                  aria-hidden="true"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: instant ? 0 : 1.2, duration: 0.4, ease: 'easeOut' }}
                >
                  — click to run a command
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Autocomplete dropdown — absolutely positioned so it overlays the output
              without adding height to the terminal body. */}
          <AnimatePresence>
            {suggestOpen && suggestions.length > 0 && (
              <motion.div
                ref={suggestRef}
                id="term-suggest-list"
                className="term-suggest"
                role="listbox"
                variants={TERM_SUGGEST}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                {suggestions.map((id, idx) => (
                  <button
                    key={id}
                    id={`suggest-${id}`}
                    type="button"
                    role="option"
                    aria-selected={idx === highlightIndex}
                    className={`suggest-item${idx === highlightIndex ? ' is-highlight' : ''}`}
                    // preventDefault prevents the input from blurring before onClick fires.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => runCommand(id)}
                    data-cursor="hover"
                  >
                    <span className="suggest-arrow tone-accent" aria-hidden="true">▶</span>
                    {id}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Command output — executing interstitial or live output.
            Keyed so AnimatePresence can exit the exec block and enter the output block.
            The pron line is handled inline here so pronounce (which accesses
            audioRef) is bound as an onClick handler, not passed into a helper. */}
        <AnimatePresence mode="wait">
          {phase === 'executing' ? (
            <motion.div
              key="exec"
              className="term-exec"
              variants={TERM_OUTPUT_PARENT}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              <motion.div className="term-line" variants={TERM_OUTPUT_LINE}>
                <span className="tone-muted">executing {active}</span>
                <Dots />
              </motion.div>
            </motion.div>
          ) : (
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
                if (line?.type === 'command-link') {
                  return (
                    <motion.div key={`${line.command}-${i}`} className="term-line" variants={TERM_OUTPUT_LINE}>
                      {line.prefix && <span className="tone-muted">{line.prefix}</span>}
                      <button
                        type="button"
                        className="term-command-link"
                        onClick={() => runCommand(line.command)}
                        data-cursor="hover"
                      >
                        {line.label}
                      </button>
                    </motion.div>
                  )
                }
                return renderLine(line, i, instant)
              })}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
