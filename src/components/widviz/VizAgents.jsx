// Orchestrator Core — orbital agentic workflow visualization.
// Story: Goal → Discovery → Planning → Parallel Agents → Verify → (Rework) → Ship.
// Architecture: one unified RAF clock, refs-only DOM writes, zero React re-renders.
// Contract: props { progress, agentsProgress, index, isActive, reduced, frozen }.
//   isFinal = reduced || frozen → static settled frame, no RAF, no ResizeObserver.observe.
import { useRef, useEffect } from 'react'
import { useTransform, motion } from 'framer-motion'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'

const DATA = WID_VIZ.agents
const N    = 5

// ── Coordinate space (viewBox 100 × 150, portrait) ────────────────────────────
const VB_W   = 100
const VB_H   = 150
const CORE_X = 50
const CORE_Y = 75

// Outer orbit ellipse — 5 stage nodes at 72° intervals clockwise from 12 o'clock
const RX = 29.7   // 33 × 0.9
const RY = 52.2   // 58 × 0.9

// Inner agent orbit — circular in vb space
const INNER_R = 17

// Stage angles: 72° apart, θ=0 at top (12 o'clock), increasing CW
const STAGE_ANGLES = DATA.stages.map((_, i) => (i * 2 * Math.PI) / DATA.stages.length)

// Stage node positions in vb coordinates (computed once at module load)
const STAGE_NODES = STAGE_ANGLES.map(θ => ({
  x: CORE_X + RX * Math.sin(θ),
  y: CORE_Y - RY * Math.cos(θ),
}))

// Agent base positions on inner orbit: 45°/135°/225°/315° from top
const AGENT_BASE_ANGLES = [0.25, 0.75, 1.25, 1.75].map(f => f * Math.PI)

// Rework chord — cubic bezier VERIFY → PLANNING through the core region
const REWORK_D = (() => {
  const s = STAGE_NODES[3]
  const e = STAGE_NODES[2]
  return `M ${s.x.toFixed(2)},${s.y.toFixed(2)} C 30,60 70,60 ${e.x.toFixed(2)},${e.y.toFixed(2)}`
})()

// CSS percentage helpers — convert vb coordinates to absolute percentages for HTML overlays
const xp = x => `${(x / VB_W * 100).toFixed(3)}%`
const yp = y => `${(y / VB_H * 100).toFixed(3)}%`

// ── Animation constants ────────────────────────────────────────────────────────
const ORBIT_SPEED = 0.00045

const PHASE_DUR = {
  rest:         1.0,
  goal:         0.80,
  discovery:    0.85,
  planning:     0.85,
  dispatch:     0.65,
  agents:       2.8,
  converge:     0.65,
  verification: 1.10,
  rework:       1.25,
  shipping:     0.85,
}

// Easing functions
const easeIO      = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
const lerp        = (a, b, t) => a + (b - a) * t
// easeOutBack — overshoot spring for spawn pops / node arrivals
const easeOutBack = t => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

// ── Background geometry (seeded PRNG — stable across renders) ─────────────────
// Separate seed from widViz.js _datRand so scatter is deterministic & independent.
const _bgRand = (() => {
  let s = 0xAF1B3C7E
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
})()

// ~16 scatter nodes — avoid the central orbit footprint (core ± 38 vb units)
const _bgNodes = (() => {
  const nodes = []
  let attempts = 0
  while (nodes.length < 16 && attempts++ < 200) {
    const x = 3 + _bgRand() * 94
    const y = 5 + _bgRand() * 140
    if (Math.hypot(x - CORE_X, y - CORE_Y) < 38) continue
    nodes.push({ x: +x.toFixed(1), y: +y.toFixed(1) })
  }
  return nodes
})()

// Connect nearby node pairs (< 35 vb units)
const _bgEdges = []
for (let i = 0; i < _bgNodes.length; i++) {
  for (let j = i + 1; j < _bgNodes.length; j++) {
    if (Math.hypot(_bgNodes[i].x - _bgNodes[j].x, _bgNodes[i].y - _bgNodes[j].y) < 35)
      _bgEdges.push([i, j])
  }
}

