import { useEffect, useRef } from 'react'
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useAnimationFrame,
} from 'framer-motion'

const CELL = 40
const SPEED = 0.5
const SPOT_R = 300

export default function InfiniteGrid() {
  const containerRef = useRef(null)

  const maskX = useMotionValue(-9999)
  const maskY = useMotionValue(-9999)

  useEffect(() => {
    const onMove = (e) => {
      const el = containerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      maskX.set(e.clientX - r.left)
      maskY.set(e.clientY - r.top)
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [maskX, maskY])

  const gridOffsetX = useMotionValue(0)
  const gridOffsetY = useMotionValue(0)

  useAnimationFrame(() => {
    gridOffsetX.set((gridOffsetX.get() + SPEED) % CELL)
    gridOffsetY.set((gridOffsetY.get() + SPEED) % CELL)
  })

  const maskImage = useMotionTemplate`radial-gradient(${SPOT_R}px circle at ${maskX}px ${maskY}px, black, transparent)`

  return (
    <div ref={containerRef} className="infinite-grid" aria-hidden="true">
      <div className="infinite-grid__base">
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </div>
      <motion.div
        className="infinite-grid__masked"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </motion.div>
    </div>
  )
}

function GridPattern({ offsetX, offsetY }) {
  return (
    <svg width="100%" height="100%">
      <defs>
        <motion.pattern
          id="infinite-grid-pattern"
          width={CELL}
          height={CELL}
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#infinite-grid-pattern)" />
    </svg>
  )
}
