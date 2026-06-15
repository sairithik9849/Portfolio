import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'

const DATA = WID_VIZ.interface
const N    = 5

// ── State B (isometric peak) geometry ────────────────────────────────────────
const PEAK_ROTATE_X = 55
const PEAK_ROTATE_Z = -35
const PEAK_Z_L4     = 200
const PEAK_Z_L3     = 130
const PEAK_Z_L2     = 60

const L3_LAG = 0.04
const L2_LAG = 0.08

const CYCLE_DURATION        = 4.5
const CYCLE_TIMES           = [0, 0.2889, 0.622, 0.889, 1]
const CYCLE_DURATION_ACTIVE = 5.0
const CYCLE_TIMES_ACTIVE    = [0, 0.30, 0.56, 0.70, 1]

// ── Per-path pulse timing — varied durations + offsets for organic data flow ──
const PULSE_CFG = [
  { delay: '0s',      dur: '1.65s' },
  { delay: '-0.55s',  dur: '2.10s' },
  { delay: '-1.05s',  dur: '1.80s' },
  { delay: '-0.28s',  dur: '2.35s' },
  { delay: '-1.30s',  dur: '1.55s' },
  { delay: '-0.72s',  dur: '1.95s' },
  { delay: '-0.18s',  dur: '2.20s' },
  { delay: '-0.88s',  dur: '1.70s' },
]

// ── Sparkline helpers ─────────────────────────────────────────────────────────
const SPARK_W = 94
const SPARK_H = 29

function buildSparkPoints(spark) {
  return spark
    .map((v, i) => `${(i / (spark.length - 1)) * SPARK_W},${SPARK_H - (v / 100) * SPARK_H}`)
    .join(' ')
}

// ── Ring helpers ──────────────────────────────────────────────────────────────
const RING_R    = 15
const RING_CIRC = 2 * Math.PI * RING_R

function buildRingDash(pct) {
  return {
    dash: +(pct * RING_CIRC).toFixed(2),
    gap:  +((1 - pct) * RING_CIRC).toFixed(2),
  }
}