// 12 ambient drift particles — pure-CSS, px drift offsets (approximate field size)
const _APPROX_W = 420
const _APPROX_H = 560
const _particles = Array.from({ length: 12 }, () => ({
  x:     +(5 + _bgRand() * 90).toFixed(1),
  y:     +(10 + _bgRand() * 130).toFixed(1),
  dx:    +((_bgRand() * 16 - 8) * _APPROX_W / VB_W).toFixed(1),
  dy:    +(-6 - _bgRand() * 22) * _APPROX_H / VB_H,
  dur:   +(10 + _bgRand() * 8).toFixed(1),
  delay: +(-_bgRand() * 14).toFixed(1),
}))

// ── Agent persona — per-agent character constants ──────────────────────────────
// speedMult: orbit angular velocity multiplier (applied to shared agentRotation)
// glow:      box-shadow intensity scalar exposed as CSS --agent-glow
// radiusDelta: ±vb units offset from INNER_R for slight orbit radius variance
const AGENT_PERSONA = [
  { speedMult: 0.88, glow: 1.35, radiusDelta:  0.9 },
  { speedMult: 1.14, glow: 0.72, radiusDelta: -0.9 },
  { speedMult: 0.94, glow: 1.08, radiusDelta:  1.3 },
  { speedMult: 1.08, glow: 0.88, radiusDelta: -0.5 },
]

// ── Contextual label — one word per phase ──────────────────────────────────────
const DISPATCH_LABELS = ['tool call', 'search', 'memory', 'reasoning']

// ─────────────────────────────────────────────────────────────────────────────

