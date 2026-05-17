import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*'
const FRAME_MS = 30
const FRAMES_PER_CHAR = 3

export default function TextScramble({ text }) {
  const prefersReducedMotion = useReducedMotion()
  const [displayText, setDisplayText] = useState(text)
  const [isScrambling, setIsScrambling] = useState(false)
  const intervalRef = useRef(null)
  const frameRef = useRef(0)

  const scramble = useCallback(() => {
    if (prefersReducedMotion) return
    setIsScrambling(true)
    frameRef.current = 0
    const duration = text.length * FRAMES_PER_CHAR
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      frameRef.current++
      const revealed = Math.floor((frameRef.current / duration) * text.length)
      const next = text
        .split('')
        .map((ch, i) => {
          if (ch === ' ') return ' '
          if (i < revealed) return text[i]
          return CHARS[Math.floor(Math.random() * CHARS.length)]
        })
        .join('')
      setDisplayText(next)
      if (frameRef.current >= duration) {
        clearInterval(intervalRef.current)
        setDisplayText(text)
        setIsScrambling(false)
      }
    }, FRAME_MS)
  }, [text, prefersReducedMotion])

  useEffect(() => () => clearInterval(intervalRef.current), [])

  if (prefersReducedMotion) {
    return <span className="text-scramble">{text}</span>
  }

  return (
    <span className="text-scramble" onMouseEnter={scramble}>
      {displayText.split('').map((ch, i) => {
        const scrambledHere = isScrambling && ch !== text[i]
        return (
          <span
            key={i}
            className={`text-scramble-char${scrambledHere ? ' text-scramble-char--scrambling' : ''}`}
          >
            {ch}
          </span>
        )
      })}
    </span>
  )
}
