import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { NAV } from '../data/nav'

export default function Nav() {
  const [position, setPosition] = useState({ left: 0, width: 0, opacity: 0 })

  return (
    <nav className="nav">
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
    </nav>
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
