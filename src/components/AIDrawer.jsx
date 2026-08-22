import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useHotkey } from '../hooks/useHotkey'
import { AGENT_MODEL, SUGGESTIONS, SEED_MESSAGES, pickCanned } from '../data/agent'
import { MESSAGE_ENTER } from '../animations/variants'
import Bubble from './Bubble'

const DRAWER_SPRING = { type: 'spring', stiffness: 380, damping: 38 }

// Terminal-style scanning loader for the "AGENT · THINKING" state — a
// density trail bouncing across a row of dots. Interval-driven React state
// (not a CSS @keyframes loop), per docs/animation.md's JS/Framer-Motion-first
// policy for new component animation.
const SCAN_COLS = 28
const SCAN_TRAIL = ['▓', '▒', '░']

function ThinkingScanner({ reduce }) {
  const [scan, setScan] = useState({ pos: 1, dir: 1 })

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => {
      setScan(({ pos, dir }) => {
        let nextDir = dir
        let next = pos + dir
        if (next >= SCAN_COLS - SCAN_TRAIL.length) {
          nextDir = -1
          next = SCAN_COLS - SCAN_TRAIL.length - 1
        }
        if (next <= 0) {
          nextDir = 1
          next = 1
        }
        return { pos: next, dir: nextDir }
      })
    }, 55)
    return () => clearInterval(id)
  }, [reduce])

  if (reduce) {
    return <div className="thinking-scan" aria-hidden="true">{'.'.repeat(SCAN_COLS)}</div>
  }

  const { pos, dir } = scan
  const chars = new Array(SCAN_COLS).fill('.')
  const bright = new Array(SCAN_COLS).fill(false)
  SCAN_TRAIL.forEach((ch, i) => {
    const idx = dir === 1 ? pos - 1 - i : pos + i
    if (idx >= 0 && idx < SCAN_COLS) {
      chars[idx] = ch
      bright[idx] = true
    }
  })

  return (
    <div className="thinking-scan" aria-hidden="true">
      {chars.map((ch, i) => (
        <span key={i} className={bright[i] ? 'bright' : undefined}>{ch}</span>
      ))}
    </div>
  )
}

export default function AIDrawer({ open, onClose }) {
  const [messages, setMessages] = useState(SEED_MESSAGES)
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bodyRef = useRef(null)
  const textareaRef = useRef(null)
  const abortRef = useRef(null)
  const cancelledRef = useRef(false)
  const reduce = useReducedMotion()

  // Scroll to bottom whenever messages update
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, loading])

  // Escape closes the drawer (no-op when already closed)
  useHotkey('escape', onClose)

  const send = useCallback(async (text) => {
    const q = (text ?? input).trim()
    if (!q) return

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setMessages((m) => [...m, { role: 'user', text: q }])
    setLoading(true)
    cancelledRef.current = false

    // Fast path: canned demo responses (no network needed)
    const canned = pickCanned(q)
    if (canned) {
      await new Promise((r) => setTimeout(r, 680))
      if (cancelledRef.current) return
      setMessages((m) => [...m, canned])
      setLoading(false)
      return
    }

    // Network path: POST to /api/chat (Gemini serverless function)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setMessages((m) => [...m, { role: 'ai', text: data.reply }])
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages((m) => [...m, {
          role: 'ai',
          text: 'Agent unreachable — try again in a moment.',
        }])
      }
    } finally {
      setLoading(false)
    }
  }, [input])

  const stop = useCallback(() => {
    cancelledRef.current = true
    abortRef.current?.abort()
    setLoading(false)
  }, [])

  const handleInput = (e) => {
    setInput(e.target.value)
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="ai-drawer-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.22 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            className="ai-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={reduce ? { duration: 0 } : DRAWER_SPRING}
          >
            {/* Header */}
            <div className="dr-head">
              <div className="left">
                <span className="core-sm" />
                <span>SAIRITHIK · AGENT v0.4</span>
              </div>
              <button className="x" onClick={onClose} aria-label="Close agent">×</button>
            </div>

            {/* Meta strip */}
            <div className="dr-meta">
              <div>MODEL<b>{AGENT_MODEL}</b></div>
              <div>CONTEXT<b>cv · 6 readmes</b></div>
              <div>LATENCY<b>~840ms</b></div>
            </div>

            {/* Messages */}
            <div className="dr-body" ref={bodyRef}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  variants={MESSAGE_ENTER}
                  initial="hidden"
                  animate="show"
                  transition={reduce ? { duration: 0 } : undefined}
                >
                  <Bubble m={m} />
                </motion.div>
              ))}
              {loading && (
                <div className="bubble ai">
                  <div className="role">AGENT · THINKING</div>
                  <ThinkingScanner reduce={reduce} />
                </div>
              )}
            </div>

            {/* Suggestion chips */}
            <div className="dr-suggest">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}>{s}</button>
              ))}
            </div>

            {/* Input form */}
            <form
              className="dr-input"
              onSubmit={(e) => { e.preventDefault(); send() }}
            >
              <span className="prompt">›</span>
              <textarea
                ref={textareaRef}
                placeholder="query the brain…"
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                rows={1}
                autoFocus
              />
              <button
                className={`send${loading ? ' stop' : ''}`}
                type={loading ? 'button' : 'submit'}
                onClick={loading ? stop : undefined}
                disabled={!loading && !input.trim()}
                aria-label={loading ? 'Stop generating' : 'Send message'}
              >
                {loading ? 'STOP' : 'SEND ↵'}
              </button>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
