import { useState, useEffect } from 'react'
import { useReducedMotion } from 'framer-motion'

const GREEN_HOLD_MS = 220

function makeHidden(text) {
  return text.split('').map((c) => ({ value: c, state: 'hidden' }))
}

export default function MatrixText({
  phrases,
  scrambleDuration = 1400,
  holdDuration = 2800,
  delay = 0,
  visible = true,
}) {
  const reduceMotion = useReducedMotion()

  const [chars, setChars] = useState(() =>
    reduceMotion
      ? phrases[0].split('').map((c) => ({ value: c, state: 'settled' }))
      : makeHidden(phrases[0])
  )

  useEffect(() => {
    // Also pauses while the hero is scrolled out of view — this loop ran
    // forever regardless of visibility before, cycling per-character React
    // state updates on an element nobody could see.
    if (reduceMotion || !visible) return

    let phraseIdx = 0
    let rafId = null
    let timerId = null

    function clearAll() {
      if (rafId) cancelAnimationFrame(rafId)
      if (timerId) clearTimeout(timerId)
    }

    function wipeIn() {
      clearAll()
      const target = phrases[phraseIdx]
      const len = target.length

      let lastStateStr = ''
      const start = performance.now()

      function tick(now) {
        const elapsed = now - start

        let allDone = true
        const nextChars = target.split('').map((ch, i) => {
          const t = (scrambleDuration / len) * i
          let state = 'hidden'

          if (elapsed >= t) {
            if (ch === ' ') {
              state = 'settled'
            } else if (elapsed < t + GREEN_HOLD_MS) {
              state = 'green'
              allDone = false
            } else {
              state = 'settled'
            }
          } else {
            allDone = false
          }
          return { value: ch, state }
        })

        const nextStateStr = nextChars.map(c => c.state).join(',')
        if (nextStateStr !== lastStateStr) {
          setChars(nextChars)
          lastStateStr = nextStateStr
        }

        if (!allDone && elapsed < scrambleDuration + GREEN_HOLD_MS) {
           rafId = requestAnimationFrame(tick)
        } else {
           timerId = setTimeout(wipeOut, holdDuration)
        }
      }
      rafId = requestAnimationFrame(tick)
    }

    function wipeOut() {
      clearAll()
      const target = phrases[phraseIdx]
      const len = target.length
      const outDuration = scrambleDuration / 2

      let lastStateStr = ''
      const start = performance.now()

      function tick(now) {
        const elapsed = now - start

        let allDone = true
        const nextChars = target.split('').map((ch, i) => {
          const t = (outDuration / len) * i
          let state = 'settled'

          if (elapsed >= t) {
            if (elapsed < t + GREEN_HOLD_MS) {
              state = 'green'
              allDone = false
            } else {
              state = 'hidden'
            }
          } else {
             allDone = false
          }
          return { value: ch, state }
        })

        const nextStateStr = nextChars.map(c => c.state).join(',')
        if (nextStateStr !== lastStateStr) {
          setChars(nextChars)
          lastStateStr = nextStateStr
        }

        if (!allDone && elapsed < outDuration + GREEN_HOLD_MS) {
           rafId = requestAnimationFrame(tick)
        } else {
           phraseIdx = (phraseIdx + 1) % phrases.length
           wipeIn()
        }
      }
      rafId = requestAnimationFrame(tick)
    }

    timerId = setTimeout(wipeIn, delay)

    return () => {
      clearAll()
    }
  }, [visible, reduceMotion]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className="matrix-wrap">
      {chars.map((c, i) => (
        <span
          key={i}
          className={`matrix-char matrix-char--${c.state}`}
        >
          {c.value}
        </span>
      ))}
    </span>
  )
}
