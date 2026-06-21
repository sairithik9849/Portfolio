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

// ── Peak border color values (isFinal shortcut) ────────────────────────────
// accent-2 = rgba(232, 196, 122, …)
const BORDER_FINAL = {
  l1: 'rgba(232, 196, 122, 0.38)',
  l2: 'rgba(232, 196, 122, 0.45)',
  l3: 'rgba(232, 196, 122, 0.52)',
  l4: 'rgba(232, 196, 122, 0.58)',
}
// Edge-lighting (inset highlights + drop shadows) is baked into the Framer
// boxShadow string because Framer's inline boxShadow fully overrides CSS
// box-shadow — there is no merging. L3/L4 use CSS box-shadow (no Framer override).
const GLOW_FINAL = {
  l1: 'inset 0 1px 0 rgba(237, 237, 223, 0.07), inset 0 -1px 0 rgba(0, 0, 0, 0.5), 0 6px 16px rgba(0, 0, 0, 0.45), 0 0 10px rgba(232, 196, 122, 0.14)',
  l2: 'inset 0 1px 0 rgba(237, 237, 223, 0.09), inset 0 -1px 0 rgba(0, 0, 0, 0.45), 0 8px 18px rgba(0, 0, 0, 0.42), 0 0 10px rgba(232, 196, 122, 0.17)',
  l3: '0 0 10px rgba(232, 196, 122, 0.20)',
}

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
    // Both active and inactive start from 0 (flat/combined) so entering the
    // section always resets to the stacked state before revealing the anatomy.
    // Active runs slightly slower (5.0s) to dwell longer at the expanded reveal.
    const keyframes = [0, 1, 1, 0, 0]
    const duration  = isActive ? CYCLE_DURATION_ACTIVE : CYCLE_DURATION
    const times     = CYCLE_TIMES
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

  // Background glow — tightened so it hugs the stack rather than filling the panel.
  // Peak scale pulled in from 1.26→1.08; opacity from 0.95→0.70 to keep the
  // stack itself (not atmospheric haze) as the visual hero at peak.
  const glowOp = useTransform(pulseT, [0, 1], [0.25, 0.70])
  const glowSc = useTransform(pulseT, [0, 1], [0.88, 1.08])

  // Widget layer
  const widgetOp   = useTransform(pulseT, [0, 1], [0.72, 1.0])
  const sparkShift = useTransform(pulseT, [0, 1], [0, -6])

  // ── Layer tag opacity — fades in as the stack opens (earlier than pulse) ──
  // Ramps 0→1 between t=0.2 and t=0.7 so labels arrive with the Z-separation,
  // not after it, making slabs feel immediately labeled as they peel apart.
  const labelOp = useTransform(t, [0.2, 0.7], [0, 1], { clamp: true })

  // ── Layer peel opacity ────────────────────────────────────────────────────
  // L4 stays dominant (0.92) at peak — the glass is the hero, not the void.
  // Physical Z-separation (200px translateZ) reveals the slabs below at the
  // isometric tilt without requiring transparency to do the work.
  const l4PeelOp = useTransform(t, [0.35, 1], [1, 0.75], { clamp: true })
  const l3PeelOp = useTransform(t, [0.35, 1], [1, 0.96], { clamp: true })
  const l3Op     = useTransform([l3PeelOp, widgetOp], ([peel, widget]) => peel * widget)

  // ── Light blob — persistent once layers open (t-driven) ──────────────────
  const lightBlobOp = useTransform(t, [0, 0.25, 1], [0, 0.22, 0.82], { clamp: true })

  // Cast shadow
  const shadowY   = useTransform(t, [0, 1], [0, 36])
  const shadowScX = useTransform(t, [0, 1], [0.5, 1.15])
  const shadowOp  = useTransform(t, [0, 0.15, 1], [0, 0, 0.55])

  const pulseOpStr = useTransform(pulseT, v => v.toFixed(3))

  // ── Layer border color — accent-2 (gold) that blooms as layers peel ───────
  // Each layer has a slight stagger matching its Z-separation lag so the
  // border appears to "arrive" with the layer rather than before or after it.
  const l1BorderOp = useTransform(t, [0.08, 1], [0, 0.38], { clamp: true })
  const l2BorderOp = useTransform(t, [0.12, 1], [0, 0.45], { clamp: true })
  const l4BorderOp = useTransform(t, [0,    1], [0.15, 0.58], { clamp: true })

  // Convert opacity to full rgba string (Framer applies this as inline borderColor)
  const l1BorderColor = useTransform(l1BorderOp, v => `rgba(232, 196, 122, ${v.toFixed(3)})`)
  const l2BorderColor = useTransform(l2BorderOp, v => `rgba(232, 196, 122, ${v.toFixed(3)})`)
  const l4BorderColor = useTransform(l4BorderOp, v => `rgba(232, 196, 122, ${v.toFixed(3)})`)

  // Framer inline boxShadow fully overrides CSS box-shadow, so edge lighting
  // (inset highlights + drop shadows) is composed here alongside the gold glow.
  // At t=0: edge lights are static; the gold term is transparent. At t=1: gold
  // blooms in to match GLOW_FINAL. L3 uses CSS box-shadow (no Framer override).
  const l1Glow = useTransform(l1BorderOp, v =>
    `inset 0 1px 0 rgba(237, 237, 223, 0.07), inset 0 -1px 0 rgba(0, 0, 0, 0.5), 0 6px 16px rgba(0, 0, 0, 0.45), 0 0 10px rgba(232, 196, 122, ${(v * 0.37).toFixed(3)})`
  )
  const l2Glow = useTransform(l2BorderOp, v =>
    `inset 0 1px 0 rgba(237, 237, 223, 0.09), inset 0 -1px 0 rgba(0, 0, 0, 0.45), 0 8px 18px rgba(0, 0, 0, 0.42), 0 0 10px rgba(232, 196, 122, ${(v * 0.38).toFixed(3)})`
  )

  // ── Data particle — rises through layers at pulse peak ────────────────────
  const particleY  = useTransform(pulseT, [0, 1], ['78%', '12%'])
  const particleX  = useTransform(pulseT, [0, 1], ['54%', '44%'])
  const particleOp = useTransform(pulseT, [0, 0.12, 0.80, 1], [0, 1, 0.9, 0])

  const sparkPoints                = buildSparkPoints(sparkData)
  const { dash: ringDash, gap: ringGap } = buildRingDash(ringPct)
  const ringLabel                  = `${Math.round(ringPct * 100)}%`

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
          opacity: isFinal ? 0.70 : glowOp,
          scale:   isFinal ? 1.06 : glowSc,
        }}
      />

      {/* ── 3D stage ────────────────────────────────────────────────────── */}
      <div className="wifc-stage">

        {/* ── Data particle — flat 2D above 3D card ────────────────────── */}
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

          {/* ── LAYER 1 — Raw Data Stream ─────────────────────────────────
                border: set in CSS as transparent 1px; borderColor animated here */}
          <motion.div
            className="wifc-layer wifc-layer--raw"
            style={{
              borderColor: isFinal ? BORDER_FINAL.l1 : l1BorderColor,
              boxShadow:   isFinal ? GLOW_FINAL.l1   : l1Glow,
            }}
          >
            <div className="wifc-raw-track" aria-hidden="true">
              <div className="wifc-raw-field" />
            </div>
            {/* Layer identity tag — fades in as the stack opens */}
            <motion.span
              className="wifc-layer-tag"
              aria-hidden="true"
              style={{ opacity: isFinal ? 1 : labelOp }}
            >
              {DATA.layerTags[0]}
            </motion.span>
          </motion.div>

          {/* ── Cast shadow ──────────────────────────────────────────────── */}
          <motion.div
            className="wifc-shadow"
            aria-hidden="true"
            style={{
              translateY: isFinal ? 36   : shadowY,
              scaleX:     isFinal ? 1.15 : shadowScX,
              opacity:    isFinal ? 0.55 : shadowOp,
            }}
          />

          {/* ── LAYER 2 — Logic Grid ──────────────────────────────────────
                border: set in CSS as transparent 1px; borderColor animated here */}
          <motion.div
            className="wifc-layer wifc-layer--logic"
            style={{
              translateZ:    isFinal ? `${PEAK_Z_L2}px` : zL2,
              '--pulse-op':  isFinal ? '1' : pulseOpStr,
              borderColor:   isFinal ? BORDER_FINAL.l2 : l2BorderColor,
              boxShadow:     isFinal ? GLOW_FINAL.l2   : l2Glow,
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
            <motion.span
              className="wifc-layer-tag"
              aria-hidden="true"
              style={{ opacity: isFinal ? 1 : labelOp }}
            >
              {DATA.layerTags[1]}
            </motion.span>
          </motion.div>

          {/* ── LAYER 3 — Insight Widgets ─────────────────────────────────
                border: set in CSS as transparent 1px; borderColor animated here */}
          <motion.div
            className="wifc-layer wifc-layer--widgets"
            style={{
              translateZ: isFinal ? `${PEAK_Z_L3}px` : zL3,
              opacity:    isFinal ? 0.96 : l3Op,
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

            <motion.span
              className="wifc-layer-tag"
              aria-hidden="true"
              style={{ opacity: isFinal ? 1 : labelOp }}
            >
              {DATA.layerTags[2]}
            </motion.span>
          </motion.div>

          {/* ── LAYER 4 — Glass control ───────────────────────────────────
                CSS already supplies border: 1px solid var(--line-2).
                borderColor inline overrides just the color at runtime.
                Opacity stays at 0.92 at peak — hierarchy lives in Z-separation,
                not in making the hero layer transparent. ── */}
          <motion.div
            className="wifc-layer wifc-layer--glass"
            style={{
              translateZ:  isFinal ? `${PEAK_Z_L4}px` : zL4,
              opacity:     isFinal ? 0.75 : l4PeelOp,
              borderColor: isFinal ? BORDER_FINAL.l4 : l4BorderColor,
            }}
          >
            <motion.div
              className="wifc-light-blob"
              aria-hidden="true"
              style={{ opacity: isFinal ? 0.75 : lightBlobOp }}
            />
            {/* Hero layer tag — lime accent to match its top-of-hierarchy status */}
            <motion.span
              className="wifc-layer-tag wifc-layer-tag--hero"
              aria-hidden="true"
              style={{ opacity: isFinal ? 1 : labelOp }}
            >
              {DATA.layerTags[3]}
            </motion.span>

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
