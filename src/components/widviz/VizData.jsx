import { useRef, useEffect } from 'react'
import { motion, useTransform } from 'framer-motion'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'

const DATA = WID_VIZ.data
const N    = 5

// Left-to-right stagger buckets: sort unique naiveX values → normalized rank.
// 5 distinct X bands → ranks 0–4 → mapped to [0, 0.8] so emit (rank 4) reaches
// full opacity exactly when enter = 1 (CSS opacity multiplier = 5, window = 0.2).
const _uniqueXs = [...new Set(DATA.planNodes.map(n => n.naiveX))].sort((a, b) => a - b)
const NODE_STAGGER = Object.fromEntries(
  DATA.planNodes.map(n => [
    n.id,
    +(_uniqueXs.indexOf(n.naiveX) / (_uniqueXs.length - 1) * 0.8).toFixed(2),
  ])
)

// Precompute edge render data: SVG endpoints parsed from naiveD + stagger band.
// Edge stagger = destination node's stagger (edge draws as its target fades in).
// Pulse begins are staggered so all 5 edges carry data simultaneously at steady state.
const EDGE_DATA = DATA.planEdges.map((e, k) => {
  const nums = e.naiveD.match(/-?[\d.]+/g).map(Number)
  return {
    key:     `${e.from}-${e.to}`,
    d:       e.naiveD,
    x1:      nums[0], y1: nums[1],
    x2:      nums[2], y2: nums[3],
    stagger: NODE_STAGGER[e.to],
    begin:   `${(k * 0.38).toFixed(2)}s`,
  }
})

export default function VizData({ progress, index, isActive, reduced, frozen }) {
  const isFinal = reduced || frozen

  const { dissolveIn, enterIn } = widSlice(index, N)

  // ── scroll clock — all hooks called unconditionally ───────────────────────
  const dissolve = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })
  const scale    = useTransform(dissolve, [0, 1], [0.985, 1])
  const enter    = useTransform(progress, enterIn,  [0, 1],    { clamp: true })
  // Readouts fade in once the DAG is fully assembled — mirrors VizSystems' statusOp.
  const costOp   = useTransform(enter, [0.8, 1], [0, 1], { clamp: true })

  // ── wall clock (row counter) ──────────────────────────────────────────────
  const counterEl = useRef(null)
  const loopRef   = useRef(null)

  useEffect(() => {
    if (!isActive || isFinal) {
      loopRef.current?.()
      return
    }
    let cancelled = false
    let val = 0

    const tick = () => {
      if (cancelled) return
      val = (val + Math.floor(Math.random() * 2400 + 800)) % 9_999_999
      if (counterEl.current) counterEl.current.textContent = val.toLocaleString()
      setTimeout(tick, 180 + Math.random() * 120)
    }
    tick()
    loopRef.current = () => { cancelled = true }
    return () => { cancelled = true }
  }, [isActive, isFinal])

  return (
    <motion.div
      className="widviz-layer widviz-data"
      style={{ opacity: isFinal ? 1 : dissolve, scale: isFinal ? 1 : scale }}
    >
      {/* Single --enter subscriber drives all CSS assembly via custom prop inheritance.
          Pattern mirrors VizSystems: one MotionValue subscriber, per-element
          variation via CSS calc(). */}
      <motion.div className="wdat-field" style={{ '--enter': isFinal ? 1 : enter }}>

        {/* ── SVG layer: edges + flowing-row pulse dots ─────────────────────────
            preserveAspectRatio="none" stretches the 0 0 100 100 viewBox to fill
            the full-height panel — same technique as VizSystems. Node HTML elements
            use matching left/top% so dots register with SVG edge endpoints. */}
        <svg
          className="wdat-mesh-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {EDGE_DATA.map(e => (
            <g key={e.key}>
              {/* Edge draws in via CSS stroke-dashoffset keyed to --enter + --i.
                  pathLength="1" normalizes dash math to 0–1 range. */}
              <path
                className="wdat-edge"
                d={e.d}
                pathLength="1"
                style={{ '--i': e.stagger }}
              />
              {/* Flowing-row pulse — SMIL, matches .wsys-pulse-dot precedent.
                  Runs continuously; the dissolve opacity hides it when off-snap. */}
              <circle className="wdat-pulse-dot" r="1.2">
                <animate
                  attributeName="cx"
                  from={e.x1} to={e.x2}
                  dur="0.65s"
                  begin={e.begin}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  from={e.y1} to={e.y2}
                  dur="0.65s"
                  begin={e.begin}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  keyTimes="0;0.12;0.88;1"
                  dur="0.65s"
                  begin={e.begin}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          ))}
        </svg>

        {/* ── HTML layer: plan nodes (dot + label) ─────────────────────────────
            Positioned in the same % coordinate space as the SVG viewBox so dot
            centers register with edge endpoints. Opacity driven by --enter + --i. */}
        {DATA.planNodes.map(node => (
          <div
            key={node.id}
            className={`wdat-node${node.id === 'emit' ? ' wdat-node--emit' : ''}`}
            style={{
              left:  `${node.naiveX}%`,
              top:   `${node.naiveY}%`,
              '--i': NODE_STAGGER[node.id],
            }}
          >
            <span className="wdat-node-dot" />
            <span className="wdat-node-label">{node.label}</span>
          </div>
        ))}

        {/* ── Corner readouts — unboxed, no border (mirrors .wsys-status) ─────── */}
        <motion.span
          className="wdat-readout wdat-counter"
          style={{ opacity: isFinal ? 1 : costOp }}
        >
          {DATA.rowCounterLabel}{' '}
          <b ref={counterEl}>{isFinal ? '4,821,094' : '0'}</b>
        </motion.span>

        <motion.span
          className="wdat-readout wdat-table"
          style={{ opacity: isFinal ? 1 : costOp }}
        >
          {DATA.tableLabel}
        </motion.span>

        <motion.span
          className="wdat-readout wdat-cost"
          style={{ opacity: isFinal ? 1 : costOp }}
        >
          {DATA.costLabel}
        </motion.span>

      </motion.div>
    </motion.div>
  )
}
