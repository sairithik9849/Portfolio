// Phases 1.5 + 2A + 2B/2C/2D — AgentsViz autonomous factory simulation.
// Phase 1.5: static visual architecture (chassis, rails, stations, core).
// Phase 2A: ambient motion (CSS keyframes + telemetry drift RAF).
// Phase 2B: token lifecycle — goal packet traverses the full factory loop.
// Phase 2C: telemetry coupling — PASS/CONF respond to verification outcomes.
// Phase 2D: rework — ~18% of cycles reject and self-correct via rework arc.
// Architecture: one unified RAF clock, refs-only DOM writes, zero React re-renders.
// See agentsViz.md §Phase 2B/2C/2D for all architecture decisions.
import { useRef, useEffect } from 'react'
import { useTransform, motion } from 'framer-motion'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'

const DATA = WID_VIZ.agents
const N    = 5

// Telemetry entries that breathe with the RAF loop. Each entry matches
// a station telemetry item carrying a drift object in widViz.js.
const DRIFT_ENTRIES = DATA.stations.flatMap(station =>
  (station.telemetry ?? []).filter(t => t.drift).map(t => ({
    key:     `${station.id}:${t.label}`,
    drift:   t.drift,
    initial: parseFloat(t.value),
  }))
)

// ── Layout model — all coordinates in viewBox space (100 × 150) ───────────────
// Portrait aspect ~0.667 maps to the real panel (~672 × 900 px at 1440).
// HTML overlay positions are derived from these same coordinates so SVG and
// HTML elements share one coordinate system:
//   xp(x) = x / VB_W * 100 + '%'   yp(y) = y / VB_H * 100 + '%'

const VB_W = 100
const VB_H = 150

// Station Y bands (ADR-002).
const BANDS = {
  intake:       { y1: 0,     y2: 4.5   },
  discovery:    { y1: 4.5,   y2: 24    },
  planning:     { y1: 24,    y2: 45    },
  execution:    { y1: 45,    y2: 105   },
  verification: { y1: 105,   y2: 126   },
  shipping:     { y1: 126,   y2: 145.5 },
  output:       { y1: 145.5, y2: 150   },
}

const FRAME_X1 = 8    // left upright
const FRAME_X2 = 92   // right upright
const USABLE_W = FRAME_X2 - FRAME_X1  // 84 units across

// Coordinate helpers — convert viewBox units to CSS percentage strings
const xp = x       => `${(x / VB_W * 100).toFixed(3)}%`
const yp = y       => `${(y / VB_H * 100).toFixed(3)}%`
const hp = (y1,y2) => `${((y2 - y1) / VB_H * 100).toFixed(3)}%`
const wp = w       => `${(w / VB_W * 100).toFixed(3)}%`

// Lane centers — evenly distributed across the usable width (ADR-003).
const LANE_CENTERS = Array.from({ length: DATA.lanes }, (_, i) =>
  FRAME_X1 + USABLE_W * (i + 0.5) / DATA.lanes
)
// → [18.5, 39.5, 60.5, 81.5]

// Core center sits at the middle of the execution band
const CORE_X = 50
const CORE_Y = (BANDS.execution.y1 + BANDS.execution.y2) / 2  // 75

// ── SVG path builders (pure functions, evaluated once at module load) ──────────

// Fan-out: single output at planning bottom → each lane top.
// Phase 2 animation target — DO NOT MODIFY.
const FAN_OUT = LANE_CENTERS.map(lx => {
  const py = BANDS.planning.y2          // 45
  const ly = BANDS.execution.y1 + 3    // 48
  return `M ${CORE_X},${py} C ${CORE_X},${py + 1} ${lx},${ly - 1} ${lx},${ly}`
})

// Reconverge: each lane bottom → single input at verification top.
// Phase 2 animation target — DO NOT MODIFY.
const RECONVERGE = LANE_CENTERS.map(lx => {
  const ly = BANDS.execution.y2 - 3    // 102
  const vy = BANDS.verification.y1     // 105
  return `M ${lx},${ly} C ${lx},${vy - 1} ${CORE_X},${vy - 1} ${CORE_X},${vy}`
})

