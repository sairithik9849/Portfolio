import { useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'

const DATA = WID_VIZ.interface
const N    = 5

// State B (isometric peak) geometry — pre-derived from plan.
// rotateX:55deg, rotateZ:-35deg produces a clean isometric dimetric projection.
const PEAK_ROTATE_X  = 55
const PEAK_ROTATE_Z  = -35
const PEAK_Z_LAYER2  = 60   // px
const PEAK_Z_LAYER3  = 120  // px

// Layer 3 starts separating first (t=0), Layer 2 lags by this fraction of the driver.
// Symmetric: Layer 2 also collapses last (clamp handles out-of-range).
const L2_LAG = 0.08

// Total cycle: 3s push-out + 0.5s peak hold + 3s collapse = 6.5s
const CYCLE_DURATION = 6.5
// times for [0, peak-in, peak-out, 1] matching the flat segment:
//   peak-in  at 3/6.5  ≈ 0.4615
//   peak-out at 3.5/6.5 ≈ 0.5385
const CYCLE_TIMES    = [0, 0.4615, 0.5385, 1]

// Bar chart dimensions (SVG, 0–100 viewBox)
const BAR_COUNT  = DATA.bars.length
const BAR_W      = 7
const BAR_GAP    = 3
const BAR_TOTAL  = BAR_COUNT * BAR_W + (BAR_COUNT - 1) * BAR_GAP

export default function VizInterface({ progress, index, reduced, frozen }) {
  const isFinal = reduced || frozen

  const { dissolveIn } = widSlice(index, N)

  const dissolve = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })
  const scale    = useTransform(dissolve, [0, 1], [0.985, 1])

  // Single autonomous driver: 0=flat, 1=peak. Framer keyframes handle hold + collapse.
  const t = useMotionValue(0)

  useEffect(() => {
    if (isFinal) {
      t.set(1)
      return
    }
    const controls = animate(t, [0, 1, 1, 0], {
      duration:   CYCLE_DURATION,
      times:      CYCLE_TIMES,
      ease:       [0.4, 0, 0.2, 1],
      repeat:     Infinity,
    })
    return () => controls.stop()
    // t is a stable MotionValue ref — intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinal])

  // ── Card rotation ────────────────────────────────────────────────────────────
  const rotateX = useTransform(t, [0, 1], [0, PEAK_ROTATE_X])
  const rotateZ = useTransform(t, [0, 1], [0, PEAK_ROTATE_Z])

  // ── Layer translations ────────────────────────────────────────────────────────
  // Layer 3 leads (full t range), Layer 2 lags by L2_LAG (clamped by useTransform).
  const z3 = useTransform(t, [0, 1], [0, PEAK_Z_LAYER3])
  const z2 = useTransform(t, [L2_LAG, 1], [0, PEAK_Z_LAYER2], { clamp: true })

  // ── Data-node illumination ────────────────────────────────────────────────────
  // Opacity: dim in flat state, full at peak.
  const nodesOp = useTransform(t, [0, 1], [0.55, 1])
  // Glow strength 0→1 maps to a CSS var read by the shadow rules.
  const glowT   = useTransform(t, v => v.toFixed(3))

  // ── Cast shadow ───────────────────────────────────────────────────────────────
  // Shadow is a separate plane beneath Layer 3 — GPU transform/opacity only.
  // translateY grows positive (moves DOWN), scale grows, opacity tracks peak.
  const shadowY   = useTransform(t, [0, 1], [0,  36])
  const shadowScX = useTransform(t, [0, 1], [0.5, 1.15])
  const shadowOp  = useTransform(t, [0, 0.15, 1], [0, 0, 0.55])

  // Final frame: static State B (isFinal already covered by t.set(1) above;
  // but for SSR/frozen the transforms below safely resolve to their peak).
  const finalZ3 = `${PEAK_Z_LAYER3}px`
  const finalZ2 = `${PEAK_Z_LAYER2}px`

  return (
    <motion.div
      className="widviz-layer widviz-interface"
      style={{ opacity: isFinal ? 1 : dissolve, scale: isFinal ? 1 : scale }}
    >
      {/* Perspective wrapper — establishes 3D viewport */}
      <div className="wifc-stage">

        {/* Drifting ambient mesh gradient — sits behind Layer 1 so L3 glass refracts it */}
        <div className="wifc-ambient" aria-hidden="true" />

        {/* 3D card container — rotates as one unit; layers separate on Z inside it */}
        <motion.div
          className="wifc-card"
          style={{
            rotateX: isFinal ? PEAK_ROTATE_X : rotateX,
            rotateZ: isFinal ? PEAK_ROTATE_Z : rotateZ,
          }}
        >

          {/* ── LAYER 1 — base dashboard map ──────────────────────────────────── */}
          <div className="wifc-layer wifc-layer--base">
            {/* Grid lines via CSS background — defined in .wifc-layer--base */}
            {DATA.baseBlocks.map(b => (
              <div
                key={b.id}
                className="wifc-block"
                style={{ width: b.w, height: b.h, top: b.t, left: b.l }}
              >
                <span className="wifc-block-label">{b.label}</span>
              </div>
            ))}
          </div>

          {/* ── Cast shadow — between L1 and L2 in DOM, painted below L3 ───── */}
          <motion.div
            className="wifc-shadow"
            aria-hidden="true"
            style={{
              translateY: isFinal ? 36  : shadowY,
              scaleX:     isFinal ? 1.15 : shadowScX,
              opacity:    isFinal ? 0.55 : shadowOp,
            }}
          />

          {/* ── LAYER 2 — floating data nodes ─────────────────────────────────── */}
          <motion.div
            className="wifc-layer wifc-layer--nodes"
            style={{
              translateZ: isFinal ? finalZ2 : z2,
              opacity: isFinal ? 1 : nodesOp,
              '--glow-t': isFinal ? '1' : glowT,
            }}
          >
            {/* Mini bar chart */}
            <div className="wifc-node wifc-node--bar" style={{ left: DATA.nodes[0].x, top: DATA.nodes[0].y }}>
              <svg
                className="wifc-bar-svg"
                viewBox={`0 0 ${BAR_TOTAL} 40`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {DATA.bars.map((v, i) => {
                  const x = i * (BAR_W + BAR_GAP)
                  const h = (v / 100) * 38
                  return (
                    <rect
                      key={i}
                      x={x} y={40 - h} width={BAR_W} height={h}
                      className={i === 7 ? 'wifc-bar wifc-bar--peak' : 'wifc-bar'}
                    />
                  )
                })}
              </svg>
              <span className="wifc-node-label">{DATA.nodes[0].label}</span>
            </div>

            {/* Circular progress ring */}
            <div className="wifc-node wifc-node--ring" style={{ left: DATA.nodes[1].x, top: DATA.nodes[1].y }}>
              <svg className="wifc-ring-svg" viewBox="0 0 40 40" aria-hidden="true">
                <circle className="wifc-ring-track" cx="20" cy="20" r="15" />
                <circle className="wifc-ring-fill"  cx="20" cy="20" r="15" />
              </svg>
              <span className="wifc-node-label wifc-node-label--ring">{DATA.nodes[1].label}</span>
            </div>

            {/* Coordinate markers */}
            <div className="wifc-node wifc-node--coord" style={{ left: DATA.nodes[2].x, top: DATA.nodes[2].y }}>
              <span className="wifc-coord-dot" />
              <span className="wifc-coord-val">{DATA.nodes[2].label}</span>
            </div>
            <div className="wifc-node wifc-node--coord" style={{ left: DATA.nodes[3].x, top: DATA.nodes[3].y }}>
              <span className="wifc-coord-dot wifc-coord-dot--gold" />
              <span className="wifc-coord-val wifc-coord-val--gold">{DATA.nodes[3].label}</span>
            </div>
          </motion.div>

          {/* ── LAYER 3 — glassmorphic control panel ─────────────────────────── */}
          <motion.div
            className="wifc-layer wifc-layer--glass"
            style={{ translateZ: isFinal ? finalZ3 : z3 }}
          >
            <div className="wifc-glass-inner">
              <div className="wifc-glass-row wifc-glass-row--head">
                <span className="wifc-glass-kicker">{DATA.kicker}</span>
                <span className="wifc-glass-mode">{DATA.mode}</span>
              </div>
              <div className="wifc-glass-row wifc-glass-row--metrics">
                <div className="wifc-glass-metric">
                  <span className="wifc-glass-val">{DATA.fpsTarget}</span>
                  <span className="wifc-glass-unit">{DATA.fpsLabel}</span>
                </div>
                <div className="wifc-glass-sep" />
                <div className="wifc-glass-metric">
                  <span className="wifc-glass-val wifc-glass-val--gold">{DATA.renderLabel}</span>
                  <span className="wifc-glass-unit">{DATA.stackLabel}</span>
                </div>
              </div>
              {/* Three slim indicator lines */}
              <div className="wifc-glass-indicators" aria-hidden="true">
                <div className="wifc-glass-ind wifc-glass-ind--1" />
                <div className="wifc-glass-ind wifc-glass-ind--2" />
                <div className="wifc-glass-ind wifc-glass-ind--3" />
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </motion.div>
  )
}
