import { useTransform, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'

const DATA = WID_VIZ.agents
const N    = 5

// SVG ring geometry
const R             = 46
const CX            = 80
const CY            = 72
const CIRCUMFERENCE = 2 * Math.PI * R

// Node positions around the ring (evenly spaced, starting top = -90°)
const nodeAngles = DATA.cycle.map((_, i) => (i * 360) / DATA.cycle.length - 90)
const nodePositions = nodeAngles.map(deg => {
  const rad = (deg * Math.PI) / 180
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) }
})

export default function VizAgents({ progress, index, isActive, reduced, frozen }) {
  const isFinal = reduced || frozen

  const { dissolveIn, enterIn } = widSlice(index, N)

  // ── scroll clock — all hooks unconditional ────────────────────────────────
  const dissolve = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })
  const scale    = useTransform(dissolve, [0, 1], [0.985, 1])
  const enter    = useTransform(progress, enterIn, [0, 1], { clamp: true })

  // Ring draws in as enter goes 0 → 0.7
  const strokeDash = useTransform(
    enter,
    [0, 0.7],
    [`0 ${CIRCUMFERENCE}`, `${CIRCUMFERENCE} 0`],
    { clamp: true }
  )

  // Node label opacities — three, declared individually.
  const node0op = useTransform(enter, [0.40, 0.55], [0, 1], { clamp: true })
  const node1op = useTransform(enter, [0.55, 0.70], [0, 1], { clamp: true })
  const node2op = useTransform(enter, [0.70, 0.85], [0, 1], { clamp: true })
  const nodeOpacities = [node0op, node1op, node2op]

  // ── wall clock (active node highlight + token stream) ─────────────────────
  const [activeNode, setActiveNode] = useState(0)
  const [tokenDisplay, setTokenDisplay] = useState('')
  const loopRef = useRef(null)

  useEffect(() => {
    if (!isActive || isFinal) {
      loopRef.current?.()
      // Reset is deferred so it doesn't cause cascading renders in this effect.
      const id = setTimeout(() => {
        setActiveNode(0)
        setTokenDisplay('')
      }, 0)
      return () => clearTimeout(id)
    }

    let cancelled = false
    let nodeIdx = 0

    const runLoop = async () => {
      while (!cancelled) {
        setActiveNode(nodeIdx)

        if (nodeIdx === 0) {
          // THINK: stream tokens in
          let built = ''
          for (const token of DATA.tokens) {
            if (cancelled) break
            built += (built ? ' ' : '') + token
            setTokenDisplay(built)
            await new Promise(r => setTimeout(r, 140))
          }
          if (!cancelled) await new Promise(r => setTimeout(r, 400))
        } else {
          setTokenDisplay('')
          await new Promise(r => setTimeout(r, 600))
        }

        nodeIdx = (nodeIdx + 1) % DATA.cycle.length
      }
    }

    runLoop()
    loopRef.current = () => { cancelled = true }
    return () => { cancelled = true }
  }, [isActive, isFinal])

  return (
    <motion.div
      className="widviz-layer widviz-agents"
      style={{ opacity: isFinal ? 1 : dissolve, scale: isFinal ? 1 : scale }}
    >
      <div className="wagnt-cycle">
        <svg
          viewBox={`0 0 ${CX * 2} ${CY * 2}`}
          className="wagnt-ring-svg"
          aria-hidden="true"
        >
          {/* Static base ring */}
          <circle cx={CX} cy={CY} r={R} className="wagnt-ring" />

          {/* Structural draw-in arc */}
          <motion.circle
            cx={CX}
            cy={CY}
            r={R}
            className="wagnt-ring--active"
            style={{
              strokeDasharray:  isFinal ? `${CIRCUMFERENCE} 0` : strokeDash,
              strokeDashoffset: 0,
            }}
            transform={`rotate(-90 ${CX} ${CY})`}
          />
        </svg>

        {/* Cycle node labels */}
        {DATA.cycle.map((label, i) => {
          const pos = nodePositions[i]
          const isNodeActive = isActive && activeNode === i && !isFinal
          return (
            <motion.div
              key={label}
              className={`wagnt-node${isNodeActive ? ' wagnt-node--active' : ''}`}
              style={{
                position: 'absolute',
                left:     `${(pos.x / (CX * 2)) * 100}%`,
                top:      `${(pos.y / (CY * 2)) * 100}%`,
                transform: 'translate(-50%, -50%)',
                opacity:   isFinal ? 1 : nodeOpacities[i],
              }}
            >
              {label}
            </motion.div>
          )
        })}
      </div>

      {/* Token stream */}
      <div className="wagnt-tokens">
        {isActive && !isFinal && tokenDisplay
          ? tokenDisplay.split(' ').map((tok, j) => (
              <span key={j}>{tok} </span>
            ))
          : isFinal
            ? DATA.tokens.slice(0, 3).map((tok, j) => <span key={j}>{tok} </span>)
            : null
        }
      </div>
    </motion.div>
  )
}
