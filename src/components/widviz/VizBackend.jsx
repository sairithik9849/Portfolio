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

// ── Sparkline constants ───────────────────────────────────────────────────────
const GW       = 230   // SVG element width and viewBox width (px)
const PAD_L    = 6
const PAD_R    = 14
const PLOT_T   = 8
const PLOT_B   = 42    // taller plot area for breathing room (was 36)
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
// GRAPH_TOP sits below the CACHE/DB nodes (y:60%).
// 65% gives ~40px gap on a 800px viewport, and enough bottom clearance in the
// frozen 295px panel (graph ends at ~265px, 30px below the field bottom).
const GRAPH_TOP = '65%'

// ── Stagger depth helper — node assembles at rank * 0.18 ─────────────────────
const NODE_I = rank => rank * 0.18

// Pre-compute the initial trace for the JSX render pass so we don't read refs
// during render. The feed's setAttribute calls overwrite these on the first tick.
const INITIAL_CALM_TRACE  = buildTrace(DATA.traceCalm)
const INITIAL_STRESS_TRACE = buildTrace(DATA.traceStressed)

// ── Request flow dots along the trunk (EDGE→API) ─────────────────────────────
// HTML motion.div dots driven by a shared clock MotionValue so they stay round
// (unlike SMIL circles in the distorted preserveAspectRatio="none" mesh SVG).
const NUM_FLOW_DOTS  = 5
const FLOW_DURATION  = 2.4   // seconds per full cycle

// ── Queue dot positions near DB node (% of field) ────────────────────────────
// Three small dots queued just above DB (now at x:70, y:60), visible when stressed.
const QUEUE_DOTS = [
  { cx: 66, cy: 53 },
  { cx: 70, cy: 52 },
  { cx: 68, cy: 50 },
]

// ── Subcomponent: flow dot — one round dot along the EDGE→API trunk ──────────
// Receives the shared clock MotionValue (0→NUM_FLOW_DOTS loop) and its index.
// t = (clock + offset) % 1 gives each dot an evenly-spaced phase; at t=0 and t=1
// opacity is 0, so the jump is invisible.
function FlowDot({ clock, dotIndex, total, from, to }) {
  const offset = dotIndex / total
  const t      = useTransform(clock, v => (v + offset) % 1)
  const top    = useTransform(t, [0, 1], [`${from.y}%`, `${to.y}%`])
  const left   = useTransform(t, [0, 1], [`${from.x}%`, `${to.x}%`])
  const opacity = useTransform(t, [0, 0.12, 0.85, 1], [0, 0.55, 0.55, 0])
  return <motion.div className="wbk-flow-dot" style={{ top, left, opacity }} />
}

// ── Subcomponent: queue dot — drains into DB node on resolve ─────────────────
// cx/cy animate from the congestion position to the DB node as phase 0→1 with a
// per-dot stagger; opacity fades out over the back half of the travel so it
// visibly flushes into the node rather than vanishing in place.
function QueueDot({ fromX, fromY, phase, staggerStart, staggerEnd }) {
  const DB   = NODE_POS.db
  const left = useTransform(phase, [staggerStart, staggerEnd], [`${fromX}%`, `${DB.x}%`])
  const top  = useTransform(phase, [staggerStart, staggerEnd], [`${fromY}%`, `${DB.y}%`])
  const opacity = useTransform(
    phase,
    [0, Math.max(staggerEnd - 0.15, 0), Math.min(staggerEnd + 0.1, 1)],
    [0.85, 0.7, 0],
  )
  return <motion.div className="wbk-queue-dot-html" style={{ left, top, opacity }} />
}

