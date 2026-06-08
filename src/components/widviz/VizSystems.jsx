import { useEffect, useRef } from 'react'
import { motion, useTransform, useMotionValue, animate } from 'framer-motion'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'
import { CURSOR_X, CURSOR_Y } from '../../utils/cursor'

const DATA = WID_VIZ.systems
const N    = 5

// Assembly stagger bucket per node: distance from the 2D projection centre (50,50)
// normalised to 0–1. Equatorial nodes appear first on scroll-in.
const MAX_DIST = Math.hypot(50, 50)
const NODE_I = DATA.nodes.map(n =>
  +(Math.hypot(n.cx - 50, n.cy - 50) / MAX_DIST).toFixed(3)
)

// Physics constants — all in % units (0–100 panel space), applied per animation frame.
const SPRING_K    = 0.08   // 8% of displacement corrected per frame
const DAMPING     = 0.85   // velocity retention per frame
const REPULSE_R   = 22     // repulsion radius in % units (~88px on a 400px panel)
const REPULSE_STR = 3.5    // max force impulse in %/frame at zero distance (linear falloff)

// One full yaw revolution in 20 000 ms
const ROT_SPEED = (2 * Math.PI) / 20000

export default function VizSystems({ progress, index, isActive, reduced, frozen }) {
  const isFinal = reduced || frozen

  const { dissolveIn, enterIn } = widSlice(index, N)

  // ── scroll clock — all hooks called unconditionally ───────────────────────
  const dissolve  = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })
  const scale     = useTransform(dissolve, [0, 1], [0.985, 1])
  const enter     = useTransform(progress, enterIn,  [0, 1],    { clamp: true })
  const statusOp     = useTransform(enter, [0.8, 1], [0, 1], { clamp: true })
  const centerOpacity = useTransform(statusOp, v => v * 0.55)
  // -18px shifts up so the SVG icon (not the text below) sits at sphere centre
  const centerY = useTransform(statusOp, [0, 1], ['calc(-50% - 5px)', 'calc(-50% - 20px)'])

  // Heal-pulse MotionValues — position (%) and opacity
  const pulseXMV  = useMotionValue(50)
  const pulseYMV  = useMotionValue(50)
  const pulseX    = useTransform(pulseXMV, v => `${v}%`)
  const pulseY    = useTransform(pulseYMV, v => `${v}%`)
  const pulseOpMV = useMotionValue(0)

  const containerRef = useRef(null)   // .wsys-field — used by heal-pulse querySelector
  const nodeElsRef   = useRef([])     // one entry per .wsys-node span (callback refs)
  const meshPathRef  = useRef(null)   // single SVG <path> for the entire mesh
  const loopRef      = useRef(null)   // heal-pulse cancel handle

  // isActive ref so the physics RAF closure always reads the current value without
  // being in its dependency array (the RAF runs for the full component lifetime).
  const isActiveRef = useRef(isActive)
  useEffect(() => { isActiveRef.current = isActive }, [isActive])

  // ── Wall Clock #1 — heal-pulse (unchanged from Phase 1) ──────────────────
  useEffect(() => {
    if (!isActive || isFinal) {
      animate(pulseOpMV, 0, { duration: 0.3 })
      loopRef.current?.()
      return
    }

    let cancelled = false

    const runLoop = async () => {
      await animate(pulseOpMV, 1, { duration: 0.2 })

      while (!cancelled) {
        for (const dotIdx of DATA.healTargets) {
          if (cancelled) break
          const target = DATA.nodes[dotIdx]

          const nodeEls = containerRef.current?.querySelectorAll('.wsys-node')
          nodeEls?.[dotIdx]?.classList.add('wsys-node--healing')

          await Promise.all([
            animate(pulseXMV, target.cx, { duration: 0.5, ease: 'easeInOut' }),
            animate(pulseYMV, target.cy, { duration: 0.5, ease: 'easeInOut' }),
          ])

          if (!cancelled) await new Promise(r => setTimeout(r, 1200))

          nodeEls?.[dotIdx]?.classList.remove('wsys-node--healing')
        }
      }
    }

    runLoop()
    loopRef.current = () => { cancelled = true }
    return () => { cancelled = true }
    // pulseOpMV, pulseXMV, pulseYMV are stable MotionValue refs — intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isFinal])

  // ── Wall Clock #2 — sphere rotation + mouse spring physics ───────────────
  // Runs for the full component lifetime so the sphere is already rotating when
  // the viz dissolves in (no jump-to-t0). Rotation is time-compensated; spring
  // physics is per-frame (stable at 60fps target). Only repulsion is gated on
  // isActiveRef.current — it only fires at the SYSTEMS scroll snap.
  useEffect(() => {
    if (isFinal) return

    const n   = DATA.nodes.length
    const x3d = Float32Array.from(DATA.nodes, nd => nd.x3d)
    const y3d = Float32Array.from(DATA.nodes, nd => nd.y3d)
    const z3d = Float32Array.from(DATA.nodes, nd => nd.z3d)
    const posX = Float32Array.from(DATA.nodes, nd => nd.cx)
    const posY = Float32Array.from(DATA.nodes, nd => nd.cy)
    const velX = new Float32Array(n)
    const velY = new Float32Array(n)

    // Capture DOM refs at effect-start (before any async unmount can clear them).
    const nodeElsSnapshot = nodeElsRef.current.slice()
    const meshPath        = meshPathRef.current

    let angle     = 0
    let lastT     = performance.now()
    let panelRect = null
    let rectAge   = 0
    let raf       = null

    const tick = t => {
      const dt = Math.min(t - lastT, 50)  // cap at 50ms to absorb tab-blur spikes
      lastT = t

      angle += ROT_SPEED * dt

      // Re-query panel bounds periodically — handles scroll-pin reflow and resize.
      rectAge += dt
      if (!panelRect || rectAge > 4000) {
        const el = nodeElsRef.current[0]?.closest('.widviz-panel')
        panelRect = el?.getBoundingClientRect() ?? null
        rectAge = 0
      }

      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)
      const pw   = panelRect?.width  ?? 400
      const ph   = panelRect?.height ?? 800

      // Mouse in panel-% space; stays at -999 when no panel rect (off-screen)
      const mx = panelRect ? ((CURSOR_X.get() - panelRect.left) / pw) * 100 : -999
      const my = panelRect ? ((CURSOR_Y.get() - panelRect.top)  / ph) * 100 : -999

      for (let i = 0; i < n; i++) {
        // Y-axis yaw: x' = x·cosθ − z·sinθ  (y' = y, z' unused)
        const rx    = x3d[i] * cosA - z3d[i] * sinA
        const restX = 50 + rx      * 32
        const restY = 50 + y3d[i]  * 40

        // Spring — pulls toward current rotating rest position
        let fx = (restX - posX[i]) * SPRING_K
        let fy = (restY - posY[i]) * SPRING_K

        // Mouse repulsion — medium shockwave, snaps back via spring
        if (isActiveRef.current) {
          const dx   = posX[i] - mx
          const dy   = posY[i] - my
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < REPULSE_R && dist > 0.1) {
            // Linear falloff: full strength at cursor, zero at REPULSE_R radius
            const force = REPULSE_STR * (1 - dist / REPULSE_R)
            fx += (dx / dist) * force
            fy += (dy / dist) * force
          }
        }

        // Euler integration — per-frame (intentionally not time-compensated for stable spring)
        velX[i] = (velX[i] + fx) * DAMPING
        velY[i] = (velY[i] + fy) * DAMPING
        posX[i] = Math.max(2, Math.min(98, posX[i] + velX[i]))
        posY[i] = Math.max(2, Math.min(98, posY[i] + velY[i]))

        // Write displacement as CSS transform — GPU-composited, zero layout cost.
        // Base position is left/top%; transform adds the physics offset in px.
        const el = nodeElsRef.current[i]
        if (el) {
          const offXpx = (posX[i] - DATA.nodes[i].cx) / 100 * pw
          const offYpx = (posY[i] - DATA.nodes[i].cy) / 100 * ph
          el.style.transform =
            `translate(calc(-50% + ${offXpx.toFixed(1)}px), calc(-50% + ${offYpx.toFixed(1)}px))`
        }
      }

      // Entire mesh as one SVG path attribute write — N×4 line attribute writes
      // replaced by a single setAttribute('d', ...) for the same visual output.
      if (meshPathRef.current) {
        let d = ''
        for (const [i, j] of DATA.edges)
          d += `M${posX[i].toFixed(1)} ${posY[i].toFixed(1)}L${posX[j].toFixed(1)} ${posY[j].toFixed(1)}`
        meshPathRef.current.setAttribute('d', d)
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      nodeElsSnapshot.forEach(el => {
        if (el) el.style.transform = 'translate(-50%, -50%)'
      })
      if (meshPath) meshPath.removeAttribute('d')
    }
  }, [isFinal])

  return (
    <motion.div
      className="widviz-layer widviz-systems"
      style={{ opacity: isFinal ? 1 : dissolve, scale: isFinal ? 1 : scale }}
    >
      <motion.div
        ref={containerRef}
        className="wsys-field"
        style={{ '--enter': isFinal ? 1 : enter }}
      >
        {/* Mesh SVG — single <path> updated by RAF each frame (mesh rotates with sphere).
            Pulse dots travel along 10 selected long-diagonal edges via SVG SMIL. */}
        <svg
          className="wsys-mesh-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path ref={meshPathRef} className="wsys-mesh-path" />

          {/* Data pulses — bright dots fade in at source, travel edge, fade out at target.
              Uses static rest positions (cx/cy); slight offset during repulsion is fine. */}
          {DATA.pulseEdges.map(([i, j], k) => {
            const a   = DATA.nodes[i]
            const b   = DATA.nodes[j]
            const dur = `${(0.85 + k * 0.12).toFixed(2)}s`
            const beg = `${(k * 0.28).toFixed(2)}s`
            return (
              <circle key={k} className="wsys-pulse-dot" r="1.5">
                <animate attributeName="cx" from={a.cx} to={b.cx}
                  dur={dur} repeatCount="indefinite" begin={beg} />
                <animate attributeName="cy" from={a.cy} to={b.cy}
                  dur={dur} repeatCount="indefinite" begin={beg} />
                <animate attributeName="opacity" values="0;1;1;0"
                  keyTimes="0;0.12;0.88;1"
                  dur={dur} repeatCount="indefinite" begin={beg} />
              </circle>
            )
          })}
        </svg>

        {/* 50 Fibonacci sphere nodes — CSS drives assembly (--enter/--i) and breathing.
            --z (0 back → 1 front) controls size and glow via CSS calc().
            Callback ref builds nodeElsRef array for direct RAF transform writes. */}
        {DATA.nodes.map((n, k) => (
          <span
            key={k}
            ref={el => { nodeElsRef.current[k] = el }}
            className="wsys-node"
            style={{
              '--i':     NODE_I[k],
              '--z':     n.z,
              '--delay': `${n.delay}s`,
              left:      `${n.cx}%`,
              top:       `${n.cy}%`,
            }}
          />
        ))}

        {!isFinal && (
          <motion.div
            className="wsys-pulse"
            style={{ opacity: pulseOpMV, left: pulseX, top: pulseY }}
          />
        )}

        <motion.div
          className="wsys-center-icon"
          style={{
            opacity: isFinal ? 0.55 : centerOpacity,
            x: 'calc(-50% - 10px)',
            y: isFinal ? 'calc(-50% - 20px)' : centerY,
          }}
          aria-hidden="true"
        >
          {/* Pentagon nucleus + 10 PCB traces — modelled on circuit-board logo reference.
              Pentagon R=13, center (45,45). Vertices:
              V0=(45,32) V1=(57.4,41) V2=(52.6,55.5) V3=(37.4,55.5) V4=(32.6,41)
              Traces exit from all 5 vertices + 5 side midpoints. */}
          <svg viewBox="0 0 90 90" width="68" height="68" fill="none" overflow="visible">

            {/* ── Pentagon outline ── */}
            <polygon
              points="45,32 57.4,41 52.6,55.5 37.4,55.5 32.6,41"
              stroke="currentColor" strokeWidth="0.85"
              fill="rgba(201,245,88,0.04)" opacity="0.8"
            />

            {/* ── Pentagram diagonals (all non-adjacent pairs) ── */}
            <line x1="45"  y1="32"   x2="52.6" y2="55.5" stroke="currentColor" strokeWidth="0.7" opacity="0.65" />
            <line x1="45"  y1="32"   x2="37.4" y2="55.5" stroke="currentColor" strokeWidth="0.7" opacity="0.65" />
            <line x1="57.4" y1="41"  x2="37.4" y2="55.5" stroke="currentColor" strokeWidth="0.7" opacity="0.65" />
            <line x1="57.4" y1="41"  x2="32.6" y2="41"   stroke="currentColor" strokeWidth="0.7" opacity="0.65" />
            <line x1="52.6" y1="55.5" x2="32.6" y2="41"  stroke="currentColor" strokeWidth="0.7" opacity="0.65" />

            {/* ── Center dot ── */}
            <circle cx="45" cy="45" r="2.2" fill="currentColor" className="wsys-icon-dot" />

            {/* ── 10 PCB traces — vertex exits + side-midpoint exits ── */}

            {/* V0 (45,32) — straight up */}
            <path d="M45,32 V7" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="45" cy="4.5" r="2.8" fill="currentColor" opacity="0.85" />

            {/* V0→V1 mid (51.2,36.5) — right then up */}
            <path d="M51.2,36.5 H65 V8" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="65" cy="5.5" r="2.8" fill="currentColor" opacity="0.85" />

            {/* V1 (57.4,41) — straight right */}
            <path d="M57.4,41 H80" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="82.5" cy="41" r="2.8" fill="currentColor" opacity="0.85" />

            {/* V1→V2 mid (55,48.3) — right then down */}
            <path d="M55,48.3 H71 V68" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="71" cy="70.5" r="2.8" fill="currentColor" opacity="0.85" />

            {/* V2 (52.6,55.5) — right then down */}
            <path d="M52.6,55.5 H66 V76" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="66" cy="78.5" r="2.8" fill="currentColor" opacity="0.85" />

            {/* V2→V3 mid (45,55.5) — straight down */}
            <path d="M45,55.5 V78" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="45" cy="80.5" r="2.8" fill="currentColor" opacity="0.85" />

            {/* V3 (37.4,55.5) — left then down */}
            <path d="M37.4,55.5 H24 V76" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="24" cy="78.5" r="2.8" fill="currentColor" opacity="0.85" />

            {/* V3→V4 mid (35,48.3) — straight left */}
            <path d="M35,48.3 H14" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="11.5" cy="48.3" r="2.8" fill="currentColor" opacity="0.85" />

            {/* V4 (32.6,41) — straight left */}
            <path d="M32.6,41 H9" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6.5" cy="41" r="2.8" fill="currentColor" opacity="0.85" />

            {/* V4→V0 mid (38.8,36.5) — left then up */}
            <path d="M38.8,36.5 H25 V8" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="25" cy="5.5" r="2.8" fill="currentColor" opacity="0.85" />

          </svg>

          <div className="wsys-logo-text">
            <div className="wsys-logo-title">SYSTEMS</div>
            <div className="wsys-logo-sub">CORE &amp; ORCHESTRATION</div>
          </div>
        </motion.div>
      </motion.div>

    </motion.div>
  )
}
