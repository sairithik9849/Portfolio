import { useState, useEffect } from 'react'

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%&*/<>?'
const FPS = 12
const FRAME_MS = 1000 / FPS
const ACCENT_FLASH_MS = 400

function randomChar() {
  return CHARSET[Math.floor(Math.random() * CHARSET.length)]
}

function makeScrambled(text) {
  return text.split('').map((c) => ({
    value: c === ' ' ? ' ' : randomChar(),
    locked: false,
    justLocked: false,
  }))
}

export default function MatrixText({
  phrases,
  scrambleDuration = 1400,
  holdDuration = 2800,
  delay = 0,
}) {
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [chars, setChars] = useState(() =>
    reduceMotion
      ? phrases[0].split('').map((c) => ({ value: c, locked: true, justLocked: false }))
      : makeScrambled(phrases[0])
  )

  // All cycling logic lives in one mount-only effect so there are no
  // circular useCallback dependencies or stale-closure risks.
  useEffect(() => {
    if (reduceMotion) return

    const timers = []
    let rafId = null
    let lastTick = 0
    let phaseRef = 'idle' // idle | scramble-in | hold | scramble-out
    let phraseIdx = 0

    function clearTimers() {
      timers.forEach(clearTimeout)
      timers.length = 0
    }

    function scrambleIn() {
      clearTimers()
      const target = phrases[phraseIdx]
      phaseRef = 'scramble-in'

      // Initialize to scrambled version of new target
      setChars(makeScrambled(target))

      // Stagger each character's lock-in across scrambleDuration
      target.split('').forEach((ch, i) => {
        if (ch === ' ') return
        const t = (scrambleDuration / target.length) * i
        const lockId = setTimeout(() => {
          setChars((prev) => {
            const next = [...prev]
            next[i] = { value: ch, locked: true, justLocked: true }
            return next
          })
          const flashId = setTimeout(() => {
            setChars((prev) => {
              const next = [...prev]
              if (next[i]) next[i] = { ...next[i], justLocked: false }
              return next
            })
          }, ACCENT_FLASH_MS)
          timers.push(flashId)
        }, t)
        timers.push(lockId)
      })

      // After all chars lock, enter hold phase
      const holdId = setTimeout(() => {
        phaseRef = 'hold'
        const nextId = setTimeout(scrambleOut, holdDuration)
        timers.push(nextId)
      }, scrambleDuration + 80)
      timers.push(holdId)
    }

    function scrambleOut() {
      clearTimers()
      phaseRef = 'scramble-out'
      const outDuration = scrambleDuration / 2
      const switchId = setTimeout(() => {
        phraseIdx = (phraseIdx + 1) % phrases.length
        scrambleIn()
      }, outDuration)
      timers.push(switchId)
    }

    // rAF loop — randomises unlocked chars during active scramble phases
    function tick(now) {
      rafId = requestAnimationFrame(tick)
      if (now - lastTick < FRAME_MS) return
      lastTick = now
      if (phaseRef === 'hold' || phaseRef === 'idle') return

      const target = phrases[phraseIdx]
      if (!target) return

      if (phaseRef === 'scramble-in') {
        setChars((prev) =>
          prev.map((c, i) => {
            if (c.locked) return c
            const ch = target[i]
            if (!ch || ch === ' ') return { ...c, value: ch ?? '' }
            return { ...c, value: randomChar() }
          })
        )
      } else if (phaseRef === 'scramble-out') {
        setChars((prev) =>
          prev.map((c, i) => {
            const ch = target[i]
            if (!ch || ch === ' ') return { value: ch ?? '', locked: false, justLocked: false }
            return { value: randomChar(), locked: false, justLocked: false }
          })
        )
      }
    }

    rafId = requestAnimationFrame(tick)

    const startId = setTimeout(scrambleIn, delay)
    timers.push(startId)

    return () => {
      clearTimers()
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className="matrix-wrap">
      {chars.map((c, i) => (
        <span
          key={i}
          className={`matrix-char${c.justLocked ? ' just-locked' : ''}`}
        >
          {c.value}
        </span>
      ))}
    </span>
  )
}