// Rework retry bus — engineered orthogonal path, right side of factory.
// Exits verification right wall → rounded corner into right gutter → runs up → rounded corner
// back into planning. Orthogonal routing with Q fillets reads as an intentional retry bus.
// Token driven by getPointAtLength(reworkPathRef) — no mirrored control-point duplication.
const RW_GUTTER_X  = FRAME_X2 + 3    // x = 95, vertical run in right gutter
const RW_ENTRY_X   = FRAME_X2 - 5    // x = 87, horizontal stub into / out of stations
const RW_CORNER_R  = 3               // fillet radius (vb units) for engineered joins
const RW_IN_Y      = BANDS.verification.y1 + 7   // 112 — exit from verification
const RW_OUT_Y     = BANDS.planning.y2 - 7        // 38  — entry into planning
// Orthogonal path: H-stub → Q corner → V-run → Q corner → H-stub
const REWORK = [
  `M ${RW_ENTRY_X},${RW_IN_Y}`,
  `L ${RW_GUTTER_X - RW_CORNER_R},${RW_IN_Y}`,
  `Q ${RW_GUTTER_X},${RW_IN_Y} ${RW_GUTTER_X},${RW_IN_Y - RW_CORNER_R}`,
  `L ${RW_GUTTER_X},${RW_OUT_Y + RW_CORNER_R}`,
  `Q ${RW_GUTTER_X},${RW_OUT_Y} ${RW_GUTTER_X - RW_CORNER_R},${RW_OUT_Y}`,
  `L ${RW_ENTRY_X},${RW_OUT_Y}`,
].join(' ')

// Arrowhead — small filled triangle pointing left into planning
const REWORK_ARROW = [
  `${RW_ENTRY_X},${RW_OUT_Y - 1.5}`,
  `${RW_ENTRY_X},${RW_OUT_Y + 1.5}`,
  `${RW_ENTRY_X - 2.5},${RW_OUT_Y}`,
].join(' ')

// Tie-bar Y positions — first and last are "cap" bars, inner are station dividers
const TIE_YS = [4.5, 24, 45, 105, 126, 145.5]
const CAP_SET = new Set([4.5, 145.5])

// ── Phase 1.5 geometry (derived from the same coordinate system) ───────────────

// A. Flow conduit underlay path (intake → discovery → planning throat)
const CONDUIT_TOP = `M ${CORE_X},${BANDS.intake.y1} L ${CORE_X},${BANDS.planning.y2 - 3}`
const CONDUIT_BOT = `M ${CORE_X},${BANDS.verification.y1 + 0} L ${CORE_X},${BANDS.output.y2}`

// A. Downward chevron ticks — larger for directional clarity (half=3.2, rise=1.8)
// Three on the top spine (discovery zone), two on the bottom (shipping zone)
const makeChevronDown = (cx, cy, half = 3.2, rise = 1.8) =>
  `M ${cx - half},${cy - rise} L ${cx},${cy} L ${cx + half},${cy - rise}`

const SPINE_CHEVRONS_DOWN = [
  makeChevronDown(CORE_X,  9),
  makeChevronDown(CORE_X, 14.5),
  makeChevronDown(CORE_X, 20),
  makeChevronDown(CORE_X, 132),
  makeChevronDown(CORE_X, 139),
]

// A. Rework upward chevrons — slightly larger for the retry bus (half=2.2, rise=1.5)
const makeChevronUp = (cx, cy, half = 2.2, rise = 1.5) =>
  `M ${cx - half},${cy + rise} L ${cx},${cy} L ${cx + half},${cy + rise}`

const REWORK_CHEVRONS = [
  makeChevronUp(RW_GUTTER_X, 88),
  makeChevronUp(RW_GUTTER_X, 76),
  makeChevronUp(RW_GUTTER_X, 64),
]

// B. Discovery mid-Y — used by renderSim for token positioning
const DISC_MID_Y = (BANDS.discovery.y1 + BANDS.discovery.y2) / 2  // 14.25

// C. Planning manifold chamber
// Top edge (input): narrow throat centered on spine
// Bottom edge (output): wider, aligned to outer lane rail span
const MF_TOP_Y   = BANDS.planning.y1 + 4    // 28 — below station label area
const MF_BOT_Y   = BANDS.planning.y2 - 2    // 43 — just above fan-out origin (45)
const MF_TOP_X1  = CORE_X - 7               // 43 — narrow throat
const MF_TOP_X2  = CORE_X + 7               // 57
const MF_BOT_X1  = CORE_X - 18             // 32 — wide base
const MF_BOT_X2  = CORE_X + 18             // 68

// Manifold outline: trapezoid (top narrow, bottom wide)
const MANIFOLD_PATH = [
  `M ${MF_TOP_X1},${MF_TOP_Y}`,
  `L ${MF_TOP_X2},${MF_TOP_Y}`,
  `L ${MF_BOT_X2},${MF_BOT_Y}`,
  `L ${MF_BOT_X1},${MF_BOT_Y}`,
  `Z`,
].join(' ')

// Manifold ribs: 4 lines from a point near top-center to 4 equally spaced bottom exits
const MF_INPUT_X = CORE_X   // 50 — single spine entry point
const MF_INPUT_Y = MF_TOP_Y + 1  // just below top edge
const MF_EXIT_YS = MF_BOT_Y
const MF_EXIT_XS = LANE_CENTERS.map(lx => {
  const t = (lx - FRAME_X1) / USABLE_W
  return MF_BOT_X1 + t * (MF_BOT_X2 - MF_BOT_X1)
})

