import { useState, useRef, useEffect } from 'react'
import { motion, useSpring } from 'framer-motion'
import { CURSOR_X, CURSOR_Y } from '../utils/cursor'

const MAIN_VARIANTS = {
  default: { x: '-50%', y: '-50%', scale: 1,   width: 16, height: 16, borderRadius: 0, boxShadow: '0 0 0px rgba(201,245,88,0)' },
  hover:   { x: '-50%', y: '-50%', scale: 1.4, width: 16, height: 16, borderRadius: 0, boxShadow: '0 0 6px rgba(201,245,88,0.55)' },
  text:    { x: '-50%', y: '-50%', scale: 1,   width: 2,  height: 20, borderRadius: 1, boxShadow: '0 0 0px rgba(201,245,88,0)' },
}

const SPRING = { type: 'spring', stiffness: 260, damping: 28, mass: 0.6 }

const STATE_CLASSES = ['state-default', 'state-hover', 'state-text']

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

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    STATE_CLASSES.forEach(c => root.classList.remove(c))
    root.classList.add(`state-${variant}`)
  }, [variant])

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
        className="cursor-main"
        initial="default"
        variants={MAIN_VARIANTS}
        animate={variant}
        transition={SPRING}
      >
        <div className="cursor-scan" />
      </motion.div>
    </motion.div>
  )
}
