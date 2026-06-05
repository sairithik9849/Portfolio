import { useTransform, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'

const DATA = WID_VIZ.data
const N    = 5
// 5 nodes, 4 edges — each must have its own hook call (no .map() with hooks).
// Thresholds evenly divide [0,1] into 5 windows.
const T = [0, 0.2, 0.4, 0.6, 0.8, 1.0]

export default function VizData({ progress, index, isActive, reduced, frozen }) {
  const isFinal = reduced || frozen

  const { dissolveIn, enterIn } = widSlice(index, N)

  // ── scroll clock — all hooks called unconditionally ───────────────────────
  const dissolve = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })
  const scale    = useTransform(dissolve, [0, 1], [0.985, 1])
  const enter    = useTransform(progress, enterIn, [0, 1], { clamp: true })

  // Per-node opacities — declared individually to satisfy rules-of-hooks.
  const node0op = useTransform(enter, [T[0], T[1]], [0, 1], { clamp: true })
  const node1op = useTransform(enter, [T[1], T[2]], [0, 1], { clamp: true })
  const node2op = useTransform(enter, [T[2], T[3]], [0, 1], { clamp: true })
  const node3op = useTransform(enter, [T[3], T[4]], [0, 1], { clamp: true })
  const node4op = useTransform(enter, [T[4], T[5]], [0, 1], { clamp: true })
  const nodeOpacities = [node0op, node1op, node2op, node3op, node4op]

  // Per-edge opacities — edge i connects node i to node i+1.
  const edge0op = useTransform(enter, [T[1], T[2]], [0, 1], { clamp: true })
  const edge1op = useTransform(enter, [T[2], T[3]], [0, 1], { clamp: true })
  const edge2op = useTransform(enter, [T[3], T[4]], [0, 1], { clamp: true })
  const edge3op = useTransform(enter, [T[4], T[5]], [0, 1], { clamp: true })
  const edgeOpacities = [edge0op, edge1op, edge2op, edge3op]

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
      <div className="wdat-tree">
        {DATA.planNodes.map((node, i) => (
          <div key={node.id}>
            {i > 0 && (
              <motion.div
                className="wdat-edge"
                style={{ opacity: isFinal ? 1 : edgeOpacities[i - 1] }}
              />
            )}
            <motion.div
              className="wdat-node"
              style={{ opacity: isFinal ? 1 : nodeOpacities[i] }}
            >
              <span
                className="wdat-node-bullet"
                style={node.id === 'emit' ? { background: 'var(--accent)' } : {}}
              />
              <span className="wdat-node-label">{node.label}</span>
            </motion.div>
          </div>
        ))}
      </div>

      <div className="wdat-footer">
        <span className="wdat-counter">
          {DATA.rowCounterLabel}{' '}
          <span ref={counterEl} style={{ color: 'var(--accent)' }}>
            {isFinal ? '4,821,094' : '0'}
          </span>
        </span>
        <motion.span
          className="wdat-cost"
          style={{ opacity: isFinal ? 1 : node4op }}
        >
          {DATA.costLabel}
        </motion.span>
      </div>
    </motion.div>
  )
}
