import { useEffect, useRef } from 'react'
import { motion, useTransform, useMotionValue, useMotionValueEvent, animate } from 'framer-motion'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'

const DATA = WID_VIZ.backend
const N    = 5

// ── Graph layout constants ────────────────────────────────────────────────────
// Positions are stored in DATA.nodes as % of the 0–100 field.
// Convenience map keyed by id for position lookups in path helpers.
const NODE_POS = Object.fromEntries(DATA.nodes.map(n => [n.id, { x: n.x, y: n.y }]))

// ── Sparkline constants (same scale as before) ────────────────────────────────
const GW       = 230   // SVG element width and viewBox width (px)
const PAD_L    = 6
const PAD_R    = 14
const PLOT_T   = 8
const PLOT_B   = 36
const P50_MS   = 4     // baseline for calm trace
const P99_MS   = 28    // ceiling for stressed trace
const MAX_MS   = 34    // y-scale max


// ── Pure sparkline helpers ────────────────────────────────────────────────────

const msToY = ms => {
  const clamped = Math.min(Math.max(ms, 0), MAX_MS)
  return PLOT_B - (clamped / MAX_MS) * (PLOT_B - PLOT_T)
}

const xAt = (i, n) => PAD_L + (i / Math.max(n - 1, 1)) * (GW - PAD_L - PAD_R)