export default function VizBackend({ progress, index, isActive, reduced, frozen }) {
  const isFinal = reduced || frozen

  const { dissolveIn, enterIn } = widSlice(index, N)

  // ── Scroll clock — all hooks called unconditionally ──────────────────────
  const dissolve  = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })
  const scale     = useTransform(dissolve, [0, 1], [0.985, 1])
  const enter     = useTransform(progress, enterIn, [0, 1], { clamp: true })
  const graphOp   = useTransform(enter, [0.55, 0.82], [0, 1], { clamp: true })

  // ── Flow clock — drives the EDGE→API request-stream dots ─────────────────
  // Runs continuously while live; each FlowDot derives its phase from (clock + offset) % 1.
  const flowClock = useMotionValue(0)
  useEffect(() => {
    if (isFinal) return
    const ctrl = animate(flowClock, NUM_FLOW_DOTS, {
      duration: NUM_FLOW_DOTS * FLOW_DURATION,
      ease: 'linear',
      repeat: Infinity,
    })
    return () => ctrl.stop()
    // flowClock is a stable MotionValue ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinal])

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

  // ── Active path weighting — visual hierarchy shifts as cache takes load ───
  // api→cache: thickens and glows lime as system resolves.
  // api→db: dims as traffic is diverted to the cache.
  // edge→api trunk: stays constant (ingress is always live).
  const LINE_2 = 'rgba(237,237,223,0.16)'  // var(--line-2) resolved value
  const LIME   = '#c9f558'                  // var(--accent)
  const activeCacheStroke  = useTransform(phase, [0, 1], [LINE_2, LIME])
  const activeCacheWidth   = useTransform(phase, [0, 1], [0.6, 1.2])
  const dimDbOpacity       = useTransform(phase, [0, 1], [1.0, 0.18])

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
            Edge api→cache thickens/glows lime on resolve; api→db dims (traffic
            rerouted). edge→api trunk stays constant (ingress always live).
            Dashoffset draw-in via CSS --enter/--i and Framer stroke/strokeWidth
            compose cleanly (different properties). */}
        <svg
          className="wbk-mesh-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {DATA.edges.map((edge, i) => {
            const isActiveCache = edge.id === 'api-cache'
            const isDimmedDb    = edge.id === 'api-db'
            const dynamicStyle  = isActiveCache
              ? {
                  stroke:      isFinal ? LIME  : activeCacheStroke,
                  strokeWidth: isFinal ? 1.2   : activeCacheWidth,
                }
              : isDimmedDb
              ? { strokeOpacity: isFinal ? 0.18 : dimDbOpacity }
              : {}
            return (
              <motion.path
                key={edge.id}
                className="wbk-edge"
                pathLength="1"
                d={edge.d}
                style={{ '--i': i * 0.12, ...dynamicStyle }}
              />
            )
          })}
        </svg>

        {/* ── Queue dots — drain into DB node as circuit breaker trips ─────────
            HTML divs (not SVG circles) so they stay round.
            Each dot's left/top animate from its congestion coord to DB(70%,52%)
            with a small per-dot stagger on the phase 0→1 range. */}
        {QUEUE_DOTS.map((dot, i) => (
          <QueueDot
            key={`queue-${i}`}
            fromX={dot.cx}
            fromY={dot.cy}
            phase={phase}
            staggerStart={i * 0.08}
            staggerEnd={0.45 + i * 0.08}
          />
        ))}

        {/* ── Request flow trail — round Framer dots flowing along EDGE→API ───
            A shared flowClock (0→NUM_FLOW_DOTS loop) drives all dots evenly.
            Rendered as HTML divs — not SVG circles — so they stay geometrically
            round regardless of the mesh SVG's non-uniform scaling.
            Hidden in frozen/reduced mode (no clock = no motion). */}
        {!isFinal && Array.from({ length: NUM_FLOW_DOTS }, (_, i) => (
          <FlowDot
            key={`flow-${i}`}
            clock={flowClock}
            dotIndex={i}
            total={NUM_FLOW_DOTS}
            from={NODE_POS.edge}
            to={NODE_POS.api}
          />
        ))}

        {/* ── Node chips (HTML — crisp over non-uniform SVG) ──────────────────
            Each node is a zero-size anchor at its coordinate.
            The dot is absolutely centered on the anchor so SVG edges terminate
            at the circle. Labels sit in a separate group that splays outward:
            EDGE/API/DB labels to the right, CACHE label to the left. */}
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
              style={
                node.id === 'db' ? { opacity: isFinal ? 1 : dbNodeOpacity } : {}
              }
            />
            <span className="wbk-node-labels">
              <span className="wbk-node-label">{node.label}</span>
              <span className="wbk-node-tag">{node.tag}</span>
            </span>
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
              viewBox={`0 0 ${GW} 50`}
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
