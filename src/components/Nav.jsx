import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { NAV } from '../data/nav'

export default function Nav() {
  const [position, setPosition] = useState({ left: 0, width: 0, opacity: 0 })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const hero = document.getElementById('top')
    if (!hero) return
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(hero)
    return () => observer.disconnect()
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
          <Tab key={n.id} setPosition={setPosition} href={`#${n.id}`}>
            <span className="num">{n.n}</span>
            {n.label}
          </Tab>
        ))}
        <Cursor position={position} />
      </ul>
    </motion.nav>
  )
}

function Tab({ children, setPosition, href }) {
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
      <a href={href} data-cursor="hover">{children}</a>
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