// Catmull-Rom cubic bezier spline. TENSION 0.4 = natural S-curves.
const TENSION = 0.4
const buildTrace = samples => {
  const n = samples.length
  if (n < 2) {
    const x = xAt(0, Math.max(n, 1))
    const y = msToY(samples[0] ?? P50_MS)
    return { d: `M${x.toFixed(1)} ${y.toFixed(1)}`, lastX: x, lastY: y }
  }
  const pts = samples.map((ms, i) => [xAt(i, n), msToY(ms)])
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[Math.max(i - 1, 0)]
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const [x3, y3] = pts[Math.min(i + 2, n - 1)]
    const cp1x = x1 + (x2 - x0) * TENSION / 2
    const cp1y = y1 + (y2 - y0) * TENSION / 2
    const cp2x = x2 - (x3 - x1) * TENSION / 2
    const cp2y = y2 - (y3 - y1) * TENSION / 2
    d += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)},${cp2x.toFixed(1)} ${cp2y.toFixed(1)},${x2.toFixed(1)} ${y2.toFixed(1)}`
  }
  return { d, lastX: pts[n - 1][0], lastY: pts[n - 1][1] }
}

// Linearly interpolate two equal-length sample arrays element-by-element.
// t=0 → stressed, t=1 → calm.
const lerpSamples = (stressed, calm, t) =>
  stressed.map((s, i) => s + (calm[i] - s) * t)

// ── Layout constants for the EKG graph ───────────────────────────────────────
// GRAPH_TOP must sit below the CACHE/DB nodes (y:52%) with clear breathing room.
const GRAPH_TOP = '59%'

// ── Stagger depth helper — node assembles at rank * 0.18 ─────────────────────
const NODE_I = rank => rank * 0.18

// Pre-compute the initial trace for the JSX render pass so we don't read refs
// during render. The feed's setAttribute calls overwrite these on the first tick.
const INITIAL_CALM_TRACE  = buildTrace(DATA.traceCalm)
const INITIAL_STRESS_TRACE = buildTrace(DATA.traceStressed)

// ── SMIL path IDs for ambient request dots ───────────────────────────────────
// Each dot animates along the EDGE→API path; offset by 1/NUM_DOTS fraction.
const NUM_AMBIENT_DOTS = 7

// ── Queue dot positions near DB node (% of field) ────────────────────────────
// Three small dots queued just above DB (y:52), visible when stressed (phase ≈ 0).
const QUEUE_DOTS = [
  { cx: 65, cy: 45 },
  { cx: 68, cy: 47 },
  { cx: 62, cy: 47 },
]

export default function VizBackend({ progress, index, isActive, reduced, frozen }) {
  const isFinal = reduced || frozen

  const { dissolveIn, enterIn } = widSlice(index, N)

  // ── Scroll clock — all hooks called unconditionally ──────────────────────
  const dissolve  = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })
  const scale     = useTransform(dissolve, [0, 1], [0.985, 1])
  const enter     = useTransform(progress, enterIn, [0, 1], { clamp: true })
  const graphOp   = useTransform(enter, [0.55, 0.82], [0, 1], { clamp: true })

  // ── phase MotionValue — 0 = STRESSED, 1 = RESOLVED ───────────────────────
  // isFinal: fixed at 1 (resolved static frame).
  // Live: narrative clock drives 0→1→0 in the isActive useEffect below.
  const phase = useMotionValue(isFinal ? 1 : 0)

  // DB strobe opacity — oscillates 1↔0.3 while stressed, settled at 0 when resolved.
  const dbStrobeMV = useMotionValue(1)

  // Hero packet opacity and position along its route (0 = API, 1 = destination).
  // packetRoute: 'db' while stressed, 'cache' while resolved.
  const packetOpMV   = useMotionValue(0)
  const packetT      = useMotionValue(0)        // 0 = at API, 1 = at destination

  // ── DOM refs — imperatively updated to avoid React re-renders ────────────
  const lineRef      = useRef(null)    // sparkline <path>
  const dotRef       = useRef(null)    // sparkline sweep <circle>
  const graphRef     = useRef(null)    // graph root — spike class toggled here
  const breakerRef   = useRef(null)    // BREAKER status value span
  const breakerRowRef = useRef(null)   // BREAKER row for gold flash class
  const latValRef    = useRef(null)    // latency value span
  const hitValRef    = useRef(null)    // cache-hit % span
  const dbNodeRef    = useRef(null)    // DB node HTML div — strobe class toggled here

  // packetRoute ref avoids stale closure in the narrative useEffect.
  const packetRouteRef = useRef('db')  // 'db' = stressed route, 'cache' = calm route

  // ── Narrative clock — wall clock #1 ──────────────────────────────────────
  // Resets to STRESSED on every isActive false→true transition (correctness req).
  // Teardown via cancelled flag + loopRef, identical pattern to the old probe loop.
  const loopRef = useRef(null)

  useEffect(() => {
    if (!isActive || isFinal) {
      animate(packetOpMV, 0, { duration: 0.25 })
      loopRef.current?.()
      return
    }

    let cancelled = false

    // Helpers for imperative DOM updates — no React re-renders.
    const setBreaker = (text, isOpen) => {
      if (breakerRef.current) breakerRef.current.textContent = text
      if (breakerRowRef.current) {
        if (isOpen) breakerRowRef.current.classList.add('wbk-breaker--open')
        else        breakerRowRef.current.classList.remove('wbk-breaker--open')
      }
    }
    const setLatency = text => {
      if (latValRef.current) latValRef.current.textContent = text
    }
    const setHitRate = text => {
      if (hitValRef.current) hitValRef.current.textContent = text
    }

    // Wait for a promise-wrapped delay, respecting cancellation.
    const wait = ms => new Promise(r => { const t = setTimeout(r, ms); if (cancelled) clearTimeout(t) })

    const runLoop = async () => {
      await animate(packetOpMV, 1, { duration: 0.2 })

      while (!cancelled) {
        // ── Phase 0: STRESSED ─────────────────────────────────────────────
        phase.set(0)
        packetRouteRef.current = 'db'
        setBreaker(DATA.breakerClosed, false)
        setLatency(DATA.latencyHi)
        setHitRate(DATA.hitRateLo)
        dbNodeRef.current?.classList.add('wbk-node--stressed')

        // Start DB strobe animation — runs until we cancel it below.
        const strobeCtrl = animate(dbStrobeMV, 0.25, {
          duration: 0.6,
          repeat: Infinity,
          repeatType: 'mirror',
          ease: 'easeInOut',
        })

        // Animate hero packet along API→DB route.
        packetT.set(0)
        if (!cancelled) {
          await animate(packetT, 1, { duration: 0.65, ease: 'easeInOut' })
        }
        if (cancelled) { strobeCtrl.stop(); break }
        await wait(200)
        if (!cancelled) {
          packetT.set(0)
          await animate(packetT, 1, { duration: 0.65, ease: 'easeInOut' })
        }
        if (cancelled) { strobeCtrl.stop(); break }

        // Hold STRESSED for ~1.5s (packet travels twice then we pause).
        await wait(1500)
        if (cancelled) { strobeCtrl.stop(); break }

        // ── Transition beat: BREAKER OPEN ─────────────────────────────────
        setBreaker(DATA.breakerOpen, true)
        dbNodeRef.current?.classList.remove('wbk-node--stressed')
        strobeCtrl.stop()
        dbStrobeMV.set(1)

        await wait(500)
        if (cancelled) break

        // ── Phase 1: RESOLVED — animate phase 0→1 ─────────────────────────
        packetRouteRef.current = 'cache'
        setBreaker(DATA.breakerClosed, false)
        setLatency(DATA.latencyLo)
        setHitRate(DATA.hitRateHi)

        await animate(phase, 1, { duration: 0.9, ease: [0.22, 1, 0.36, 1] })
        if (cancelled) break

        // Animate hero packet along API→CACHE route.
        packetT.set(0)
        await animate(packetT, 1, { duration: 0.4, ease: 'easeOut' })
        if (cancelled) break
        await wait(300)
        if (!cancelled) {
          packetT.set(0)
          await animate(packetT, 1, { duration: 0.4, ease: 'easeOut' })
        }
        if (cancelled) break

        // Hold RESOLVED for ~2s.
        await wait(2000)
        if (cancelled) break

        // ── Reset to STRESSED ─────────────────────────────────────────────
        // Snap phase back instantly (not animated — scroll-in always opens on stressed).
        await animate(phase, 0, { duration: 0.4, ease: 'easeIn' })
        if (cancelled) break

        // Short gap before the next stressed cycle.
        await wait(400)
      }

      animate(packetOpMV, 0, { duration: 0.2 })
    }

    runLoop()
    loopRef.current = () => { cancelled = true }
    return () => { cancelled = true }
    // phase, packetT, packetOpMV, dbStrobeMV are stable MotionValue refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isFinal])

  // ── Sparkline morph — driven imperatively from phase changes ─────────────
  // useMotionValueEvent (no React render on each phase update).
  useMotionValueEvent(phase, 'change', t => {
    const samples = lerpSamples(DATA.traceStressed, DATA.traceCalm, t)
    const { d, lastX, lastY } = buildTrace(samples)
    lineRef.current?.setAttribute('d', d)
    if (dotRef.current) {
      dotRef.current.setAttribute('cx', lastX.toFixed(1))
      dotRef.current.setAttribute('cy', lastY.toFixed(1))
    }
    // Trace color: gold (stressed, t<0.5) → lime (resolved, t>0.5).
    const stressed = t < 0.5
    if (graphRef.current) {
      if (stressed) graphRef.current.classList.add('wbk-graph--stressed')
      else          graphRef.current.classList.remove('wbk-graph--stressed')
    }
  })

  // ── Compute hero packet screen position from packetT ─────────────────────
  // packetRoute: 'db' → API→DB path; 'cache' → API→CACHE path.
  // Returns CSS top/left % strings for the motion.div.
  const packetX = useTransform(packetT, t => {
    const from = NODE_POS.api
    const to   = packetRouteRef.current === 'cache' ? NODE_POS.cache : NODE_POS.db
    return `${(from.x + (to.x - from.x) * t).toFixed(1)}%`
  })
  const packetY = useTransform(packetT, t => {
    const from = NODE_POS.api
    const to   = packetRouteRef.current === 'cache' ? NODE_POS.cache : NODE_POS.db
    return `${(from.y + (to.y - from.y) * t).toFixed(1)}%`
  })

  // ── DB strobe CSS opacity (attached to db node via style.opacity) ─────────
  // In isFinal, dbStrobeMV stays at 1 — no effect.
  const dbNodeOpacity = useTransform(
    [phase, dbStrobeMV],
    ([p, strobe]) => {
      // During stressed (p < 0.5): use strobe value (0.25–1).
      // During resolved (p ≥ 0.5): fade from strobe to 1 as p→1.
      const strobeContrib = strobe * (1 - Math.min(p * 2, 1))
      return strobeContrib + Math.min(p * 2, 1)
    }
  )

  // Cache node glow opacity: ramps from 0 (stressed) to 1 (resolved) via phase.
  const cacheGlowOp = useTransform(phase, [0, 1], [0, 1])

  // Queue dot cluster opacity: 1 when stressed, 0 when resolved.
  const queueOp = useTransform(phase, [0, 0.5], [0.85, 0])

  // Initial trace for JSX — frozen uses calm, live starts at stressed.
  const initialTrace = isFinal ? INITIAL_CALM_TRACE : INITIAL_STRESS_TRACE

  return (
    <motion.div
      className="widviz-layer widviz-backend"
      style={{ opacity: isFinal ? 1 : dissolve, scale: isFinal ? 1 : scale }}
    >
      {/* Single --enter subscriber — all CSS assembly stagger inherits from here.
          Pattern identical to VizSystems (.wsys-field) and VizData (.wdat-field). */}
      <motion.div
        className="wbk-field"
        style={{ '--enter': isFinal ? 1 : enter }}
      >

        {/* ── SVG layer: edges ────────────────────────────────────────────────
            Structural lines in the stretched preserveAspectRatio="none" SVG.
            The sparkline gets its own 1:1 SVG (below). */}
        <svg
          className="wbk-mesh-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {DATA.edges.map((edge, i) => (
            <path
              key={edge.id}
              className="wbk-edge"
              pathLength="1"
              d={edge.d}
              style={{ '--i': i * 0.12 }}
            />
          ))}

          {/* Queue dots near DB — visible (gold) when stressed */}
          {QUEUE_DOTS.map((dot, i) => (
            <motion.circle
              key={i}
              className="wbk-queue-dot"
              cx={dot.cx}
              cy={dot.cy}
              r="1.5"
              style={{ opacity: queueOp }}
            />
          ))}

          {/* Ambient SMIL request dots flowing along EDGE→API */}
          {Array.from({ length: NUM_AMBIENT_DOTS }, (_, i) => {
            const offset = (i / NUM_AMBIENT_DOTS) * 100
            return (
              <circle key={`ambient-${i}`} className="wbk-ambient-dot" r="1.8">
                <animateMotion
                  dur="2.4s"
                  repeatCount="indefinite"
                  begin={`${-offset * 0.024}s`}
                  path={`M${NODE_POS.edge.x},${NODE_POS.edge.y} L${NODE_POS.api.x},${NODE_POS.api.y}`}
                />
              </circle>
            )
          })}
        </svg>

        {/* ── Node chips (HTML — crisp over non-uniform SVG) ──────────────────
            Positioned at left:{x}%, top:{y}% to register with SVG edges.
            Opacity driven by --enter + --i CSS calc (assembles in-order). */}
        {DATA.nodes.map((node, i) => (
          <div
            key={node.id}
            ref={node.id === 'db' ? dbNodeRef : null}
            className={`wbk-node wbk-node--${node.id}`}
            style={{
              left: `${node.x}%`,
              top:  `${node.y}%`,
              '--i': NODE_I(i),
            }}
          >
            <motion.span
              className="wbk-node-dot"
              // DB node: opacity strobes when stressed (handled via dbNodeOpacity below).
              // CACHE node: separate glow MotionValue.
              style={
                node.id === 'db'    ? { opacity: isFinal ? 1 : dbNodeOpacity } :
                node.id === 'cache' ? {} : {}
              }
            />
            <span className="wbk-node-label">{node.label}</span>
            <span className="wbk-node-tag">{node.tag}</span>
          </div>
        ))}

        {/* CACHE lit glow — separate element so it cross-fades independently */}
        <motion.div
          className="wbk-cache-glow"
          style={{
            left:    `${NODE_POS.cache.x}%`,
            top:     `${NODE_POS.cache.y}%`,
            opacity: isFinal ? 1 : cacheGlowOp,
          }}
        />

        {/* ── BREAKER tag — mid-point of api→db edge ──────────────────────────
            Flips OPEN (gold flash) at stress peak, back to CLOSED on resolve. */}
        <div
          ref={breakerRowRef}
          className="wbk-breaker"
          style={{
            left: `${DATA.breakerX}%`,
            top:  `${DATA.breakerY}%`,
            '--i': 0.3,
          }}
        >
          <span className="wbk-breaker-label">{DATA.breakerLabel}</span>
          <span ref={breakerRef} className="wbk-breaker-val">
            {isFinal ? DATA.breakerClosed : DATA.breakerClosed}
          </span>
        </div>

        {/* ── Hero request packet — Framer MotionValue position ───────────────
            Hidden in frozen/reduced mode. Route: API→DB (stressed) or API→CACHE
            (resolved), driven by narrative clock via packetT + packetRouteRef. */}
        {!isFinal && (
          <motion.div
            className="wbk-packet"
            style={{ left: packetX, top: packetY, opacity: packetOpMV }}
          />
        )}

        {/* ── EKG latency graph — 1:1 viewBox SVG (no distortion) ────────────
            Identical outer centering wrapper as the current component. */}
        <div
          style={{
            position:      'absolute',
            top:           GRAPH_TOP,
            left:          0,
            right:         0,
            display:       'flex',
            justifyContent:'center',
            pointerEvents: 'none',
          }}
        >
          <motion.div
            ref={graphRef}
            className="wbk-graph"
            style={{ opacity: isFinal ? 1 : graphOp }}
          >
            <div className="wbk-graph-head">
              <span className="wbk-graph-title">{DATA.latencyLabel}</span>
              <span ref={latValRef} className="wbk-graph-val">
                {isFinal ? DATA.latencyLo : DATA.latencyHi}
              </span>
            </div>

            <svg
              className="wbk-graph-svg"
              viewBox={`0 0 ${GW} 44`}
              aria-hidden="true"
            >
              {/* p99 ceiling — dashed gold reference line */}
              <line
                className="wbk-graph-ceil"
                x1={PAD_L} x2={GW - PAD_R}
                y1={msToY(P99_MS)} y2={msToY(P99_MS)}
              />
              {/* p50 baseline — faint lime floor */}
              <line
                className="wbk-graph-base"
                x1={PAD_L} x2={GW - PAD_R}
                y1={msToY(P50_MS)} y2={msToY(P50_MS)}
              />
              {/* Latency trace — redrawn by sparkline morph handler */}
              <path
                ref={lineRef}
                className="wbk-graph-line"
                d={initialTrace.d}
              />
              {/* Round sweep dot at the leading edge */}
              <circle
                ref={dotRef}
                className="wbk-graph-dot"
                r="2.4"
                cx={initialTrace.lastX.toFixed(1)}
                cy={initialTrace.lastY.toFixed(1)}
              />
            </svg>

            <div className="wbk-graph-legend">
              <span ref={hitValRef} className="wbk-hit-val">
                {isFinal ? DATA.hitRateHi : DATA.hitRateLo}
              </span>
              <span className="wbk-hit-label">{DATA.hitRateLabel}</span>
            </div>
          </motion.div>
        </div>


      </motion.div>
    </motion.div>
  )
}
