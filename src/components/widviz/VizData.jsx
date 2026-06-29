import { useEffect, useRef } from 'react'
import { motion, useTransform } from 'framer-motion'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'

const DATA = WID_VIZ.data
const N    = 5

// ── Wall-clock phase timeline (ms after the DATA snap activates) ────────────
// NOISE: pure static so the mess registers. SWEEP: front travels X0→X1 and
// resolves dots onto the curve. SIGNAL: locked, holds until deactivation.
const NOISE_HOLD_MS = 900
const SWEEP_MS      = 1800
const LOCK_MS       = NOISE_HOLD_MS + SWEEP_MS

// ── Field-space tuning constants (0–100 panel units) ────────────────────────
const RESOLVE_BAND = 8     // trailing band behind the front where a dot lerps onto the curve
const FLARE_BAND   = 5     // half-width of the flare pulse around the sweep line
const FLARE_SCALE  = 0.9   // extra dot scale at flare peak (1 → 1.9)
const DRIFT_AMP    = 3.2   // ambient noise drift radius
const JITTER_AMP   = 0.9   // unresolved static jitter amplitude
const BREATH_AMP   = 0.7   // resolved on-curve breathing amplitude
const RESOLVE_LAG  = 160   // ms easing constant — dots trail the front like a wake

// Counter scramble: update interval stretches as the lock approaches —
// the deceleration IS the radio lock-on feel.
const COUNTER_FAST_MS = 140
const COUNTER_SLOW_MS = 420
const COUNTER_SPREAD  = 3_500_000  // scramble amplitude around lockValue at sweep start

// Loop: hold the SIGNAL state for this long before restarting from NOISE.
const SIGNAL_HOLD_MS = 1400

// Dot color: all dots render at the accent color in CSS.
// The noise-to-signal transition is driven entirely via opacity, which is
// a composited property and never causes a style-recalc + paint.
// (Previously a COLOR_LUT wrote el.style.background per-dot per-frame — 110
// background rewrites per rAF tick — causing a large paint batch.)

const smooth = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
const lerp   = (a, b, t) => a + (b - a) * t
const clamp  = (v, a, b) => (v < a ? a : v > b ? b : v)

