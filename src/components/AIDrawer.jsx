import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useHotkey } from '../hooks/useHotkey'
import { SUGGESTIONS, SEED_MESSAGES, pickCanned } from '../data/agent'
import Bubble from './Bubble'

const DRAWER_SPRING = { type: 'spring', stiffness: 380, damping: 38 }

export default function AIDrawer({ open, onClose }) {
  const [messages, setMessages] = useState(SEED_MESSAGES)
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bodyRef = useRef(null)

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
    setMessages((m) => [...m, { role: 'user', text: q }])
    setLoading(true)

    // Fast path: canned demo responses (no network needed)
    const canned = pickCanned(q)
    if (canned) {
      await new Promise((r) => setTimeout(r, 680))
      setMessages((m) => [...m, canned])
      setLoading(false)
      return
    }

    // Network path: POST to /api/chat (Gemini serverless function)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setMessages((m) => [...m, { role: 'ai', text: data.reply }])
    } catch {
      setMessages((m) => [...m, {
        role: 'ai',
        text: 'Agent unreachable — wire up GEMINI_API_KEY in .env.local to activate.',
      }])
    } finally {
      setLoading(false)
    }
  }, [input])

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
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            className="ai-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={DRAWER_SPRING}
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
              <div>MODEL<b>gemini-1.5-flash</b></div>
              <div>CONTEXT<b>cv · 6 readmes</b></div>
              <div>LATENCY<b>~840ms</b></div>
            </div>

            {/* Messages */}
            <div className="dr-body" ref={bodyRef}>
              {messages.map((m, i) => <Bubble key={i} m={m} />)}
              {loading && (
                <div className="bubble ai">
                  <div className="role">AGENT · THINKING</div>
                  <div className="skeleton-row"><i style={{ width: '60%' }} /></div>
                  <div className="skeleton-row"><i style={{ width: '85%' }} /></div>
                  <div className="skeleton-row"><i style={{ width: '40%' }} /></div>
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
              <input
                placeholder="query the brain — e.g. 'walk me through MF Compiler'"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
              />
              <button className="send" type="submit">SEND ↵</button>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
