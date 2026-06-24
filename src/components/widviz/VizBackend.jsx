import { useEffect, useRef } from 'react'
import { motion, useTransform, useMotionValue, useMotionValueEvent, animate } from 'framer-motion'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'

const DATA = WID_VIZ.backend
const N    = 5

const NODE_POS = Object.fromEntries(DATA.nodes.map(n => [n.id, { x: n.x, y: n.y }]))

const NUM_TRUNK_DOTS = 6
const NUM_PATH_DOTS  = 6
const TRUNK_DUR      = 2.2
const PATH_DUR       = 1.5

const NODE_I = rank => rank * 0.15

// ── Sparkline constants ───────────────────────────────────────────────────────
const GW     = 300
const PAD_L  = 6
const PAD_R  = 14
const PLOT_T = 8
const PLOT_B = 42
const P50_MS = 4
const P99_MS = 28
const MAX_MS = 34
const GRAPH_TOP = '59%'

const msToY = ms => {
  const clamped = Math.min(Math.max(ms, 0), MAX_MS)
  return PLOT_B - (clamped / MAX_MS) * (PLOT_B - PLOT_T)
}

const xAt = (i, n) => PAD_L + (i / Math.max(n - 1, 1)) * (GW - PAD_L - PAD_R)

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

const lerpSamples = (stressed, calm, t) =>
  stressed.map((s, i) => s + (calm[i] - s) * t)

const INITIAL_CALM_TRACE   = buildTrace(DATA.traceCalm)
const INITIAL_STRESS_TRACE = buildTrace(DATA.traceStressed)

// ── FlowDot — one particle along a fixed from→to path ────────────────────────
function FlowDot({ clock, dotIndex, total, from, to, colorClass }) {
  const offset  = dotIndex / total
  const t       = useTransform(clock, v => (v + offset) % 1)
  const top     = useTransform(t, [0, 1], [`${from.y}%`, `${to.y}%`])
  const left    = useTransform(t, [0, 1], [`${from.x}%`, `${to.x}%`])
  const opacity = useTransform(t, [0, 0.1, 0.88, 1], [0, 0.9, 0.9, 0])
  return (
    <motion.div
      className={`wbk-flow-dot ${colorClass}`}
      style={{ top, left, opacity }}
    />
  )
}