export default function VizData({ progress, index, isActive, reduced, frozen }) {
  const isFinal = reduced || frozen

  const { dissolveIn, enterIn } = widSlice(index, N)

  // ── scroll clock — all hooks called unconditionally ───────────────────────
  const dissolve  = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })
  const scale     = useTransform(dissolve, [0, 1], [0.985, 1])
  const enter     = useTransform(progress, enterIn,  [0, 1],    { clamp: true })
  // Readouts fade in as the snap lands — mirrors VizSystems' statusOp.
  const readoutOp = useTransform(enter, [0.8, 1], [0, 1], { clamp: true })

  // ── refs for direct-DOM rAF writes (zero React re-renders on the wall clock)
  const fieldRef   = useRef(null)
  const dotElsRef  = useRef([])
  const curveRef   = useRef(null)
  const sweepRef   = useRef(null)
  const stageRef   = useRef(null)
  const counterRef = useRef(null)

  // Activation clock + counter state shared between the isActive effect and
  // the rAF closure (the rAF runs for the full component lifetime).
  const isActiveRef = useRef(isActive)
  const t0Ref       = useRef(null)
  const counterSt   = useRef({ locked: false, nextAt: 0 })

  useEffect(() => {
    isActiveRef.current = isActive
    if (isActive) {
      if (t0Ref.current === null) t0Ref.current = performance.now()
    } else {
      // Reset so the next activation replays the full noise → sweep → lock arc.
      t0Ref.current = null
      counterSt.current.locked = false
      counterSt.current.nextAt = 0
    }
  }, [isActive])

  // ── Wall clock — single rAF, VizSystems pattern ───────────────────────────
  // Runs for the component lifetime; skips all frame work while the layer is
  // dissolved out (dissolve == 0) so mid-section scrolling costs nothing.
  useEffect(() => {
    if (isFinal) return

    const P = DATA.particles
    const n = P.length

    // Per-dot eased resolve factor — eases toward the front-derived target so
    // the convergence trails the sweep like a wake (and de-res on deactivation
    // is a fade, not a jump cut).
    const rfCur = new Float32Array(n)

    let panelRect = null
    let rectAge   = Infinity   // force a bounds query on the first frame
    let lastT     = performance.now()
    let lastStage = null
    let raf       = null

    const tick = t => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(t - lastT, 50)  // cap to absorb tab-blur spikes
      lastT = t

      if (dissolve.get() <= 0.001) return  // invisible — skip everything

      // Re-query field bounds periodically — handles pin reflow and resize.
      // Must use the field (not the panel) so px offset math matches the
      // left/top % positions which are relative to the field, not the panel.
      rectAge += dt
      if (!panelRect || rectAge > 4000) {
        panelRect = fieldRef.current?.getBoundingClientRect() ?? null
        rectAge = 0
      }
      const pw = panelRect?.width  ?? 400
      const ph = panelRect?.height ?? 400

      // ── phase clock ──────────────────────────────────────────────────────
      const t0 = t0Ref.current
      let tt = t0 === null ? 0 : t - t0

      // Loop: after the full cycle (noise + sweep + signal hold), restart.
      if (t0 !== null && tt >= LOCK_MS + SIGNAL_HOLD_MS) {
        t0Ref.current = t
        tt = 0
        counterSt.current.locked = false
        counterSt.current.nextAt = 0
      }

      let frontK, stage
      if (t0 === null || tt < NOISE_HOLD_MS) {
        frontK = 0
        stage  = 'noise'
      } else if (tt < LOCK_MS) {
        frontK = smooth((tt - NOISE_HOLD_MS) / SWEEP_MS)
        stage  = 'resolving'
      } else {
        frontK = 1
        stage  = 'signal'
      }
      // Front overshoots both bounds so edge dots fully flare and resolve.
      const front  = lerp(DATA.sweepX0 - FLARE_BAND,
                          DATA.sweepX1 + RESOLVE_BAND + FLARE_BAND, frontK)
      const sweepX = clamp(front, DATA.sweepX0, DATA.sweepX1)
      const rfEase = Math.min(1, dt / RESOLVE_LAG)

      // ── dots ─────────────────────────────────────────────────────────────
      for (let i = 0; i < n; i++) {
        const p  = P[i]
        const el = dotElsRef.current[i]
        if (!el) continue

        const target = t0 === null ? 0 : smooth(clamp((front - p.sx) / RESOLVE_BAND, 0, 1))
        rfCur[i] += (target - rfCur[i]) * rfEase
        const rf = rfCur[i]

        // Flare — pulse in a band around the visible sweep line.
        const fl = stage === 'resolving'
          ? Math.max(0, 1 - Math.abs(sweepX - p.sx) / FLARE_BAND)
          : 0

        const driftX = DRIFT_AMP * Math.sin(t * 0.0011 + p.ph)
        const driftY = DRIFT_AMP * Math.cos(t * 0.0013 + p.ph2)
        const jit    = (1 - rf) * (JITTER_AMP * Math.sin(t * 0.02 + p.ph)
                                 + 0.6 * Math.cos(t * 0.017 + p.ph2))
        const breath = rf * BREATH_AMP * Math.sin(t * 0.004 + p.sx * 0.08)

        const x = lerp(p.nx + driftX, p.sx, rf)
        const y = lerp(p.ny + driftY, p.sy, rf) + jit + breath

        // Base position is left/top %; transform adds the px offset (GPU-only).
        const offX = ((x - p.nx) / 100) * pw
        const offY = ((y - p.ny) / 100) * ph
        const s    = 1 + FLARE_SCALE * smooth(fl)
        el.style.transform =
          `translate(calc(-50% + ${offX.toFixed(1)}px), calc(-50% + ${offY.toFixed(1)}px)) scale(${s.toFixed(2)})`

        const noiseOp = 0.3 + 0.2 * Math.abs(Math.sin(t * 0.01 + p.ph))
        // Opacity drives the full noise→signal transition. The flare peak boosts
        // opacity slightly above baseline (was: also rewriting style.background per
        // dot per frame via a COLOR_LUT — 110 background rewrites per rAF caused a
        // large paint batch; opacity is composited and never triggers paint).
        el.style.opacity = clamp(lerp(noiseOp, 0.95, rf) + fl * 0.4, 0, 1).toFixed(2)
      }

      // ── curve draw — front-synced with the sweep line ────────────────────
      if (curveRef.current) {
        const cprog = clamp((front - DATA.sweepX0) / (DATA.sweepX1 - DATA.sweepX0), 0, 1)
        curveRef.current.style.strokeDashoffset = (1 - cprog).toFixed(3)
        curveRef.current.style.opacity = (cprog * 0.9).toFixed(2)
      }

      // ── sweep line ───────────────────────────────────────────────────────
      if (sweepRef.current) {
        const op = stage === 'resolving' ? 0.85 * Math.sin(Math.PI * frontK) : 0
        sweepRef.current.style.opacity   = clamp(op, 0, 0.85).toFixed(2)
        sweepRef.current.style.transform = `translateX(${((sweepX / 100) * pw).toFixed(1)}px)`
      }

      // ── stage label + phase gate (area glow / spark via CSS) ─────────────
      if (stage !== lastStage) {
        lastStage = stage
        if (stageRef.current) {
          stageRef.current.dataset.stage = stage
          stageRef.current.textContent   = DATA.stageLabels[stage]
        }
        if (fieldRef.current) fieldRef.current.dataset.phase = stage
      }

      // ── lock-on counter ──────────────────────────────────────────────────
      const cs = counterSt.current
      if (!cs.locked && t >= cs.nextAt && counterRef.current) {
        let val
        if (stage === 'noise') {
          val = Math.floor(Math.random() * 9_999_999)
          cs.nextAt = t + COUNTER_FAST_MS + Math.random() * 60
        } else if (stage === 'resolving') {
          const spread = (1 - frontK) * COUNTER_SPREAD
          val = Math.max(0, Math.round(DATA.lockValue + (Math.random() * 2 - 1) * spread))
          cs.nextAt = t + lerp(COUNTER_FAST_MS, COUNTER_SLOW_MS, frontK)
        } else {
          val = DATA.lockValue
          cs.locked = true
        }
        counterRef.current.textContent = val.toLocaleString()
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // dissolve is a stable useTransform MotionValue — intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinal])

  const lockedText = DATA.lockValue.toLocaleString()

  return (
    <motion.div
      className="widviz-layer widviz-data"
      style={{ opacity: isFinal ? 1 : dissolve, scale: isFinal ? 1 : scale }}
    >
      <div className="wdat-layout">

        {/* data-phase gates the area glow + spark in CSS; the rAF flips it
            noise → resolving → signal. Final frames pin it at signal. */}
        <div
          ref={fieldRef}
          className="wdat-field"
          data-phase={isFinal ? 'signal' : 'noise'}
        >

          {/* ── SVG layer: signal curve, area glow, traveling spark ──────────
              preserveAspectRatio="none" stretches the 0–100 viewBox to the
              field; non-scaling-stroke keeps line weights uniform.
              Dots are HTML spans — circles in a stretched SVG distort into
              ellipses (same split as VizSystems). */}
          <svg
            className="wdat-mesh-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="wdat-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#c9f558" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#c9f558" stopOpacity="0" />
              </linearGradient>
            </defs>

            <path className="wdat-area" d={DATA.curveAreaD} />

            <path
              ref={curveRef}
              className="wdat-curve"
              d={DATA.curveD}
              pathLength="1"
              vectorEffect="non-scaling-stroke"
              style={isFinal ? { strokeDashoffset: 0, opacity: 0.9 } : undefined}
            />

            {/* Spark comet — CSS dashoffset keyframe (no SMIL: distorts in
                stretched viewBox). Post-lock only; omitted from final frame. */}
            {!isFinal && (
              <path
                className="wdat-spark"
                d={DATA.curveD}
                pathLength="1"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {/* ── HTML layer: noise dots ───────────────────────────────────────
              Base position via left/top %; rAF writes transform/opacity/colour.
              Final frames settle on the curve in lime. */}
          {DATA.particles.map((p, i) => (
            <span
              key={i}
              ref={el => { dotElsRef.current[i] = el }}
              className="wdat-dot"
              style={isFinal
                ? { left: `${p.sx}%`, top: `${p.sy}%` }
                : { left: `${p.nx}%`, top: `${p.ny}%` }}
            />
          ))}

          {/* Sweep line — translateX driven by rAF, hidden outside sweep phase */}
          {!isFinal && <div ref={sweepRef} className="wdat-sweep" />}

        </div>

        {/* ── Readouts — below the field, in flow (not absolute corners) ───── */}
        <div className="wdat-meta">
          <motion.span
            className="wdat-readout wdat-counter"
            style={{ opacity: isFinal ? 1 : readoutOp }}
          >
            {DATA.rowCounterLabel}{' '}
            <b ref={counterRef}>{isFinal ? lockedText : '0'}</b>
          </motion.span>

          <motion.span
            ref={stageRef}
            className="wdat-readout wdat-stage"
            data-stage={isFinal ? 'signal' : 'noise'}
            style={{ opacity: isFinal ? 1 : readoutOp }}
          >
            {isFinal ? DATA.stageLabels.signal : DATA.stageLabels.noise}
          </motion.span>
        </div>

      </div>
    </motion.div>
  )
}
