// Dummy animation — proves the Agents dwell runway scrubs correctly.
// Replace this entire file when building the real Agents viz.
import { useMotionValue, useTransform, motion } from 'framer-motion'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'

const DATA = WID_VIZ.agents
const N    = 5

export default function VizAgents({ progress, agentsProgress, index, reduced, frozen }) {
  const isFinal = reduced || frozen

  // Cross-dissolve: fade in as user approaches Agents, hold at 1 during dwell.
  // widSlice for index=4, n=5 → snap=1.0, dissolveIn=[0.75, 1, 1.25]
  // useTransform clamps so the [1.25] side stays at 0 (never reached in the new
  // two-phase track — wordProg maxes out at 1.0 = snap point, not beyond it).
  const { dissolveIn } = widSlice(index, N)
  const dissolve = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })

  // Dwell channel: use the agentsProgress MotionValue when live, or a static
  // completed value for frozen/mobile/reduced-motion (final frame shown at rest).
  const fallback = useMotionValue(isFinal ? 1 : 0)
  const dwell    = agentsProgress ?? fallback

  // Exit fade: ramp opacity to 0 over the last 10% of the dwell so the viz
  // disappears exactly as Execution Log snaps back, and reappears on reverse-scroll.
  const exitFade    = useTransform(dwell, [0.5, 1], [1, 0], { clamp: true })
  const layerOpacity = useTransform([dissolve, exitFade], ([d, e]) => d * e)

  // Progress bar scaleX: 0→1 across the dwell.
  const barScale = useTransform(dwell, [0, 1], [0, 1])

  // Percentage readout label.
  const pctLabel = useTransform(dwell, v => `${Math.round(v * 100)}%`)

  // Cycle word opacities — THINK lights first, then ACT, then OBSERVE.
  // Each word occupies a third of the dwell range with a small overlap.
  const thinkOp   = useTransform(dwell, [0,    0.15, 0.45], [0.25, 1,    0.35], { clamp: true })
  const actOp     = useTransform(dwell, [0.25, 0.50, 0.75], [0.25, 1,    0.35], { clamp: true })
  const observeOp = useTransform(dwell, [0.60, 0.80, 1.0 ], [0.25, 1,    1.0 ], { clamp: true })
  const cycleOps  = [thinkOp, actOp, observeOp]

  return (
    <motion.div
      className="widviz-layer widviz-agents"
      style={{
        opacity:  isFinal ? 1 : layerOpacity,
        display:  'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem',
        padding: '2rem',
        height: '100%',
      }}
    >
      {/* Kicker */}
      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--lime, #c8f135)', opacity: 0.6 }}>
        {DATA.kicker}
      </span>

      {/* Cycle nodes: THINK · ACT · OBSERVE */}
      <div style={{ display: 'flex', gap: '2rem' }}>
        {DATA.cycle.map((label, i) => (
          <motion.span
            key={label}
            style={{
              fontFamily: 'monospace',
              fontSize: '1.1rem',
              letterSpacing: '0.15em',
              color: 'var(--lime, #c8f135)',
              opacity: isFinal ? (i === 2 ? 1 : 0.35) : cycleOps[i],
            }}
          >
            {label}
          </motion.span>
        ))}
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: '240px',
          height: '3px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <motion.div
          style={{
            height: '100%',
            background: 'var(--lime, #c8f135)',
            transformOrigin: 'left center',
            scaleX: isFinal ? 1 : barScale,
          }}
        />
      </div>

      {/* Percent readout */}
      <motion.span
        style={{
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          color: 'var(--lime, #c8f135)',
          opacity: 0.7,
        }}
      >
        {isFinal ? '100%' : pctLabel}
      </motion.span>
    </motion.div>
  )
}
