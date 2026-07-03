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

    const timers = []
    let phraseIdx = 0
    let currentLength = phrases[0].length

    function clearTimers() {
      timers.forEach(clearTimeout)
      timers.length = 0
    }

    function wipeIn() {
      clearTimers()
      const target = phrases[phraseIdx]
      currentLength = target.length

      setChars(makeHidden(target))

      target.split('').forEach((ch, i) => {
        const t = (scrambleDuration / target.length) * i

        const greenId = setTimeout(() => {
          setChars((prev) => {
            const next = [...prev]
            if (next[i]) next[i] = { value: ch, state: ch === ' ' ? 'settled' : 'green' }
            return next
          })

          if (ch !== ' ') {
            const settleId = setTimeout(() => {
              setChars((prev) => {
                const next = [...prev]
                if (next[i]) next[i] = { ...next[i], state: 'settled' }
                return next
              })
            }, GREEN_HOLD_MS)
            timers.push(settleId)
          }
        }, t)
        timers.push(greenId)
      })

      const holdId = setTimeout(() => {
        const nextId = setTimeout(wipeOut, holdDuration)
        timers.push(nextId)
      }, scrambleDuration + 80)
      timers.push(holdId)
    }

    function wipeOut() {
      clearTimers()
      const outDuration = scrambleDuration / 2
      const len = currentLength

      for (let i = 0; i < len; i++) {
        const t = (outDuration / len) * i

        const greenId = setTimeout((idx) => {
          setChars((prev) => {
            const next = [...prev]
            if (next[idx]) next[idx] = { ...next[idx], state: 'green' }
            return next
          })

          const hideId = setTimeout((hidIdx) => {
            setChars((prev) => {
              const next = [...prev]
              if (next[hidIdx]) next[hidIdx] = { ...next[hidIdx], state: 'hidden' }
              return next
            })
          }, GREEN_HOLD_MS, idx)
          timers.push(hideId)
        }, t, i)
        timers.push(greenId)
      }

      const switchId = setTimeout(() => {
        phraseIdx = (phraseIdx + 1) % phrases.length
        wipeIn()
      }, outDuration + GREEN_HOLD_MS)
      timers.push(switchId)
    }

    const startId = setTimeout(wipeIn, delay)
    timers.push(startId)

    return () => {
      clearTimers()
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
