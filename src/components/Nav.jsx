import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { NAV } from '../data/nav'
import { scrollToId } from '../utils/scrollTo'

// Sections whose presence on screen should hide the nav (Hero + editorial About).
const NAV_HIDE_IDS = ['top', 'about']

export default function Nav() {
  const [position, setPosition] = useState({ left: 0, width: 0, opacity: 0 })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const targets = NAV_HIDE_IDS
      .map((id) => document.getElementById(id))
      .filter(Boolean)
    if (!targets.length) return undefined

    const state = new Map(targets.map((el) => [el, false]))
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => state.set(e.target, e.isIntersecting))
        const anyIntersecting = Array.from(state.values()).some(Boolean)
        setVisible(!anyIntersecting)
      },
      { threshold: 0 },
    )
    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const handleNavClick = useCallback((e, id) => {
    e.preventDefault()
    scrollToId(id)
  }, [])

  return (
    <motion.nav
      className="nav"
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : -16 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
    >
      <ul
        className="nav-tabs"
        onMouseLeave={() => setPosition((p) => ({ ...p, opacity: 0 }))}
      >
        {NAV.map((n) => (
          <Tab
            key={n.id}
            setPosition={setPosition}
            href={`#${n.id}`}
            onClick={(e) => handleNavClick(e, n.id)}
          >
            <span className="num">{n.n}</span>
            {n.label}
          </Tab>
        ))}
        <Cursor position={position} />
      </ul>
    </motion.nav>
  )
}

function Tab({ children, setPosition, href, onClick }) {
  const ref = useRef(null)
  return (
    <li
      ref={ref}
      className="nav-tab"
      onMouseEnter={() => {
        if (!ref.current) return
        const { width } = ref.current.getBoundingClientRect()
        setPosition({ width, opacity: 1, left: ref.current.offsetLeft })
      }}
    >
      <a href={href} data-cursor="hover" onClick={onClick}>{children}</a>
    </li>
  )
}

function Cursor({ position }) {
  return (
    <motion.li
      className="nav-tab-cursor"
      animate={position}
      transition={{ type: 'spring', stiffness: 400, damping: 32, mass: 0.6 }}
    />
  )
}