export default function VizBackend({ progress, index, isActive, reduced, frozen }) {
  const isFinal = reduced || frozen

  const { dissolveIn, enterIn } = widSlice(index, N)

  const dissolve  = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })
  const scale     = useTransform(dissolve, [0, 1], [0.985, 1])
  const enter     = useTransform(progress, enterIn, [0, 1], { clamp: true })
  const graphOp   = useTransform(enter, [0.55, 0.82], [0, 1], { clamp: true })

  // ── Flow clocks ───────────────────────────────────────────────────────────
  const trunkClock = useMotionValue(0)
  const pathClock  = useMotionValue(0)

  useEffect(() => {
    if (isFinal) return
    const c1 = animate(trunkClock, NUM_TRUNK_DOTS, {
      duration: NUM_TRUNK_DOTS * TRUNK_DUR,
      ease: 'linear',
      repeat: Infinity,
    })
    const c2 = animate(pathClock, NUM_PATH_DOTS, {
      duration: NUM_PATH_DOTS * PATH_DUR,
      ease: 'linear',
      repeat: Infinity,
    })
    return () => { c1.stop(); c2.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinal])

  // ── Phase MotionValue — 0=STRESSED, 1=RESOLVED ────────────────────────────
  const phase      = useMotionValue(isFinal ? 1 : 0)
  const dbStrobeMV = useMotionValue(1)
  const packetOpMV = useMotionValue(0)
  const packetT    = useMotionValue(0)

  // Phase-derived opacities for the two path-flow particle groups
  const dbPathOp    = useTransform(phase, [0, 0.45], [1, 0])
  const cachePathOp = useTransform(phase, [0.55, 1], [0, 1])
  const dbFlowOp    = useTransform(phase, [0, 0.45], [1, 0])
  const cacheFlowOp = useTransform(phase, [0.55, 1], [0, 1])

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const lineRef       = useRef(null)
  const dotRef        = useRef(null)
  const graphRef      = useRef(null)
  const breakerRef    = useRef(null)
  const breakerRowRef = useRef(null)
  const latValRef     = useRef(null)
  const hitValRef     = useRef(null)
  const dbNodeRef     = useRef(null)
  const dbRingsRef    = useRef(null)

  const packetRouteRef = useRef('db')
  const loopRef        = useRef(null)

  // ── Narrative clock ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || isFinal) {
      animate(packetOpMV, 0, { duration: 0.25 })
      loopRef.current?.()
      return
    }

    let cancelled = false

    const setBreaker = (text, isOpen) => {
      if (breakerRef.current)    breakerRef.current.textContent = text
      if (breakerRowRef.current) {
        if (isOpen) breakerRowRef.current.classList.add('wbk-breaker--open')
        else        breakerRowRef.current.classList.remove('wbk-breaker--open')
      }
    }
    const setLatency = text => { if (latValRef.current) latValRef.current.textContent = text }
    const setHitRate = text => { if (hitValRef.current) hitValRef.current.textContent = text }

    const setStressed = isStressed => {
      if (dbNodeRef.current) {
        if (isStressed) dbNodeRef.current.classList.add('wbk-node--stressed')
        else            dbNodeRef.current.classList.remove('wbk-node--stressed')
      }
      if (dbRingsRef.current) {
        if (isStressed) dbRingsRef.current.classList.add('wbk-rings--active')
        else            dbRingsRef.current.classList.remove('wbk-rings--active')
      }
    }

    const wait = ms => new Promise(r => {
      const t = setTimeout(r, ms)
      if (cancelled) clearTimeout(t)
    })

    const runLoop = async () => {
      await animate(packetOpMV, 1, { duration: 0.2 })

      while (!cancelled) {
        // ── STRESSED ─────────────────────────────────────────────────────────
        phase.set(0)
        packetRouteRef.current = 'db'
        setBreaker(DATA.breakerClosed, false)
        setLatency(DATA.latencyHi)
        setHitRate(DATA.hitRateLo)
        setStressed(true)

        const strobeCtrl = animate(dbStrobeMV, 0.28, {
          duration: 0.55,
          repeat: Infinity,
          repeatType: 'mirror',
          ease: 'easeInOut',
        })

        packetT.set(0)
        if (!cancelled) await animate(packetT, 1, { duration: 0.6, ease: 'easeInOut' })
        if (cancelled) { strobeCtrl.stop(); break }
        await wait(180)
        if (!cancelled) { packetT.set(0); await animate(packetT, 1, { duration: 0.6, ease: 'easeInOut' }) }
        if (cancelled) { strobeCtrl.stop(); break }
        await wait(1400)
        if (cancelled) { strobeCtrl.stop(); break }

        // ── BREAKER OPEN ──────────────────────────────────────────────────────
        setBreaker(DATA.breakerOpen, true)
        setStressed(false)
        strobeCtrl.stop()
        dbStrobeMV.set(1)
        await wait(480)
        if (cancelled) break

        // ── RESOLVED ──────────────────────────────────────────────────────────
        packetRouteRef.current = 'cache'
        setBreaker(DATA.breakerClosed, false)
        setLatency(DATA.latencyLo)
        setHitRate(DATA.hitRateHi)

        await animate(phase, 1, { duration: 0.88, ease: [0.22, 1, 0.36, 1] })
        if (cancelled) break

        packetT.set(0)
        await animate(packetT, 1, { duration: 0.38, ease: 'easeOut' })
        if (cancelled) break
        await wait(280)
        if (!cancelled) { packetT.set(0); await animate(packetT, 1, { duration: 0.38, ease: 'easeOut' }) }
        if (cancelled) break

        await wait(2000)
        if (cancelled) break

        // ── RESET ─────────────────────────────────────────────────────────────
        await animate(phase, 0, { duration: 0.38, ease: 'easeIn' })
        if (cancelled) break
        await wait(350)
      }

      animate(packetOpMV, 0, { duration: 0.2 })
    }

    runLoop()
    loopRef.current = () => { cancelled = true }
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isFinal])

  // ── Sparkline morph ───────────────────────────────────────────────────────
  useMotionValueEvent(phase, 'change', t => {
    const samples = lerpSamples(DATA.traceStressed, DATA.traceCalm, t)
    const { d, lastX, lastY } = buildTrace(samples)
    lineRef.current?.setAttribute('d', d)
    if (dotRef.current) {
      dotRef.current.setAttribute('cx', lastX.toFixed(1))
      dotRef.current.setAttribute('cy', lastY.toFixed(1))
    }
    const stressed = t < 0.5
    if (graphRef.current) {
      if (stressed) graphRef.current.classList.add('wbk-graph--stressed')
      else          graphRef.current.classList.remove('wbk-graph--stressed')
    }
  })

  // ── DB strobe ─────────────────────────────────────────────────────────────
  const dbNodeOpacity = useTransform(
    [phase, dbStrobeMV],
    ([p, strobe]) => {
      const strobeContrib = strobe * (1 - Math.min(p * 2, 1))
      return strobeContrib + Math.min(p * 2, 1)
    }
  )

  // ── Edge color transforms ─────────────────────────────────────────────────
  const LINE_2 = 'rgba(237,237,223,0.16)'
  const LIME   = '#c9f558'
  const AMBER  = '#e8c47a'

  const activeCacheStroke = useTransform(phase, [0, 1], [LINE_2, LIME])
  const activeCacheWidth  = useTransform(phase, [0, 1], [0.5, 1.5])
  const dimDbStroke       = useTransform(phase, [0, 1], [AMBER, LINE_2])
  const dimDbWidth        = useTransform(phase, [0, 1], [1.2, 0.5])
  const dimDbOpacity      = useTransform(phase, [0, 1], [1.0, 0.14])

  const cacheGlowOp = useTransform(phase, [0, 1], [0, 1])

  // ── Packet position ───────────────────────────────────────────────────────
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

  const initialTrace = isFinal ? INITIAL_CALM_TRACE : INITIAL_STRESS_TRACE

  return (
    <motion.div
      className="widviz-layer widviz-backend"
      style={{ opacity: isFinal ? 1 : dissolve, scale: isFinal ? 1 : scale }}
    >
      <motion.div
        className="wbk-field"
        style={{ '--enter': isFinal ? 1 : enter }}
      >

        {/* ── Dot-grid background ─────────────────────────────────────────── */}
        <div className="wbk-bg-grid" />

        {/* ── SVG mesh: base edges ───────────────────────────────────────── */}
        <svg
          className="wbk-mesh-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {DATA.edges.map((edge, i) => {
            const isCache = edge.id === 'api-cache'
            const isDb    = edge.id === 'api-db'
            const dStyle  = isCache
              ? { stroke: isFinal ? LIME  : activeCacheStroke, strokeWidth: isFinal ? 1.5  : activeCacheWidth }
              : isDb
              ? { stroke: isFinal ? LINE_2 : dimDbStroke, strokeWidth: isFinal ? 0.5  : dimDbWidth, strokeOpacity: isFinal ? 0.14 : dimDbOpacity }
              : {}
            return (
              <motion.path
                key={edge.id}
                className="wbk-edge"
                pathLength="1"
                d={edge.d}
                style={{ '--i': i * 0.12, ...dStyle }}
              />
            )
          })}

          {/* Flowing dash overlays */}
          <motion.path
            className="wbk-edge-flow wbk-edge-flow--db"
            d={DATA.flowPathDb}
            style={{ opacity: isFinal ? 0 : dbFlowOp }}
          />
          <motion.path
            className="wbk-edge-flow wbk-edge-flow--cache"
            d={DATA.flowPathCache}
            style={{ opacity: isFinal ? 1 : cacheFlowOp }}
          />
        </svg>

        {/* ── DB pressure rings ─────────────────────────────────────────── */}
        <div
          ref={dbRingsRef}
          className="wbk-rings"
          style={{ left: `${NODE_POS.db.x}%`, top: `${NODE_POS.db.y}%` }}
        >
          {[0, 1, 2].map(i => (
            <div key={i} className="wbk-ring" style={{ '--ring-i': i }} />
          ))}
        </div>

        {/* ── CACHE glow bloom ──────────────────────────────────────────── */}
        <motion.div
          className="wbk-cache-glow"
          style={{
            left:    `${NODE_POS.cache.x}%`,
            top:     `${NODE_POS.cache.y}%`,
            opacity: isFinal ? 1 : cacheGlowOp,
          }}
        />

        {/* ── Trunk flow dots: EDGE→API ──────────────────────────────────── */}
        {!isFinal && Array.from({ length: NUM_TRUNK_DOTS }, (_, i) => (
          <FlowDot
            key={`trunk-${i}`}
            clock={trunkClock}
            dotIndex={i}
            total={NUM_TRUNK_DOTS}
            from={NODE_POS.edge}
            to={NODE_POS.api}
            colorClass="wbk-flow-dot--trunk"
          />
        ))}

        {/* ── Path flow dots: API→DB (stressed) ─────────────────────────── */}
        {!isFinal && (
          <motion.div
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: dbPathOp }}
          >
            {Array.from({ length: NUM_PATH_DOTS }, (_, i) => (
              <FlowDot
                key={`db-${i}`}
                clock={pathClock}
                dotIndex={i}
                total={NUM_PATH_DOTS}
                from={NODE_POS.api}
                to={NODE_POS.db}
                colorClass="wbk-flow-dot--db"
              />
            ))}
          </motion.div>
        )}

        {/* ── Path flow dots: API→CACHE (resolved) ──────────────────────── */}
        {!isFinal && (
          <motion.div
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: cachePathOp }}
          >
            {Array.from({ length: NUM_PATH_DOTS }, (_, i) => (
              <FlowDot
                key={`cache-${i}`}
                clock={pathClock}
                dotIndex={i}
                total={NUM_PATH_DOTS}
                from={NODE_POS.api}
                to={NODE_POS.cache}
                colorClass="wbk-flow-dot--cache"
              />
            ))}
          </motion.div>
        )}

        {/* ── Node chips ────────────────────────────────────────────────── */}
        {DATA.nodes.map((node, i) => (
          <div
            key={node.id}
            ref={node.id === 'db' ? dbNodeRef : null}
            className={`wbk-node wbk-node--${node.id}`}
            style={{ left: `${node.x}%`, top: `${node.y}%`, '--i': NODE_I(i) }}
          >
            <motion.div
              className="wbk-node-hex"
              style={node.id === 'db' ? { opacity: isFinal ? 1 : dbNodeOpacity } : {}}
            >
              <div className="wbk-node-inner" />
            </motion.div>
            <div className="wbk-node-labels">
              <span className="wbk-node-label">{node.label}</span>
              <span className="wbk-node-tag">{node.tag}</span>
            </div>
          </div>
        ))}

        {/* ── BREAKER chip ──────────────────────────────────────────────── */}
        <div
          ref={breakerRowRef}
          className="wbk-breaker"
          style={{ left: `${DATA.breakerX}%`, top: `${DATA.breakerY}%`, '--i': 0.3 }}
        >
          <span className="wbk-breaker-label">{DATA.breakerLabel}</span>
          <span ref={breakerRef} className="wbk-breaker-val">
            {isFinal ? DATA.breakerClosed : DATA.breakerClosed}
          </span>
        </div>

        {/* ── Hero request packet ───────────────────────────────────────── */}
        {!isFinal && (
          <motion.div
            className="wbk-packet"
            style={{ left: packetX, top: packetY, opacity: packetOpMV }}
          />
        )}

        {/* ── EKG latency graph — 1:1 viewBox SVG, centered ────────────── */}
        <div
          style={{
            position:       'absolute',
            top:            GRAPH_TOP,
            left:           0,
            right:          0,
            display:        'flex',
            justifyContent: 'center',
            pointerEvents:  'none',
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
              {/* p99 ceiling — dashed amber reference line */}
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