const MANIFOLD_RIBS = MF_EXIT_XS.map(ex =>
  `M ${MF_INPUT_X},${MF_INPUT_Y} L ${ex},${MF_EXIT_YS}`
)

// E. Verification gate bar — full-span, no hatch dependency
// Centered at 55% down the verification band (same as before)
const VER_GATE_Y  = BANDS.verification.y1 + (BANDS.verification.y2 - BANDS.verification.y1) * 0.55
const GATE_BAR_X1 = FRAME_X1 + 2   // nearly full width — no hatch strips
const GATE_BAR_X2 = FRAME_X2 - 2

// Execution station (separate from the other four; rendered as a lane grid)
const EXEC_STATION   = DATA.stations.find(s => s.id === 'execution')
const OTHER_STATIONS = DATA.stations.filter(s => s.id !== 'execution')

// ── Phase 2B — Simulation geometry (additive; d-strings above are UNCHANGED) ──

// Cubic bezier point evaluator — pure function, no DOM reads.
// Derives the same curves as FAN_OUT / RECONVERGE / REWORK without touching them.
const cubicBezierPt = (p0, p1, p2, p3, t) => {
  const u = 1 - t
  return {
    x: u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
    y: u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y,
  }
}

// Smooth ease-in-out (cubic) for token motion
const easeIO = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2

// Fan-out control points per lane — match FAN_OUT d-strings exactly
const FAN_OUT_PTS = LANE_CENTERS.map(lx => {
  const py = BANDS.planning.y2       // 45
  const ly = BANDS.execution.y1 + 3  // 48
  return [{ x: CORE_X, y: py }, { x: CORE_X, y: py+1 }, { x: lx, y: ly-1 }, { x: lx, y: ly }]
})

// Reconverge control points per lane — match RECONVERGE d-strings exactly
const RECONVERGE_PTS = LANE_CENTERS.map(lx => {
  const ly = BANDS.execution.y2 - 3  // 102
  const vy = BANDS.verification.y1   // 105
  return [{ x: lx, y: ly }, { x: lx, y: vy-1 }, { x: CORE_X, y: vy-1 }, { x: CORE_X, y: vy }]
})

// Execution rail travel bounds
const EXEC_RAIL_Y1 = BANDS.execution.y1 + 3  // 48
const EXEC_RAIL_Y2 = BANDS.execution.y2 - 3  // 102

// Per-lane duration multipliers — staggered, non-synchronized finishes
// Lane 0: 72%, Lane 1: 100% (gate), Lane 2: 85%, Lane 3: 62%
const LANE_DUR_MULT = [0.72, 1.0, 0.85, 0.62]
const EXEC_BASE_DUR = 3.2  // slowest lane (×1.0) defines when execution phase ends

// Phase durations in seconds. Execution overridden by getPhaseDur() for rework compression.
const PHASE_DUR = {
  intake:       0.8,
  discovery:    1.0,
  planning:     1.0,
  fanout:       0.6,
  execution:    EXEC_BASE_DUR,
  reconverge:   0.7,
  verification: 1.0,
  shipping:     0.8,
  rework:       1.2,
  rest:         1.0,
}

// ─────────────────────────────────────────────────────────────────────────────