export default function VizAgents({ progress, agentsProgress, index, isActive, reduced, frozen }) {
  const isFinal = reduced || frozen
  void agentsProgress  // consumed by WidVisual exit-fade wrapper, not here

  // Cross-dissolve — identical infra used by every widviz component
  const { dissolveIn, dissolveOut } = widSlice(index, N)
  const dissolve = useTransform(progress, dissolveIn, dissolveOut, { clamp: true })

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const isActiveRef   = useRef(isActive)
  const fieldRef      = useRef(null)
  const fieldSizeRef  = useRef({ w: 100, h: 150 })
  const reworkPathRef = useRef(null)
  const leadRef       = useRef(null)
  const childRefs     = useRef([])
  const nodeRefs      = useRef([])
  const trailRefs     = useRef([])    // pool of 6 ghost trail dots
  const labelRef      = useRef(null)  // contextual phase label
  const labelPickRef  = useRef('')    // dispatch label chosen once per dispatch entry

  const simRef = useRef({
    phase:               'rest',
    phaseStartT:         0,
    reworkedThisCycle:   false,
    agentDurMult:        [0.72, 1.0, 0.85, 0.62],
    agentProgress:       [0, 0, 0, 0],
    agentRotation:       0,
    convergeStartAngles: AGENT_BASE_ANGLES.slice(),
    phaseDurJitter:      1.0,
  })

  // Sync isActive → ref; clear phase marker + hide tokens when off-screen
  useEffect(() => {
    isActiveRef.current = isActive
    if (!isActive && fieldRef.current) {
      delete fieldRef.current.dataset.phase
      if (leadRef.current) leadRef.current.style.opacity = '0'
      childRefs.current.forEach(el => { if (el) el.style.opacity = '0' })
      nodeRefs.current.forEach(el => { if (el) el.classList.remove('wagnt-node--active') })
      trailRefs.current.forEach(el => { if (el) el.style.opacity = '0' })
      if (labelRef.current) labelRef.current.classList.remove('wagnt-ctx-label--show')
    }
  }, [isActive])

  // ResizeObserver — keeps fieldSizeRef current for vb→px conversion
  useEffect(() => {
    const el = fieldRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.width > 0) fieldSizeRef.current = { w: r.width, h: r.height }
    if (isFinal) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0) fieldSizeRef.current = { w: width, h: height }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [isFinal])

  // ── Unified RAF loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isFinal) return

    let lastT = performance.now()
    let raf   = null

    const TRAIL_LEN  = 6
    const trailBuf   = { pts: Array(TRAIL_LEN).fill(null), head: 0 }
    let   travelVis  = false  // whether traveler is currently shown

    // Convert viewBox coordinates to field pixel positions
    const vbPx = (vbX, vbY) => ({
      x: vbX / VB_W * fieldSizeRef.current.w,
      y: vbY / VB_H * fieldSizeRef.current.h,
    })

    // Write token position via transform only — no layout
    const placeToken = (el, vbX, vbY, opacity = 1, scale = 1) => {
      if (!el) return
      const { x, y } = vbPx(vbX, vbY)
      el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${scale})`
      el.style.opacity   = opacity.toFixed(3)
    }

    // Place traveler and push position into comet trail ring-buffer
    const placeLead = (vbX, vbY, opacity = 1, scale = 1) => {
      placeToken(leadRef.current, vbX, vbY, opacity, scale)
      travelVis = opacity > 0.05
      if (travelVis) {
        trailBuf.pts[trailBuf.head] = { vbX, vbY }
        trailBuf.head = (trailBuf.head + 1) % TRAIL_LEN
      }
    }

    const hideToken = el => { if (el) el.style.opacity = '0' }
    const hideLead  = () => { hideToken(leadRef.current); travelVis = false }

    // Update comet tail — N ghost dots behind the traveler, decreasing opacity+scale
    const updateTrail = () => {
      if (!travelVis) {
        trailRefs.current.forEach(el => { if (el) el.style.opacity = '0' })
        return
      }
      for (let i = 0; i < TRAIL_LEN; i++) {
        const el  = trailRefs.current[i]
        if (!el) continue
        const idx = (trailBuf.head - 1 - i + TRAIL_LEN * 2) % TRAIL_LEN
        const pt  = trailBuf.pts[idx]
        if (!pt) { el.style.opacity = '0'; continue }
        const age = (i + 1) / (TRAIL_LEN + 1)
        placeToken(el, pt.vbX, pt.vbY, (1 - age) * 0.45, lerp(0.82, 0.2, age))
      }
    }

    const setActiveNode = idx => {
      nodeRefs.current.forEach((el, i) => {
        if (el) el.classList.toggle('wagnt-node--active', i === idx)
      })
    }
    const clearActiveNodes = () => {
      nodeRefs.current.forEach(el => { if (el) el.classList.remove('wagnt-node--active') })
    }

    // Show/hide contextual label near a vb position
    const showLabel = (text, vbX, vbY) => {
      const el = labelRef.current
      if (!el) return
      el.textContent = text
      el.style.left  = xp(vbX)
      el.style.top   = yp(vbY)
      el.classList.add('wagnt-ctx-label--show')
    }
    const hideLabel = () => {
      const el = labelRef.current
      if (el) el.classList.remove('wagnt-ctx-label--show')
    }

    // Update label on FSM phase entry
    const updateLabelForPhase = phase => {
      switch (phase) {
        case 'planning':     showLabel('planning', STAGE_NODES[2].x, STAGE_NODES[2].y); break
        case 'dispatch':
        case 'agents':       showLabel(labelPickRef.current, CORE_X, CORE_Y - 24);       break
        case 'verification': showLabel('critique', STAGE_NODES[3].x, STAGE_NODES[3].y); break
        case 'rework':       showLabel('retry',    STAGE_NODES[3].x, STAGE_NODES[3].y); break
        case 'shipping':     showLabel('passed',   STAGE_NODES[4].x, STAGE_NODES[4].y); break
        default:             hideLabel(); break
      }
    }

    // Effective phase duration
    const getPhaseDur = sim => {
      if (sim.phase === 'agents') {
        return PHASE_DUR.agents * (sim.reworkedThisCycle ? 0.7 : 1.0) * sim.phaseDurJitter
      }
      if (sim.phase === 'goal' || sim.phase === 'discovery' || sim.phase === 'planning') {
        return PHASE_DUR[sim.phase] * sim.phaseDurJitter
      }
      return PHASE_DUR[sim.phase] ?? 1.0
    }

    // FSM transition — pure function returning a new state object
    const nextPhase = (sim, now) => {
      const b = { ...sim, phaseStartT: now }
      switch (sim.phase) {
        case 'rest':
          return {
            ...b,
            phase:             'goal',
            reworkedThisCycle: false,
            agentRotation:     0,
            agentProgress:     [0, 0, 0, 0],
            phaseDurJitter:    0.9 + Math.random() * 0.2,
          }
        case 'goal':      return { ...b, phase: 'discovery' }
        case 'discovery': return { ...b, phase: 'planning' }
        case 'planning': {
          const gateIdx      = Math.floor(Math.random() * 4)
          const agentDurMult = [0, 1, 2, 3].map(i =>
            i === gateIdx ? 1.0 : 0.55 + Math.random() * 0.37
          )
          return { ...b, phase: 'dispatch', agentDurMult, agentProgress: [0, 0, 0, 0] }
        }
        case 'dispatch':  return { ...b, phase: 'agents' }
        case 'agents':
          // Capture each agent's individual end angle (base + rotation × speedMult)
          return {
            ...b,
            phase:               'converge',
            convergeStartAngles: AGENT_BASE_ANGLES.map((base, i) =>
              base + sim.agentRotation * AGENT_PERSONA[i].speedMult
            ),
          }
        case 'converge':     return { ...b, phase: 'verification' }
        case 'verification':
          if (!sim.reworkedThisCycle) return { ...b, phase: 'rework' }
          return { ...b, phase: 'shipping' }
        case 'rework':    return { ...b, phase: 'planning', reworkedThisCycle: true }
        case 'shipping':  return { ...b, phase: 'rest' }
        default:          return { ...b, phase: 'rest' }
      }
    }

    // Render one frame of the current phase
    const renderSim = (sim, t, elapsed, dt) => {
      if (!fieldRef.current) return
      const ease = easeIO(Math.min(t, 1))

      switch (sim.phase) {

        case 'rest': {
          hideLead()
          childRefs.current.forEach(hideToken)
          clearActiveNodes()
          break
        }

        case 'goal': {
          leadRef.current?.classList.remove('wagnt-packet--fail')
          // easeOutBack for the pop-in overshoot
          const popT  = Math.min(ease / 0.4, 1)
          const scale = ease < 0.4
            ? lerp(0.5, 1.1, easeOutBack(popT))
            : lerp(1.1, 1.0, (ease - 0.4) / 0.6)
          placeLead(STAGE_NODES[0].x, STAGE_NODES[0].y, Math.min(ease * 3, 1), scale)
          childRefs.current.forEach(hideToken)
          setActiveNode(0)
          break
        }

        case 'discovery': {
          const θ = lerp(STAGE_ANGLES[0], STAGE_ANGLES[1], ease)
          placeLead(CORE_X + RX * Math.sin(θ), CORE_Y - RY * Math.cos(θ))
          childRefs.current.forEach(hideToken)
          setActiveNode(ease > 0.65 ? 1 : 0)
          break
        }

        case 'planning': {
          if (!sim.reworkedThisCycle) {
            const θ = lerp(STAGE_ANGLES[1], STAGE_ANGLES[2], ease)
            placeLead(CORE_X + RX * Math.sin(θ), CORE_Y - RY * Math.cos(θ))
            setActiveNode(ease > 0.65 ? 2 : 1)
          } else {
            leadRef.current?.classList.remove('wagnt-packet--fail')
            placeLead(STAGE_NODES[2].x, STAGE_NODES[2].y, Math.min(ease * 5, 1))
            setActiveNode(2)
          }
          childRefs.current.forEach(hideToken)
          break
        }

        case 'dispatch': {
          placeLead(STAGE_NODES[2].x, STAGE_NODES[2].y, Math.max(1 - ease * 2.5, 0))
          setActiveNode(2)
          childRefs.current.forEach((el, i) => {
            const spawnAt = i * 0.12
            const childT  = ease <= spawnAt ? 0 : Math.min((ease - spawnAt) / 0.65, 1)
            if (childT <= 0) { hideToken(el); return }
            const persona     = AGENT_PERSONA[i]
            const targetAngle = AGENT_BASE_ANGLES[i]
            const r  = INNER_R + persona.radiusDelta
            const tx = CORE_X + r * Math.sin(targetAngle)
            const ty = CORE_Y - r * Math.cos(targetAngle)
            const ce = easeIO(childT)
            // easeOutBack for the pop-out overshoot
            const cs = childT < 0.6
              ? lerp(0.3, 1.1, easeOutBack(childT / 0.6))
              : lerp(1.1, 1.0, (childT - 0.6) / 0.4)
            // --agent-glow is static per agent (set once inline at mount below) —
            // no need to re-write it on every frame.
            placeToken(el, lerp(STAGE_NODES[2].x, tx, ce), lerp(STAGE_NODES[2].y, ty, ce), childT, cs)
          })
          break
        }

        case 'agents': {
          // Agents orbit at individual speeds (persona.speedMult × shared rotation)
          clearActiveNodes()
          hideLead()
          sim.agentRotation += dt * ORBIT_SPEED
          const agentDur = PHASE_DUR.agents * (sim.reworkedThisCycle ? 0.7 : 1.0) * sim.phaseDurJitter
          childRefs.current.forEach((el, i) => {
            const persona = AGENT_PERSONA[i]
            sim.agentProgress[i] = Math.min(elapsed / (sim.agentDurMult[i] * agentDur), 1)
            const angle = AGENT_BASE_ANGLES[i] + sim.agentRotation * persona.speedMult
            const r     = INNER_R + persona.radiusDelta
            placeToken(
              el,
              CORE_X + r * Math.sin(angle),
              CORE_Y - r * Math.cos(angle),
              lerp(0.45, 1.0, sim.agentProgress[i]),
            )
          })
          break
        }

        case 'converge': {
          clearActiveNodes()
          hideLead()
          childRefs.current.forEach((el, i) => {
            const startAngle = sim.convergeStartAngles[i]
            const persona    = AGENT_PERSONA[i]
            const r          = INNER_R + persona.radiusDelta
            const sx = CORE_X + r * Math.sin(startAngle)
            const sy = CORE_Y - r * Math.cos(startAngle)
            placeToken(el,
              lerp(sx, STAGE_NODES[3].x, ease),
              lerp(sy, STAGE_NODES[3].y, ease),
              1 - ease * 0.8,
            )
          })
          break
        }

        case 'verification': {
          leadRef.current?.classList.remove('wagnt-packet--fail')
          const popT  = Math.min(ease / 0.35, 1)
          const scale = ease < 0.35
            ? lerp(0.5, 1.1, easeOutBack(popT))
            : lerp(1.1, 1.0, (ease - 0.35) / 0.65)
          placeLead(STAGE_NODES[3].x, STAGE_NODES[3].y, Math.min(ease * 4, 1), scale)
          childRefs.current.forEach(hideToken)
          setActiveNode(3)
          break
        }

        case 'rework': {
          const pathEl = reworkPathRef.current
          if (pathEl) {
            const opacity = ease < 0.82 ? 1 : lerp(1, 0, (ease - 0.82) / 0.18)
            const pt = pathEl.getPointAtLength(ease * pathEl.getTotalLength())
            leadRef.current?.classList.add('wagnt-packet--fail')
            placeLead(pt.x, pt.y, opacity)
          }
          childRefs.current.forEach(hideToken)
          setActiveNode(3)
          break
        }

        case 'shipping': {
          leadRef.current?.classList.remove('wagnt-packet--fail')
          const θ = lerp(STAGE_ANGLES[3], STAGE_ANGLES[4], ease)
          placeLead(CORE_X + RX * Math.sin(θ), CORE_Y - RY * Math.cos(θ))
          childRefs.current.forEach(hideToken)
          setActiveNode(ease > 0.6 ? 4 : 3)
          break
        }

        default: break
      }
    }

    const tick = t => {
      raf   = requestAnimationFrame(tick)
      const dt = Math.min(t - lastT, 50)
      lastT = t

      if (!isActiveRef.current) return

      const sim     = simRef.current
      const elapsed = (t - sim.phaseStartT) / 1000
      const dur     = getPhaseDur(sim)

      if (elapsed >= dur) {
        const newSim = nextPhase(sim, t)
        simRef.current = newSim
        if (fieldRef.current) {
          if (newSim.phase === 'rest') delete fieldRef.current.dataset.phase
          else fieldRef.current.dataset.phase = newSim.phase
        }
        // Pick dispatch label once on entry into dispatch
        if (newSim.phase === 'dispatch') {
          labelPickRef.current = DISPATCH_LABELS[Math.floor(Math.random() * DISPATCH_LABELS.length)]
        }
        updateLabelForPhase(newSim.phase)
        renderSim(newSim, 0, 0, 0)
        updateTrail()
        return
      }

      renderSim(sim, elapsed / dur, elapsed, dt)
      updateTrail()
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isFinal])

  return (
    <motion.div
      className={`widviz-layer widviz-agents${isActive && !isFinal ? ' wagnt-live' : ''}`}
      style={{ opacity: isFinal ? 1 : dissolve }}
    >
      <div className="wagnt-field" ref={fieldRef}>

        {/* ── Depth gradient — spatial falloff behind the core ──────────────── */}
        <div className="wagnt-depth-gradient" aria-hidden="true" />

        {/* ── Background scatter network (static CSS breathing, no RAF) ─────── */}
        <svg
          className="wagnt-network-svg"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {_bgEdges.map(([a, b], i) => (
            <line
              key={i}
              x1={_bgNodes[a].x} y1={_bgNodes[a].y}
              x2={_bgNodes[b].x} y2={_bgNodes[b].y}
              className="wagnt-bg-edge"
            />
          ))}
          {_bgNodes.map((n, i) => (
            <circle key={i} cx={n.x} cy={n.y} r="0.8" className="wagnt-bg-node" />
          ))}
        </svg>

        {/* ── Ambient drift particles (pure CSS, very low opacity) ───────────── */}
        {_particles.map((p, i) => (
          <div
            key={i}
            className="wagnt-particle"
            style={{
              left:            xp(p.x),
              top:             yp(p.y),
              '--par-dx':    `${p.dx.toFixed(1)}px`,
              '--par-dy':    `${p.dy.toFixed(1)}px`,
              '--par-dur':   `${p.dur}s`,
              '--par-delay': `${p.delay}s`,
            }}
            aria-hidden="true"
          />
        ))}

        {/* ── SVG: orbit guides + rework chord ──────────────────────────────── */}
        <svg
          className="wagnt-svg"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <ellipse cx={CORE_X} cy={CORE_Y} rx={RX} ry={RY} className="wagnt-orbit-guide" />
          <ellipse cx={CORE_X} cy={CORE_Y} rx={INNER_R} ry={INNER_R} className="wagnt-inner-orbit" />
          <path ref={reworkPathRef} d={REWORK_D} className="wagnt-rework-chord" />
        </svg>

        {/* ── Stage nodes ─────────────────────────────────────────────────────── */}
        {DATA.stages.map((stage, i) => (
          <div
            key={stage.id}
            ref={el => { nodeRefs.current[i] = el }}
            className={`wagnt-node wagnt-node--${stage.id}`}
            style={{ left: xp(STAGE_NODES[i].x), top: yp(STAGE_NODES[i].y) }}
          >
            <div className="wagnt-node-dot-wrap">
              {/* --node-phase staggers idle-breathing animation per node */}
              <div className="wagnt-node-halo" style={{ '--node-phase': `${i * 0.9}s` }} />
              <div className="wagnt-node-dot" />
              <div className="wagnt-node-ripple" />
            </div>
            <span className="wagnt-node-label">{stage.label}</span>
          </div>
        ))}

        {/* ── Orchestrator core ─────────────────────────────────────────────── */}
        <div className="wagnt-core" style={{ left: xp(CORE_X), top: yp(CORE_Y) }}>
          <div className="wagnt-core-bloom" />
          <div className="wagnt-core-ring" />
          <div className="wagnt-core-dot" />
        </div>

        {/* ── Frozen agent orbs (isFinal: CSS-positioned, no RAF) ───────────── */}
        {isFinal && AGENT_BASE_ANGLES.map((angle, i) => (
          <div
            key={i}
            className="wagnt-agent wagnt-agent--static"
            style={{
              left:    xp(CORE_X + INNER_R * Math.sin(angle)),
              top:     yp(CORE_Y - INNER_R * Math.cos(angle)),
              opacity: 0.3,
            }}
            aria-hidden="true"
          />
        ))}

        {/* ── Live motion elements (RAF-driven; hidden when !isActive) ──────── */}
        {!isFinal && (
          <>
            {/* Traveler — lime dot that rides the outer ring */}
            <div
              ref={leadRef}
              className="wagnt-traveler"
              style={{ opacity: 0 }}
              aria-hidden="true"
            />

            {/* Comet trail — 6 ghost dots behind the traveler, RAF-placed */}
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                ref={el => { trailRefs.current[i] = el }}
                className="wagnt-trail"
                style={{ opacity: 0 }}
                aria-hidden="true"
              />
            ))}

            {/* 4 agent orbs — orbit the core during the agents phase */}
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                ref={el => { childRefs.current[i] = el }}
                className="wagnt-agent"
                style={{ opacity: 0, '--agent-glow': AGENT_PERSONA[i].glow }}
                aria-hidden="true"
              />
            ))}

            {/* Contextual phase label — one lowercase whisper, phase-driven */}
            <div ref={labelRef} className="wagnt-ctx-label" aria-hidden="true" />
          </>
        )}

      </div>
    </motion.div>
  )
}
