import { useState, useRef, useEffect } from 'react'
import { motion, useSpring } from 'framer-motion'
import { CURSOR_X, CURSOR_Y } from '../utils/cursor'

const LENS_VARIANTS = {
  default: { scale: 1,   borderWidth: '1.5px', borderRadius: '50%', opacity: 1 },
  hover:   { scale: 1.8, borderWidth: '2px',   borderRadius: '40%', opacity: 1 },
  text:    { scale: 0.6, borderWidth: '1.5px', borderRadius: '50%', opacity: 0 },
}

const DOT_VARIANTS = {
  default: { opacity: 1, scale: 1 },
  hover:   { opacity: 0, scale: 0 },
  text:    { opacity: 0, scale: 0 },
}

const SPRING = { type: 'spring', stiffness: 260, damping: 28, mass: 0.6 }

function useMQ(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const h = (e) => setMatches(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [query])
  return matches
}

export default function Cursor() {
  const isPointerFine = useMQ('(pointer: fine)')
  const reducedMotion = useMQ('(prefers-reduced-motion: reduce)')

  const springX = useSpring(CURSOR_X, { stiffness: 500, damping: 40, mass: 0.5 })
  const springY = useSpring(CURSOR_Y, { stiffness: 500, damping: 40, mass: 0.5 })

  const [variant, setVariant] = useState('default')
  const [visible, setVisible] = useState(false)
  const rootRef   = useRef(null)
  const lastElRef = useRef(null)

  useEffect(() => {
    if (!isPointerFine || reducedMotion) return

    const onMove = (e) => {
      CURSOR_X.set(e.clientX - 16)
      CURSOR_Y.set(e.clientY - 16)
      setVisible(true)

      const el = e.target
      if (el === lastElRef.current) return
      lastElRef.current = el

      if (!(el instanceof Element)) {
        setVariant('default')
        return
      }

      rootRef.current?.classList.toggle('in-hero', !!el.closest('.hero'))

      if (el.closest('input, textarea, [contenteditable]')) {
        setVariant('text')
      } else if (el.closest('[data-cursor="hover"]')) {
        setVariant('hover')
      } else {
        setVariant('default')
      }
    }

    const hide = () => setVisible(false)
    const show = () => setVisible(true)

    window.addEventListener('pointermove', onMove)
    window.addEventListener('blur',        hide)
    window.addEventListener('focus',       show)
    document.addEventListener('mouseleave',  hide)
    document.addEventListener('mouseenter',  show)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('blur',        hide)
      window.removeEventListener('focus',       show)
      document.removeEventListener('mouseleave',  hide)
      document.removeEventListener('mouseenter',  show)
    }
  }, [isPointerFine, reducedMotion])

  if (!isPointerFine || reducedMotion) return null

  return (
    <motion.div
      ref={rootRef}
      className="cursor-root"
      style={{ x: springX, y: springY }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ opacity: { duration: 0.3 } }}
    >
      <motion.div
        className="cursor-lens"
        initial="default"
        variants={LENS_VARIANTS}
        animate={variant}
        transition={SPRING}
      />
      <motion.div
        className="cursor-dot"
        initial="default"
        variants={DOT_VARIANTS}
        animate={variant}
        transition={SPRING}
      />
    </motion.div>
  )
}