export default function VizAgents({ progress, agentsProgress, index, isActive, reduced, frozen }) {
  const isFinal = reduced || frozen

  // Cross-dissolve — shared infra used by every widviz component.
  const { dissolveIn } = widSlice(index, N)
  const dissolve = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })

  // agentsProgress consumed in Phase 2B+ (could drive cycle speed; parked for now)
  void agentsProgress

  // ── Refs ─────────────────────────────────────────────────────────────────────

  // Phase 2A: telemetry drift
  const driftElsRef   = useRef(new Map())
  const driftStateRef = useRef(
    Object.fromEntries(
      DRIFT_ENTRIES.map(e => [e.key, { value: e.initial, target: e.initial, nextAt: 0 }])
    )
  )
  const isActiveRef = useRef(isActive)

  // Phase 2B: simulation
  const fieldRef        = useRef(null)
  const fieldSizeRef    = useRef({ w: 100, h: 150 })  // px, updated by ResizeObserver
  const reworkPathRef   = useRef(null)   // SVG <path> element — sampled via getPointAtLength
  const leadRef         = useRef(null)
  const childRefs       = useRef([])   // length 4, one per lane
  const slot1Refs       = useRef([])   // length 4, module fill for slot[1] per lane
  // New motion elements — CSS-animation-driven, no RAF writes needed
  const intakePulseRef  = useRef(null)
  const lanePulseRefs   = useRef([])    // length 4, one per lane
  const outPulseRef     = useRef(null)
  const simRef          = useRef({
    phase:              'rest',
    phaseStartT:        0,    // 0 → elapsed will be huge on first tick → immediate transition
    reworkedThisCycle:  false,
    failThisCycle:      false,
    consecutivePasses:  0,
    laneProgress:       [0, 0, 0, 0],
    // Per-cycle variation: randomised each execution entry and cycle start
    laneDurMult:        LANE_DUR_MULT,
    phaseDurJitter:     1.0,
  })

  // Sync isActive to ref; clear phase marker + hide tokens when panel is off-screen
  useEffect(() => {
    isActiveRef.current = isActive
    if (!isActive && fieldRef.current) {
      delete fieldRef.current.dataset.phase
      if (leadRef.current) leadRef.current.style.opacity = '0'
      childRefs.current.forEach(el => { if (el) el.style.opacity = '0' })
    }
  }, [isActive])

  // ResizeObserver keeps fieldSizeRef current for vb→px conversion (no per-frame BoundingClientRect)
  useEffect(() => {
    const el = fieldRef.current
    if (!el) return
    // Immediate measurement for the first tick
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

  // ── Unified RAF loop (Phase 2A drift + Phase 2B/2C/2D simulation) ────────────
  // Single clock, refs-only writes, zero React re-renders during animation.
  useEffect(() => {
    if (isFinal) return

    let lastT = performance.now()
    let raf   = null

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
      el.style.opacity = opacity.toFixed(3)
    }
    const hideToken = el => { if (el) el.style.opacity = '0' }

    // Lerp between two viewBox points
    const lerp2 = (ax, ay, bx, by, t) => ({
      x: ax + (bx - ax) * t,
      y: ay + (by - ay) * t,
    })

    // Execution duration for the current cycle (compressed 30% for rework re-run)
    const execDur = reworked => reworked ? EXEC_BASE_DUR * 0.7 : EXEC_BASE_DUR

    // Phase duration — execution compresses on rework; discovery/planning carry per-cycle jitter
    const getPhaseDur = sim => {
      if (sim.phase === 'execution') return execDur(sim.reworkedThisCycle)
      if (sim.phase === 'discovery' || sim.phase === 'planning') {
        return PHASE_DUR[sim.phase] * (sim.phaseDurJitter ?? 1.0)
      }
      return PHASE_DUR[sim.phase]
    }

    // FSM transition — returns new sim state object (never mutates)
    const nextPhase = (sim, now) => {
      const b = { ...sim, phaseStartT: now }
      switch (sim.phase) {
        case 'intake':       return { ...b, phase: 'discovery' }
        case 'discovery':    return { ...b, phase: 'planning' }
        case 'planning':     return { ...b, phase: 'fanout' }
        case 'fanout': {
          // Randomise which lane is the gate (1.0) and give the rest unique multipliers.
          // Keeps the same base duration ceiling but varies completion order every cycle.
          const gateIdx    = Math.floor(Math.random() * 4)
          const laneDurMult = [0, 1, 2, 3].map(i =>
            i === gateIdx ? 1.0 : 0.55 + Math.random() * 0.37
          )
          return { ...b, phase: 'execution', laneProgress: [0,0,0,0], laneDurMult }
        }
        case 'execution':    return { ...b, phase: 'reconverge' }
        case 'reconverge':   return { ...b, phase: 'verification' }
        case 'verification': {
          // First pass always fails → rework; second pass (after rework) always ships.
          if (!sim.reworkedThisCycle) {
            return { ...b, phase: 'rework', failThisCycle: true, consecutivePasses: 0 }
          }
          return { ...b, phase: 'shipping' }
        }
        case 'rework':    return { ...b, phase: 'planning', reworkedThisCycle: true, failThisCycle: false }
        case 'shipping':  return { ...b, phase: 'rest', consecutivePasses: sim.consecutivePasses + 1 }
        case 'rest':
        default:          return {
          phase:              'intake',
          phaseStartT:        now,
          reworkedThisCycle:  false,
          failThisCycle:      false,
          consecutivePasses:  sim.consecutivePasses,
          laneProgress:       [0, 0, 0, 0],
          laneDurMult:        LANE_DUR_MULT,
          // ±10% jitter on discovery/planning duration so each loop feels subtly different
          phaseDurJitter:     0.90 + Math.random() * 0.20,
        }
      }
    }

    // Render token positions and apply activation classes for one frame.
    // t ∈ [0,1] within the current phase. elapsed = seconds since phase start.
    const renderSim = (sim, t, elapsed) => {
      const field    = fieldRef.current
      const lead     = leadRef.current
      const children = childRefs.current
      if (!field || !lead) return

      const ease = easeIO(Math.min(t, 1))

      switch (sim.phase) {
        case 'intake': {
          // Lead descends from intake port to discovery entry
          const p = lerp2(CORE_X, BANDS.intake.y1 + 1.5, CORE_X, BANDS.discovery.y1, ease)
          placeToken(lead, p.x, p.y, Math.min(ease * 4, 1))
          lead.classList.remove('wagnt-packet--fail')
          children.forEach(hideToken)
          break
        }
        case 'discovery': {
          // Lead moves through discovery band to mid-point, then dwells
          const ry = BANDS.discovery.y1 + (DISC_MID_Y - BANDS.discovery.y1) * Math.min(ease * 2.5, 1)
          placeToken(lead, CORE_X, ry)
          children.forEach(hideToken)
          break
        }
        case 'planning': {
          // Lead travels toward manifold top, then fades as children spawn
          const descend = Math.min(ease * 2.0, 1)
          const py = DISC_MID_Y + (MF_INPUT_Y + 4 - DISC_MID_Y) * descend
          const leadOp = Math.max(1 - (t - 0.55) / 0.2, 0)
          placeToken(lead, CORE_X, py, leadOp)

          // 4 children appear staggered at the fan-out origin (CORE_X, planning.y2).
          // Wider stagger + overshoot scale makes "one goal → many subtasks" pop visibly.
          children.forEach((el, i) => {
            const spawnAt = 0.44 + i * 0.10
            const childT  = t < spawnAt ? 0 : Math.min((t - spawnAt) / 0.18, 1)
            if (childT > 0) {
              // Overshoot: ramps 0.5 → 1.15 (pop out) → 1.0 (settle) for dramatic separation
              const scale = childT < 0.6
                ? 0.50 + childT * (0.65 / 0.6)          // ramp to overshoot peak at childT=0.6
                : 1.15 - (childT - 0.6) * (0.15 / 0.4)  // settle to natural scale at childT=1.0
              placeToken(el, CORE_X, BANDS.planning.y2, childT, scale)
            } else {
              hideToken(el)
            }
          })
          break
        }
        case 'fanout': {
          // Children follow FAN_OUT beziers from CORE to each lane top
          hideToken(lead)
          children.forEach((el, i) => {
            const [p0, p1, p2, p3] = FAN_OUT_PTS[i]
            const pt = cubicBezierPt(p0, p1, p2, p3, ease)
            placeToken(el, pt.x, pt.y)
          })
          break
        }
        case 'execution': {
          // Each lane descends at its own pace — per-cycle random multipliers (sim.laneDurMult)
          // ensure completion order and timing vary every loop
          hideToken(lead)
          const dur      = execDur(sim.reworkedThisCycle)
          const laneMult = sim.laneDurMult ?? LANE_DUR_MULT
          children.forEach((el, i) => {
            const laneDur = laneMult[i] * dur
            const laneT   = Math.min(elapsed / laneDur, 1)
            const ry      = EXEC_RAIL_Y1 + (EXEC_RAIL_Y2 - EXEC_RAIL_Y1) * easeIO(laneT)
            placeToken(el, LANE_CENTERS[i], ry)
            // Animate the active module slot fill width to show task progress
            const fillEl = slot1Refs.current[i]
            if (fillEl) {
              const pct = laneT * 100
              fillEl.style.width = `${pct.toFixed(1)}%`
              fillEl.classList.toggle('wagnt-module-fill--done', pct >= 100)
            }
          })
          break
        }
        case 'reconverge': {
          // Children converge back along RECONVERGE beziers to verification top
          hideToken(lead)
          children.forEach((el, i) => {
            const [p0, p1, p2, p3] = RECONVERGE_PTS[i]
            const pt = cubicBezierPt(p0, p1, p2, p3, ease)
            placeToken(el, pt.x, pt.y)
          })
          break
        }
        case 'verification': {
          // Merged lead dwells at gate — children are hidden (merged into lead)
          const gy = BANDS.verification.y1 + (VER_GATE_Y - BANDS.verification.y1) * Math.min(ease * 2.5, 1)
          lead.classList.remove('wagnt-packet--fail')
          placeToken(lead, CORE_X, gy)
          children.forEach(hideToken)
          break
        }
        case 'shipping': {
          // Lead exits down the output spine
          const p = lerp2(CORE_X, BANDS.verification.y2, CORE_X, BANDS.output.y2 - 1.5, ease)
          lead.classList.remove('wagnt-packet--fail')
          placeToken(lead, p.x, p.y, Math.max(1 - ease * 1.8, 0))
          children.forEach(hideToken)
          break
        }
        case 'rework': {
          // Gold lead travels up the right-side retry bus.
          // getPointAtLength samples SVG viewBox coords directly → vbPx().
          const pathEl = reworkPathRef.current
          if (pathEl) {
            const totalLen = pathEl.getTotalLength()
            const pt = pathEl.getPointAtLength(ease * totalLen)
            lead.classList.add('wagnt-packet--fail')
            placeToken(lead, pt.x, pt.y)
          }
          children.forEach(hideToken)
          break
        }
        case 'rest':
        default: {
          hideToken(lead)
          children.forEach(hideToken)
          break
        }
      }
    }

    const tick = t => {
      raf   = requestAnimationFrame(tick)
      const dt = Math.min(t - lastT, 50)   // cap to absorb tab-blur spikes
      lastT = t

      // ── Phase 2A: telemetry drift ─────────────────────────────────────────────
      if (isActiveRef.current) {
        const state = driftStateRef.current
        for (const entry of DRIFT_ENTRIES) {
          const el = driftElsRef.current.get(entry.key)
          if (!el) continue
          const s = state[entry.key]
          if (t >= s.nextAt) {
            const { min, max } = entry.drift
            s.target = min + Math.random() * (max - min)
            s.nextAt = t + 1800 + Math.random() * 800
          }
          s.value += (s.target - s.value) * Math.min(dt * 0.001, 0.06)
          const { decimals, suffix } = entry.drift
          el.textContent = s.value.toFixed(decimals) + suffix
        }
      }

      if (!isActiveRef.current) return   // simulation idles off-screen

      // ── Phase 2B/2C/2D: simulation clock ─────────────────────────────────────
      const sim     = simRef.current
      const elapsed = (t - sim.phaseStartT) / 1000  // seconds since phase start
      const dur     = getPhaseDur(sim)

      if (elapsed >= dur) {
        // Phase transition
        const prevPhase = sim.phase
        const newSim    = nextPhase(sim, t)
        simRef.current  = newSim

        // Update field data-phase attribute — CSS activation rules key off this
        if (fieldRef.current) {
          if (newSim.phase === 'rest') {
            delete fieldRef.current.dataset.phase
          } else {
            fieldRef.current.dataset.phase = newSim.phase
          }
        }

        // Phase 2C: couple PASS/CONF telemetry to verification outcome
        if (prevPhase === 'verification') {
          const s = driftStateRef.current
          if (newSim.phase === 'rework') {
            // Fail: metrics dip
            if (s['verification:PASS']) { s['verification:PASS'].target = 91; s['verification:PASS'].nextAt = t + 4500 }
            if (s['verification:CONF']) { s['verification:CONF'].target = 0.92; s['verification:CONF'].nextAt = t + 4500 }
          } else {
            // Pass: metrics recover
            if (s['verification:PASS']) { s['verification:PASS'].target = 98; s['verification:PASS'].nextAt = t + 3000 }
            if (s['verification:CONF']) { s['verification:CONF'].target = 0.97; s['verification:CONF'].nextAt = t + 3000 }
          }
        }

        // Phase 2C: re-roll LAT on each shipment
        if (prevPhase === 'shipping') {
          const s = driftStateRef.current
          if (s['shipping:LAT']) { s['shipping:LAT'].target = 232 + Math.random() * 16; s['shipping:LAT'].nextAt = t + 300 }
        }

        // Reset slot[1] fills when starting a new execution pass
        if (newSim.phase === 'execution') {
          EXEC_STATION.lanes.forEach((_, i) => {
            const fillEl = slot1Refs.current[i]
            if (fillEl) { fillEl.style.width = '0%'; fillEl.classList.remove('wagnt-module-fill--done') }
          })
        }

        // Restore static slot data when cycle fully resets
        if (newSim.phase === 'rest') {
          EXEC_STATION.lanes.forEach((lane, i) => {
            const fillEl = slot1Refs.current[i]
            if (fillEl) {
              fillEl.style.width = `${lane.slots[1]}%`
              fillEl.classList.toggle('wagnt-module-fill--done', lane.slots[1] >= 100)
            }
          })
        }

        renderSim(newSim, 0, 0)
        return
      }

      const phaseT = Math.min(elapsed / dur, 1)
      renderSim(sim, phaseT, elapsed)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isFinal])

  return (
    <motion.div
      className={`widviz-layer widviz-agents${isActive && !isFinal ? ' wagnt-live' : ''}`}
      style={{ opacity: isFinal ? 1 : dissolve }}
    >

      {/* ── Global status header (sits above the chassis frame) ────────── */}
      <div className="wagnt-header">
        <span className="wagnt-status">{DATA.status}</span>
        <div className="wagnt-global-tel">
          {DATA.globalTelemetry.map(t => (
            <span key={t.label} className="wagnt-tel-pair">
              <span className="wagnt-tel-label">{t.label}</span>
              <span className="wagnt-tel-value">{t.value}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Factory field — shared coordinate space for SVG + HTML ──────── */}
      <div className="wagnt-field" ref={fieldRef}>

        {/* ── SVG layer: chassis + rails + Phase 1.5 factory detail ─────── */}
        <svg
          className="wagnt-svg"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* ── A. Flow conduit underlays (dim wider paths behind spine) ── */}
          <path d={CONDUIT_TOP} className="wagnt-conduit" />
          <path d={CONDUIT_BOT} className="wagnt-conduit" />

          {/* ── Chassis: frame uprights ──────────────────────────────────── */}
          <line
            x1={FRAME_X1} y1={BANDS.intake.y2}
            x2={FRAME_X1} y2={BANDS.shipping.y2}
            className="wagnt-upright"
          />
          <line
            x1={FRAME_X2} y1={BANDS.intake.y2}
            x2={FRAME_X2} y2={BANDS.shipping.y2}
            className="wagnt-upright"
          />

          {/* ── Chassis: cap bars + tie-bars ─────────────────────────────── */}
          {TIE_YS.map(y => (
            <line
              key={y}
              x1={FRAME_X1} y1={y} x2={FRAME_X2} y2={y}
              className={CAP_SET.has(y) ? 'wagnt-cap' : 'wagnt-tiebar'}
            />
          ))}

          {/* ── Intake port dot + spine stub ─────────────────────────────── */}
          <circle cx={CORE_X} cy={BANDS.intake.y1 + 1.5} r={1.4} className="wagnt-port-dot wagnt-port-dot--in" style={{ '--port-i': 0 }} />
          <line
            x1={CORE_X} y1={BANDS.intake.y1 + 2.9}
            x2={CORE_X} y2={BANDS.discovery.y1}
            className="wagnt-spine"
          />

          {/* ── A. Downward flow chevrons — directional cues on the spine ── */}
          {SPINE_CHEVRONS_DOWN.map((d, i) => (
            <path key={i} d={d} className="wagnt-flow-chevron" style={{ '--chev-i': i }} />
          ))}

          {/* ── C. Planning: splitter manifold ───────────────────────────── */}
          <path d={MANIFOLD_PATH} className="wagnt-manifold" />
          {MANIFOLD_RIBS.map((d, i) => <path key={i} d={d} className="wagnt-manifold-rib" style={{ '--rib-i': i }} />)}

          {/* ── Fan-out: planning → 4 lane tops ──────────────────────────── */}
          {FAN_OUT.map((d, i) => <path key={i} d={d} className="wagnt-fanout" />)}

          {/* ── Lane centerline rails — tokens animate along these ───────── */}
          {LANE_CENTERS.map((lx, i) => (
            <line
              key={i}
              x1={lx} y1={BANDS.execution.y1 + 3}
              x2={lx} y2={BANDS.execution.y2 - 3}
              className="wagnt-lane-rail"
            />
          ))}

          {/* ── Reconverge: 4 lane bottoms → verification ────────────────── */}
          {RECONVERGE.map((d, i) => <path key={i} d={d} className="wagnt-reconverge" />)}

          {/* ── E. Verification: inspection gate bar ─────────────────────── */}
          <line
            x1={GATE_BAR_X1} y1={VER_GATE_Y}
            x2={GATE_BAR_X2} y2={VER_GATE_Y}
            className="wagnt-gate-bar"
          />

          {/* ── Spine: verification bottom → shipping → output ───────────── */}
          <line
            x1={CORE_X} y1={BANDS.verification.y2}
            x2={CORE_X} y2={BANDS.shipping.y1}
            className="wagnt-spine"
          />
          <line
            x1={CORE_X} y1={BANDS.shipping.y2}
            x2={CORE_X} y2={BANDS.output.y2 - 2.4}
            className="wagnt-spine"
          />
          <circle cx={CORE_X} cy={BANDS.output.y2 - 1.5} r={1.4} className="wagnt-port-dot wagnt-port-dot--out" style={{ '--port-i': 1 }} />

          {/* ── Core SVG ring — silent backdrop for the HTML nucleus ─────── */}
          <circle cx={CORE_X} cy={CORE_Y} r={8} className="wagnt-core-ring" />

          {/* ── Rework retry bus — engineered orthogonal, right gutter ───── */}
          <path ref={reworkPathRef} d={REWORK} className="wagnt-rework" />
          <polygon points={REWORK_ARROW} className="wagnt-rework-arrow" />

          {/* ── Rework direction chevrons (upward, right gutter) ─────────── */}
          {REWORK_CHEVRONS.map((d, i) => <path key={i} d={d} className="wagnt-rework-chevron" style={{ '--chev-rw-i': i }} />)}
        </svg>

        {/* ── GOAL IN port label — floats above the field, between header and chassis ── */}
        <div
          className="wagnt-port-label wagnt-port-label--in"
          style={{ top: '-22px', left: '50%' }}
        >
          GOAL IN
        </div>

        {/* ── Intake cycle-start pulse ring — CSS-driven, fires on [data-phase="intake"] ── */}
        {!isFinal && (
          <div
            ref={intakePulseRef}
            className="wagnt-intake-pulse"
            style={{ top: yp(BANDS.intake.y1 + 1.5), left: xp(CORE_X) }}
            aria-hidden="true"
          />
        )}

        {/* ── Non-execution station bays ────────────────────────────────── */}
        {OTHER_STATIONS.map(station => {
          const band = BANDS[station.id]
          return (
            <div
              key={station.id}
              className={`wagnt-station wagnt-station--${station.id}`}
              style={{
                top:    yp(band.y1),
                height: hp(band.y1, band.y2),
                left:   xp(FRAME_X1),
                width:  wp(USABLE_W),
              }}
            >
              <div className="wagnt-station-head">
                <span className="wagnt-station-index">{station.index}</span>
                <span className="wagnt-station-label">{station.label}</span>
              </div>
              {station.telemetry && (
                <div className="wagnt-station-tel">
                  {station.telemetry.map(t => (
                    <span key={t.label} className="wagnt-tel-pair">
                      <span className="wagnt-tel-label">{t.label}</span>
                      <span
                        className="wagnt-tel-value"
                        ref={t.drift ? el => {
                          const key = `${station.id}:${t.label}`
                          if (el) driftElsRef.current.set(key, el)
                          else    driftElsRef.current.delete(key)
                        } : null}
                      >
                        {t.value}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* ── Execution band — dominant zone (40% of height) ───────────── */}
        <div
          className="wagnt-exec-band"
          style={{
            top:    yp(BANDS.execution.y1),
            height: hp(BANDS.execution.y1, BANDS.execution.y2),
            left:   xp(FRAME_X1),
            width:  wp(USABLE_W),
          }}
        >
          <div className="wagnt-exec-head">
            <span className="wagnt-station-index">{EXEC_STATION.index}</span>
            <span className="wagnt-station-label">{EXEC_STATION.label}</span>
          </div>

          <div className="wagnt-lanes">
            {EXEC_STATION.lanes.map((lane, i) => (
              <div key={i} className="wagnt-lane">
                <div className="wagnt-lane-head">
                  <span className="wagnt-tel-label">{lane.label}</span>
                  <span className="wagnt-tel-value">{lane.run}%</span>
                </div>

                {/* D. Modular rack-unit blocks. slot[1] ref wired for Phase 2B live width.
                    All fills rendered (no conditional) so slot[1] is always addressable. */}
                <div className="wagnt-module-slots">
                  {lane.slots.map((pct, j) => (
                    <div key={j} className="wagnt-module">
                      <div
                        ref={j === 1 ? el => { slot1Refs.current[i] = el } : null}
                        className={`wagnt-module-fill${pct >= 100 ? ' wagnt-module-fill--done' : ''}`}
                        style={{ width: `${pct}%`, '--cell-i': i * 3 + j }}
                      />
                    </div>
                  ))}
                </div>

                {/* Execution lane flow pulse — CSS-driven, fires on [data-phase="execution"] */}
                {!isFinal && (
                  <div
                    ref={el => { lanePulseRefs.current[i] = el }}
                    className="wagnt-lane-pulse"
                    style={{ '--lane-i': i }}
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Core nucleus — three HTML layers: glow bloom, ring, nucleus ── */}
        <div
          className="wagnt-core"
          style={{ left: xp(CORE_X), top: yp(CORE_Y) }}
        >
          <div className="wagnt-core-glow" />
          <div className="wagnt-core-ring-inner" />
          <div className="wagnt-core-nucleus" />
          <div className="wagnt-core-ack" />
        </div>

        {/* ── Rework label — centered on vertical segment of retry bus ─── */}
        {/* right: '-28px' pushes the label into the right gutter past the bus   */}
        {/* line (x≈95% of the field) so text doesn't overlap the path element. */}
        <div
          className="wagnt-rework-label"
          style={{
            top:       yp((RW_OUT_Y + RW_IN_Y) / 2),
            right:     '-28px',
            transform: 'translateY(-50%)',
          }}
        >
          REWORK
        </div>

        {/* ── Token pool (Phase 2B) ─────────────────────────────────────── */}
        {/* Lead packet + 4 child packets. Initially hidden (opacity:0).    */}
        {/* Positioned exclusively via transform in the RAF — no layout.    */}
        {!isFinal && (
          <>
            <div
              ref={leadRef}
              className="wagnt-packet wagnt-packet--lead"
              aria-hidden="true"
              style={{ opacity: 0 }}
            >
              <div className="wagnt-packet-tick" />
            </div>
            {LANE_CENTERS.map((_, i) => (
              <div
                key={i}
                ref={el => { childRefs.current[i] = el }}
                className="wagnt-packet wagnt-packet--child"
                aria-hidden="true"
                style={{ opacity: 0 }}
              >
                <div className="wagnt-packet-tick" />
              </div>
            ))}
          </>
        )}

        {/* ── Output shipping pulse ring — CSS-driven, fires on [data-phase="shipping"] ── */}
        {!isFinal && (
          <div
            ref={outPulseRef}
            className="wagnt-out-pulse"
            style={{ top: yp(BANDS.output.y2 - 1.5), left: xp(CORE_X) }}
            aria-hidden="true"
          />
        )}

        {/* ── OUTPUT port label — floats below the field, below the chassis ── */}
        <div
          className="wagnt-port-label wagnt-port-label--out"
          style={{ top: 'calc(100% + 16px)', left: '50%' }}
        >
          OUTPUT
        </div>

      </div>
    </motion.div>
  )
}
