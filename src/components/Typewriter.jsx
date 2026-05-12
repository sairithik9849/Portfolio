import { useState, useEffect } from 'react'

export default function Typewriter({ text, speed = 40, delay = 0, caret = false }) {
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [index, setIndex] = useState(() => (reduceMotion ? text.length : 0))

  useEffect(() => {
    if (reduceMotion) return

    let outer
    let inner

    function advance(i) {
      if (i >= text.length) return
      inner = setTimeout(() => {
        setIndex(i + 1)
        advance(i + 1)
      }, speed)
    }

    outer = setTimeout(() => advance(index), delay)

    return () => {
      clearTimeout(outer)
      clearTimeout(inner)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className="tw-wrap">
      {/* Ghost reserves width so flex parent never reflows */}
      <span className="tw-ghost" aria-hidden="true">
        {text}
        {caret && <span className="tw-caret">▌</span>}
      </span>
      <span className="tw-visible">
        {text.slice(0, index)}
        {caret && <span className="tw-caret">▌</span>}
      </span>
    </span>
  )
}