export default function VizInterface({ progress, index, isActive, reduced, frozen }) {
  const isFinal = reduced || frozen

  const { dissolveIn } = widSlice(index, N)
  const dissolve = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })
  const scale    = useTransform(dissolve, [0, 1], [0.985, 1])

  // ── Autonomous breathing driver: 0 = flat illusion, 1 = peak reveal ───────
  const t = useMotionValue(0)

  useEffect(() => {
    if (isFinal) {
      t.set(1)
      return
    }
    const keyframes = isActive ? [1, 1, 0, 0, 1] : [0, 1, 1, 0, 0]
    const duration  = isActive ? CYCLE_DURATION_ACTIVE : CYCLE_DURATION
    const times     = isActive ? CYCLE_TIMES_ACTIVE    : CYCLE_TIMES
    const controls = animate(t, keyframes, {
      duration,
      times,
      ease:   [0.4, 0, 0.2, 1],
      repeat: Infinity,
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinal, isActive])

  // ── Live counter ticker ───────────────────────────────────────────────────
  const [counterVal, setCounterVal] = useState(parseInt(DATA.counterValue, 10))
  useEffect(() => {
    if (isFinal) return
    const id = setInterval(() => {
      setCounterVal(v => {
        const delta = Math.floor(Math.random() * 28) - 11
        return Math.max(780, Math.min(980, v + delta))
      })
    }, 850)
    return () => clearInterval(id)
  }, [isFinal])

  // ── Rolling sparkline ─────────────────────────────────────────────────────
  const sparkRef = useRef([...DATA.spark])
  const [sparkData, setSparkData] = useState([...DATA.spark])
  useEffect(() => {
    if (isFinal) return
    const id = setInterval(() => {
      const next = [...sparkRef.current.slice(1), 52 + Math.floor(Math.random() * 38)]
      sparkRef.current = next
      setSparkData(next)
    }, 1050)
    return () => clearInterval(id)
  }, [isFinal])

  // ── Ring GPU% oscillation ─────────────────────────────────────────────────
  const ringPhaseRef = useRef(0)
  const [ringPct, setRingPct] = useState(DATA.ringPct)
  useEffect(() => {
    if (isFinal) return
    const id = setInterval(() => {
      ringPhaseRef.current += 0.20
      setRingPct(0.67 + Math.sin(ringPhaseRef.current) * 0.09)
    }, 380)
    return () => clearInterval(id)
  }, [isFinal])

  // ── Card rotation ─────────────────────────────────────────────────────────
  const rotateX = useTransform(t, [0, 1], [0, PEAK_ROTATE_X])
  const rotateZ = useTransform(t, [0, 1], [0, PEAK_ROTATE_Z])

  // ── Layer Z-separation with peel stagger ──────────────────────────────────
  const zL4 = useTransform(t, [0,        1], [0, PEAK_Z_L4], { clamp: true })
  const zL3 = useTransform(t, [L3_LAG,   1], [0, PEAK_Z_L3], { clamp: true })
  const zL2 = useTransform(t, [L2_LAG,   1], [0, PEAK_Z_L2], { clamp: true })

  // ── Pulse — fires sharply as layers reach peak separation ─────────────────
  const pulseT = useTransform(t, [0, 0.65, 1], [0, 0, 1], { clamp: true })

  // Background glow
  const glowOp = useTransform(pulseT, [0, 1], [0.25, 0.95])
  const glowSc = useTransform(pulseT, [0, 1], [0.88, 1.26])

  // Widget layer
  const widgetOp   = useTransform(pulseT, [0, 1], [0.72, 1.0])
  const sparkShift = useTransform(pulseT, [0, 1], [0, -6])

  // ── Layer peel opacity — FIX: L3 stays readable at peak (was 0.65, now 0.88) ──
  const l4PeelOp = useTransform(t, [0.35, 1], [1, 0.28], { clamp: true })
  const l3PeelOp = useTransform(t, [0.35, 1], [1, 0.88], { clamp: true })
  const l3Op     = useTransform([l3PeelOp, widgetOp], ([peel, widget]) => peel * widget)

  // ── Light blob — FIX: persistent once layers open (t-driven, not pulseT) ──
  // Previously: opacity 0→0.75 driven by pulseT (only at burst peak).
  // Now: ramps in as layers separate (t=0.25), stays present through peak.
  const lightBlobOp = useTransform(t, [0, 0.25, 1], [0, 0.22, 0.82], { clamp: true })

  // Cast shadow
  const shadowY   = useTransform(t, [0, 1], [0, 36])
  const shadowScX = useTransform(t, [0, 1], [0.5, 1.15])
  const shadowOp  = useTransform(t, [0, 0.15, 1], [0, 0, 0.55])

  const pulseOpStr = useTransform(pulseT, v => v.toFixed(3))

  // ── Data particle — rises through layers at pulse peak ────────────────────
  // Sits outside preserve-3d card (sibling), animates in flat stacking context.
  // Path traces isometric "up": lower-right → upper-left across the card face.
  const particleY  = useTransform(pulseT, [0, 1], ['78%', '12%'])
  const particleX  = useTransform(pulseT, [0, 1], ['54%', '44%'])
  const particleOp = useTransform(pulseT, [0, 0.12, 0.80, 1], [0, 1, 0.9, 0])

  const sparkPoints       = buildSparkPoints(sparkData)
  const { dash: ringDash, gap: ringGap } = buildRingDash(ringPct)
  const ringLabel         = `${Math.round(ringPct * 100)}%`

  return (
    <motion.div
      className="widviz-layer widviz-interface"
      style={{ opacity: isFinal ? 1 : dissolve, scale: isFinal ? 1 : scale }}
    >

      {/* ── Background glow ─────────────────────────────────────────────── */}
      <motion.div
        className="wifc-glow"
        aria-hidden="true"
        style={{
          opacity: isFinal ? 0.9  : glowOp,
          scale:   isFinal ? 1.22 : glowSc,
        }}
      />

      {/* ── 3D stage ────────────────────────────────────────────────────── */}
      <div className="wifc-stage">

        {/* ── Data particle — flat 2D, sits above 3D card in stage ─────── */}
        {!isFinal && (
          <motion.div
            className="wifc-particle"
            aria-hidden="true"
            style={{
              top:     particleY,
              left:    particleX,
              opacity: particleOp,
            }}
          />
        )}

        {/* ── 3D card ──────────────────────────────────────────────────── */}
        <motion.div
          className="wifc-card"
          style={{
            rotateX: isFinal ? PEAK_ROTATE_X : rotateX,
            rotateZ: isFinal ? PEAK_ROTATE_Z : rotateZ,
          }}
        >

          {/* LAYER 1 — Raw Data Stream */}
          <div className="wifc-layer wifc-layer--raw">
            <div className="wifc-raw-track" aria-hidden="true">
              <div className="wifc-raw-field" />
            </div>
          </div>

          {/* Cast shadow */}
          <motion.div
            className="wifc-shadow"
            aria-hidden="true"
            style={{
              translateY: isFinal ? 36   : shadowY,
              scaleX:     isFinal ? 1.15 : shadowScX,
              opacity:    isFinal ? 0.55 : shadowOp,
            }}
          />

          {/* LAYER 2 — Logic Grid */}
          <motion.div
            className="wifc-layer wifc-layer--logic"
            style={{
              translateZ:   isFinal ? `${PEAK_Z_L2}px` : zL2,
              '--pulse-op': isFinal ? '1' : pulseOpStr,
            }}
          >
            <svg
              className="wifc-logic-svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {DATA.routePaths.map(p => (
                <path key={`s-${p.id}`} className="wifc-route-line" d={p.d} />
              ))}
              {/* Each comet gets its own speed + offset — organic stagger */}
              {DATA.routePaths.map((p, i) => (
                <path
                  key={`c-${p.id}`}
                  className="wifc-route-pulse"
                  d={p.d}
                  pathLength="1"
                  style={{
                    animationDelay:    PULSE_CFG[i % PULSE_CFG.length].delay,
                    animationDuration: PULSE_CFG[i % PULSE_CFG.length].dur,
                  }}
                />
              ))}
              {DATA.gridNodes.map((n, i) => (
                <circle
                  key={n.id}
                  className="wifc-gridnode"
                  cx={n.x} cy={n.y} r="2.2"
                  style={{ animationDelay: `${i * 0.07}s` }}
                />
              ))}
            </svg>
          </motion.div>

          {/* LAYER 3 — Insight Widgets */}
          <motion.div
            className="wifc-layer wifc-layer--widgets"
            style={{
              translateZ: isFinal ? `${PEAK_Z_L3}px` : zL3,
              opacity:    isFinal ? 0.88 : l3Op,
            }}
          >
            {/* Sparkline — rolls with live data */}
            <motion.div
              className="wifc-widget wifc-widget--spark"
              style={{ x: isFinal ? -6 : sparkShift }}
            >
              <span className="wifc-widget-label">{DATA.sparkLabel}</span>
              <svg
                className="wifc-spark-svg"
                viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <polyline className="wifc-spark-line" points={sparkPoints} />
              </svg>
            </motion.div>

            {/* Live counter */}
            <div className="wifc-widget wifc-widget--counter">
              <span className="wifc-counter-val">{counterVal}</span>
              <span className="wifc-counter-label">{DATA.counterLabel}</span>
            </div>

            {/* Resource ring — GPU% oscillating */}
            <div className="wifc-widget wifc-widget--ring">
              <svg className="wifc-ring-svg" viewBox="0 0 40 40" aria-hidden="true">
                <circle className="wifc-ring-track" cx="20" cy="20" r={RING_R} />
                <circle
                  className="wifc-ring-fill"
                  cx="20" cy="20" r={RING_R}
                  strokeDasharray={`${ringDash} ${ringGap}`}
                />
              </svg>
              <div className="wifc-ring-labels">
                <span className="wifc-ring-pct">{ringLabel}</span>
                <span className="wifc-ring-title">{DATA.ringTitle}</span>
              </div>
            </div>
          </motion.div>

          {/* LAYER 4 — Glass control */}
          <motion.div
            className="wifc-layer wifc-layer--glass"
            style={{
              translateZ: isFinal ? `${PEAK_Z_L4}px` : zL4,
              opacity:    isFinal ? 0.30 : l4PeelOp,
            }}
          >
            {/* Refraction blob — now persistent once layers open */}
            <motion.div
              className="wifc-light-blob"
              aria-hidden="true"
              style={{ opacity: isFinal ? 0.75 : lightBlobOp }}
            />

            {/* Terminal scanline — sweeps glass panel on a slow loop */}
            <div className="wifc-scanline" aria-hidden="true" />

            <div className="wifc-glass-inner">
              <div className="wifc-glass-row wifc-glass-row--head">
                <span className="wifc-glass-title">{DATA.panelTitle}</span>
              </div>

              <div className="wifc-glass-row wifc-glass-row--metrics">
                <div className="wifc-glass-metric">
                  <span className="wifc-glass-val">{DATA.fpsTarget}</span>
                  <span className="wifc-glass-unit">{DATA.fpsLabel}</span>
                </div>
                <div className="wifc-glass-sep" />
                <div className="wifc-glass-metric">
                  <span className="wifc-glass-val wifc-glass-val--gold">{DATA.frameTarget}</span>
                  <span className="wifc-glass-unit">{DATA.frameLabel}</span>
                </div>
              </div>

              <div className="wifc-tech-row" aria-hidden="true">
                {DATA.techStack.map(chip => (
                  <span key={chip} className="wifc-tech-chip">{chip}</span>
                ))}
              </div>

              <div className="wifc-badge-row" aria-hidden="true">
                <div className={`wifc-status-badge${isFinal ? ' wifc-status-badge--static' : ''}`}>
                  <span className="wifc-badge-prefix">[+]</span>
                  4D_MAPPED
                </div>
                <div className={`wifc-status-badge wifc-status-badge--2${isFinal ? ' wifc-status-badge--static' : ''}`}>
                  <span className="wifc-badge-prefix">[+]</span>
                  FLUID_STATE
                </div>
              </div>

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
