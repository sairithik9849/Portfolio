import { useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'

const DATA = WID_VIZ.interface
const N    = 5

// ── State B (isometric peak) geometry ────────────────────────────────────────
// rotateX:55deg, rotateZ:-35deg → clean isometric dimetric projection.
const PEAK_ROTATE_X = 55
const PEAK_ROTATE_Z = -35
const PEAK_Z_L4     = 200  // glass — furthest (covers all in flat State A)
const PEAK_Z_L3     = 130  // insight widgets
const PEAK_Z_L2     = 60   // logic grid
// L1 (raw stream) stays at z=0 — the floor.

// Peel stagger fractions: L4 leads separation, L2 lags most.
// useTransform clamps so pre-lag values resolve to 0 translateZ.
const L3_LAG = 0.04
const L2_LAG = 0.08

// Breathing cycle (idle): flat → push-out (1.3s) → peak hold (1.5s) → collapse (1.2s) → flat hold (0.5s) = 4.5s.
const CYCLE_DURATION = 4.5
const CYCLE_TIMES    = [0, 0.2889, 0.622, 0.889, 1]

// Breathing cycle (active entry): peak hold (1.5s) → collapse (1.3s) → flat hold (0.7s) → push-out (1.5s) = 5.0s.
const CYCLE_DURATION_ACTIVE = 5.0
const CYCLE_TIMES_ACTIVE    = [0, 0.30, 0.56, 0.70, 1]

// ── Layer 3 widget geometry (precomputed at module load) ──────────────────────
// Sparkline — SVG 94×29 viewBox, maps 12 sample values to x/y coords.
const SPARK_W = 94
const SPARK_H = 29
const SPARK_POINTS = DATA.spark
  .map((v, i) => `${(i / (DATA.spark.length - 1)) * SPARK_W},${SPARK_H - (v / 100) * SPARK_H}`)
  .join(' ')

// Ring — SVG 40×40 viewBox, r=15 → circumference ≈ 94.25.
// Dash covers ringPct of the arc; gap covers the remainder.
const RING_R    = 15
const RING_CIRC = 2 * Math.PI * RING_R
const RING_DASH = +(DATA.ringPct * RING_CIRC).toFixed(2)
const RING_GAP  = +((1 - DATA.ringPct) * RING_CIRC).toFixed(2)

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
    // When the user enters this tab, snap to peak (t=1) immediately and cycle
    // from there: peak-hold → collapse → flat-hold → push-out → repeat.
    // When idle (not active), run the original flat-first cycle.
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
    // t is a stable MotionValue ref — intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinal, isActive])

  // ── Card rotation ─────────────────────────────────────────────────────────
  const rotateX = useTransform(t, [0, 1], [0, PEAK_ROTATE_X])
  const rotateZ = useTransform(t, [0, 1], [0, PEAK_ROTATE_Z])

  // ── Layer Z-separation with peel stagger ──────────────────────────────────
  const zL4 = useTransform(t, [0,        1], [0, PEAK_Z_L4], { clamp: true })
  const zL3 = useTransform(t, [L3_LAG,   1], [0, PEAK_Z_L3], { clamp: true })
  const zL2 = useTransform(t, [L2_LAG,   1], [0, PEAK_Z_L2], { clamp: true })

  // ── Pulse — fires sharply as layers reach peak separation ─────────────────
  // Ramps 0→1 only in the final 35% of the push-out (t_value 0.65→1),
  // then reverses symmetrically during the collapse. Peaks during hold.
  const pulseT = useTransform(t, [0, 0.65, 1], [0, 0, 1], { clamp: true })

  // Background glow div (flat 2D, sibling of stage — NOT inside preserve-3d).
  // Animating filter on the card itself breaks WebKit Z-sort; this avoids that.
  const glowOp = useTransform(pulseT, [0, 1], [0.3,  0.9])
  const glowSc = useTransform(pulseT, [0, 1], [0.88, 1.22])

  // Widget layer brightens as pulse hits Layer 2
  const widgetOp   = useTransform(pulseT, [0, 1], [0.6, 1.0])
  // Sparkline nudges left (small translateX) when pulse hits
  const sparkShift = useTransform(pulseT, [0, 1], [0, -6])

  // ── Layer peel opacity — upper layers fade as they separate so lower layers
  // show through. Starts fading at t=0.35 (visible separation begins) and
  // reaches minimum at t=1 (peak). Combined with widgetOp for L3.
  const l4PeelOp = useTransform(t, [0.35, 1], [1, 0.30], { clamp: true })
  const l3PeelOp = useTransform(t, [0.35, 1], [1, 0.65], { clamp: true })
  const l3Op     = useTransform([l3PeelOp, widgetOp], ([peel, widget]) => peel * widget)

  // Light blob on L4 glass underside — radial-gradient, opacity only.
  // NO filter:blur (repaint-heavy); the gradient itself achieves the diffuse look.
  const lightBlobOp = useTransform(pulseT, [0, 1], [0, 0.75])

  // Cast shadow — in-card plane, driven by t (same pattern as previous build).
  const shadowY   = useTransform(t, [0, 1], [0,   36])
  const shadowScX = useTransform(t, [0, 1], [0.5, 1.15])
  const shadowOp  = useTransform(t, [0, 0.15, 1], [0, 0, 0.55])

  // CSS var string for the pulse comet opacity — consumed by .wifc-route-pulse
  const pulseOpStr = useTransform(pulseT, v => v.toFixed(3))

  return (
    <motion.div
      className="widviz-layer widviz-interface"
      style={{ opacity: isFinal ? 1 : dissolve, scale: isFinal ? 1 : scale }}
    >

      {/* ── Background glow — flat 2D div behind the 3D stage.
              MUST remain outside .wifc-card (preserve-3d) — applying any filter
              to a preserve-3d element breaks Z-sorting in WebKit/Safari. ──── */}
      <motion.div
        className="wifc-glow"
        aria-hidden="true"
        style={{
          opacity: isFinal ? 0.9  : glowOp,
          scale:   isFinal ? 1.22 : glowSc,
        }}
      />

      {/* ── 3D stage — establishes perspective for the card ─────────────────── */}
      <div className="wifc-stage">

        {/* ── 3D card — all four layers separate on Z inside preserve-3d ─────── */}
        <motion.div
          className="wifc-card"
          style={{
            rotateX: isFinal ? PEAK_ROTATE_X : rotateX,
            rotateZ: isFinal ? PEAK_ROTATE_Z : rotateZ,
          }}
        >

          {/* ── LAYER 1 — Raw Data Stream (chaos) ─────────────────────────────
                One scrolling track div → zero per-glyph DOM nodes.
                The dense data pattern is a repeating SVG background-image tile
                defined in CSS (.wifc-raw-field). ─────────────────────────── */}
          <div className="wifc-layer wifc-layer--raw">
            <div className="wifc-raw-track" aria-hidden="true">
              <div className="wifc-raw-field" />
            </div>
          </div>

          {/* ── Cast shadow — in-card plane grounding the tilt ──────────────── */}
          <motion.div
            className="wifc-shadow"
            aria-hidden="true"
            style={{
              translateY: isFinal ? 36    : shadowY,
              scaleX:     isFinal ? 1.15  : shadowScX,
              opacity:    isFinal ? 0.55  : shadowOp,
            }}
          />

          {/* ── LAYER 2 — Logic & Orchestration Grid (filter) ─────────────────
                SVG circuit paths + structural node dots.
                --pulse-op CSS var gates the traveling lime comet opacity. ── */}
          <motion.div
            className="wifc-layer wifc-layer--logic"
            style={{
              translateZ:     isFinal ? `${PEAK_Z_L2}px` : zL2,
              '--pulse-op':   isFinal ? '1' : pulseOpStr,
            }}
          >
            <svg
              className="wifc-logic-svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {/* Structural routing lines — dim base, brightened by --pulse-op */}
              {DATA.routePaths.map(p => (
                <path key={`s-${p.id}`} className="wifc-route-line" d={p.d} />
              ))}
              {/* Traveling pulse comets — continuous CSS anim, opacity gated by --pulse-op */}
              {DATA.routePaths.map(p => (
                <path
                  key={`c-${p.id}`}
                  className="wifc-route-pulse"
                  d={p.d}
                  pathLength="1"
                />
              ))}
              {/* Empty structural nodes at intersections */}
              {DATA.gridNodes.map(n => (
                <circle key={n.id} className="wifc-gridnode" cx={n.x} cy={n.y} r="2.2" />
              ))}
            </svg>
          </motion.div>

          {/* ── LAYER 3 — Insight Widgets (synthesis) ─────────────────────────
                Three floating UI widgets. Brightness tied to pulseT so they
                "light up" when the logic layer's pulse hits them. ──────── */}
          <motion.div
            className="wifc-layer wifc-layer--widgets"
            style={{
              translateZ: isFinal ? `${PEAK_Z_L3}px` : zL3,
              opacity:    isFinal ? 0.65 : l3Op,
            }}
          >
            {/* Sparkline — nudges left when pulse hits (translateX) */}
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
                <polyline className="wifc-spark-line" points={SPARK_POINTS} />
              </svg>
            </motion.div>

            {/* Rolling metric counter */}
            <div className="wifc-widget wifc-widget--counter">
              <span className="wifc-counter-val">{DATA.counterValue}</span>
              <span className="wifc-counter-label">{DATA.counterLabel}</span>
            </div>

            {/* Resource allocation ring */}
            <div className="wifc-widget wifc-widget--ring">
              <svg className="wifc-ring-svg" viewBox="0 0 40 40" aria-hidden="true">
                <circle className="wifc-ring-track" cx="20" cy="20" r={RING_R} />
                <circle
                  className="wifc-ring-fill"
                  cx="20" cy="20" r={RING_R}
                  strokeDasharray={`${RING_DASH} ${RING_GAP}`}
                />
              </svg>
              <div className="wifc-ring-labels">
                <span className="wifc-ring-pct">{DATA.ringLabel}</span>
                <span className="wifc-ring-title">{DATA.ringTitle}</span>
              </div>
            </div>
          </motion.div>

          {/* ── LAYER 4 — Human Interface (glass control) ─────────────────────
                Frosted glass panel. Furthest Z — covers all machinery in flat
                State A so the viewer sees only a clean dashboard.
                .wifc-light-blob is a radial-gradient div (NO filter:blur)
                that simulates the refracted glow from layers below. ──────── */}
          <motion.div
            className="wifc-layer wifc-layer--glass"
            style={{
              translateZ: isFinal ? `${PEAK_Z_L4}px` : zL4,
              opacity:    isFinal ? 0.30 : l4PeelOp,
            }}
          >
            {/* Hybrid refraction — radial-gradient blob on the glass underside */}
            <motion.div
              className="wifc-light-blob"
              aria-hidden="true"
              style={{ opacity: isFinal ? 0.75 : lightBlobOp }}
            />

            <div className="wifc-glass-inner">
              {/* Header — personal philosophy */}
              <div className="wifc-glass-row wifc-glass-row--head">
                <span className="wifc-glass-title">{DATA.panelTitle}</span>
              </div>

              {/* Metrics — two real perf targets, not generic labels */}
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

              {/* Tech stack — the four libraries actually powering this */}
              <div className="wifc-tech-row" aria-hidden="true">
                {DATA.techStack.map(chip => (
                  <span key={chip} className="wifc-tech-chip">{chip}</span>
                ))}
              </div>

              {/* Immersive Motion status badges */}
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

              {/* Slim status indicator bars */}
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
