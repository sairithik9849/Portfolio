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

// Deterministic bar seeds — sine hash so they're stable across renders
const BAR_COUNT = 16
const BAR_SEEDS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return +(v - Math.floor(v)).toFixed(3)
})

// ── FlowDot — one particle along a fixed from→to path ─────────────────────────
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

  const dissolve   = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })
  const scale      = useTransform(dissolve, [0, 1], [0.985, 1])
  const enter      = useTransform(progress, enterIn, [0, 1], { clamp: true })
  const metricsOp  = useTransform(enter, [0.55, 0.82], [0, 1], { clamp: true })

  // ── Flow clocks ──────────────────────────────────────────────────────────────
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

  // ── Phase MotionValue — 0=STRESSED, 1=RESOLVED ───────────────────────────────
  const phase      = useMotionValue(isFinal ? 1 : 0)
  const dbStrobeMV = useMotionValue(1)
  const packetOpMV = useMotionValue(0)
  const packetT    = useMotionValue(0)

  // Phase-derived opacities for path-flow particle groups
  const dbPathOp    = useTransform(phase, [0, 0.45], [1, 0])
  const cachePathOp = useTransform(phase, [0.55, 1], [0, 1])
  const dbFlowOp    = useTransform(phase, [0, 0.45], [1, 0])
  const cacheFlowOp = useTransform(phase, [0.55, 1], [0, 1])

  // ── DOM refs ─────────────────────────────────────────────────────────────────
  const breakerRef    = useRef(null)
  const breakerRowRef = useRef(null)
  const latValRef     = useRef(null)
  const hitValRef     = useRef(null)
  const dbNodeRef     = useRef(null)
  const dbRingsRef    = useRef(null)
  const barsRef       = useRef(null)
  const statusRowRef  = useRef(null)
  const statusLblRef  = useRef(null)
  const latMetricRef  = useRef(null)

  const packetRouteRef = useRef('db')
  const loopRef        = useRef(null)

  // ── Narrative clock ───────────────────────────────────────────────────────────
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
      // DB node — stressed class
      if (dbNodeRef.current) {
        if (isStressed) dbNodeRef.current.classList.add('wbk-node--stressed')
        else            dbNodeRef.current.classList.remove('wbk-node--stressed')
      }
      // Pressure rings
      if (dbRingsRef.current) {
        if (isStressed) dbRingsRef.current.classList.add('wbk-rings--active')
        else            dbRingsRef.current.classList.remove('wbk-rings--active')
      }
      // EQ bars color
      if (barsRef.current) {
        if (isStressed) {
          barsRef.current.classList.add('wbk-bars--stressed')
          barsRef.current.classList.remove('wbk-bars--resolved')
        } else {
          barsRef.current.classList.remove('wbk-bars--stressed')
          barsRef.current.classList.add('wbk-bars--resolved')
        }
      }
      // Status row
      if (statusRowRef.current) {
        if (isStressed) {
          statusRowRef.current.classList.add('wbk-status-row--stressed')
          statusRowRef.current.classList.remove('wbk-status-row--resolved')
        } else {
          statusRowRef.current.classList.remove('wbk-status-row--stressed')
          statusRowRef.current.classList.add('wbk-status-row--resolved')
        }
      }
      // Status label text
      if (statusLblRef.current)
        statusLblRef.current.textContent = isStressed ? DATA.stressState : DATA.calmState
      // Latency metric color
      if (latMetricRef.current) {
        if (isStressed) latMetricRef.current.classList.add('wbk-metric--stressed')
        else            latMetricRef.current.classList.remove('wbk-metric--stressed')
      }
    }

    const wait = ms => new Promise(r => {
      const t = setTimeout(r, ms)
      if (cancelled) clearTimeout(t)
    })

    const runLoop = async () => {
      await animate(packetOpMV, 1, { duration: 0.2 })

      while (!cancelled) {
        // ── STRESSED ───────────────────────────────────────────────────────────
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

        // ── BREAKER OPEN ───────────────────────────────────────────────────────
        setBreaker(DATA.breakerOpen, true)
        setStressed(false)
        strobeCtrl.stop()
        dbStrobeMV.set(1)
        await wait(480)
        if (cancelled) break

        // ── RESOLVED ───────────────────────────────────────────────────────────
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

        // ── RESET ──────────────────────────────────────────────────────────────
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

  // ── DB strobe ─────────────────────────────────────────────────────────────────
  const dbNodeOpacity = useTransform(
    [phase, dbStrobeMV],
    ([p, strobe]) => {
      const strobeContrib = strobe * (1 - Math.min(p * 2, 1))
      return strobeContrib + Math.min(p * 2, 1)
    }
  )

  // ── Edge color transforms ─────────────────────────────────────────────────────
  const LINE_2 = 'rgba(237,237,223,0.16)'
  const LIME   = '#c9f558'
  const AMBER  = '#e8c47a'

  const activeCacheStroke = useTransform(phase, [0, 1], [LINE_2, LIME])
  const activeCacheWidth  = useTransform(phase, [0, 1], [0.5, 1.5])
  const dimDbStroke       = useTransform(phase, [0, 1], [AMBER, LINE_2])
  const dimDbWidth        = useTransform(phase, [0, 1], [1.2, 0.5])
  const dimDbOpacity      = useTransform(phase, [0, 1], [1.0, 0.14])

  const cacheGlowOp = useTransform(phase, [0, 1], [0, 1])

  // ── Packet position ───────────────────────────────────────────────────────────
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

  return (
    <motion.div
      className="widviz-layer widviz-backend"
      style={{ opacity: isFinal ? 1 : dissolve, scale: isFinal ? 1 : scale }}
    >
      <motion.div
        className="wbk-field"
        style={{ '--enter': isFinal ? 1 : enter }}
      >

        {/* ── Dot-grid background ───────────────────────────────────────────── */}
        <div className="wbk-bg-grid" />

        {/* ── EQ bars — request throughput visualizer ──────────────────────── */}
        <div
          ref={barsRef}
          className={`wbk-bars ${isFinal ? 'wbk-bars--resolved' : 'wbk-bars--stressed'}`}
        >
          {BAR_SEEDS.map((seed, i) => (
            <div
              key={i}
              className="wbk-bar"
              style={{ '--seed': seed, '--i': i }}
            />
          ))}
        </div>

        {/* ── Status row ───────────────────────────────────────────────────── */}
        <div
          ref={statusRowRef}
          className={`wbk-status-row ${isFinal ? 'wbk-status-row--resolved' : 'wbk-status-row--stressed'}`}
        >
          <span className="wbk-status-dot" />
          <span ref={statusLblRef} className="wbk-status-label">
            {isFinal ? DATA.calmState : DATA.stressState}
          </span>
        </div>

        {/* ── SVG mesh: base edges ─────────────────────────────────────────── */}
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

        {/* ── DB pressure rings ─────────────────────────────────────────────── */}
        <div
          ref={dbRingsRef}
          className="wbk-rings"
          style={{ left: `${NODE_POS.db.x}%`, top: `${NODE_POS.db.y}%` }}
        >
          {[0, 1, 2].map(i => (
            <div key={i} className="wbk-ring" style={{ '--ring-i': i }} />
          ))}
        </div>

        {/* ── CACHE glow bloom ─────────────────────────────────────────────── */}
        <motion.div
          className="wbk-cache-glow"
          style={{
            left:    `${NODE_POS.cache.x}%`,
            top:     `${NODE_POS.cache.y}%`,
            opacity: isFinal ? 1 : cacheGlowOp,
          }}
        />

        {/* ── Trunk flow dots: EDGE→API ─────────────────────────────────────── */}
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

        {/* ── Path flow dots: API→DB (stressed) ───────────────────────────── */}
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

        {/* ── Path flow dots: API→CACHE (resolved) ────────────────────────── */}
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

        {/* ── Node chips ────────────────────────────────────────────────────── */}
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

        {/* ── BREAKER chip ─────────────────────────────────────────────────── */}
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

        {/* ── Hero request packet ───────────────────────────────────────────── */}
        {!isFinal && (
          <motion.div
            className="wbk-packet"
            style={{ left: packetX, top: packetY, opacity: packetOpMV }}
          />
        )}

        {/* ── Metrics bar ───────────────────────────────────────────────────── */}
        <motion.div
          className="wbk-metrics"
          style={{ opacity: isFinal ? 1 : metricsOp }}
        >
          <div ref={latMetricRef} className={`wbk-metric ${isFinal ? '' : 'wbk-metric--stressed'}`}>
            <span className="wbk-metric-label">{DATA.latencyLabel}</span>
            <span ref={latValRef} className="wbk-metric-val">
              {isFinal ? DATA.latencyLo : DATA.latencyHi}
            </span>
          </div>
          <div className="wbk-metric-sep" />
          <div className="wbk-metric">
            <span className="wbk-metric-label">{DATA.hitRateLabel}</span>
            <span ref={hitValRef} className="wbk-metric-val">
              {isFinal ? DATA.hitRateHi : DATA.hitRateLo}
            </span>
          </div>
          <div className="wbk-metric-sep" />
          <div className="wbk-metric">
            <span className="wbk-metric-label">{DATA.reqLabel}</span>
            <span className="wbk-metric-val wbk-metric-val--req">{DATA.rpsLabel}</span>
          </div>
        </motion.div>

      </motion.div>
    </motion.div>
  )
}
